# @workspace/ui-web

> **Platform scope**: WEB  
> **Entry point**: `src/index.ts`  
> **Consumers**: studio-web only

## Purpose

Web-only layout and page components. Provides the responsive sidebar layout system, web-specific toolbar, and the public marketing landing page. **Must NOT be imported by the Android app.**

## Internal Structure

```
src/
├── index.ts                           # Public barrel
├── components/
│   ├── WebSidebarLayout.tsx           # Responsive sidebar + content layout shell
│   ├── StudioSidebar.tsx              # SidebarProvider, SidebarInset, useSidebar context
│   └── WebAppSectionDock.tsx          # App-mode dock for desktop web
└── landing/
    ├── StudioLandingPage.tsx          # Public marketing landing page
    ├── landingData.ts                 # Landing page content data
    └── landingUtils.ts                # Landing page utility helpers
```

## Exports

```typescript
export { default as WebSidebarLayout } from './components/WebSidebarLayout';
export { SidebarProvider, SidebarInset, useSidebar } from './components/StudioSidebar';
export { default as WebAppSectionDock } from './components/WebAppSectionDock';
export { default as StudioLandingPage } from './landing/StudioLandingPage';
```

## Dependencies

- **Workspace**: `@workspace/livex-core` (limited — hooks and stores only)
- **External**: react

## Files That Should Rarely Be Modified

- `components/StudioSidebar.tsx` — Sidebar context provider used by WebSidebarLayout

## Platform Rules

- This package is **WEB scope only**
- Never import from `@workspace/ui-android`
- Never import Capacitor plugins here
