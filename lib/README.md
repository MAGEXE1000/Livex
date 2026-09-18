# lib/ — Standalone Libraries

> **Platform scope**: None (framework-agnostic)  
> **Consumers**: Tooling, back-end scripts, code generation

## Purpose

Standalone TypeScript packages used by tooling or back-end scripts. These packages have **no workspace dependencies** — they never import from `packages/*` or `apps/*`.

## Packages

All former prototype libraries (`api-spec`, `api-zod`, `api-client-react`, `db`) have been permanently decommissioned.
Production code uses canonical client architectures:
- `@workspace/studio-core/lib/services/supabaseClient` for Supabase PostgREST, Realtime, and Storage.
- `@workspace/studio-core/lib/services/firebase` for Firebase Auth and Firestore stage collaboration.
