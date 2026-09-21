# Chordex Studio — Release Process

This document defines the release pipeline, git commit naming rules, and verification criteria for deploying updates.

---

## 1. Versioning Protocol

Chordex Studio enforces version parameters:

- **`versionCode`**: Must be incremented by exactly `+1` on each release (e.g. from `183` to `184`). Reusing codes is strictly forbidden.
- **`versionName`**: Uses semantic naming conventions (`Major.Minor.Patch`, e.g. `3.7.56`). Matches the git release tags.
- **Sync Configuration**: Bumping the native build configurations inside `apps/studio-android/android/app/build.gradle` is synced automatically to `packages/studio-core/src/lib/appVersion.ts` using the version script:
  ```bash
  node scripts/sync-version.mjs
  ```

Source:

- `apps/studio-android/android/app/build.gradle`
- `apps/studio-android/scripts/sync-version.mjs`

---

## 2. Git Workflow & Commit Rules

### Explicit Staging Only

- Never use `git add .` or `git add -A`.
- Stage target files explicitly using their path:
  ```bash
  git add packages/ui-shared/src/components/DevToolsDashboard.tsx
  ```

### Commit Formatting

Commits must conform to Semantic Commits specifications:

- `feat(ui)`: New user interface features.
- `fix(ota)`: Corrections to updater logic.
- `refactor(core)`: Code cleanups, performance tuning, or hooks refactoring.
- `chore(build)`: Build script edits, dependency bumps, or config changes.

_Example_: `feat(ui): modernize Updater Diagnostics dashboard with Material 3 Google Stitch style layout`

---

## 3. Deployment Pipeline (GitHub Actions)

Deployments are manually triggered via the GitHub Actions user interface using the `workflow_dispatch` event handler:

```
┌──────────────────┐       ┌────────────────────┐       ┌────────────────────┐
│ Trigger UI Build ├──────>│  Trigger Workflow  ├──────>│ Compile & Assemble │
│ (inputs: v_name) │       │(android-release.yml)│      │    Signed APKs     │
└──────────────────┘       └─────────┬──────────┘       └─────────┬──────────┘
                                     │                            │
                                     ▼                            ▼
                           ┌────────────────────┐       ┌────────────────────┐
                           │Publish GitHub Release│      │ Deploy Metadata to │
                           │   with APK & SHA   │       │  Firebase Hosting  │
                           └────────────────────┘       └────────────────────┘
```

### Steps

1. **Trigger**: Navigate to Actions on GitHub, select **Android Release Pipeline**, and click **Run workflow**. Fill in the required inputs: `version_name`, `version_code`, and optional `note`.
2. **Build Stage**: The runner launches `android-release.yml`, executing:
   - Linters and unit testing suites.
   - Compiles the React distribution bundles.
   - Decodes base64 keystore credentials and compiles the release APK.
3. **GitHub Release Stage**: Publishes a new release tag containing:
   - Compiled signed APK (`studio-[version_name].apk`).
   - Integrity checksum signature (`studio-[version_name].sha256`).
4. **Hosting Distribution Stage**: Deploys the latest metadata files (`version.json` and `app-release.json`) directly to Firebase Hosting.

Source:

- `.github/workflows/release.yml`

---

## 4. Verification Checklists

Before finalizing a release, complete the following verification steps:

- [ ] **Public Metadata Verification**: Fetch metadata parameters:
  - URL: `https://studio-30f44.web.app/version.json` -> verify version matches the tag.
  - URL: `https://studio-30f44.web.app/app-release.json` -> verify `apkUrl`, `sha256`, and `versionCode` are correct.
- [ ] **Updater Auto-Detect**: Launch an older app version and verify that it detects the new version, downloads it, and launches the install prompt.
- [ ] **Regression Verification**: Ensure that offline database synchronization and backing tracks work correctly post-install.

Source:

- `packages/studio-core/src/lib/updater/index.ts`

---

## 5. Web Deployment (Cloudflare Pages)

Web application compilation and deployment are managed via Cloudflare Pages:

- **Auto-Publishing**: Commits pushed or merged to the `main` branch automatically trigger Cloudflare Pages to run the production build script (`pnpm run build:web`).
- **Pre-deployment Verification**:
  1. Build assets locally using `pnpm run build:web`.
  2. Confirm type safety: `pnpm run typecheck:web`.
- **Cache Invalidation**: Cloudflare Pages clears standard CDN caches. Hashed files in `/assets/**` are marked as immutable for browser caching, while `/index.html` and service worker files (`/sw.js`) are configured with `no-store` headers via `_headers` to guarantee instant updates.

Source:

- `wrangler.toml`
- `apps/studio-web/public/_headers`
- `apps/studio-web/public/_redirects`

---

## 6. Hotfix Workflow

When a critical bug is discovered in production:

1.  **Branch Creation**: Branch directly from the corresponding production release tag (e.g. `release-v3.7.56` or `main` depending on active state):
    ```bash
    git checkout -b hotfix/bug-description
    ```
2.  **Implementation**: Fix the root cause directly, following the Bug Fix Checklist.
3.  **Local Validation**: Test across target platforms (Android WebView and Web browser SPA).
4.  **Cherry-pick / Merge**: Merge the hotfix branch back to `main` via PR, and cherry-pick to any active release branches.
5.  **Trigger Release**: Manually trigger the release workflow on GitHub Actions. Incremented `versionCode` (+1) is mandatory.

Source: *

---

## 7. Rollback Procedures

Follow these steps to revert a deployment in case of critical production failures:

### A. Web Rollback (Cloudflare Pages)

If a web deployment introduces breaking regressions:

1.  Navigate to the Cloudflare Dashboard > **Workers & Pages** > **livex** > **Deployments**.
2.  Select the last stable deploy from the history list.
3.  Click **Rollback to this deployment** to instantly revert production traffic to that previous stable revision.

### B. Android Rollback

If a published APK update is broken, the update state machine will trigger rollback fallback recovery mechanisms:

1.  **Client-Side Auto-Recovery**: If the app fails to boot or update successfully, the client registers `consecutiveFailures: 5` and transitions to Recovery Mode. This deletes the cached broken APK, resets providers, and prompts the user with diagnostics options.
2.  **Server-Side Revocation**: To stop the rollout of a broken update immediately:
    - Update `app-release.json` on Firebase Hosting to point to the previous stable `versionCode`, `versionName`, and `apkUrl` hash.
    - Android clients fetching the metadata will see that their active version is equal to or greater than the target, aborting the download prompt.

Source: *

---

## 8. Emergency Release Procedure

If the GitHub Actions CI pipeline is stuck or offline and an emergency release is required:

1.  **Local APK Assembly**: Run the production build locally:
    ```bash
    pnpm run build:android:web
    npx cap sync android
    ```
2.  **Native Signing**: Open Android Studio (`npx cap open android`) and build the signed APK using the release Keystore file.
3.  **Manual Asset Upload**: Upload the compiled APK to GitHub Releases manually under a new semantic tag release.
4.  **Metadata Deployment**: Deploy version metadata directly to Firebase Hosting using the Firebase CLI:
    ```bash
    firebase deploy --only hosting
    ```
5.  **Verify CDN**: Fetch the public `version.json` and `app-release.json` from the browser to confirm propagation.
