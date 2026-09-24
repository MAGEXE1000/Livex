# Version 4.6.44

Release Date: 2026-09-24

### Added
- Edge Multimodal Vision Pipeline: Extracted raw image byte payloads into Uint8Array vectors and routed directly to @cf/meta/llama-3.2-11b-vision-instruct on Cloudflare Workers AI edge, providing genuine on-device and edge musical visual intelligence.
- Grounding Conflict Isolation: Decoupled Google Gemini search grounding tools from multimodal inlineData requests to eliminate HTTP 400 parameter rejections when analyzing musical visual artifacts.

### Improved
- Bottom Navigation Compact Scroll: Restored compact shrinking dock interaction across Hub and all sub-apps on downward scroll without translating the navigation off-screen.
- Symmetrical Center-Bottom Dock Scaling: Downscaled the navigation dock to 0.88 toward center bottom while maintaining 100% visibility, active touch targets, and full dock interactivity.
- Satellite Action Button Collapse: Smoothly collapsed and faded the App Switcher and AI mascot satellite controls to opacity 0 and scale 0, retracting horizontal footprint inward cleanly.
- Instant Physics-Based Scroll Restoration: Restored full dock dimensions and satellite controls smoothly upon upward scrolling via unified spring physics.
