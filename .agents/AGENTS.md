# Project Rules

## Permanent Android Signing Invariant

The production Android signing identity is a PERMANENT PROJECT INVARIANT.

- NEVER change the production signing certificate.
- NEVER change the production keystore.
- NEVER generate a new production keystore.
- NEVER replace the production signing key.
- NEVER publish an APK signed with any certificate other than the established production certificate.
- The production fingerprint is immutable. Every future release MUST use EXACTLY the same production signing identity.
- If the signing configuration is missing, invalid, unavailable, or cannot be verified:
  - STOP THE RELEASE.
  - Do NOT build.
  - Do NOT publish.
  - Do NOT upload.
  - Do NOT update Firebase metadata.
  - Do NOT create a GitHub Release.
  - Fail immediately with a clear error explaining why.
- The release pipeline must refuse to continue if the generated APK fingerprint differs by even one character from the production fingerprint.
- This rule must become part of the permanent release pipeline and must never be bypassed by modifying validation scripts or predeploy hooks.
- No debug keystore, temporary keystore, locally generated keystore, CI-generated keystore, fallback keystore, or alternate signing identity may EVER be used for a production release.

## Permanent APK Architecture Rule

- OTA updates are permanently deprecated.
- The APK updater is now the single source of truth.
- Whenever a repository-wide architectural migration permanently removes a subsystem (like OTA), that subsystem must never be silently reintroduced.
- Do NOT replace dead code with compatibility wrappers.
- Fix root causes only.

## Permanent Architecture Migration Rule

Whenever a subsystem is permanently removed from Studio, AI agents must completely migrate the repository.

Removing the primary implementation is not sufficient.

Agents must also remove:

- obsolete interfaces
- obsolete enums
- obsolete settings
- obsolete release scripts
- obsolete diagnostics
- obsolete tests
- obsolete documentation
- obsolete feature flags
- obsolete workflows
- obsolete migrations
- obsolete compatibility code
- obsolete helper utilities

The repository must not contain historical remnants of removed architectures.
Future implementations must never recreate removed architectures unless explicitly instructed by the user.

## Performance Baseline Contract (Permanent)

### Purpose

Studio has reached a performance and responsiveness level that is now considered the permanent engineering baseline.
This baseline represents the minimum acceptable user experience.
Every future implementation must preserve or improve it.
Performance regressions are considered architectural regressions.

### User Experience Contract

Studio must feel instantaneous.
Users should never perceive unnecessary waiting.
Navigation should feel immediate.
Animations should remain smooth.
The application should always feel responsive.

### Performance Goals

Target experience:

- Instant startup
- Instant application switching
- Instant tab switching
- Instant Settings navigation
- Instant Preferences navigation
- Instant Updater navigation
- Instant modal opening
- Instant sheet opening
- Stable rendering
- No visible freezes
- No navigation lag
- No animation stutter
- No unnecessary loading indicators
  The objective is to maintain a native 120 Hz experience whenever the hardware allows it.

### Architectural Principle

Performance is a feature.
Every implementation must attempt to reduce:

- render count
- allocations
- subscriptions
- listeners
- layout invalidations
- paint operations
- React reconciliation work
- Zustand updates
- startup work
- synchronous storage operations
- unnecessary component mounting
- unnecessary component recreation
- memory growth
- main-thread blocking

### Mandatory Performance Review

Every implementation must evaluate whether it:
reduces latency
reduces rendering
reduces memory
reduces startup work
reduces navigation work
reduces blocking work
If a better implementation exists with equal functionality and lower cost, it should be preferred.

### Regression Policy

The following are considered regressions:

- slower startup
- slower navigation
- slower app switching
- slower tab switching
- additional loading delays
- additional freezes
- dropped frames
- animation jitter
- black screens
- render storms
- unnecessary rerenders
- additional listeners
- additional subscriptions
- memory leaks
- long tasks
- layout thrashing
  Regression fixes take priority over new features.

### Baseline Validation

Before every release verify:

- Startup remains equal or faster.
- Navigation remains equal or faster.
- Settings remain instantaneous.
- Updater remains responsive.
- Stagex remains responsive.
- Chordex remains responsive.
- Drumex remains responsive.
- Groovex remains responsive.
- Vocalex remains responsive.
- Hub remains responsive.
  If any area becomes slower than the established baseline, the implementation must stop and resolve the regression before release.

### Engineering Philosophy

Never optimize only one screen.
Optimize the entire application continuously.
Small improvements accumulated across every subsystem are preferred over isolated micro-optimizations.
Every implementation should leave Studio faster than it was before.

## Performance Budget Rule

Every Pull Request, commit, feature, refactor or bug fix must leave the application in one of these states:

- Faster
- Equal performance

Never slower.

If performance becomes worse, the implementation is incomplete.
The agent must identify the regression, fix it, and revalidate before publishing.

## Repository-Wide Performance Audit Rule

Before considering any optimization complete, perform a repository-wide performance audit.
Do not optimize only the modified screen.

Evaluate the impact on:

- Startup
- Hub
- Navigation
- Settings
- Updater
- Chordex
- Drumex
- Groovex
- Stagex
- Vocalex

The optimization is complete only if no subsystem regresses.

## Permanent Mobile UI Architecture Rule (Mobile Web Preview = Android Mobile UI)

The Mobile Web Preview (`pnpm dev:mobile`) is NOT a separate UI implementation.
It is the browser-based development and visual-preview representation of the SAME mobile experience that runs inside the Android/Capacitor APK.

1. **Single Source of Truth**:
   - Mobile UI must have one canonical implementation in shared packages (`packages/ui-shared`, `packages/livex-core`).
   - Prefer shared components, shared styles, shared design tokens, shared animation systems, shared navigation logic, and shared interaction logic.
   - Do not duplicate mobile UI implementations between Mobile Web Preview and Android.
   - Do not create one implementation "for preview" and another "for APK" when the same shared implementation can be used.

2. **Visual Parity Is Required**:
   - Any mobile UI change must produce the same visual result in Mobile Web Preview (`pnpm dev:mobile`) and Android/Capacitor APK.
   - Includes layout, spacing, typography, colors, Liquid Glass materials, blur, translucency, shadows, borders, gradients, icons, navigation, transitions, animations, gestures, scrolling behavior, component states, loading states, and interaction feedback.
   - Do not accept "close enough" implementations between the two environments.

3. **Behavioral Parity Is Required**:
   - Interactions must behave consistently between Mobile Web Preview and Android.
   - If an interaction behaves differently because of a genuine native Android limitation, isolate only the platform-specific mechanism while keeping UX, visual result, timing, and state behavior equivalent.
   - Do not use platform differences as an excuse to create unrelated UI behavior.

4. **Mobile Web Preview Is the Primary UI Iteration Environment**:
   - For normal mobile UI/UX work, develop and iterate using Mobile Web Preview first (`pnpm dev:mobile`).
   - Use its Vite HMR workflow for rapid visual iteration.
   - Validate the final result against the Android runtime architecture before considering the work complete.
   - Do NOT require a physical Android phone for ordinary UI iteration.

5. **Android Is the Production Target**:
   - The Android APK remains the production target.
   - The Mobile Web Preview must represent the same production mobile UI, not an approximation or mockup.
   - When a change is approved in Mobile Web Preview, the same canonical implementation must be what is packaged into the Android APK.

6. **No Platform-Specific Duplication**:
   - Do NOT create separate mobile CSS solely for preview, separate mobile components solely for preview, duplicate navigation implementations, duplicate animation implementations, duplicate Liquid Glass implementations, browser-only visual substitutes, or Android-only visual variants unless technically unavoidable.
   - If separation is unavoidable, keep the shared visual/UX contract identical and document the exact native reason.

7. **Shared Components Take Priority**:
   - Before creating a new component, animation, style, or effect, inspect the existing shared architecture, reuse the canonical component/system, and extend or refactor it when appropriate.

8. **Design System Consistency**:
   - All mobile visual systems must remain centralized in the shared design system (`tokens.css`, shared motion constants, etc.).

9. **Verification Requirement**:
   - Verify Mobile Web Preview visually and behaviorally.
   - Verify that the implementation path used by Mobile Web Preview is also consumed by Android/Capacitor.
   - Verify that no Android-only duplicate implementation was introduced.
   - Verify production build isolation (development preview tooling is not shipped in APK).

10. **Regression Rule**:
    - If a future change modifies a shared mobile component, re-verify the Mobile Web Preview ↔ Android parity.

11. **Desktop Web Remains Separate**:
    - Desktop Web (`apps/studio-web`) retains its own responsive layout and desktop-specific UX where appropriate.
    - Architecture:
      - Desktop Web → Desktop-specific responsive experience
      - Mobile Web Preview → Canonical Mobile UI → Android / Capacitor APK

12. **Agent Responsibility**:
    - Every agent working on Studio/Livex must treat this as a permanent architectural constraint.
    - Definition of Done for mobile UI work:
      "Implemented once through the canonical mobile UI architecture, visually and behaviorally verified in Mobile Web Preview, and confirmed to be the same implementation consumed by the Android/Capacitor APK."
