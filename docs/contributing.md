# Chordex Studio — Contributing & Development Guide

This document describes onboarding protocols, development workflows, and testing/commit standards for all developers and AI agents.

---

## 1. Onboarding & Reading Order

Before making any changes to this repository, you must read the documentation in the following sequence:

1.  **[engineering_guide.md](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/engineering_guide.md)**: Master outline of repository folders, dependencies, and application visions.
2.  **[ai_workflow.md](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/ai_workflow.md)**: Mandatory rules, checklists, and model roles definitions.
3.  ****: Standard checklist library for feature additions, refactoring, and releases.
4.  **[architecture.md](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/architecture.md)**: Package structures, communication patterns, and sync engine design.
5.  **Platform-Specific Guides**:
    - **[android.md](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/android.md)**: Android compilation and native capacitor plugins.
    - **[web.md](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/web.md)**: Cloudflare Pages rules and web layouts.
    - **[firebase.md](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/firebase.md)**: Security rules and deployment configurations.
    - ****: State machine updates and recovery handlers.

Source:

- `docs/ai_workflow.md`

---

## 2. Development Workflow Checklist

All development sessions must conform to the following checkpoints:

- **Checks First**: Always complete the Session Start Checklist in `docs/ai_workflow.md` before editing code files.
- **Planning Phase**: Document the root cause, target files, and plan details in `docs/architecture_decisions.md` before coding.
- **Minimal Scope**: Design minimal, highly focused refactoring overrides. Avoid duplicate code helper definitions.
- **Boundary Enforcement**: Keep Android Gradle configurations and native java source files separate from Cloudflare Pages routing parameters and Vite web settings.

Source:

- `docs/ai_workflow.md`

---

## 3. Build & Typecheck Expectations

The application code must pass all TypeScript validations and compile successfully:

- **Type Safety Check**: Ensure all workspace directories verify cleanly:
  ```bash
  pnpm run typecheck:libs
  ```
- **Production Build Verification**: Compile assets for both mobile web views and desktop browser views:
  ```bash
  pnpm build
  ```

Source:

- `package.json`

---

## 4. Documentation Update Policy

- **Prevent Doc Drift**: If an implementation alters directory paths, store states, configurations, or secrets, the corresponding markdown document in `docs/` must be updated first.
- **Source References**: Add `Source:` file reference blocks indicating the relative path of the repository code files to back up factual statements.
- **Validate Documentation**: Verify that referenced files, workflows, and rules exist:
  ```bash
  pnpm docs:validate
  ```

Source:

- `docs/documentation_validation.md`

---

## 5. Regression & Testing Rules

- **Offline Preservation**: Bumping versions or installing updates must not reset local cache storage metrics or log out auth profiles.
- **Double-Target Check**: Fixing a bug on Android must not break Web client renders, and vice versa. Always test changes across both environments.

---

## 6. Commit & Release Protocol

- **Explicit Staging**: Never use `git add .`. Stage target files explicitly:
  ```bash
  git add docs/contributing.md
  ```
- **Semantic Prefix**: Format git commits using lowercase terms (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`).
- **Release Trigger**: Releases are run manually using `workflow_dispatch` on GitHub Actions. Do not push tags to trigger releases automatically.

Source:

- `docs/release_process.md`
