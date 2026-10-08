# Native Android Studio Emulator & ADB Verification Protocol (Production Release Gate)

## 1. Quality Gate Principle

To guarantee that all release-candidate changes render natively without regressions on Android, developers may optionally verify changes on an active **Android Studio Emulator** or connected physical device prior to publishing.

For everyday development and rapid UI iterations, developers and agents use the fast, lightweight **Puppeteer Headless** pipeline (`pnpm verify:ui` / `scripts/verify-ui-screenshots.mjs`), which generates pixel-perfect mobile screenshots in under 15 seconds without the heavy CPU and memory overhead of launching an Android Virtual Device (AVD).

**Core Rule**: Text-only claims of visual verification are prohibited. Every UI implementation must produce an uncorrupted, real-time PNG artifact stored under `.artifacts/verification/`.

---

## 2. Standard Verification Lifecycle

For all UI tasks targeting or affecting the Android application:

```text
[1. Build Bundle] ──> [2. Capacitor Sync] ──> [3. Gradle Assemble]
                                                      │
                                                      ▼
[6. ADB Screencap] <── [5. UI Navigation] <── [4. ADB Install & Launch]
```

1. **Build & Native Sync**:
   Compile web assets and synchronize plugins/assets into the Capacitor Android container:
   ```bash
   pnpm --filter @workspace/studio-android build
   cd apps/studio-android && npx cap sync android
   ```
2. **Native Compilation**:
   Compile the debug APK using the local Gradle wrapper:
   ```bash
   cd apps/studio-android/android && ./gradlew assembleDebug
   # On Windows: gradlew.bat assembleDebug
   ```
3. **ADB Deployment**:
   Install the debug APK on the active emulator (`emulator-5554` or target device):
   ```bash
   adb install -r -d apps/studio-android/android/app/build/outputs/apk/debug/app-debug.apk
   ```
4. **Clean Launch**:
   Launch the main activity:
   ```bash
   adb shell am force-stop com.chordex.app
   adb shell am start -n com.chordex.app/.MainActivity
   ```
5. **Interactive Navigation (Optional Sub-views)**:
   Navigate to deep features (e.g. Setlists, Chordex, Groovex, Settings) via scripted touch commands:
   ```bash
   # Tap specific coordinates
   node scripts/android-verify/interact.mjs tap <X> <Y>
   # Or tap by screen percentage
   node scripts/android-verify/interact.mjs tap-pct <X_PCT> <Y_PCT>
   # Back button
   node scripts/android-verify/interact.mjs back
   ```
6. **Binary Screenshot Capture**:
   Capture the exact rendered display to `.artifacts/verification/`:
   ```bash
   pnpm android:emulator:screenshot <feature-name>.png
   ```

---

## 3. Automation Commands Reference

| Command | Purpose |
| :--- | :--- |
| `pnpm android:emulator:deploy` | Complete automated build, sync, Gradle assemble, ADB install, app launch, and screenshot capture. |
| `pnpm android:verify` | Alias for `android:emulator:deploy`. |
| `node scripts/android-verify/deploy-emulator.mjs --skip-build` | Fast deployment when web bundles and APK are already compiled. |
| `pnpm android:emulator:screenshot [name.png]` | Instant on-demand screenshot of whatever is currently on the emulator screen. |
| `node scripts/android-verify/interact.mjs <action>` | Drive emulator input (`tap`, `tap-pct`, `swipe`, `back`, `home`, `text`, `key`). |

---

## 4. Emulator Setup Prerequisites

If no active emulator is detected:
1. Launch **Android Studio** (`C:\Program Files\Android\Android Studio`).
2. Open the native Android project: `apps/studio-android/android`.
3. Open **Device Manager** (`Tools > Device Manager`).
4. Select or create an emulator (e.g. **Pixel 8**, **API 34/35**, `x86_64`).
5. Click the **Play** button to launch the virtual device.
6. Verify device readiness:
   ```bash
   adb devices
   # Expected output:
   # emulator-5554    device
   ```

---

## 5. Definition of Done for UI Changes

A UI task is complete ONLY when:
- The implementation has been deployed to the native Android environment.
- A verified PNG artifact is saved under `.artifacts/verification/`.
- The screenshot exhibits 100% visual integrity:
  - AMOLED dark mode contrast compliant (`#ffffff` text on dark surfaces where required).
  - Safe-area insets respected (notch, status bar, navigation pill).
  - No element clipping, font truncation, or touch boundary overlaps.
- The artifact is explicitly referenced in the task's final report.

---

## 6. Scope Separation: Rapid Headless UI Iteration vs Native Release Validation

The repository maintains a clear separation between rapid visual UI iteration and native production verification:

- **Primary Rapid UI Verification (Puppeteer Headless)**:
  - Tool: `pnpm verify:ui` or `node scripts/verify-ui-screenshots.mjs`
  - Target: Mobile viewport emulation (`412x915`, 2x DPR) against Vite HMR.
  - Performance: Instant execution (<15 seconds), zero CPU/battery drain, zero ADB/AVD boot overhead.
  - Used for: Feature development, layout tweaks, themes, typography, animations, and regressions.

- **Optional Native Validation (Android Studio ADB Emulator)**:
  - Tool: `pnpm android:verify` or `node scripts/android-verify/deploy-emulator.mjs`
  - Target: Real Android Capacitor shell on emulator or physical phone.
  - Used for: Final production release candidate validation, native Android plugins (camera, filesystem, hardware back button).

