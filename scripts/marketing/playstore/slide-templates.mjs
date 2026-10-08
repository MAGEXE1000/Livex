/**
 * Play Store Screenshot Template Generator
 *
 * Generates 1080x1920 px (9:16) HTML composites for Google Play Store screenshots:
 * - Pixel 9 Pro flagship frame with ultra-slim bezels & pill punch-hole camera
 * - Bold, clear top editorial typography (Geist / Inter sans-serif)
 * - Zero artificial floating badges or pills
 * - Pure AMOLED dark backdrops (#000000) with subtle ambient lighting & fine grid
 * - Specialized compositions for each of the 6 slides
 */

const SHARED_BASE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  html, body {
    width: 1080px;
    height: 1920px;
    background-color: #000000;
    overflow: hidden;
    font-family: 'Geist', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #ffffff;
    -webkit-font-smoothing: antialiased;
  }

  .canvas {
    position: relative;
    width: 1080px;
    height: 1920px;
    background: #000000;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* Ambient dark vignette & fine subtle grid */
  .grid-pattern {
    position: absolute;
    inset: 0;
    background-size: 48px 48px;
    background-image: 
      linear-gradient(to right, rgba(255, 255, 255, 0.012) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.012) 1px, transparent 1px);
    pointer-events: none;
    z-index: 1;
  }

  .top-ambient {
    position: absolute;
    top: -160px;
    left: 50%;
    transform: translateX(-50%);
    width: 900px;
    height: 480px;
    background: radial-gradient(circle at 50% 35%, rgba(255, 255, 255, 0.04) 0%, rgba(0, 0, 0, 0) 70%);
    pointer-events: none;
    z-index: 1;
  }

  /* ── Header Typography ── */
  .header-container {
    position: relative;
    z-index: 20;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding-top: 110px;
    width: 100%;
    max-width: 980px;
    padding-left: 32px;
    padding-right: 32px;
  }

  .title-primary {
    font-size: 58px;
    font-weight: 800;
    line-height: 1.14;
    letter-spacing: -0.035em;
    color: #ffffff;
  }

  .title-secondary {
    font-size: 36px;
    font-weight: 500;
    line-height: 1.25;
    letter-spacing: -0.02em;
    color: #94a3b8;
    margin-top: 14px;
  }
`;

/**
 * Slide 1: Livex Hub Workspace
 */
export function buildHubSlideHtml({
  headingLine1 = 'All-in-one band workspace.',
  headingLine2 = 'Rehearsal suite for every musician.',
  imageBase64,
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  ${SHARED_BASE_CSS}

  .device-wrapper {
    position: absolute;
    bottom: -60px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    width: 790px;
    height: 1540px;
    display: flex;
    justify-content: center;
  }

  .device-chassis {
    position: relative;
    width: 780px;
    height: 1540px;
    background: #09090b;
    border-radius: 54px;
    padding: 8px;
    box-shadow: 
      0 45px 120px -15px rgba(0, 0, 0, 0.98),
      0 0 0 1.5px rgba(255, 255, 255, 0.14),
      0 0 80px -10px rgba(56, 189, 248, 0.16);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .device-chassis::before {
    content: '';
    position: absolute;
    inset: 1.5px;
    border-radius: 52px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    pointer-events: none;
    z-index: 6;
  }

  .screen-frame {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 46px;
    overflow: hidden;
    background: #000000;
  }

  .screen-frame img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    display: block;
  }

  .camera-punch {
    position: absolute;
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    width: 24px;
    height: 7px;
    background: #000000;
    border-radius: 4px;
    border: 1.2px solid rgba(255, 255, 255, 0.12);
    z-index: 10;
  }

  .screen-gloss {
    position: absolute;
    inset: 0;
    border-radius: 46px;
    background: linear-gradient(140deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 45%);
    pointer-events: none;
    z-index: 8;
  }
</style>
</head>
<body>
<div class="canvas">
  <div class="grid-pattern"></div>
  <div class="top-ambient"></div>

  <div class="header-container">
    <h1 class="title-primary">${headingLine1}</h1>
    <p class="title-secondary">${headingLine2}</p>
  </div>

  <div class="device-wrapper">
    <div class="device-chassis">
      <div class="camera-punch"></div>
      <div class="screen-frame">
        <img src="${imageBase64}" alt="Livex Hub" />
        <div class="screen-gloss"></div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/**
 * Slide 2: Chordex Chord Library with Open Morph Modal
 */
export function buildChordMorphSlideHtml({
  headingLine1 = 'Smart chord library.',
  headingLine2 = 'Interactive fretboards, voicings & keys.',
  imageBase64,
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  ${SHARED_BASE_CSS}

  .device-wrapper {
    position: absolute;
    bottom: -60px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    width: 790px;
    height: 1540px;
    display: flex;
    justify-content: center;
  }

  .device-chassis {
    position: relative;
    width: 780px;
    height: 1540px;
    background: #09090b;
    border-radius: 54px;
    padding: 8px;
    box-shadow: 
      0 45px 120px -15px rgba(0, 0, 0, 0.98),
      0 0 0 1.5px rgba(255, 255, 255, 0.14),
      0 0 80px -10px rgba(59, 130, 246, 0.16);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .device-chassis::before {
    content: '';
    position: absolute;
    inset: 1.5px;
    border-radius: 52px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    pointer-events: none;
    z-index: 6;
  }

  .screen-frame {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 46px;
    overflow: hidden;
    background: #000000;
  }

  .screen-frame img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    display: block;
  }

  .camera-punch {
    position: absolute;
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    width: 24px;
    height: 7px;
    background: #000000;
    border-radius: 4px;
    border: 1.2px solid rgba(255, 255, 255, 0.12);
    z-index: 10;
  }

  .screen-gloss {
    position: absolute;
    inset: 0;
    border-radius: 46px;
    background: linear-gradient(140deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 45%);
    pointer-events: none;
    z-index: 8;
  }
</style>
</head>
<body>
<div class="canvas">
  <div class="grid-pattern"></div>
  <div class="top-ambient"></div>

  <div class="header-container">
    <h1 class="title-primary">${headingLine1}</h1>
    <p class="title-secondary">${headingLine2}</p>
  </div>

  <div class="device-wrapper">
    <div class="device-chassis">
      <div class="camera-punch"></div>
      <div class="screen-frame">
        <img src="${imageBase64}" alt="Chordex Library" />
        <div class="screen-gloss"></div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/**
 * Slide 3: 3 Live Performance Modes (Chords, Lyrics, Both)
 * Strict left-to-right order:
 * Left: Chords mode
 * Middle: Lyrics / Teleprompter mode
 * Right: Both mode
 */
export function buildThreeLiveModesSlideHtml({
  headingLine1 = '3 live performance modes.',
  headingLine2 = 'Chords, lyrics, or both synchronized.',
  chordsImageBase64,
  prompterImageBase64,
  combinedImageBase64,
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  ${SHARED_BASE_CSS}

  .stage-viewport {
    position: absolute;
    top: 320px;
    bottom: -60px;
    left: 0;
    width: 1080px;
    z-index: 10;
  }

  .phone-card {
    position: absolute;
    background: #09090b;
    border-radius: 50px;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 
      0 40px 100px -10px rgba(0, 0, 0, 0.95),
      0 0 0 1.5px rgba(255, 255, 255, 0.12);
  }

  .phone-card::before {
    content: '';
    position: absolute;
    inset: 1.5px;
    border-radius: 48px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    pointer-events: none;
    z-index: 6;
  }

  .phone-screen {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 44px;
    overflow: hidden;
    background: #000000;
  }

  .phone-screen img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    display: block;
  }

  .phone-punch {
    position: absolute;
    top: 11px;
    left: 50%;
    transform: translateX(-50%);
    width: 22px;
    height: 6px;
    background: #000000;
    border-radius: 3px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    z-index: 10;
  }

  .phone-gloss {
    position: absolute;
    inset: 0;
    border-radius: 44px;
    background: linear-gradient(140deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 45%);
    pointer-events: none;
    z-index: 8;
  }

  /* Left: Chords Mode */
  .phone-left {
    top: 80px;
    left: 50%;
    transform: translateX(-94%) rotate(-4.5deg);
    width: 590px;
    height: 1580px;
    z-index: 5;
    box-shadow: 
      0 35px 95px -10px rgba(0, 0, 0, 0.92),
      0 0 0 1.3px rgba(255, 255, 255, 0.1);
  }

  /* Middle: Lyrics / Teleprompter Mode (Foreground hero) */
  .phone-center {
    top: 15px;
    left: 50%;
    transform: translateX(-50%);
    width: 630px;
    height: 1640px;
    z-index: 10;
    box-shadow: 
      0 45px 125px -10px rgba(0, 0, 0, 0.98),
      0 0 0 1.8px rgba(255, 255, 255, 0.16),
      0 0 75px -10px rgba(245, 158, 11, 0.16);
  }

  /* Right: Both Mode */
  .phone-right {
    top: 80px;
    left: 50%;
    transform: translateX(-6%) rotate(4.5deg);
    width: 590px;
    height: 1580px;
    z-index: 5;
    box-shadow: 
      0 35px 95px -10px rgba(0, 0, 0, 0.92),
      0 0 0 1.3px rgba(255, 255, 255, 0.1);
  }
</style>
</head>
<body>
<div class="canvas">
  <div class="grid-pattern"></div>
  <div class="top-ambient"></div>

  <div class="header-container">
    <h1 class="title-primary">${headingLine1}</h1>
    <p class="title-secondary">${headingLine2}</p>
  </div>

  <div class="stage-viewport">
    <!-- LEFT: Chords Mode -->
    <div class="phone-card phone-left">
      <div class="phone-punch"></div>
      <div class="phone-screen">
        <img src="${chordsImageBase64}" alt="Live Chords View" />
        <div class="phone-gloss"></div>
      </div>
    </div>

    <!-- MIDDLE: Lyrics / Teleprompter Mode -->
    <div class="phone-card phone-center">
      <div class="phone-punch"></div>
      <div class="phone-screen">
        <img src="${prompterImageBase64}" alt="Live Teleprompter Lyrics View" />
        <div class="phone-gloss"></div>
      </div>
    </div>

    <!-- RIGHT: Both Mode -->
    <div class="phone-card phone-right">
      <div class="phone-punch"></div>
      <div class="phone-screen">
        <img src="${combinedImageBase64}" alt="Live Synchronized Both View" />
        <div class="phone-gloss"></div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/**
 * Slide 4: Drumex Multi-Track Step Sequencer
 */
export function buildDrumexSlideHtml({
  headingLine1 = 'Multi-track step sequencer.',
  headingLine2 = 'Design punchy beats & rhythm patterns.',
  imageBase64,
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  ${SHARED_BASE_CSS}

  .device-wrapper {
    position: absolute;
    bottom: -60px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    width: 790px;
    height: 1540px;
    display: flex;
    justify-content: center;
  }

  .device-chassis {
    position: relative;
    width: 780px;
    height: 1540px;
    background: #09090b;
    border-radius: 54px;
    padding: 8px;
    box-shadow: 
      0 45px 120px -15px rgba(0, 0, 0, 0.98),
      0 0 0 1.5px rgba(255, 255, 255, 0.14),
      0 0 80px -10px rgba(234, 88, 12, 0.16);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .device-chassis::before {
    content: '';
    position: absolute;
    inset: 1.5px;
    border-radius: 52px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    pointer-events: none;
    z-index: 6;
  }

  .screen-frame {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 46px;
    overflow: hidden;
    background: #000000;
  }

  .screen-frame img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    display: block;
  }

  .camera-punch {
    position: absolute;
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    width: 24px;
    height: 7px;
    background: #000000;
    border-radius: 4px;
    border: 1.2px solid rgba(255, 255, 255, 0.12);
    z-index: 10;
  }

  .screen-gloss {
    position: absolute;
    inset: 0;
    border-radius: 46px;
    background: linear-gradient(140deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 45%);
    pointer-events: none;
    z-index: 8;
  }
</style>
</head>
<body>
<div class="canvas">
  <div class="grid-pattern"></div>
  <div class="top-ambient"></div>

  <div class="header-container">
    <h1 class="title-primary">${headingLine1}</h1>
    <p class="title-secondary">${headingLine2}</p>
  </div>

  <div class="device-wrapper">
    <div class="device-chassis">
      <div class="camera-punch"></div>
      <div class="screen-frame">
        <img src="${imageBase64}" alt="Drumex Sequencer" />
        <div class="screen-gloss"></div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/**
 * Slide 5: Stagex Stage Plot & PDF Export Technical Rider
 * 2 Devices:
 * - Main phone (foreground): Stage plot rotated for landscape
 * - Secondary phone (behind/side): PDF Export sheet in portrait
 */
export function buildStagexPlotAndExportSlideHtml({
  headingLine1 = 'Visual stage plots & tech riders.',
  headingLine2 = 'Interactive layout with instant PDF export.',
  landscapePlotImageBase64,
  portraitExportImageBase64,
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  ${SHARED_BASE_CSS}

  .stagex-container {
    position: absolute;
    top: 340px;
    left: 0;
    width: 1080px;
    height: 1580px;
    z-index: 10;
  }

  /* Production Phone (Centered Portrait, PDF Export Document) */
  .phone-export {
    position: absolute;
    top: 15px;
    left: 50%;
    transform: translateX(-50%);
    width: 630px;
    height: 1320px;
    background: #09090b;
    border-radius: 50px;
    padding: 8px;
    box-shadow: 
      0 45px 120px -10px rgba(0, 0, 0, 0.98),
      0 0 0 1.5px rgba(255, 255, 255, 0.14);
    z-index: 4;
  }

  .phone-export::before {
    content: '';
    position: absolute;
    inset: 1.5px;
    border-radius: 48px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    pointer-events: none;
    z-index: 6;
  }

  .export-screen {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 44px;
    overflow: hidden;
    background: #000000;
  }

  .export-screen img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    display: block;
  }

  .export-punch {
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    width: 22px;
    height: 6px;
    background: #000000;
    border-radius: 3px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    z-index: 10;
  }

  /* Main Phone (Foreground, Landscape, Stage Plot) */
  .phone-landscape {
    position: absolute;
    top: 980px;
    left: 50%;
    transform: translateX(-50%);
    width: 1000px;
    height: 500px;
    background: #09090b;
    border-radius: 52px;
    padding: 8px;
    box-shadow: 
      0 50px 130px -15px rgba(0, 0, 0, 0.98),
      0 0 0 1.8px rgba(255, 255, 255, 0.16),
      0 0 80px -10px rgba(16, 185, 129, 0.18);
    z-index: 10;
  }

  .phone-landscape::before {
    content: '';
    position: absolute;
    inset: 1.5px;
    border-radius: 50px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    pointer-events: none;
    z-index: 6;
  }

  .landscape-screen {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 44px;
    overflow: hidden;
    background: #000000;
  }

  .landscape-screen img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
  }

  .landscape-punch {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 7px;
    height: 24px;
    background: #000000;
    border-radius: 4px;
    border: 1.2px solid rgba(255, 255, 255, 0.12);
    z-index: 10;
  }

  .gloss-layer {
    position: absolute;
    inset: 0;
    background: linear-gradient(140deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 45%);
    pointer-events: none;
    z-index: 8;
  }
</style>
</head>
<body>
<div class="canvas">
  <div class="grid-pattern"></div>
  <div class="top-ambient"></div>

  <div class="header-container">
    <h1 class="title-primary">${headingLine1}</h1>
    <p class="title-secondary">${headingLine2}</p>
  </div>

  <div class="stagex-container">
    <!-- Secondary Phone: PDF Technical Rider Export (Portrait) -->
    <div class="phone-export">
      <div class="export-punch"></div>
      <div class="export-screen">
        <img src="${portraitExportImageBase64}" alt="Stagex Technical Rider PDF Export" />
        <div class="gloss-layer"></div>
      </div>
    </div>

    <!-- Main Phone: Interactive Stage Plot (Landscape) -->
    <div class="phone-landscape">
      <div class="landscape-punch"></div>
      <div class="landscape-screen">
        <img src="${landscapePlotImageBase64}" alt="Stagex Interactive Stage Plot" />
        <div class="gloss-layer"></div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/**
 * Slide 6: Vocalex Exercises & Recording Takes
 * 2 Devices:
 * - Phone 1 (Left): Vocal exercises & coach routines
 * - Phone 2 (Right): Vocal recording takes & lossless waveform player
 */
export function buildVocalexExercisesAndTakesSlideHtml({
  headingLine1 = 'Vocal coach & recording takes.',
  headingLine2 = 'Guided training routines & lossless audio.',
  exercisesImageBase64,
  takesImageBase64,
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  ${SHARED_BASE_CSS}

  .vocalex-stage {
    position: absolute;
    top: 320px;
    bottom: -60px;
    left: 0;
    width: 1080px;
    z-index: 10;
  }

  .vocal-phone {
    position: absolute;
    background: #09090b;
    border-radius: 50px;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 
      0 40px 100px -10px rgba(0, 0, 0, 0.95),
      0 0 0 1.5px rgba(255, 255, 255, 0.12);
  }

  .vocal-phone::before {
    content: '';
    position: absolute;
    inset: 1.5px;
    border-radius: 48px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    pointer-events: none;
    z-index: 6;
  }

  .vocal-screen {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 44px;
    overflow: hidden;
    background: #000000;
  }

  .vocal-screen img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    display: block;
  }

  .vocal-punch {
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    width: 22px;
    height: 6px;
    background: #000000;
    border-radius: 3px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    z-index: 10;
  }

  .vocal-gloss {
    position: absolute;
    inset: 0;
    border-radius: 44px;
    background: linear-gradient(140deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 45%);
    pointer-events: none;
    z-index: 8;
  }

  /* Left Phone: Vocal Exercises */
  .vocal-left {
    top: 75px;
    left: 50%;
    transform: translateX(-92%) rotate(-4deg);
    width: 640px;
    height: 1580px;
    z-index: 5;
    box-shadow: 
      0 35px 95px -10px rgba(0, 0, 0, 0.92),
      0 0 0 1.3px rgba(255, 255, 255, 0.1);
  }

  /* Right Phone: Recording Takes (Foreground Hero) */
  .vocal-right {
    top: 15px;
    left: 50%;
    transform: translateX(-8%) rotate(3deg);
    width: 660px;
    height: 1640px;
    z-index: 10;
    box-shadow: 
      0 45px 125px -10px rgba(0, 0, 0, 0.98),
      0 0 0 1.8px rgba(255, 255, 255, 0.16),
      0 0 75px -10px rgba(236, 72, 153, 0.18);
  }
</style>
</head>
<body>
<div class="canvas">
  <div class="grid-pattern"></div>
  <div class="top-ambient"></div>

  <div class="header-container">
    <h1 class="title-primary">${headingLine1}</h1>
    <p class="title-secondary">${headingLine2}</p>
  </div>

  <div class="vocalex-stage">
    <!-- LEFT: Vocal Exercises & Coach -->
    <div class="vocal-phone vocal-left">
      <div class="vocal-punch"></div>
      <div class="vocal-screen">
        <img src="${exercisesImageBase64}" alt="Vocalex Exercises & Coach" />
        <div class="vocal-gloss"></div>
      </div>
    </div>

    <!-- RIGHT: Recording Takes -->
    <div class="vocal-phone vocal-right">
      <div class="vocal-punch"></div>
      <div class="vocal-screen">
        <img src="${takesImageBase64}" alt="Vocalex Takes & Recordings" />
        <div class="vocal-gloss"></div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}
