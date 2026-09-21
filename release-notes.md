# Version 4.6.35

Release Date: 2026-09-21

### Security
- Comprehensive Security Hardening: Remediated all GitHub Dependabot security alerts, upgrading Vitest to 4.1.11, overriding uuid to ^11.1.1 (CVE-2026-41907), and overriding esbuild to 0.28.1 (GHSA-g7r4-m6w7-qqqr).
- Remediated CodeQL Code Scanning Alerts: Resolved command injection vectors in release orchestration scripts, sanitized Android SafeContentResolver URI operations, hardened URL validation in updater security checks, and eliminated prototype pollution vectors in StageCanvasView.
- Closed Secret Scanning False Positives: Audited and verified all repository tokens and credentials, confirming zero open secret scanning alerts.

### Improved
- CI/CD & Release Pipeline Modernization: Updated all GitHub Actions workflows to align dynamic package manager resolution (pnpm 11.24.0), modernized runner action versions, corrected CI paths to packages/livex-core/**, and ensured release workflows dynamically target github.repository.
- CodeQL Java/Kotlin Analysis Resilience: Configured Android Gradle analysis in CodeQL to rerun compilation tasks without stale build cache interference.
- Workspace Quality Gates: Resolved all TypeScript and ESLint linting discrepancies across workspace tests and documentation validation.
