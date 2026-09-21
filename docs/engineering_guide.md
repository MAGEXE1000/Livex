# Chordex Studio — Master Engineering Guide

This document serves as the master engineering guide and single source of truth for the Chordex Studio monorepo. Every developer, architect, and agent must read and reference this guide first.

---

## 1. Project Vision & Goals

Chordex Studio is a high-performance, cross-platform audio station, chords practice suite, interactive sequencer, and vocal tuning workshop.

### Key Objectives

- **Unified Core Logic**: Leverage a shared core package (`@workspace/livex-core`) across both web and native Android builds to guarantee consistency in business rules, local storage caching, and state machine behaviors.
- **Low-Latency Audio Engine**: Deliver real-time audio playback, tuning, and sequencing capabilities natively on Android and in HTML5 browser environments.
- **Resilient Offline-First Sync**: Sync user configurations, practice sessions, and custom song databases seamlessly to Firestore or Supabase Realtime synchronization backends.
- **Robust OTA Updates**: Deploy bug fixes, performance upgrades, and assets dynamically via a secure native OTA (Over-the-Air) updater engine.

---

## 2. Monorepo Repository Structure

The monorepo uses `pnpm` workspaces for dependency orchestration.

```
studio/
├── apps/
│   ├── studio-android/       # Capacitor + React + Vite Android client
│   └── studio-web/           # React + Vite desktop web deployment
├── packages/
│   ├── studio-core/          # Core state stores, OTA engines, local storage interfaces, services
│   ├── ui-shared/            # Platform-neutral Material 3 UI component library
│   ├── ui-android/           # Touchsafe adapters, back gesture handlers, safe areas
│   └── ui-web/               # Desktop workspace docks and web views
├── lib/
│   ├── api-client-react/     # API Client hooks for frontend integration
│   ├── api-spec/             # JSON API Specifications and endpoints
│   ├── api-zod/              # Zod schemas for API request validation
│   └── db/                   # Database clients and schema definitions
├── docs/                     # Production engineering specifications & documentation
├── scripts/                  # Version manager, sync, and release automation scripts
├── supabase/                 # Supabase configuration, schema migrations, and edge functions
├── firebase-public/          # Web deployment assets targeted by Firebase Hosting
├── firebase-public-android/  # Android web asset bundles targeted by Firebase Hosting
├── package.json              # Workspace manifest
└── pnpm-workspace.yaml       # Workspace definition
```

Source:

- `pnpm-workspace.yaml`

---

## 3. Technology Stack & Applications

| Layer              | Technology              | Version / Notes                                                           |
| ------------------ | ----------------------- | ------------------------------------------------------------------------- |
| **PackageManager** | `pnpm`                  | Workspace mapping, lockfile enforcement                                   |
| **Language**       | `TypeScript`            | Standard configuration, strict type checking                              |
| **Framework**      | `React`                 | Hooks-first functional component architecture                             |
| **Build Engine**   | `Vite` + `ESBuild`      | Low-overhead bundler, fast dev reloading                                  |
| **Native Bridge**  | `Capacitor`             | Core app plugins, native android views                                    |
| **State Store**    | `Zustand`               | Lightweight decoupled hooks and actions (`useChordStore`, `useDrumStore`) |
| **Offline Sync**   | `Firebase` / `Supabase` | Auth, sync engine (Supabase Realtime configured as default provider)      |
| **Styling**        | `CSS` / `Tailwind`      | Inline utility styles, Material 3 layouts, safe-area adaptation           |

Source:

- `package.json`
- `pnpm-workspace.yaml`
- `packages/studio-core/src/store/`

---

## 4. Platform Separation & Boundaries

To prevent compilation leaks, the monorepo strictly separates platform-specific dependencies. Detailed layout boundaries, dependencies, and environment separation checks are defined in the central coding standards guide.

Source:

- [coding_standards.md](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/coding_standards.md#L44-L56)
- [platform-separation.md](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/architecture/platform-separation.md)

---

## 5. Dependency Graph

```mermaid
graph TD
    AndroidApp[apps/studio-android] -->|Depends on| UIAndroid[packages/ui-android]
    AndroidApp -->|Depends on| UIShared[packages/ui-shared]
    AndroidApp -->|Depends on| Core[packages/studio-core]

    WebApp[apps/studio-web] -->|Depends on| UIWeb[packages/ui-web]
    WebApp -->|Depends on| UIShared[packages/ui-shared]
    WebApp -->|Depends on| Core[packages/studio-core]

    UIAndroid -->|Depends on| UIShared
    UIWeb -->|Depends on| UIShared
    UIShared -->|Depends on| Core
    UIShared -->|Depends on| DBCli[lib/db]
    UIShared -->|Depends on| APIReact[lib/api-client-react]
```

Source:

- `apps/studio-android/package.json`
- `apps/studio-web/package.json`
- `packages/ui-shared/package.json`
- `packages/ui-android/package.json`
- `packages/ui-web/package.json`

---

## 6. Mandatory Workflow Integration

This repository integrates documentation directly into the development cycle. Adhering to the following workflow components is mandatory:

- **Onboarding & Contribution**: Refer to [contributing.md](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/contributing.md) for onboarding procedures.
- **AI Protocols**: Refer to [ai_workflow.md](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/ai_workflow.md) for mandatory checklist prompts and validation steps.
- **Standard Checklists**: Refer to for reusable testing, release, and code review lists.
- **Doc Validation**: Refer to [documentation_validation.md](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/documentation_validation.md) to verify that links, references, and configurations remain synced on changes.
- **Automation Tooling**: The repository includes validation and health reporting automation scripts:
  - **Document Linter**: Run `pnpm docs:validate` (runs [validate-documentation.mjs](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/scripts/validate-documentation.mjs))
  - **Session Brief Generator**: Run `node scripts/generate-session-summary.mjs` (runs [generate-session-summary.mjs](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/scripts/generate-session-summary.mjs))
  - **Health Audit**: Run `node scripts/repository-health.mjs` to generate
  - **Context Map Generator**: Run `node scripts/context-map-generator.mjs` to generate [context_map.md](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/context_map.md)
  - **Large File Analysis**: Run `node scripts/large-file-report.mjs` to generate
  - **Dead Code Detector**: Run `node scripts/dead-code-report.mjs` to generate

Source:

- `docs/contributing.md`
- `docs/ai_workflow.md`
- `docs/documentation_validation.md`
- `scripts/`

---

## 7. Definition of Done (DoD)

An implementation is considered complete only when it meets the following criteria:

- [ ] **Compilation**: App builds successfully without warnings in all target packages (`pnpm build`).
- [ ] **Type Safety**: All TypeScript checks pass with zero compile issues (`pnpm run typecheck:libs`).
- [ ] **No regressions**: Previous client behaviors, logins, databases, and audio engines remain fully functional.
- [ ] **UI Adaptation**: Layouts are fully responsive on small screens (down to 360dp) and respect mobile safe area status bars and bottom navigation heights.
- [ ] **Touch Safety**: All interactive targets are easy to tap and do not suffer from scrolling touch-interception bugs.
- [ ] **Platform Isolation**: Web modifications are not loaded in the native WebView, and native interfaces handle fallback scenarios elegantly on web configurations.
- [ ] **Documentation**: Any system behavior changes are recorded in the engineering docs.

---

## 8. Index of Reference Guides

Refer to these targeted subsystem and architecture guides for implementation details:

- **Platform Guides**:
  - [Android Platform Guide](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/android.md)
  - [Web Platform Guide](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/web.md)
- **Backend & Gating**:
  - [Firebase Services Guide](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/firebase.md)
  - [Supabase Synchronization Guide](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/supabase.md)
  - [Permissions & Feature Gating Guide](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/permissions.md)
  - [Authentication Architecture Guide](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/auth.md)
- **Standards & Telemetry**:
  - [Coding Standards Guide](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/coding_standards.md)
  - [Design System Guide](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/design_system.md)
  - [Performance Optimization Guide](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/performance.md)
  - [Debugging & Diagnostics Guide](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/debugging.md)
  -
  - [Release Process Guide](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/release_process.md)
  - [Architectural Decision Records (ADR)](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/architecture_decisions.md)
  - [Report Templates Guide](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/report_templates.md)
- **Reference Maps**:
  - [AI Context Map](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/ai-context-map.md)
  - [Project Structure Map](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/project-structure.md)
  - [Codebase Size & Context Report](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/codebase-size-report.md)
  -
  - [Known Issues Log](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/known_issues.md)
  - [Environment Setup Guide](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/environment_setup.md)
  - [Legacy Migration Inventory](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/architecture/migration_map.md)
  -
  -
  -
  - [Generated Context Minimization Map](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/context_map.md)
  -
  -
  - [Legacy Backups Inventory](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/backups/v3.6.81-stable-before-cleanup.md)
- **Knowledge Repository**:
  - [Android Gradle Guide](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/knowledge/android/gradle.md)
  - [Android Capacitor Guide](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/knowledge/android/capacitor.md)
  - [Android Build Commands](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/knowledge/android/build.md)
  - [Android PackageInstaller Integration](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/knowledge/android/packageinstaller.md)
  - [Android Permissions Configuration](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/knowledge/android/permissions.md)
  - [Android Screen Plugins](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/knowledge/android/plugins.md)
  - [Android safe-area Layouts](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/knowledge/android/safe-area.md)
  - [Firebase Client settings](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/knowledge/firebase/client.md)
  - [Firebase Security rules](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/knowledge/firebase/security.md)
  - [React Hooks Standards](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/knowledge/react/hooks.md)
  - [React Component Splitting](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/knowledge/react/components.md)
  -
  -
  - [Multitrack Audio Caching](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/knowledge/performance/audio.md)
  - [Selective Rendering Performance](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/knowledge/performance/rendering.md)
  - [Monorepo Package boundaries](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/knowledge/architecture/monorepo.md)
  - [Modular Import boundaries](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/knowledge/architecture/imports.md)
  - [Remote WebView debugging](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/knowledge/debugging/webview.md)
  - [Diagnostics UI overlays](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/knowledge/debugging/diagnostics-ui.md)
  - [Updater Verification pipeline](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/knowledge/updater/packageinstaller.md)
  - [Updater Key signing constants](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/knowledge/updater/keystore.md)
  - [Lessons Learned Database](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/knowledge/lessons_learned.md)

Source:

- `docs/`
