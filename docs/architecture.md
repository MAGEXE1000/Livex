# Chordex Studio — Architectural Specification

This document provides a detailed overview of the system architecture, component layout, data communication models, and folder structures.

---

## 1. Modular Subsystem Overview

Chordex Studio is composed of five active functional subsystems built on a shared platform architecture.

```
                  ┌─────────────────────────────────────────┐
                  │          Studio Hub (Dashboard)         │
                  └────────────────────┬────────────────────┘
                                       │
         ┌───────────────┬─────────────┼──────────────┬──────────────┐
         ▼               ▼             ▼              ▼              ▼
    ┌──────────┐   ┌───────────┐   ┌──────────┐   ┌──────────┐   ┌───────────┐
    │ Chordex  │   │  Stagex   │   │  Drumex  │   │ Groovex  │   │  Vocalex  │
    └──────────┘   └───────────┘   └──────────┘   └──────────┘   └───────────┘
```

### Subsystems

- **Studio Hub**: The user landing screen and settings manager. Orchestrates active panels, account sync statuses, and developer debugging subviews.
- **Chordex**: The song discovery catalog and chords practice dashboard. Integrates real-time chord detection overlays and sheet renderers.
- **Stagex**: An interactive layout stage utilizing iframe wrappers to run sandboxed canvas widgets, communicating via cross-document messaging.
- **Drumex**: A 16-step grid drum sequencer and drum pads editor backed by a high-performance web audio sampler.
- **Groovex**: An interactive backing track generator with dynamic tempo and instrumentation controls.
- **Vocalex**: A vocal tuning sandbox incorporating microphone frequency analyzer waves and multi-track recording takes.

Source:

- `packages/ui-shared/src/components/StudioHub.tsx`
- `packages/ui-shared/src/panels/`
- `packages/ui-shared/src/vocalex/`
- `packages/ui-shared/src/groovex/`

---

## 2. Package Topology & Responsibilities

The codebase divides responsibilities across shared modules, library workspaces, and platform packages:

```
                          ┌─────────────────────────┐
                          │    @workspace/studio    │
                          │     (Root Monorepo)     │
                          └────────────┬────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
       ┌───────────────────┐                         ┌───────────────────┐
       │   studio-android  │                         │     studio-web    │
       │    (Android App)  │                         │     (Web App)     │
       └────────┬──────────┘                         └────────┬──────────┘
                │                                             │
                ├──────────────────────┐       ┌──────────────┤
                ▼                      ▼       ▼              ▼
       ┌───────────────────┐         ┌───────────┐         ┌───────────────────┐
       │     ui-android    │         │ ui-shared │         │       ui-web      │
       │   (Android UI)    │         │ (Shared)  │         │      (Web UI)     │
       └───────────────────┘         └─────┬─────┘         └───────────────────┘
                                           │
                                           ├──────────────────────┐
                                           ▼                      ▼
                                     ┌───────────┐          ┌───────────┐
                                     │studio-core│          │   lib/*   │
                                     │  (Core)   │          │ (Drizzle/ │
                                     └───────────┘          │Zod/API/DB)│
                                                            └───────────┘
```

### Packages

- **`apps/studio-android`**: Android build workspace running under Capacitor. Wraps compiled assets into the native app package shell.
- **`apps/studio-web`**: Web target build directory, deployed to Cloudflare Pages.
- **`packages/studio-core`**: Core business logic. Contains audio samplers (`drumAudio.ts`), synchronization logic (`syncEngine.ts`), state stores (`store/`), updates lifecycle hooks, and translation keys.
- **`packages/ui-shared`**: Common component library containing layout wrappers, practice sheets, and panels.
- **`packages/ui-android`**: Android components implementing Capacitor interfaces, back gestures, and system bar spacings.
- **`packages/ui-web`**: Web-only landing panels and desktop utilities.
- **`lib/db`**: Decoupled Drizzle ORM client, schemas, and configurations.
- **`lib/api-spec`**: API specification registry.
- **`lib/api-zod`**: Zod verification structures.
- **`lib/api-client-react`**: React bindings for API calls.

Source:

- `pnpm-workspace.yaml`
- `packages/`

---

## 3. Communication & Data Flows

### Module Communication: Stagex IFrame Bridge

Stagex executes sandbox scripts in a separate document context to prevent execution blockages on the main React thread. Communication is managed via postMessage:

```
┌────────────────────────────────┐            ┌────────────────────────────────┐
│      Main React Application    │            │     Stagex Sandboxed IFrame    │
│  (packages/ui-android/Stage)   │            │        (public/stage-core)     │
├────────────────────────────────┤            ├────────────────────────────────┤
│                                │            │                                │
│  postMessage({ cmd: 'play' }) ─┼───────────>│  window.addEventListener       │
│                                │            │    ('message', handler)        │
│                                │            │                                │
│  onMessage(ackPayload) <───────┼────────────┼─ postMessage({ status: 'ack' })│
│                                │            │                                │
└────────────────────────────────┘            └────────────────────────────────┘
```

Source:

- `apps/studio-android/public/stage-core/app.js`
- `packages/ui-android/src/components/StageCorePanel.tsx`
- `packages/ui-shared/src/components/StageCorePanel.tsx`

### State Storage & State Flow

System configurations and parameters use Zustand stores. Active stores are:

- **`useChordStore`**: Core states for songs catalog, selected tabs, layout preferences, and active subview tags.
- **`useDrumStore`**: Drum sequencer parameters, track channels, instruments sound maps, step selections, and BPM values.

Source:

- `packages/studio-core/src/store/useChordStore.ts`
- `packages/studio-core/src/store/useDrumStore.ts`

### Offline Synchronization Flow

The offline database synchronization flow relies on Drizzle schema engines, queue listeners, and Supabase / Firestore backend endpoints.

```
┌───────────┐         ┌──────────────┐         ┌─────────────────────────┐
│ React UI  │────────>│ Zustand Store│────────>│      Local Cache        │
│ Mutations │         │    Actions   │         │ (LocalStorage/Prefs/DB) │
└───────────┘         └──────┬───────┘         └────────────┬────────────┘
                             │                              │
                             ▼                              ▼
                      ┌──────────────┐         ┌─────────────────────────┐
                      │ Sync Engine  ├────────>│        Cloud DB         │
                      │ Queue Handler│         │  (Supabase/Firestore)   │
                      └──────────────┘         └─────────────────────────┘
```

Source:

- `packages/studio-core/src/lib/syncEngine.ts`
- `packages/studio-core/src/lib/sync.ts`
- `packages/studio-core/src/lib/auth.ts`
