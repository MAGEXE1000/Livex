/**
 * Google Play Store Feature Graphic Template (1024x500 px)
 *
 * Implements the flagship dark hardware aesthetic of Livex:
 * - Pure AMOLED #000000 backdrop with subtle specular spotlight & precision grid
 * - Disciplined typographic hierarchy (Geist 800, 500, 600)
 * - Safe margins (all essential typography and branding within central 80% safe zone)
 * - Authentic 3D audio workstation rig showcasing Groovex stem mixer & Stagex stage plot
 * - Tactile hardware feature pills with glowing signal LEDs
 */

export function buildFeatureGraphicHtml({
  iconBase64,
  groovexBase64,
  stagexBase64,
  title = 'Livex',
  tagline = 'The Audio Rehearsal & Live Performance Engine',
  eyebrow = 'PRO AUDIO WORKSTATION',
  badges = ['Low-Latency DSP', 'Offline-First', 'Multi-Track Stems'],
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    width: 1024px;
    height: 500px;
    background-color: #000000;
    overflow: hidden;
    font-family: 'Geist', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #ffffff;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .canvas {
    position: relative;
    width: 1024px;
    height: 500px;
    background: #000000;
    overflow: hidden;
    display: flex;
    align-items: center;
  }

  /* ── Ambient Studio Grid & Lighting ── */
  .grid-pattern {
    position: absolute;
    inset: 0;
    background-size: 32px 32px;
    background-image: 
      linear-gradient(to right, rgba(255, 255, 255, 0.015) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
    pointer-events: none;
    z-index: 1;
  }

  /* Top-center ambient specular wash */
  .top-ambient {
    position: absolute;
    top: -120px;
    left: 45%;
    transform: translateX(-50%);
    width: 800px;
    height: 360px;
    background: radial-gradient(ellipse at 50% 25%, rgba(255, 255, 255, 0.06) 0%, rgba(0, 0, 0, 0) 70%);
    pointer-events: none;
    z-index: 2;
  }

  /* Rich acoustic ambient glow behind hardware rig */
  .rig-ambient {
    position: absolute;
    top: 50%;
    right: 80px;
    transform: translateY(-50%);
    width: 580px;
    height: 440px;
    background: radial-gradient(circle at 60% 50%, rgba(56, 189, 248, 0.12) 0%, rgba(59, 130, 246, 0.04) 45%, rgba(0, 0, 0, 0) 75%);
    pointer-events: none;
    z-index: 2;
  }

  /* Subtle vignette edge guards */
  .vignette-edges {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0) 65%, rgba(0, 0, 0, 0.5) 100%);
    pointer-events: none;
    z-index: 3;
  }

  /* ── Left Column: Typography & Brand Identity (Safe Zone: X: 64px to 460px) ── */
  .left-column {
    position: relative;
    z-index: 20;
    width: 440px;
    padding-left: 68px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .brand-header-row {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 14px;
  }

  .brand-icon {
    width: 54px;
    height: 54px;
    border-radius: 14px;
    object-fit: contain;
    filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.7)) drop-shadow(0 0 16px rgba(56, 189, 248, 0.28));
  }

  .eyebrow-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 6px;
    background: rgba(56, 189, 248, 0.08);
    border: 1px solid rgba(56, 189, 248, 0.22);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #38bdf8;
  }

  .eyebrow-led {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #38bdf8;
    box-shadow: 0 0 6px #38bdf8;
  }

  .title-main {
    font-size: 54px;
    font-weight: 900;
    line-height: 1.02;
    letter-spacing: -0.04em;
    color: #ffffff;
    margin-bottom: 12px;
  }

  .tagline {
    font-size: 17.5px;
    font-weight: 500;
    line-height: 1.38;
    letter-spacing: -0.015em;
    color: rgba(255, 255, 255, 0.72);
    margin-bottom: 24px;
    max-width: 390px;
  }

  /* Tactile Hardware Feature Badges */
  .badge-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    max-width: 410px;
  }

  .badge-chip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 12px;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.035em;
    color: rgba(255, 255, 255, 0.88);
  }

  .badge-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.45);
  }

  .badge-chip:first-child .badge-dot {
    background: #38bdf8;
    box-shadow: 0 0 6px rgba(56, 189, 248, 0.8);
  }

  /* ── Right Column: Hardware Workstation Rig (3D Showcase) ── */
  .rig-stage {
    position: absolute;
    right: 28px;
    top: 50%;
    transform: translateY(-50%);
    width: 540px;
    height: 500px;
    perspective: 1200px;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Secondary Hardware Device (Stagex Stage Plot / Background Rig) */
  .device-secondary {
    position: absolute;
    right: 24px;
    top: 30px;
    width: 255px;
    height: 480px;
    background: #09090b;
    border-radius: 36px;
    padding: 6px;
    transform: rotateY(-18deg) rotateX(6deg) rotateZ(2deg) scale(0.92);
    transform-origin: center center;
    box-shadow: 
      -20px 24px 60px rgba(0, 0, 0, 0.95),
      0 0 0 1px rgba(255, 255, 255, 0.1);
    opacity: 0.88;
    z-index: 11;
  }

  .device-secondary .screen-container {
    width: 100%;
    height: 100%;
    border-radius: 30px;
    overflow: hidden;
    background: #000000;
  }

  .device-secondary img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 40%;
    transform: scale(1.05);
    display: block;
  }

  /* Primary Hardware Device (Groovex Fader Mixer Console) */
  .device-primary {
    position: absolute;
    right: 170px;
    top: 14px;
    width: 268px;
    height: 520px;
    background: #09090b;
    border-radius: 38px;
    padding: 6.5px;
    transform: rotateY(-12deg) rotateX(4deg) rotateZ(-1.5deg);
    transform-origin: center center;
    box-shadow: 
      -28px 36px 90px -10px rgba(0, 0, 0, 0.98),
      0 0 0 1.5px rgba(255, 255, 255, 0.18),
      0 0 65px -8px rgba(56, 189, 248, 0.32);
    z-index: 14;
  }

  .device-primary::before {
    content: '';
    position: absolute;
    inset: 1px;
    border-radius: 37px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    pointer-events: none;
    z-index: 16;
  }

  .device-primary .screen-container {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 32px;
    overflow: hidden;
    background: #000000;
  }

  .device-primary img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center bottom;
    transform: scale(1.12);
    transform-origin: center 85%;
    display: block;
  }

  .camera-punch {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    width: 18px;
    height: 5.5px;
    background: #000000;
    border-radius: 3px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    z-index: 20;
  }

  .screen-gloss {
    position: absolute;
    inset: 0;
    border-radius: 32px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 45%);
    pointer-events: none;
    z-index: 18;
  }
</style>
</head>
<body>
<div class="canvas">
  <div class="grid-pattern"></div>
  <div class="top-ambient"></div>
  <div class="rig-ambient"></div>
  <div class="vignette-edges"></div>

  <!-- Left Column: Branding, Hierarchy, Specs -->
  <div class="left-column">
    <div class="brand-header-row">
      <img src="${iconBase64}" class="brand-icon" alt="Livex Mark" />
      <div class="eyebrow-badge">
        <span class="eyebrow-led"></span>
        <span>${eyebrow}</span>
      </div>
    </div>

    <h1 class="title-main">${title}</h1>
    <p class="tagline">${tagline}</p>

    <div class="badge-row">
      ${badges
        .map(
          (b) => `<div class="badge-chip"><span class="badge-dot"></span><span>${b}</span></div>`
        )
        .join('')}
    </div>
  </div>

  <!-- Right Column: 3D Workstation Rig (Groovex Console + Stagex Plot) -->
  <div class="rig-stage">
    <div class="device-secondary">
      <div class="screen-container">
        <img src="${stagexBase64}" alt="Stagex Spatial Stage Plot" />
      </div>
    </div>

    <div class="device-primary">
      <div class="camera-punch"></div>
      <div class="screen-container">
        <img src="${groovexBase64}" alt="Groovex Multi-Track Console" />
        <div class="screen-gloss"></div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}
