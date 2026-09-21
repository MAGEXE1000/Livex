# Chordex Studio — AI Engineering Workflow

This document defines the mandatory, enforceable operating procedures, context loading strategies, execution models, and silent verification rules for all AI sessions in the project. Compliance with this workflow is required before any task.

---

## 1. Context Loading Strategy & Platform Folders

To conserve context window usage, reduce token cost, and prevent model attention drift, the AI must load **only** the minimum documentation required for the current task scope. Never load unnecessary documents.

### Task Category Mapping & Limits

| Task Category     | Required Documentation                                                                     | Optional Documentation                                             | Folders to Inspect                                        | Max Recommended Context |
| ----------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | --------------------------------------------------------- | ----------------------- |
| **Bug Fix**       | `docs/engineering_guide.md`<br>`docs/ai_workflow.md`<br>`docs/debugging.md`                | `docs/ai-context-map.md`<br>`knowledge/debugging.md`               | `packages/studio-core/src/`<br>`apps/studio-android/src/` | ~30k tokens             |
| **Android / APK** | `docs/engineering_guide.md`<br>`docs/ai_workflow.md`<br>`docs/android.md`                  | `docs/coding_standards.md`<br>`knowledge/android.md`               | `apps/studio-android/android/`<br>`packages/ui-android/`  | ~40k tokens             |
| **Web / Cloudflare** | `docs/engineering_guide.md`<br>`docs/ai_workflow.md`<br>`docs/web.md`                      | `docs/coding_standards.md`<br>`knowledge/build.md`                 | `apps/studio-web/`<br>`packages/ui-web/`                  | ~30k tokens             |
| **OTA Subsystem** | `docs/engineering_guide.md`<br>`docs/ai_workflow.md`<br>`docs/ota_updater.md`              | `docs/firebase.md`<br>`knowledge/ota.md`<br>`knowledge/updater.md` | `packages/studio-core/src/lib/updater/`                   | ~50k tokens             |
| **Documentation** | `docs/engineering_guide.md`<br>`docs/ai_workflow.md`<br>`docs/documentation_validation.md` | `session_logs/index.md`                                            | `docs/`                                                   | ~20k tokens             |
| **Architecture**  | `docs/engineering_guide.md`<br>`docs/ai_workflow.md`<br>`docs/architecture.md`             | `docs/architecture_decisions.md`<br>`knowledge/architecture.md`    | `docs/architecture/`                                      | ~30k tokens             |
| **Release / CI**  | `docs/engineering_guide.md`<br>`docs/ai_workflow.md`<br>`docs/release_process.md`          | `knowledge/build.md`                                               | `.github/workflows/`                                      | ~30k tokens             |
| **Performance**   | `docs/engineering_guide.md`<br>`docs/ai_workflow.md`<br>`docs/performance.md`              | `knowledge/performance.md`                                         | `packages/studio-core/src/store/`                         | ~40k tokens             |
| **Refactor**      | `docs/engineering_guide.md`<br>`docs/ai_workflow.md`<br>`docs/coding_standards.md`         | `docs/codebase-size-report.md`                                     | `packages/ui-shared/src/`                                 | ~45k tokens             |
| **New Feature**   | `docs/engineering_guide.md`<br>`docs/ai_workflow.md`<br>`docs/engineering_checklists.md`   | `docs/project-structure.md`<br>`knowledge/patterns.md`             | `packages/ui-shared/src/`                                 | ~60k tokens             |

Source:

- [engineering_guide.md](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/engineering_guide.md#L115-L129)

---

## 2. Session Start Checklist (MANDATORY)

Before writing any code or modifying any file, the AI must output this completed checklist:

- [ ] **1. Identify Category**: Classify the task into a standard category from Section 1.
- [ ] **2. Load Minimum Docs**: Load only the specific documents mapped to that category.
- [ ] **3. Search Knowledge Base**: Search `knowledge/` folder (Section 6) before checking code files.
- [ ] **4. Verify Scope**: Confirm boundaries (Android in `apps/studio-android`, Web in `apps/studio-web`, Shared in `packages/studio-core`).
- [ ] **5. Generate Plan**: Write a concise, 1-page implementation plan (refer to Section 4).

---

## 3. Session Execution Model (8-Step Order)

To minimize error rates and avoid wasteful edit/validate loops, sessions must proceed linearly through these 8 steps:

1.  **Context Load**: Load the minimum required documents (Section 1).
2.  **Implementation Plan**: Produce a concise, maximum 1-page plan.
3.  **Approval Gate**: Wait for user/system approval if in planning mode.
4.  **Repository Analysis**: Perform all code searches, file inspections, and root-cause analysis first.
5.  **Implementation**: Execute all code changes in one clean pass. Do not write partial code.
6.  **Validations**: Run the compilers, test suites, and documentation validators.
7.  **Commit**: Create a staged commit using semantic commit formatting.
8.  **Push**: Push directly to the current working branch.

---

## 4. Planning Rule

The Implementation Plan must be concise (maximum 1 page) and detail:

- **Problem**: Short description of the issue or feature.
- **Root Cause**: The exact files and lines identified during analysis.
- **Files Affected**: Target filepaths to modify.
- **Implementation Strategy**: A step-by-step list of modifications.
- **Validation Plan**: Test commands (`pnpm test:web`, `pnpm docs:validate`) to execute.

---

## 5. Silent Execution Mode

To conserve tokens and reduce chat noise, the AI must operate silently.

- **Do NOT Output Chatty Narrative**: Avoid conversational updates like "Let's inspect...", "Wonderful, now let's verify...", "I will check...", "Perfect...".
- **Allowed Outputs**: The AI is permitted to expose only:
  1. The Session Start Checklist and Implementation Plan.
  2. Concise progress checkpoints (e.g. updating task status files).
  3. The final, structured Engineering Report (refer to Section 7).

---

## 6. Knowledge Reuse Policy

Before inspecting raw repository source code files, the AI must search the `knowledge/` directory:

- **Search Knowledge Base First**: If the logic, parameters, or configurations are already documented inside `knowledge/` or `lessons_learned.md`, reuse it immediately. Do not spend tokens rediscovering it.
- **Outdated Code Scans**: Only inspect code files if the local documentation appears outdated, has verification markers, or if there is a conflict.
- **Documenting Conflict**: If documentation conflicts with code findings, document the discrepancy in the session log first before updating references.

Source:

- [lessons_learned.md](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/knowledge/lessons_learned.md)

---

## 7. Output Quality (Engineering Report Format)

The final response must consist only of a structured report containing:

- **Summary**: A concise description of the completed work.
- **Files Modified / Created**: Explicit list of filepaths.
- **Validation**: Commands executed and results.
- **Commit Hash**: The generated commit hash.
- **Risks**: Any potential platform boundaries or regression impacts.
- **Recommendations**: Clean future improvements.

Remove all conversational filler and narrative summaries.

---

## 8. Failure Recovery Protocol

If two implementation attempts fail to compile or build:

1.  **Stop Coding**: Halt all code modifications immediately.
2.  **Collect Evidence**: Gather compiler error traces.
3.  **Independent Review**: Explicitly recommend a logical review by **Claude Opus** before making any further edits.

Source: *
