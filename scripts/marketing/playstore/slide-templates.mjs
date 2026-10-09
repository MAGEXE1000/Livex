/**
 * Play Store Screenshot Template Generator
 *
 * Generates 1080x1920 px (9:16) standardized composites for Google Play Store screenshots:
 * - Exactly one centered device frame at a uniform vertical baseline across all slides
 * - Pixel 9 Pro flagship frame with ultra-slim bezels & pill punch-hole camera
 * - Bold, clear top editorial typography (Geist / Inter sans-serif) at identical top baseline
 * - Zero artificial floating badges or pills
 * - Pure AMOLED dark backdrops (#000000) with subtle ambient lighting & fine grid
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

  /* ── Standardized Single Centered Device Frame ── */
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
`;

/**
 * Shared template renderer producing the canonical single centered device frame
 */
export function buildStandardSlideHtml({
  headingLine1,
  headingLine2,
  imageBase64,
  glowColor = 'rgba(56, 189, 248, 0.16)',
  altText = 'Livex Screen',
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  ${SHARED_BASE_CSS}

  .device-chassis {
    box-shadow: 
      0 45px 120px -15px rgba(0, 0, 0, 0.98),
      0 0 0 1.5px rgba(255, 255, 255, 0.14),
      0 0 80px -10px ${glowColor};
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
        <img src="${imageBase64}" alt="${altText}" />
        <div class="screen-gloss"></div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/**
 * Slide 1: Livex Hub Workspace
 */
export function buildHubSlideHtml({
  headingLine1 = 'All-in-one band workspace.',
  headingLine2 = 'Rehearsal suite for every musician.',
  imageBase64,
}) {
  return buildStandardSlideHtml({
    headingLine1,
    headingLine2,
    imageBase64,
    glowColor: 'rgba(56, 189, 248, 0.16)',
    altText: 'Livex Hub Workspace',
  });
}

/**
 * Slide 2: Chordex Chord Library with Open Morph Modal
 */
export function buildChordMorphSlideHtml({
  headingLine1 = 'Smart chord library.',
  headingLine2 = 'Interactive fretboards, voicings & keys.',
  imageBase64,
}) {
  return buildStandardSlideHtml({
    headingLine1,
    headingLine2,
    imageBase64,
    glowColor: 'rgba(59, 130, 246, 0.16)',
    altText: 'Chordex Chord Library',
  });
}

/**
 * Slide 3: Live Performance Prompter
 */
export function buildLivePrompterSlideHtml({
  headingLine1 = 'Live performance prompter.',
  headingLine2 = 'Synchronized lyrics, chords & beat tracking.',
  imageBase64,
}) {
  return buildStandardSlideHtml({
    headingLine1,
    headingLine2,
    imageBase64,
    glowColor: 'rgba(245, 158, 11, 0.16)',
    altText: 'Live Performance Prompter',
  });
}

/**
 * Compatibility alias for Slide 3
 */
export function buildThreeLiveModesSlideHtml({
  headingLine1 = 'Live performance prompter.',
  headingLine2 = 'Synchronized lyrics, chords & beat tracking.',
  imageBase64,
  combinedImageBase64,
  prompterImageBase64,
}) {
  return buildLivePrompterSlideHtml({
    headingLine1,
    headingLine2,
    imageBase64: imageBase64 || combinedImageBase64 || prompterImageBase64,
  });
}

/**
 * Slide 4: Drumex Multi-Track Step Sequencer
 */
export function buildDrumexSlideHtml({
  headingLine1 = 'Multi-track step sequencer.',
  headingLine2 = 'Design punchy beats & rhythm patterns.',
  imageBase64,
}) {
  return buildStandardSlideHtml({
    headingLine1,
    headingLine2,
    imageBase64,
    glowColor: 'rgba(234, 88, 12, 0.16)',
    altText: 'Drumex Step Sequencer',
  });
}

/**
 * Slide 5: Stagex Interactive Stage Plot
 */
export function buildStagexSlideHtml({
  headingLine1 = 'Visual stage plots & tech riders.',
  headingLine2 = 'Interactive stage grid & equipment layouts.',
  imageBase64,
}) {
  return buildStandardSlideHtml({
    headingLine1,
    headingLine2,
    imageBase64,
    glowColor: 'rgba(16, 185, 129, 0.16)',
    altText: 'Stagex Interactive Stage Plot',
  });
}

/**
 * Compatibility alias for Slide 5
 */
export function buildStagexPlotAndExportSlideHtml({
  headingLine1 = 'Visual stage plots & tech riders.',
  headingLine2 = 'Interactive stage grid & equipment layouts.',
  imageBase64,
  landscapePlotImageBase64,
}) {
  return buildStagexSlideHtml({
    headingLine1,
    headingLine2,
    imageBase64: imageBase64 || landscapePlotImageBase64,
  });
}

/**
 * Slide 6: Vocalex Exercises & Coach
 */
export function buildVocalexSlideHtml({
  headingLine1 = 'Vocal coach & exercises.',
  headingLine2 = 'Guided warmup routines & vocal training.',
  imageBase64,
}) {
  return buildStandardSlideHtml({
    headingLine1,
    headingLine2,
    imageBase64,
    glowColor: 'rgba(236, 72, 153, 0.16)',
    altText: 'Vocalex Exercises & Coach',
  });
}

/**
 * Compatibility alias for Slide 6
 */
export function buildVocalexExercisesAndTakesSlideHtml({
  headingLine1 = 'Vocal coach & exercises.',
  headingLine2 = 'Guided warmup routines & vocal training.',
  imageBase64,
  exercisesImageBase64,
}) {
  return buildVocalexSlideHtml({
    headingLine1,
    headingLine2,
    imageBase64: imageBase64 || exercisesImageBase64,
  });
}
