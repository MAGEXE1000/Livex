# Livex Engineering Release Guide

This document is the authoritative guide to the Livex Release Infrastructure, Release State Machine, Execution Modes, E2E Release Pipeline Simulator, Release Parity Layer, diagnostic tooling, and release workflows.

---

## Release Pipeline Parity Subsystem (`pnpm release:parity`)

The Release Parity Layer continuously verifies that the E2E Release Simulator (`pnpm release:e2e`), orchestration scripts (`release-firebase.mjs`), diagnostic checkers (`pnpm release:doctor`), and production GitHub Actions workflows (`.github/workflows/release.yml`) remain synchronized and execute the identical release stages in the identical order:

```
┌───────────────────────────────┐     ┌───────────────────────────────┐
│ PRODUCTION RELEASE WORKFLOW   │ ◄═► │ RELEASE E2E SIMULATOR         │
│ (.github/workflows/release)   │     │ (apps/studio-android/e2e)     │
└───────────────┬───────────────┘     └───────────────┬───────────────┘
                │                                     │
                └──────────────────┬──────────────────┘
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │ RELEASE PIPELINE PARITY LAYER │
                   │ (pnpm release:parity)         │
                   └───────────────────────────────┘
```

### Subsystem Commands
- `pnpm release:parity` — Compares workflow and simulator stages. Outputs `release-parity-report.md`, `release-parity-report.html`, and `release-parity-summary.json`.
- `test:release-parity` — Automated test suite for release parity verification.

---

## Subsystem Inventory

- `apps/studio-android/scripts/release/`: Canonical release utilities.
- `apps/studio-android/scripts/releaseDoctor/`: Ecosystem health checker (`pnpm release:doctor`).
- `apps/studio-android/scripts/releaseDryRun/`: Pre-publication dry run engine (`pnpm release:dry-run`).
- `apps/studio-android/scripts/releaseTimeline/`: Historical release alignment viewer (`pnpm release:timeline`).
- `apps/studio-android/scripts/releaseLint/`: Architecture linter (`pnpm release:lint`).
- `apps/studio-android/scripts/releaseAudit/`: Governance auditor (`pnpm release:audit`).
- `apps/studio-android/scripts/releaseE2E/`: E2E Release Pipeline Simulator (`pnpm release:e2e`).
- `apps/studio-android/scripts/releaseParity/`: Pipeline Parity Layer (`pnpm release:parity`).
