# scripts/ — Build, Test & Release Tooling

> **Platform scope**: INFRASTRUCTURE

## Purpose

Build automation, testing, release pipeline, and repository health scripts. All scripts are Node.js ESM (`.mjs`) or CommonJS (`.cjs`).

## Key Scripts

### Build & Validation
| Script | Purpose |
|--------|---------|
| `verify-versions-consistency.mjs` | Multi-manifest version audit across all 9 version files |
| `verify-bundle-separation.mjs` | Ensures web bundles don't contain Android-only code |
| `enforce-platform-scope.mjs` | Validates platform file ownership boundaries |
| `enforce-import-boundaries.mjs` | Checks cross-package import rules |
| `verify-circular-deps.mjs` | Detects circular dependencies |
| `verify-all-references.mjs` | Validates documentation file references |
| `validate-documentation.mjs` | Documentation integrity checker |

### Testing
| Script | Purpose |
|--------|---------|
| `run-smoke-tests.mjs` | Repository-wide smoke test suite |
| `run-navigation-core-tests.mjs` | Navigation system unit tests |
| `run-navigation-regression-tests.mjs` | Navigation regression tests |
| `run-updater-regression-tests.mjs` | OTA updater regression tests |
| `run-startup-regression-tests.mjs` | Startup sequence regression tests |
| `run-release-smoke-test.mjs` | Pre-release smoke tests |
| `test-shared-navigation.mjs` | Shared navigation integration tests |

### Release Pipeline
| Script | Purpose |
|--------|---------|
| `publish-release.ps1` | PowerShell release publication script |
| `version-manager.mjs` | Version bump automation |
| `generate-release-manifest.mjs` | Release manifest generation |
| `generate-release-delta.mjs` | Release delta/changelog generation |
| `generate-release-health.mjs` | Post-release health report |
| `generate-slsa-provenance.mjs` | SLSA provenance generation |
| `validate-release-changelog.mjs` | Changelog format validation |
| `release-audit-logger.mjs` | Release audit logging |
| `verify-release-signatures.mjs` | Release signature verification |

### Code Quality
| Script | Purpose |
|--------|---------|
| `dead-code-report.mjs` | Dead code detection |
| `large-file-report.mjs` | Oversized file identification |
| `repository-health.mjs` | Repository health metrics |
| `context-map-generator.mjs` | AI context map generation |

### Utilities
| Script | Purpose |
|--------|---------|
| `clean-packages.mjs` | Clean build artifacts |
| `sync-dependencies.mjs` | Dependency synchronization |
| `create-symlinks.mjs` | Workspace symlink creation |

## Running Scripts

```bash
# Most scripts are run via pnpm workspace commands:
pnpm scope:check                              # enforce-platform-scope.mjs
pnpm test:android                             # smoke + regression suite
node scripts/verify-versions-consistency.mjs  # Direct execution
node scripts/verify-bundle-separation.mjs     # Direct execution
```
