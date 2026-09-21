# @workspace/studio-web

> **Platform scope**: WEB  
> **Entry point**: `src/main.tsx`  
> **Deployment**: Cloudflare Pages  
> **Build tool**: Vite 7

## Purpose

The browser-based responsive web application. Provides all studio modes (Chordex, Drumex, StageX, Groovex, Vocalex) inside a Vite SPA deployed to Cloudflare Pages. Shares business logic with the Android app via `@workspace/livex-core` and UI components via `@workspace/ui-shared`. Uses web-only layout components from `@workspace/ui-web`.

## Internal Structure

```
src/
├── main.tsx           # React DOM root mount
├── App.tsx            # Root component: routing, auth state machine, panel navigation
├── index.css          # Global CSS: TailwindCSS base, design tokens, animations
└── vite-env.d.ts      # Vite type declarations
vite.config.ts         # Vite configuration: React plugin, Tailwind, path aliases
index.html             # HTML shell: Google Fonts, Material Symbols, meta tags
```

## Imports (workspace)

- `@workspace/livex-core` — stores, navigation, sync, auth, version
- `@workspace/ui-shared` — StudioHub, SmartLoading, all panels, SharedNavigationContainer, ErrorBoundary
- `@workspace/ui-web` — WebSidebarLayout, SidebarProvider, SidebarInset, useSidebar, StudioLandingPage

## Key Files

| File | Role |
|------|------|
| `src/App.tsx` | Root component — auth state machine, routing, panel switching, sidebar management |
| `src/main.tsx` | React DOM `createRoot` entry |
| `vite.config.ts` | Vite configuration with React plugin and path aliases |
| `index.html` | HTML shell with fonts, meta tags, and root div |

## Platform Rules

- This is a **WEB scope** app
- Never import from `@workspace/ui-android` or `@workspace/studio-android`
- Deployed to Cloudflare Pages via `wrangler.toml` at repository root
- Web version maintained separately in `appVersion.ts`
