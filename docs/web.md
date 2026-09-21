# Chordex Studio — Web Platform Guide

This document describes web-specific styles, Vite compilation setups, Cloudflare Pages hosting configurations, and browser compatibility fallbacks.

---

## 1. Web Technology Stack & Compilers

The web application compiles React code into static SPA files deployed to Content Delivery Networks.

- **Vite Compilation**: The web workspace utilizes `apps/studio-web/vite.config.ts` to bundle components.
- **Asset Optimization**: Bundles are minified via ESBuild and split into dynamic chunks to improve initial page load speeds.
- **Platform Exclusivity**: Web views and Cloudflare redirects stay in web-focused packages. They are not allowed to load native Android assemblies or query Capacitor interfaces directly.

Source:

- `apps/studio-web/package.json`
- `apps/studio-web/vite.config.ts`

---

## 2. Cloudflare Pages Hosting & Routing (`wrangler.toml` & `public/_redirects`)

Cloudflare Pages serves as the primary hosting provider for the desktop web build. It handles client-side routers by redirecting routes back to `index.html` via `_redirects`, applies security headers via `_headers`, and proxies update requests to Firebase Hosting:

```
# Cloudflare Pages / Static Redirects & SPA Fallback
/app-release.json https://studio-30f44.web.app/app-release.json 302
/apk/* https://studio-30f44.web.app/apk/:splat 302
/* /index.html 200
```

Source:

- `wrangler.toml`
- `apps/studio-web/public/_redirects`
- `apps/studio-web/public/_headers`

---

## 3. Responsive Styling & Viewport Rules

The web client adapts automatically between mobile viewports and desktop resolutions:

- **Desktop Layout Grid**: Uses CSS grid layouts wrapping main panels into sidebar categories, navigation drawers, and floating panels.
- **Mobile-First Breakpoints**: Utilizes Tailwind breakpoints (`sm:`, `md:`, `lg:`) to scale UI elements:
  - Phone layouts (down to 360dp): Render simple vertical lists and full-width card elements.
  - Tablets & Laptops: Split layouts horizontally into double-column dashboards.
- **Hover Safety**: Web UI elements are allowed to utilize CSS hovers (`:hover`), whereas mobile templates must avoid hover states to prevent tap-freeze bugs on touch displays.

---

## 4. Web Browser Fallbacks

Since native bridge utilities are missing in standard browsers, the core package falls back to web standard APIs:

- **Web Clipboard Fallback**: If the native `AppInstallerPlugin` bridge is absent, copy controls route content via `navigator.clipboard.writeText(text)`:
  ```typescript
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  } else {
    throw new Error('Clipboard API not supported in this browser.');
  }
  ```
- **Offline LocalStorage**: Offline database features fall back to standard `localStorage` indices if native Preferences interfaces are blocked or uninstalled.

Source:

- `packages/ui-shared/src/components/DevToolsDashboard.tsx`
- `packages/studio-core/src/lib/nativePrefs.ts`
