# Android Launcher Icon Architecture & Developer Workflow

## 1. Architectural Principles

This document defines the canonical launcher icon architecture for Livex/Studio on Android.

### Core Tenets

1. **Canonical Application Identity (`com.chordex.app`)**:
   The application ID and namespace is permanently and exclusively `com.chordex.app`. All keystore signatures, Google Services OAuth client IDs, Firebase configurations, and release manifests are bound to this invariant. `com.livex.app` is not a valid package identity.

2. **Single Stable Launcher Component**:
   The application maintains exactly one permanent launcher entry point:
   ```xml
   <activity
       android:name=".MainActivity"
       android:label="@string/title_activity_main"
       android:icon="@mipmap/ic_launcher"
       android:roundIcon="@mipmap/ic_launcher_round"
       ...
       android:exported="true">
       <intent-filter>
           <action android:name="android.intent.action.MAIN" />
           <category android:name="android.intent.category.LAUNCHER" />
       </intent-filter>
   </activity>
   ```

3. **Strict Prohibition of Activity Aliases & Runtime PackageManager Mutations**:
   Never introduce an `<activity-alias>` (e.g. `MainActivityLivex`) or mutate `PackageManager` component enabled states at runtime (`setComponentEnabledSetting`) to force launcher cache invalidation. Such workarounds:
   - Break desktop shortcuts, widgets, and app pinning on user home screens.
   - Introduce fragile native code and state management into `MainActivity.kt`.
   - Deviate from standard Android application packaging standards.
   - Act as ineffective no-ops on modern OEM launchers (Samsung One UI, Pixel Launcher).

4. **Automated Cross-Platform Single-Source-of-Truth Generation**:
   All 15 native Android density mipmaps and Web/PWA public assets are derived deterministically from single authoritative master assets using the project's synchronization tooling (`scripts/sync-launcher-icons.mjs`).

5. **CI Preflight & Post-Build Integrity Enforcement**:
   Every build and release is guarded by `pnpm check:icons` in Preflight Job 1 of `.github/workflows/release.yml` and post-packaging binary APK verification in `scripts/generate-release-verification-report.mjs`.

---

## 2. Adaptive Icon Specification (Android 8.0 - Android 15+)

Modern Android launchers (One UI Home, Pixel Launcher, Nova Launcher) do not render flat icon bitmaps directly. Instead, they render adaptive icons defined in `res/mipmap-anydpi-v26/ic_launcher.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
```

### Canvas & Safe Zone Geometry

- **Total Canvas**: 108dp × 108dp.
- **Safe Zone**: 66dp × 66dp centered circle/square ($66 / 108 \approx 61.11\%$).
- **Background**: Pure AMOLED black (`#000000` defined in `res/values/ic_launcher_background.xml`).
- **Foreground**: Transparent 32-bit PNG with the brand symbol optically centered within the 66dp safe zone. Content outside the 66dp zone is clipped by OEM masks (squircle on Samsung, circle on Pixel).
- **Monochrome**: Points to `@mipmap/ic_launcher_foreground` to support Android 13+ Material You themed icons.

### Density Buckets

| Density Bucket     | Scale | Legacy Launcher (`ic_launcher.png`) | Legacy Round (`ic_launcher_round.png`) | Adaptive Foreground (`ic_launcher_foreground.png`) |
| ------------------ | ----- | ----------------------------------- | -------------------------------------- | -------------------------------------------------- |
| **mdpi** (1.0x)    | 1×    | 48 × 48 px                          | 48 × 48 px                             | 108 × 108 px                                       |
| **hdpi** (1.5x)    | 1.5×  | 72 × 72 px                          | 72 × 72 px                             | 162 × 162 px                                       |
| **xhdpi** (2.0x)   | 2×    | 96 × 96 px                          | 96 × 96 px                             | 216 × 216 px                                       |
| **xxhdpi** (3.0x)  | 3×    | 144 × 144 px                        | 144 × 144 px                           | 324 × 324 px                                       |
| **xxxhdpi** (4.0x) | 4×    | 192 × 192 px                        | 192 × 192 px                           | 432 × 432 px                                       |

---

## 3. Developer Workflow for Future Icon Updates

To update the launcher icon in future versions, follow this simple 3-step workflow:

### Step 1: Replace Authoritative Master Assets

Place the new high-resolution artwork into the canonical locations:

- Master badge (squircle badge, min 1024×1024): `packages/ui-shared/src/assets/livex-logo.png`
- Master symbol (isolated symbol on transparent background): `packages/ui-shared/src/assets/livex-symbol.png`

### Step 2: Run Synchronization Tooling

Run the canonical synchronization command:

```bash
pnpm sync:icons
```

This automatically generates all 15 density mipmaps with high-quality Lanczos3 resampling via `sharp`, computes exact 66dp safe-zone margins, generates `apps/studio-android/launcher-icons-manifest.json`, and synchronizes public Web/PWA assets.

### Step 3: Verify Integrity & Freshness

Run the verification safeguard:

```bash
pnpm check:icons
pnpm test:icons
```

This performs an 8-point integrity check:
1. Validates asset freshness against `launcher-icons-manifest.json` and canonical master SHA-256 hashes.
2. Validates that all 20 assets exist and are valid PNGs.
3. Verifies exact pixel dimensions across all density buckets.
4. Asserts zero presence of retired legacy waveform hashes.
5. Verifies `com.chordex.app.MainActivity` is registered as the sole launcher activity.
6. Enforces absolute prohibition of `<activity-alias>` elements.
7. Enforces `android:icon` and `android:roundIcon` references in `AndroidManifest.xml`.
8. Verifies full adaptive and monochrome XML definitions in `mipmap-anydpi-v26`.

### Step 4: Normal Build & Update

Proceed with standard build and release:

```bash
pnpm build:android:web
```

No modifications to `MainActivity.kt` or `AndroidManifest.xml` are ever required.

---

## 4. Understanding OEM Launcher Caching (Samsung One UI)

- **Standard Play Store Updates**: When distributed through Google Play, the Play Store service automatically signals the launcher to invalidate its icon bitmap cache on package replacement.
- **Sideloaded / OTA Updates**: When installing APKs directly outside the Play Store, Samsung One UI Home stores icon bitmaps in a local SQLite database (`launcher.db`). Furthermore, Samsung Cloud / Smart Switch Home Screen Backup can persist cached bitmaps across simple uninstalls if the home screen layout is automatically restored.
- **Troubleshooting Stale Cache on Sideloaded Test Devices**: If a test device persists an old cached bitmap after sideloading:
  1. Open Android **Settings** > **Apps** > **One UI Home** > **Storage** > **Clear Cache**.
  2. Or restart the device to force One UI Home to re-query the package manager.
