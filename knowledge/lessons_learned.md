# Lessons Learned Database

This database serves as the permanent memory of resolved engineering problems, bugs, and design errors, providing details on how to avoid recurring issues.

---

## 1. Absolute Path reference errors in Subsystem Documentation

- **Problem**: Running document validation on local developer machines or CI servers reported multiple file-not-found `[ERROR]` references.
- **Root Cause**: Absolute link references in sub-app guides were hardcoded to a specific local path: `file:///c:/Users/ayuda/Documents/Studio/chordex-app/`.
- **Fix**:
  1. Ran a recursive file-prefix replacement across all `.md` files to point absolute links to the local workspace location.
  2. Upgraded `scripts/validate-documentation.mjs` path parsing logic to normalize and resolve paths relative to the current workspace root `process.cwd()`.
- **How to Avoid**: Always use relative markdown links or standard `file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/` patterns, and run `pnpm docs:validate` locally before committing.

Source:

- [validate-documentation.mjs](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/scripts/validate-documentation.mjs#L37-L50)
- [internal-index.md](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/docs/architecture/internal-index.md#L20-L36)

---

## 2. Empty Markdown Headers causing Validator Warnings

- **Problem**: Multiple `[WARNING]` logs reported empty section headers during validation checks.
- **Root Cause**: Headers like `## 2. Platform-Specific Manual QA Checklist` had no immediate text blocks before subsequent subsections or dividers.
- **Fix**: Added brief introductory text under headers to satisfy the validator condition that checks for non-empty text lines.
- **How to Avoid**: Do not leave headers completely empty. Provide a short introductory sentence describing what the subsections contain.

Source:

- [validate-documentation.mjs](file:///c:/Users/ayuda/Documents/.gemini/antigravity/scratch/Studio/scripts/validate-documentation.mjs#L95-L125)

---

## 3. Lyrics editor: span corruption, global Backspace hijack, prop-sync race, live timing drift

- **Problem**: Formatting spans drifted after text edits; Backspace outside the canvas (chord picker, inputs) could be swallowed; a parent prop echo could overwrite in-flight typing; Live highlight drifted from the song duration and wrapped at the end of the song.
- **Root Cause**:
  - Text edits replaced `line.text` without shifting `formatSpans` offsets.
  - Window-level Backspace/`beforeinput` handlers were not scoped to the editable canvas.
  - `areLyricsEqual` compared by reference/shallow, so our own debounced emit re-entered through props.
  - The live timer used a uniform `msPerLine`/`setInterval` instead of the schedule's per-line `durationMs`, and `% totalLines` wrapped.
- **Fix**:
  - `reconcileSpansOnTextEdit` (`livex-core/src/lib/lyrics/spanReconcile.ts`, unit tested).
  - Document-level handlers scoped to `canvasRef`.
  - Structural equality plus `lastEmittedRef` echo guard.
  - Schedule-authoritative, drift-compensated line timer that stops at the last line.
  - Interruptible rAF `scrollTop` animation (`ui-shared/src/lib/animatedScroll.ts`).
- **How to Avoid**:
  - Never attach window-level key handlers without a canvas-containment check.
  - Any text mutation of a line must reconcile its spans.
  - Never give React a child it will later unmount inside a contentEditable or timer-written node.
  - Live timing must derive from the song schedule, not from a speed constant.
- **Open**: `handleSplitLine` still drops span formatting on split; per-line DOM editor architecture unchanged.
