# Version 4.6.49

Release Date: 2026-09-25

### Improved
- Restored Taller Navbar Geometry: Restored canonical 58px navbar height and 58px circular satellite buttons matching the vertical dock center with generous negative space.
- Zero-Clipping Active Highlight Containment: Configured `overflow: visible` on the inner navigation container and established 5px uniform insets around the 48px highlight capsule, completely eliminating lower-edge and rounded-corner clipping artifacts on Android WebView.
- Apple-Grade Fluid Spring Physics: Replaced high-stiffness, low-mass snapping with critically damped fluid spring physics (`stiffness: 280, damping: 32, mass: 1.0`), delivering a subtle sense of physical inertia, controlled momentum, and smooth glide without cheap bounce or overshoot.
- 0ms Press Response & Full Interruption: Added `onPointerDown` tap listeners to initiate highlight motion the instant the finger touches the screen, and removed redundant 100ms throttle guards so rapid tab sequences retarget velocity seamlessly.
- Balanced Optical Vertical Centering: Aligned icon (22px) and label (10.5px) in an optically centered flex hierarchy with balanced negative space above and below.
