# Permanent Livex Platform-Scope Policy & Instructions

This document is the authoritative platform-scope policy for all developers and AI agents working on Livex. Every task must be classified and validated before making any source code modifications.

---

## Agent skills

### Issue tracker

Tracked using GitHub Issues via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical triage vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-package monorepo context layout. See `docs/agents/domain.md`.

---

## 1. Task Classification System

Every task must be classified into one of the following platform scopes:

- **WEB**: Refers to the responsive browser-based application (for desktop, mobile, and tablet browsers). Deployed via Netlify.
- **APK**: Refers to the native installed Android application built via Capacitor and Gradle.
- **SHARED**: platform-neutral logic, sync backend engines, and common visual primitives.
- **INFRASTRUCTURE**: GitHub Actions pipelines, Netlify configuration, Firebase Hosting config, workspace package configuration.
- **DOCUMENTATION**: Manuals, changelogs, architecture diagrams, agent run instructions.
- **RELEASE**: Version bumps, production APK signing, final artifact publishing.

### Ambiguity Interpretation Rules

- **"Web"** strictly means the responsive browser app.
- **"APK"**, **"Android"**, **"móvil"**, **"app de teléfono"**, or **"aplicación instalada"** strictly means the Android native application.
- **"Mobile"** without explicit "Web" or "browser" context defaults to **APK**.
- **SHARED** is only allowed if genuinely platform-neutral or explicitly requested for both targets by the user.
- If a request is genuinely ambiguous, ask the user only:
  > “¿Este cambio es para WEB móvil en navegador o para la APK de Android?”

---

## 2. Permanent Rules

- **Scope Isolation**: A WEB task must not alter Android/APK-owned files unless strictly necessary and documented. An APK task must not alter Web-owned files unless strictly necessary and documented.
- **Build Boundaries**: Android-only changes must not intentionally trigger Netlify builds.
- **UI Purity**: Never copy complete Web layouts directly into Android. Never copy Android navigation (like BottomNav) directly into Web.
- **No Silent Expansions**: Never silently expand a task to both platforms.
- **Version Control**: Never silently bump versions. Maintain Web at `4.0.0` and Android at the latest release version (e.g. `3.7.8`, `versionCode 135`).
- **Security & Tokens**: Never retrieve, print, or embed credentials, secrets, or GitHub tokens in Git URLs. Never commit keystore files.
- **Fail-Closed Release Validation**: Never weaken production signing or metadata verification. Production release flows must enforce exactly the expected signer certificate fingerprint: `900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206`.
- **Testing Integrity**: Never describe untested behavior as verified. Never describe no-op tests as passing tests.
- **No git add .**: Stage explicit file paths only.

---

## 3. Platform File Ownership Map

- **WEB**:
  - `apps/studio-web/**`
  - `packages/ui-web/**`
- **APK**:
  - `apps/studio-android/**`
  - `packages/ui-android/**`
- **SHARED**:
  - `packages/studio-core/**`
  - `packages/ui-shared/**`

---

## 4. Scope Validation Checks

Validate your changes using the workspace scope validator:

```bash
pnpm scope:check --platform web
pnpm scope:check --platform apk
pnpm scope:check --platform shared
```

---

## 5. Detailed Operations & Reference Manuals

### A. OTA Update Banner System & Dev Testing

- **Trigger**: The application checks `public/version.json` on boot. An in-app update banner morphs (width/height/border-radius transition) into a small pulsing pill after ~6 seconds (or on user minimize). Tapping it launches the update modal.
- **Single Source of Truth**: The coordinate constant `APP_VERSION` in `packages/studio-core/src/lib/appVersion.ts` is the single source of truth.
- **Dev Banner Testing Override**: The `predev` workspace hook runs version synchronization with the `--preserve-newer` flag. This allows developers to manually edit `public/version.json` to a higher version (e.g. `3.0.1`) and add a custom changelog mock to demo banner morphs and animation behavior locally without the file being overwritten on package restarts.
- **Production Builds**: The `prebuild` hook deliberately omits `--preserve-newer`, overwriting `public/version.json` to prevent local overrides from entering production release tracks.

### B. Android APK Native Updater & Release Procedure

- **Architecture**: The updater is modularized under `packages/studio-core/src/lib/updater/` with dedicated modules for `stateMachine`, `releaseMetadata`, `versionComparison`, `downloadManager`, `integrityVerification`, `eligibilityVerification`, `installer`, `recovery`, `diagnostics`, and `versionManager`.
- **State Machine**: A single authoritative state machine manages transitions with strict validation guards and watchdog timeouts for transient states (`checking`, `downloading`, `verifying`).
- **Check Priority**: Manual update checks always take priority and automatically obsolete active background checks using a `latestCheckId` sequence, discarding background results to prevent deadlock.
- **OTA Base URL Config**: The APK build requires `VITE_OTA_BASE_URL` baked into the bundle pointing to the Firebase public tracking endpoint (e.g. `https://studio-30f44.web.app`). If empty, `versionJsonUrl()` fails closed and logs a Native Updater configuration error, disabling background update polling.
- **APK Release Flow**:
  1. Bump the coordinates `APP_VERSION` in `packages/studio-core/src/lib/appVersion.ts`.
  2. Build and sign the production APK, upload it to Firebase Hosting and GitHub Releases, and update the `version.json` and `app-release.json` metadata manifests on Firebase.

### C. Cloud Sync Engine Queue Architecture

- **State Machine Rules**: Sync phases cycle strictly through: `'idle' | 'syncing' | 'success' | 'error'`.
- **Lock Management**: Callers hook into `enqueueRun(reason, mode)`. This locks an in-flight `runPromise` wrapper. Concurrent sync triggers share the same in-flight execution promise, with a max queue depth of 1 pending followup run.
- **Isolation boundaries**: Sub-app sync payloads execute concurrently via `Promise.allSettled()`. Each Firestore operation has a 6-second timeout, with an overall run limit of 10 seconds capped by an `AbortController`.
- **Auth Swapping**: An `epoch` atomic counter is incremented on every `attachSyncEngine` / `detachSyncEngine` auth boundaries. This causes in-flight runs to discard write promises on mismatch, preventing cross-UID contamination on sign-out/sign-in swaps.

---

## 6. Livex Engineering Protocol v1.0 (Permanent Project Rule)

### Core Principle

Stability is more important than feature velocity. A feature is not considered complete when it compiles; it is only complete when:

- It works.
- Existing functionality still works.
- Platform boundaries remain intact.
- Release validation passes.
- Regressions are ruled out.
  Never trade reliability for speed.

### Change Classification

Before modifying code, classify the change into one of the following categories:

- **Category A**: Android-only
- **Category B**: Web-only
- **Category C**: Shared cross-platform
- **Category D**: Infrastructure / CI / Build pipeline
  Every task must explicitly identify its category before implementation. Do not modify unrelated categories.

### Platform Isolation Rule

Never assume a Web implementation can be copied directly into Android. When adapting Web functionality to Android, you must adapt:

1. Web-specific dependencies
2. Android-specific constraints
3. Layout
4. Safe areas
5. Viewport behavior
6. Gestures & touch interactions
7. Keyboard behavior & safe areas
8. Navigation & back button behavior
9. Performance characteristics
   Android must feel native. Never force a desktop-oriented implementation into Android unchanged.

### No Blind Reuse Rule

Before reusing code, check if it depends on: mouse events, hover states, desktop viewport assumptions, browser-only APIs, iframe assumptions, keyboard shortcuts, or Web-only routing. If so, adapt it before integrating.

### Regression Prevention Protocol

Before changing any module, create a short impact map of:

- Affected files
- Affected modules
- Affected platform(s)
  Verify these assumptions after implementation.

### No Collateral Damage Rule

Do not modify working systems unless absolutely required. If fixing one component (e.g. Stagex), do not casually modify unrelated components (e.g. Chordex, Drumex, Hub, Update system, Sync system, Themes, Authentication). Every unrelated modification requires justification.

### Implementation Pipeline

1. Understand existing architecture.
2. Identify platform boundaries.
3. Implement minimal required changes.
4. Run targeted validation.
5. Run regression validation.
6. Prepare release candidate.

### Android Adaptation Checklist

Verify: touch interactions, pointer events, gestures, back button, swipe-back, safe areas, notch handling, keyboard behavior, scrolling, orientation changes, and performance.

### UI Wiring Protocol

For every visible control, verify: UI element → handler → action → state update → visible result. Do not mark a control functional merely because it renders, compiles, or a handler exists. Trace the full chain.

### Stagex Rule

Any redesign of Stagex must preserve: add button, save, export, setup, preferences, stage editor, element selection, element movement, element editing, and navigation. Visual redesigns must never disconnect functionality; functionality always wins.

### Performance Rule

Reduce: unnecessary rerenders, duplicate listeners, duplicate polling, duplicate effects, hidden background work, and excessive logging. Measure actual impact instead of optimization theater.

### Loop Prevention Rule

Do not repeatedly reopen identical files, rerun identical searches, reread unchanged plans, or regenerate identical reports. Checkpoint conclusions and move on.

### Release Gate

Before any publication, verify: version alignment, package ID, signing certificate, APK integrity, release manifest, update eligibility, and platform separation. If any check fails, STOP. Do not publish.

### Post-Implementation Review

Every completed task must answer:

1. What changed?
2. Why was it necessary?
3. Which platforms were affected?
4. What regressions were checked?
5. What remains risky?

---

### Architecture Index Rule

**`ARCHITECTURE_INDEX.md` is the primary source of project structure.**

Before reading any implementation file, consult `ARCHITECTURE_INDEX.md` first. It documents every module's purpose, main files, imports, exports, dependencies, consumers, and known technical debt.

Rules:

- Use `ARCHITECTURE_INDEX.md` to locate the relevant files for any task before opening them.
- Only open implementation files that are **directly required** for the requested task — do not speculatively explore unrelated modules.
- **Never re-index the repository** (i.e., do not re-survey directory trees or re-read all source files to rebuild structural understanding) unless the user explicitly requests it.
- If `ARCHITECTURE_INDEX.md` is stale or missing an entry for a module you need, read only that module's files, then update the index entry before proceeding.

---

### Direct-Fix-First Rule

When diagnosing an error, **attempt the simplest direct fix first**.

- Do not investigate build systems, tsconfig internals, package.json exports, caches, or TypeScript resolution mechanics before trying the obvious fix.
- Use short **verify → fix → verify** loops. One hypothesis, one attempt, one check.
- Escalate to deeper investigation only when the direct fix has been tried and failed.
- Avoid multi-step hypothesis chains that delay the actual fix.

---

### External References & Library Setup Rule

Before using any third-party library or external reference (e.g. Framer Motion, Backdrop Filters, Canvas, Web APIs), verify:

1. Compatibility: Ensure full support on Android WebView (specifically rendering performance under hardware acceleration).
2. Optimization: Implement automatic scaling/fallback modes for low-performance environments (e.g. reducing blur layers or disabling high-cost animations when `studio_performance_mode === 'low'`).
3. Single Source: Register any shared index/registry entries or global UI configurations in central modules (like `searchIndex` or `StudioDesignSystem`) rather than local component files to prevent structural drift.

---

## 6. Engineering Workflow & Production-Quality Development Rules

The following rules govern the development workflow and implementation of all features and updates:

### A. Spec-Driven Development

- Never begin implementation immediately.
- Translate the feature request into a complete technical specification and break it into independent implementation phases in `implementation_plan.md` before coding.
- Specify: objective, scope, affected systems, expected outcome, and validation criteria for each phase.

### B. User Story Validation

- Simulate the complete user journey from the user's perspective before writing code.
- Define entry point, initial state, user actions, feedback, visual changes, data changes, next steps, failure handling, and exit conditions.

### C. Small Checkpoints & Audits

- Divide implementation into logical, compilable, independently testable checkpoints.
- Perform a self-audit after each checkpoint: review architecture quality, DRY compliance, performance, complexity, and design consistency.

### D. Root-Cause-First & Lessons Learned

- Isolate and fix the root cause instead of stacking workarounds.
- Document lessons learned (root cause, failed attempts, successful solution, architectural lessons) in `knowledge/lessons_learned.md`.

### E. Production Principles & Telemetry

- Adhere to SOLID, DRY, KISS, and Clean Architecture principles.
- Evaluate performance (renders, listeners, layout, memory) and optimize before completion.
- Conduct a final Product Owner review: "Would I approve this to ship to millions of users tomorrow?"

### F. Bug Knowledge Base

- Permanent bug documentation lives in [`docs/bugs/`](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/bugs/README.md).
- **Before investigating any bug**, check existing bug documents first. Do not repeat failed solutions.
- Every significant bug gets its own document following the standard [TEMPLATE.md](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/bugs/TEMPLATE.md).
- When a bug is resolved, update its document immediately alongside the code fix.
- This knowledge base is permanent and must survive between chats, releases, and contributors.

### G. Architecture Documentation

- Permanent architecture documentation lives in [`docs/architecture/`](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/architecture/README.md).
- **Before implementing any major feature**, read the relevant architecture documents first. Do not rediscover the architecture from scratch.
- When architecture changes, update the documentation immediately alongside the code.
- If documentation conflicts with implementation, identify the inconsistency and update whichever is incorrect.
- This documentation is permanent and must always represent the current codebase.

### H. Global Engineering Workflow

- The mandatory 12-step engineering workflow is defined in [`docs/workflows/global-engineering-workflow.md`](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/workflows/global-engineering-workflow.md).
- **Every task must follow this workflow. No steps may be skipped.**
- The steps are: (1) Understand, (2) Read Docs, (3) Investigate, (4) Shared-First, (5) Root Cause, (6) Small Phases, (7) Self Audit, (8) Performance Review, (9) Update Memory, (10) Product Owner Review, (11) Validate, (12) Complete.

### I. Architectural Invariant

- The shared-first development rule is defined in [`docs/workflows/architectural-invariant.md`](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/workflows/architectural-invariant.md).
- **One implementation. Multiple consumers. Never the opposite.**
- Before implementing any feature, check the Shared Systems Registry to determine if it belongs to a shared system.
- Any implementation that duplicates existing shared behavior is an architectural defect.

### J. Architectural Decisions

- Architectural Decision Records (ADRs) live in [`docs/decisions/`](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/decisions/README.md).
- Every significant architectural choice must be recorded as a numbered ADR.
- ADRs are permanent — never delete or overwrite them. Superseded decisions are referenced by their replacement.

### K. Android Preview Before Release Workflow

- Every code change targeting Android must be tested and manually approved via the Preview Workflow **BEFORE** running any version bump or triggering the production Release Pipeline.
- **Preview Command**: `pnpm preview:android` (runs `apps/studio-android/scripts/preview-android.mjs`).
- **Target Runtime**: Native Android Capacitor shell (`apps/studio-android/android` via Gradle `assembleDebug`).
- **Output Artifact**: `dist/android-preview.apk` (and ADB auto-install if a physical phone is connected via USB/ADB).
- **Rules**:
  1. Never validate Android changes using standalone web build.
  2. Never bump version, create git release tags, or push to production prior to manual preview testing.
  3. Never modify OTA metadata, update channels, or release pipelines during preview generation.
