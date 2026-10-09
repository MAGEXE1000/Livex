---
name: ui-skills-root
description: "Primary topical and intent router across the Livex UI Skills catalog. Use before initiating UI or UX work to select the minimal, precise skill set (<3 skills) and avoid context overloading."
---

# UI Skills Root — Livex Router

You are the authoritative routing layer for the Livex UI skills catalog (`.agents/skills/`).

Use this router before beginning UI, UX, animation, layout, or mobile adaptation work in Livex to pick **only the 1 to 2 most relevant skills** needed for the task.

## Selection Rules

1. **Rule of Restraint**: Prefer **1 skill**. Use **2 skills** only when the task requires two distinct angles (e.g. `mobile-native` + `fixing-motion-performance`). Use **3 skills** strictly for comprehensive audits or multi-surface refactors. **Never exceed 3 skills.**
2. **Context Guard**: Never load or concatenate the entire skill directory into context. Only read the specific `.agents/skills/<skill>/SKILL.md` identified by this router.
3. **Hierarchy**: Route by **Target Intent** → **Domain** → **Specific Craft**.

---

## Topical Route Map

### 1. Touch, Mobile & Viewport (Capacitor Android)
*For soft-keyboard viewport shifts, touch gestures, handle dragging, safe-area insets, and physical touch targets.*
- `mobile-native` (`.agents/skills/mobile-native/SKILL.md`): Native Capacitor/WebView mobile ergonomics, keyboard handling, safe-area insets, gesture avoidance.
- `interactive-hit-areas` (`.agents/skills/interactive-hit-areas/SKILL.md`): Minimum 48x48dp touch targets, padding, hit-area expansion.
- `adapt` (`.agents/skills/adapt/SKILL.md`): Viewport height shifts, soft-keyboard open/dismiss transitions, responsive sheet boundaries.

### 2. UI Systems, Craft & Visual Polish
*For layout cleanup, component refinement, visual hierarchy, and interface polish.*
- `better-ui`: Design engineering polish, micro-interactions, subtle tactile details.
- `better-layout`: Layout structure, spacing rhythm, visual hierarchy.
- `baseline-ui`: Fast cleanup and deslop pass for spacing and alignment.
- `layout`: Layout fundamentals, negative space, grouping.
- `distill`: Content simplification, removing unnecessary visual noise.
- `clarify`: Clear visual cues, unambiguous affordances.
- `harden`: Robustness against extreme content, edge-cases, error states.
- `impeccable`: Pixel-perfect precision and alignment discipline.
- `make-interfaces-feel-better`: Invisible micro-polish and tactile feedback.
- `refactoring-ui`: Practical tactical design heuristics.
- `redesign-skill`: Structured design upgrades without breaking functionality.
- `rams`: Dieter Rams principles applied to UI (unobtrusive, honest, minimal).
- `break`: Breaking patterns intentionally for focal points.
- `variant`: Component states and permutations.
- `frontend-ui-engineering`: Full architectural frontend craft standards.

### 3. Motion & 60/120fps Performance
*For teleprompter scrolling, drag-and-drop, sheet animations, and Framer Motion / CSS transitions.*
- `fixing-motion-performance`: Diagnosing layout thrashing, composite layers, scroll jank.
- `accessible-animation`: Reduced-motion compliance and stable transitions.
- `animate`: Motion from scratch, purpose, curve, duration, interruptibility.
- `animate-ui`: Choreographed UI animations and transition sequences.
- `animation-systems`: Consistent animation token architecture.
- `animation-vocabulary`: Reverse-lookup for motion naming.
- `animation-on-scroll`: Fluid scroll-linked transitions.
- `to-spring-or-not-to-spring`: Spring physics vs easing curves decision matrix.
- `transitions-dev`: Developer transition implementation patterns.
- `transitions-polish`: Fluid transition timing and feel polish.
- `12-principles-of-animation`: Disney animation principles applied to UI.

### 4. Review & Audits
*For evaluating screens, identifying regressions, and holistic interface audits.*
- `better-interface`: Cross-discipline screen review.
- `design-review`: Pre-ship visual and interaction design audit.
- `interface-review`: Structured interface evaluation.
- `improve-ui`: Audit against product design evidence.
- `audit`: Technical UI quality checks across accessibility, performance, theming, responsive behavior, and anti-patterns.
- `review-animations`: Critiquing existing motion implementation.
- `improve-animations`: Roadmap of motion improvements.

### 5. Typography & Color (Dark AMOLED Teleprompter)
*For lyric/chord rendering, monospace alignment, high contrast on AMOLED, and theme tokens.*
- `better-typography`: Monospace chords vs sans lyrics, legibility at performance distance.
- `typeset`: Line-height rhythm, tabular numbers, text wrapping.
- `better-colors`: Palette generation, dark mode appearance, token semantics.
- `colorize`: Color application, accent tints, role meaning.
- `oklch-skill`: Perceptual uniform color math and role tinting.
- `contrast-checker`: WCAG-compliant contrast checking on OLED black.

### 6. React 19, Architecture & Debugging
*For React performance, re-render elimination, hook hygiene, and bug isolation.*
- `diagnosing-bugs`: Systematic reproduce -> isolate -> patch cycle.
- `improve-react`: Memoization, re-render avoidance, hook hygiene.
- `react-best-practices`: Idiomatic React component architecture.
- `react-doctor`: Quick health checks for React components.
- `codebase-design`: Modular organization, interfaces, boundary design.
- `improve-codebase-architecture`: Decoupling and refactoring codebase architecture.
- `improve`: Codebase survey as senior advisor producing prioritized, self-contained implementation plans.
- `thermo-nuclear-code-quality-review`: Strict maintainability review for abstraction quality, giant files, and spaghetti growth.
- `unlazy`: Rigorous verification before declaring tasks complete.
- `best-practices`: Core frontend engineering principles.
- `optimize`: Performance bottleneck elimination.
- `performance`: Runtime memory, CPU, and rendering optimization.
- `web-perf`: Network and loading performance.
- `core-web-vitals`: INP, LCP, CLS metrics optimization.

### 7. Testing & Accessibility
*For automated tests, E2E test verification, and WCAG compliance.*
- `playwright-cli`: End-to-end browser automation and test verification.
- `vitest`: Unit and integration testing with Vitest.
- `tdd`: Test-driven development loop.
- `accessibility-diff`: Pre- vs post-change accessibility regressions.
- `wcag-audit-patterns`: Systematic WCAG checklist and pattern audit.
- `better-accessibility`: Semantic markup, keyboard navigation, focus management.

### 8. Stack-Specific (Livex Tooling)
*For tooling directly present in the Livex repo.*
- `tailwindcss`: Tailwind CSS utility composition and v4 token rules.
- `vite`: Bundler configuration, HMR hygiene, build optimization.
- `prefer-container-queries`: Modular responsive component layouts.

---

## Routing Execution Workflow

1. **Assess Intent**: What is the primary user goal? (e.g., "Fix keyboard overlapping text container").
2. **Match Domain**: Touch, Mobile & Viewport.
3. **Select Skill**: `mobile-native` or `adapt`.
4. **Read Skill**: Open `.agents/skills/<skill>/SKILL.md` using `view_file`.
5. **Apply Context**: Execute changes adhering strictly to the selected skill's principles and Livex platform boundaries.
