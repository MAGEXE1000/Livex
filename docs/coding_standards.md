# Chordex Studio — Coding Standards

This document establishes the coding rules, directory ownership guidelines, and code quality recommendations for the project.

---

## 1. Core Engineering Principles

### Root-Cause-First Resolution

- Do not apply band-aids, conditional bypasses, or quick visual overrides.
- Always isolate the underlying root cause of a defect (e.g., event listeners leaking memory, concurrent database access locks, out-of-order state updates).
- Redesign and refactor the core system if a bug reveals architectural gaps.

### Refactoring & Code Grooming

- Refactor existing functions instead of copying logic or creating parallel helpers.
- Prefer clean, descriptive naming conventions. Maintain comments and docstrings.

Source:

- `AGENTS.md`
- `packages/ui-shared/src/components/DevToolsDashboard.tsx` (e.g. centralized copy handler)

---

## 2. Code Quality & Modularity

### Modularization Guidelines (Aspirational Style Guidelines)

- **File Length Recommendation**: Developers should strive to keep code files under `1000` lines of code. If a file grows beyond this threshold, consider splitting components, helpers, or hooks into separate module directories.
  - _Note_: This is an architectural recommendation; it is not enforced by linter build scripts.
- **Component Splitting**: Do not define functional components inside rendering loops or nested helper functions. Define them at the file or module level to avoid DOM reconstruction and state loss during renders.

Source:

- `packages/ui-shared/src/components/DevToolsDashboard.tsx` (extracted AccordionSection)

### Strict Typing Rules

- **No `any`**: Explicitly declare type interfaces or aliases. Avoid using `any` unless absolutely necessary (such as wrapping external untyped JavaScript libraries).
- **Strict Null Checks**: Safely handle undefined/null states by utilizing optional chaining (`?.`) and nullish coalescing (`??`) operators.
- **Store Actions**: Decouple state mutations from components by declaring them inside store actions (e.g., in Zustand).

Source:

- `tsconfig.base.json` (strict checking enabled)

---

## 3. Platform Boundaries & Isolation

To prevent compiler leaks or runtime exceptions across different platforms:

- **Conditional API Checks**: Never import or invoke Capacitor native interfaces without running environment checks (`isNative()`).
- **Web Boundaries**: Cloudflare Pages config modifications, web landing docks, and Vite web scripts must remain in web-specific packages (`apps/studio-web` and `packages/ui-web`). They must not leak into Android packages.
- **Android Boundaries**: Native Android Gradle keys, native views, and Capacitor plugin dependencies must remain in Android packages (`apps/studio-android` and `packages/ui-android`).
- **Shared Logic**: General helpers and platform-neutral components belong in `packages/studio-core` and `packages/ui-shared`.

Source:

- `scripts/verify-bundle-separation.mjs`
- `scripts/enforce-platform-scope.mjs`

---

## 4. Hook Safety Rules

To comply with the React **Rules of Hooks**:

- Hooks (`useState`, `useRef`, `useEffect`, etc.) must only be called at the root of React functional components.
- Never call hooks inside conditional branches (`if`), loops, or nested rendering functions.
- Clean up hooks: `useEffect` blocks that establish listeners, register watchers, or spin up timers must return a cleanup function to release resource handles and avoid memory leaks.
  ```typescript
  useEffect(() => {
    const handle = registerListener();
    return () => {
      handle.remove();
    };
  }, []);
  ```

Source:

- `packages/ui-shared/src/components/DevToolsDashboard.tsx`

---

## 5. Platform-Scope & Version Control Standards

To maintain project architecture and code separation, future implementations must follow these strict operational rules:

- **Scope Isolation**: A WEB-classified task must not alter Android/APK-owned files. An APK-classified task must not alter Web-owned files.
- **Build Boundaries**: Android-only changes must not trigger Web (Cloudflare Pages) builds.
- **UI Purity**: Never copy complete Web layouts directly into Android. Never copy Android navigation elements directly into Web.
- **No Silent Expansions**: Never silently expand a task to both platforms.
- **Version Control Constraints**: Never silently bump versions. Maintain Web at `4.0.0` and Android at the latest release version.
- **Security & Credentials**: Never print, embed, or retrieve credentials, secrets, or GitHub tokens in Git URLs. Keystore files must never be committed.
- **Explicit Git Staging**: Do not run `git add .` or `git add -A`. Stage target files individually using explicit path names.
- **Testing Integrity**: Never describe untested behavior as verified. Never represent no-op tests as passing tests.
- **Fail-Closed Releases**: Never weaken production signing or metadata verification. Release flows must enforce the production signer certificate fingerprint: `900cf259185c81100cda8bb08571fa23552e9789131cf07a8f4056e4d4129206`.

Source:

- [AGENTS.md](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/AGENTS.md#L28-L39)
