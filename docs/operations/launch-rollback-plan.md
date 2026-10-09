# Livex Launch Day Rollback & Incident Response Plan

**Scope**: Production Systems (Cloudflare Pages Web, Android Google Play / APK, Firebase/Firestore, Supabase)  
**Classification**: Emergency Standard Operating Procedure  
**Effective Date**: 2026-10-09  
**Execution Target Time**: Full mitigation under 5 minutes  

---

## 1. Trigger Criteria for Emergency Rollback

Initiate an emergency rollback immediately if any of the following P0/P1 conditions are confirmed:

1. **Client Crash Loop**: Sentry / Livex Production Monitor records `>= 3` exceptions per session or crash loop flag active in `> 1%` of active sessions.
2. **Audio Engine / Teleprompter Malfunction**: Critical failure in Web Audio DSP, metronome stutter, or lyrics teleprompter freeze affecting live stage performances.
3. **Data Loss / Sync Contamination**: Firestore or Supabase database writes failing, cross-tenant data contamination, or band session desynchronization.
4. **Credential / Security Exposure**: API token leak or unexpected permissive rule detection in security scanners.

---

## 2. Web Rollback Procedure (< 2 Minutes)

Cloudflare Pages maintains immutable deployment hashes for every commit. Rollback requires zero build time and propagates globally within seconds.

### Step 1: List Deployments and Identify Last Stable Hash

```bash
# List the last 5 production deployments
pnpm wrangler pages deployment list --project-name=livex-studio
```

Identify the `Deployment ID` or `Hash` of the last verified stable build (e.g. `d419a3b8`).

### Step 2: Instant Production Promotion

Rollback to the known stable deployment:

```bash
# Promote the stable deployment immediately to the production domain
pnpm wrangler pages deployment promote [STABLE_DEPLOYMENT_ID] --project-name=livex-studio
```

### Step 3: Firebase Hosting Rollback (Fallback / Dual-Host Mirror)

If Firebase Hosting is active as the OTA tracking host or secondary mirror:

```bash
# List recent Firebase Hosting releases
firebase hosting:clone [SOURCE_STABLE_VERSION] studio-30f44:live

# Or redeploy previous stable dist artifact
git checkout [STABLE_TAG] -- dist/
firebase deploy --only hosting
```

### Step 4: Verify Web Rollback

- Access `https://livex.studio/` in an incognito window.
- Verify in browser DevTools: `window.__LIVEX_VERSION__` or footer reflects previous stable release.
- Confirm critical path: Hub → Chordex → Live Teleprompter.

---

## 3. Mobile / Android Rollback Procedure

Native mobile APKs cannot be forcefully uninstalled from user devices over the wire. Instead, mitigate instantly using Google Play Console and the Native In-App Updater.

### A. Google Play Phased Rollout Emergency Halt (< 1 Minute)

For releases deployed via Google Play Console phased rollout (10% → 20% → 100%):

1. **Open Google Play Console**: Navigate to **Release** → **Production**.
2. Select the active rollout track.
3. Click **Halt rollout**.
   - *Result*: Immediately halts updates for all remaining users. Users who have not yet downloaded the buggy update remain on the stable version.

### B. Emergency Rollback Release (Hotfix / Version Bump)

If the buggy version was 100% rolled out:

1. Revert to the last known stable git tag:
   ```bash
   git checkout tags/v4.7.2 -b hotfix-rollback
   ```
2. Bump `versionCode` in `apps/studio-android/android/app/build.gradle` higher than the broken build (e.g. `versionCode 140`), maintaining identical stable code.
3. Build and sign using the permanent production key:
   ```bash
   pnpm build:android:production
   ```
4. Verify signing fingerprint against the permanent invariant:
   `900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206`
5. Upload to Google Play Production track and set rollout to **100%**.

### C. Native APK Updater Rollback (Direct-Distribution / In-App)

For direct APK distribution via Firebase Hosting:

1. Update `public/version.json` and `public/app-release.json` on the update tracking server to point back to the stable APK artifact URL and SHA-256 hash.
2. The Livex In-App Native Updater will prompt active devices to download the verified stable binary.

---

## 4. Database Schema & Migration Rollback

If a migration introduced breaking columns or locked tables:

### A. Non-Destructive Feature Flag Disablement

Before reverting physical tables, disable the breaking feature via remote flags or environment variables:

```bash
# Disable breaking sync or experimental feature flag
# Set FEATURE_EXPERIMENTAL_CHORD_SYNC=false in Cloudflare Pages / Functions environment
wrangler pages secret put FEATURE_EXPERIMENTAL_CHORD_SYNC <<< "false"
```

### B. PostgreSQL / Supabase Migration Rollback

```bash
# 1. Check current migration state
supabase migration list

# 2. Revert the specific failing migration script
supabase migration repair [MIGRATION_VERSION] --status reverted

# 3. Apply backward-compatible schema fix
psql -h [DB_HOST] -U [DB_USER] -d postgres -f scripts/rollback-schema.sql
```

### C. Firestore Rules Rollback

If newly deployed `firestore.rules` caused permission rejections:

```bash
# Revert to previous tested rule set
git checkout HEAD~1 -- firestore.rules
firebase deploy --only firestore:rules
```

---

## 5. Incident Communication Templates

Notify users and band members immediately to maintain trust during service degradation.

### Template 1: Investigating (Within 5 Minutes of Detection)

> **Headline**: Investigating Performance Issue with Livex Sync  
> **Body**: We are actively investigating reports of connection latency and teleprompter synchronization delays in Livex Studio. Our engineering team is on the case, and offline local playback remains fully operational. Next update in 15 minutes.

### Template 2: Rollback in Progress (Within 10 Minutes)

> **Headline**: Applying Temporary Update Rollback  
> **Body**: To ensure uninterrupted live stage performance, we are rolling back today's web update to the previous verified stable version. If you are experiencing issues, please refresh your browser tab. We apologize for the inconvenience.

### Template 3: Issue Resolved & Monitoring (Post-Mitigation)

> **Headline**: Service Fully Restored  
> **Body**: The rollback has completed, and all Livex services (Band Rooms, Teleprompter, Cloud Sync) are operating at 100% stability. No data was impacted. We will publish a full post-mortem once the root cause is resolved.

---

## 6. Post-Mortem & Root-Cause Review Gate

Following every rollback execution, the engineering team must complete the following within 24 hours:

1. **Log Collection**: Download sanitized crash logs from the Production Error Monitor and Cloudflare Analytics.
2. **Post-Mortem Document**: Create `docs/incidents/YYYY-MM-DD-incident-post-mortem.md`.
3. **Regression Test Addition**: Add an automated Vitest test reproducing the exact failure before attempting re-deployment.
4. **Approval Gate**: Requires sign-off from Lead Engineer before any re-release.
