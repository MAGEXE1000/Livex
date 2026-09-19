# @workspace/studio-android

> **Platform scope**: APK  
> **Entry point**: `src/main.tsx`  
> **Deployment**: Capacitor → Gradle → signed APK  
> **Build tool**: Vite 7 + `cap sync android`

## Purpose

The native Android application rendered inside a Capacitor WebView. Has access to native Capacitor plugins (filesystem, status bar, notifications, screen orientation). Contains its own OTA updater pipeline (native APK downloader + PackageInstaller). Shares all business logic with the web app via shared packages.

## Internal Structure

```
src/
├── main.tsx                   # React DOM root mount (mirrors web entry)
├── App.tsx                    # Root component (mirrors web with native-only paths)
├── index.css                  # Android-specific global CSS
└── vite-env.d.ts
android/                       # Native Android project
├── app/
│   ├── build.gradle           # ★ Gradle config: signing, versionCode, versionName
│   └── src/main/
│       ├── AndroidManifest.xml
│       └── java/.../MainActivity.kt
├── build.gradle               # Root Gradle config
└── gradle.properties
public/
├── version.json               # OTA version metadata (auto-generated)
└── stage-core/                # StageX iframe content (app.js, features.js, app.css)
scripts/
├── sync-version.mjs           # Prebuild hook: stamps public/version.json
└── preview-android.mjs        # Preview workflow for testing
capacitor.config.ts            # Capacitor config: appId, server URL, plugin settings
vite.config.ts                 # Vite config for Android
```

## Imports (workspace)

- `@workspace/livex-core` — all business logic
- `@workspace/ui-shared` — all shared UI
- `@workspace/ui-android` — Android-specific components

## Key Files

| File | Role |
|------|------|
| `src/App.tsx` | Root component with native-only paths (APK updater, back-handler) |
| `android/app/build.gradle` | ★ Production signing config — DO NOT weaken signing rules |
| `capacitor.config.ts` | Capacitor plugin settings and server config |
| `public/stage-core/` | StageX iframe content |

## Platform Rules

- This is an **APK scope** app
- Never import from `@workspace/ui-web` or `@workspace/studio-web`
- APK signing key config is outside the monorepo — see AGENTS.md §B
- All changes must be tested via `pnpm preview:android` before release
