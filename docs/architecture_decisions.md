# Chordex Studio — Architectural Decision Records (ADR)

This document records the design decisions, alternatives, chosen solutions, and risk profiles in the project.

---

## ADR 001: Monorepo Orchestration with PNPM Workspaces

- **Date**: 2026-03-15
- **Problem**: Staging, versioning, and deploying separate repositories for the Android app, Web app, and core shared packages led to dependency mismatches and version-bumping overhead.
- **Context**: The app shares 80% of its business logic (audio tuners, chords catalogs, state machines, updater rules) across platforms, but relies on platform-exclusive rendering envelopes (Cloudflare Pages Web SPA vs Android Capacitor viewports).
- **Alternatives Considered**:
  - _Option A_: Maintain multi-repository layouts and sync via npm packages. (High maintenance, delay in developer cycles).
  - _Option B_: Merge everything into a single folder without module separation. (Poor compilation boundaries, dependency leaks).
- **Chosen Solution**: PNPM workspaces monorepo architecture.
- **Reasoning**: PNPM provides symlinked directory dependencies, ensuring instant local package updates without registry publish steps, while enforcing strict lockfiles.
- **Files Affected**: `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`.
- **Expected Impact**: Faster local builds, guaranteed version consistency.

Source:

- `pnpm-workspace.yaml`

---

## ADR 002: Decoupled Logic using Zustand State Stores

- **Date**: 2026-04-10
- **Problem**: Propagating state updates between audio recording takes, tuner waves, sequencer clicks, and settings panels led to rendering bottlenecks and spaghetti-code props drilling.
- **Context**: Redux introduces heavy setup boilerplate, while standard React Context forces entire page trees to re-render.
- **Alternatives Considered**:
  - _Option A_: React Context providers. (Low performance, causes layout stutter).
  - _Option B_: Redux Toolkit. (Excessive boilerplate).
- **Chosen Solution**: Zustand state managers.
- **Reasoning**: Zustand provides clean, hooks-first state declarations with subscriber selector selectors. Components only re-render if their selected state elements mutate.
- **Files Affected**: `packages/studio-core/src/store/`.
- **Expected Impact**: Improved CPU frames, modular stores.

Source:

- `packages/studio-core/src/store/useChordStore.ts`
- `packages/studio-core/src/store/useDrumStore.ts`

---

## ADR 003: Native PackageInstaller Bridge for In-App Updates

- **Date**: 2026-06-15
- **Problem**: Triggering updates via standard Android intent launches (`Intent.ACTION_VIEW`) caused APK files to leak, lacked integrity checks, and did not provide progress callbacks.
- **Context**: The client needs to track install successes or signature incompatibilities gracefully in-app.
- **Alternatives Considered**:
  - _Option A_: Trigger system file viewer intents. (Blind execution, high fail rate).
  - _Option B_: Integrate the official Google Play In-App Updates SDK. (Requires distribution exclusively through Google Play, blocking sideloads).
- **Chosen Solution**: Native Java `PackageInstaller` Session Bridge.
- **Reasoning**: Empowers the application to stream APK files directly to the Android OS installation daemon, receiving transactional state events (storage full, signature conflict, install success) natively.
- **Files Affected**: `packages/studio-core/src/lib/capgoUpdater.ts`, `apps/studio-android/android/app/src/main/java/com/chordex/app/AppInstallerPlugin.java`.
- **Expected Impact**: 100% reliable updater callbacks, sandboxed installation progress updates.

Source:

- `apps/studio-android/android/app/src/main/java/com/chordex/app/AppInstallerPlugin.java`
- `packages/studio-core/src/lib/updater/installer.ts`

---

## ADR 004: Extraction of Nested Declarations & Hooks in UI Components

- **Date**: 2026-07-01
- **Problem**: Defining UI helpers (such as `AccordionSection`) and hooks (`useState`, `useRef`, `useEffect`) inside conditional helper render methods caused state resets, DOM thrashing, and violated React Hook Compilation Rules.
- **Context**: The devtools dashboard rendered parts conditionally, leading to unexpected hook call orders on tab changes.
- **Alternatives Considered**:
  - _Option A_: Retain nested components and bypass warnings using custom ESLint ignore configurations. (Risks app crashes during runtime transitions).
  - _Option B_: Relocate components and hooks to module/file-level scopes. (Standard best-practice React architecture).
- **Chosen Solution**: Module-level component extraction and component-level hook declarations.
- **Reasoning**: Ensures all hooks execute in a consistent, static order on every render cycle, and prevents child components from rebuilding their DOM node tree during parent state changes.
- **Files Affected**: `packages/ui-shared/src/components/DevToolsDashboard.tsx`.
- **Expected Impact**: Zero React lifecycle compiler warnings, resolved input focus loss.

Source:

- `packages/ui-shared/src/components/DevToolsDashboard.tsx`
