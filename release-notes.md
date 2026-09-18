# Version 4.6.22

Release Date: 2026-09-17

### Security
- Android Manifest Permission Hardening: Stripped legacy `com.google.android.providers.gsf.permission.READ_GSERVICES` injected transitively by reCAPTCHA via manifest merger (`tools:node="remove"`), strictly enforcing a 16-permission whitelist with zero unauthorized permissions.
- Scoped FileProvider & Backup Protection: Narrowed `FileProvider` paths strictly to cache directories and configured `data_extraction_rules.xml` and `backup_rules.xml` to completely disable cloud backups and device data transfers.
- Strict Authorization & Storage Isolation: Decommissioned unused `firebase/storage` SDK from client runtime, enforced strict 2MB/10MB limits in server rules, and locked Firestore rooms and presence to authenticated user sandboxes.

### Fixed
- Native Updater State Machine Deadlock Resolution: Corrected unhandled transition paths in updater pipeline that previously left the updater stuck in downloading/verifying states on unhandled transitions.
- Updater Download Cancellation Support: Added comprehensive `AbortController` cancellation for in-flight APK downloads when dialogs are closed or dismissed, cleanly terminating connections and resetting state to `INSTALL_CANCELLED`.
- Native Android PackageInstaller Callbacks: Connected native Android `PackageInstaller` broadcast events (`STATUS_SUCCESS`, `STATUS_PENDING_USER_ACTION`, `STATUS_FAILURE_*`) to the JavaScript runtime.
- Silent Catch Block Remediation: Replaced silent empty catch blocks across metadata retrieval, SHA-256 verification, and installation recovery with structured diagnostic flight recorder telemetry.
- Theme Cold-Boot Initialization Flash: Eliminated theme flicker and initialization lag during cold boots and page transitions.

### Improved
- Decommissioned Obsolete Prototype Packages: Completely removed legacy direct-postgres prototype package `lib/db/` and purged obsolete workspace dependencies and tsconfig references.
- Sync Provider Canonicalization: Pruned dead ghost options (`firebase-firestore-legacy`, `supabase-powersync`) in favor of canonical `supabase-realtime` sync engine.
- Theme Token & Visual Hierarchy Unification: Consolidated Chordex and Drumex tuner surfaces to canonical Livex theme tokens, guaranteeing true AMOLED pitch black and adaptive light mode backgrounds.
- Animation & Motion Performance: Optimized animation lifecycles with CSS compositor offloading and strict reduced-motion accessibility enforcement.
