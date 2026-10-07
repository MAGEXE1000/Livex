# Mandatory Android Studio Emulator & ADB Screenshot Verification Protocol

## 1. Quality Gate Principle

To guarantee that all UI/UX changes render natively without visual regressions, clipping, or touch conflicts inside the Android WebView, all engineering agents and developers must verify UI modifications directly on an active **Android Studio Emulator** or connected physical device.

**Core Rule**: Text-only claims of visual verification are prohibited. Every UI implementation must produce an uncorrupted, real-time PNG artifact captured via ADB and stored under `.artifacts/verification/`.

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

## 6. Deprecation of Desktop Browser Mocks

Desktop headless browser verification tools (Puppeteer / Playwright) are permanently deprecated for visual verification in Livex.

- **Single Standard**: The Android Studio ADB Emulator pipeline (`scripts/android-verify/`) is the sole authoritative visual verification standard across the entire repository.
- **No Dual Pipelines**: Bypassing the native Android WebView via desktop browser emulation is prohibited.
- **Evidence Mandatory**: Agents must never claim visual fidelity without citing an actual PNG artifact generated via `adb exec-out screencap -p` into `.artifacts/verification/`.

