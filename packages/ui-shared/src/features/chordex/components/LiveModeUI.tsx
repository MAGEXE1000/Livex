import React from 'react';
import { LiveDiagram, MiniLiveDiagram } from './LiveDiagrams';
import { Button } from '../../../shared/design-system/buttons';
import ElasticSlider from '../../../shared/progress/ElasticSlider';
import {
  type LiveModeState,
  type LiveDisplayMode,
  type TeleprompterFontFamily,
  type TeleprompterLineHeight,
  type TeleprompterAlignment,
  type TeleprompterLineChunk,
} from './useLiveModeState';
import { useSettingsStore, getChordById, type LyricTextSpan } from '@workspace/livex-core';

/* ── HEADER ─────────────────────────────────────────────────── */
export function LiveModeHeader({ state }: { state: LiveModeState }) {
  const {
    preset,
    accent,
    autoPlay,
    setAutoPlay,
    showSettings,
    setShowSettings,
    bpmOverride,
    handleClose,
    displayMode,
    isTeleprompterMode,
  } = state;

  const modeBadgeText = (() => {
    switch (displayMode) {
      case 'chords_both':
      case 'chords_diagram':
      case 'chords_name':
        return 'CHORDS';
      case 'lyrics_only':
        return 'LYRICS';
      case 'lyrics_chord_diagram':
        return 'LYRICS + DIAGRAMS';
      case 'lyrics_chord_name':
      default:
        return 'CHORDS + LYRICS';
    }
  })();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        flexShrink: 0,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <Button
        variant="secondary"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        data-testid="live-close"
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          borderColor: 'rgba(255,255,255,0.12)',
          pointerEvents: 'all',
        }}
        icon="close"
      />

      <div style={{ textAlign: 'center', pointerEvents: 'all' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <p
            style={{
              color: 'var(--c-text-primary)',
              fontFamily: 'var(--studio-font-body)',
              fontWeight: 800,
              fontSize: '15px',
            }}
          >
            {preset.name}
          </p>
          <span
            style={{
              fontFamily: 'var(--studio-font-body)',
              fontSize: '9px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              padding: '1.5px 6px',
              borderRadius: '9999px',
              background: `${accent.from}22`,
              border: `1px solid ${accent.from}44`,
              color: accent.from,
            }}
          >
            {modeBadgeText}
          </span>
        </div>
        <p style={{ color: 'var(--c-text-secondary)', fontFamily: 'Inter', fontSize: '12px', marginTop: '1px' }}>
          {preset.artist && `${preset.artist} · `}
          {preset.key && `${preset.key} · `}
          <span style={{ color: accent.from }}>{bpmOverride} BPM</span>
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px', pointerEvents: 'all' }}>
        <Button
          variant="secondary"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setShowSettings((s) => !s);
          }}
          data-testid="live-settings"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: showSettings ? `${accent.from}33` : 'rgba(255,255,255,0.08)',
            borderColor: showSettings ? accent.from + '55' : 'rgba(255,255,255,0.12)',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              color: showSettings ? accent.from : '#acabaa',
              fontSize: '20px',
              fontVariationSettings: showSettings ? "'FILL' 1" : "'FILL' 0",
            }}
          >
            tune
          </span>
        </Button>
        <Button
          variant={autoPlay ? 'primary' : 'secondary'}
          onClick={(e) => {
            e.stopPropagation();
            setAutoPlay((a) => !a);
          }}
          data-testid="live-autoplay"
          style={{
            padding: '6px 14px',
            borderRadius: '9999px',
            background: autoPlay
              ? `linear-gradient(135deg, ${accent.from}, ${accent.to})`
              : 'rgba(255,255,255,0.08)',
            borderColor: autoPlay ? 'transparent' : 'rgba(255,255,255,0.12)',
            color: autoPlay ? '#fff' : '#acabaa',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '16px',
              fontVariationSettings: autoPlay ? "'FILL' 1" : "'FILL' 0",
            }}
          >
            {autoPlay ? 'pause' : 'play_arrow'}
          </span>
          {isTeleprompterMode ? 'Auto' : 'Auto'}
        </Button>
      </div>
    </div>
  );
}

/* ── TELEPROMPTER VIEW (Lyrics & Hybrid) ─────────────────────── */
function getSubSpansForRange(
  spans: LyricTextSpan[],
  start: number,
  end: number,
  fallbackText: string
): LyricTextSpan[] {
  if (start >= end) return [{ text: fallbackText }];
  const result: LyricTextSpan[] = [];
  let currentOffset = 0;
  for (const span of spans) {
    const spanLen = span.text.length;
    const spanEnd = currentOffset + spanLen;
    if (spanEnd > start && currentOffset < end) {
      const overlapStart = Math.max(currentOffset, start);
      const overlapEnd = Math.min(spanEnd, end);
      const sliceStart = overlapStart - currentOffset;
      const sliceEnd = overlapEnd - currentOffset;
      const subText = span.text.slice(sliceStart, sliceEnd);
      if (subText.length > 0) {
        result.push({
          text: subText,
          format: span.format,
        });
      }
    }
    currentOffset = spanEnd;
  }
  return result.length > 0 ? result : [{ text: fallbackText }];
}

function TeleprompterView({ state }: { state: LiveModeState }) {
  const {
    teleprompterLines,
    currentLineIdx,
    displayMode,
    accent,
    handleLineClick,
    teleprompterFontSize,
    teleprompterFontFamily,
    teleprompterLineHeight,
    teleprompterAlignment,
    teleprompterMirror,
    teleprompterContainerRef,
    preset,
  } = state;

  const docFormatting = preset.lyrics?.formatting;
  const docColor = docFormatting?.defaultColor;
  const docChordColor = docFormatting?.defaultChordColor || '#38bdf8';

  const fontSizes = {
    normal: { text: '18px', chord: '13px', lineGap: '16px' },
    large: { text: '22px', chord: '15px', lineGap: '20px' },
    huge: { text: '28px', chord: '17px', lineGap: '26px' },
  }[teleprompterFontSize] || { text: '18px', chord: '13px', lineGap: '16px' };

  const resolvedFontFamily = (() => {
    switch (teleprompterFontFamily) {
      case 'sans':
        return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      case 'serif':
        return 'Georgia, Cambria, "Times New Roman", Times, serif';
      case 'mono':
        return 'var(--studio-font-mono, "SF Mono", Consolas, monospace)';
      case 'studio':
      default:
        return 'var(--studio-font-body, system-ui, sans-serif)';
    }
  })();

  const resolvedLineHeight = (() => {
    switch (teleprompterLineHeight) {
      case 'compact':
        return 1.25;
      case 'relaxed':
        return 1.95;
      case 'normal':
      default:
        return 1.55;
    }
  })();

  const isCentered = teleprompterAlignment === 'center';

  if (teleprompterLines.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--c-text-secondary)',
          fontFamily: resolvedFontFamily,
        }}
      >
        <p>No lyrics added to this song.</p>
      </div>
    );
  }

  return (
    <div
      ref={teleprompterContainerRef}
      data-testid="teleprompter-container"
      style={{
        flex: 1,
        width: '100%',
        maxWidth: '820px',
        margin: '0 auto',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '24px 20px 140px',
        display: 'flex',
        flexDirection: 'column',
        gap: fontSizes.lineGap,
        scrollBehavior: 'smooth',
        WebkitOverflowScrolling: 'touch',
        transform: teleprompterMirror ? 'scaleX(-1)' : 'none',
      }}
    >
      {teleprompterLines.map((item, idx) => {
        const isActive = idx === currentLineIdx;
        const isPast = idx < currentLineIdx;
        const isBold = Boolean(item.line.format?.bold);
        const resolvedColor =
          item.line.format?.color || docColor || 'var(--c-text-primary, #ffffff)';
        const hasSectionPill = Boolean(item.sectionName && item.sectionName.trim().length > 0);

        return (
          <div
            key={item.id}
            id={`live-line-${idx}`}
            data-testid={`teleprompter-line-${idx}`}
            onClick={(e) => {
              e.stopPropagation();
              handleLineClick(idx);
            }}
            style={{
              position: 'relative',
              borderRadius: '16px',
              padding: '12px 18px',
              background: isActive
                ? `color-mix(in srgb, ${accent.from} 15%, rgba(255,255,255,0.03))`
                : 'transparent',
              borderLeft: isActive
                ? `4px solid ${accent.from}`
                : '4px solid transparent',
              boxShadow: isActive
                ? `0 0 24px ${accent.from}22, inset 0 0 12px ${accent.from}11`
                : 'none',
              opacity: isActive ? 1 : isPast ? 0.38 : 0.85,
              transition:
                'background 250ms ease, opacity 250ms ease, border-color 250ms ease, box-shadow 250ms ease',
              cursor: 'pointer',
              textAlign: isCentered ? 'center' : 'left',
            }}
          >
            {/* Section Header if first line of section AND section has a name or role */}
            {item.isFirstLineOfSection && (hasSectionPill || item.sectionVocalRole) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isCentered ? 'center' : 'flex-start',
                  gap: '8px',
                  marginBottom: '10px',
                }}
              >
                {hasSectionPill && (
                  <span
                    style={{
                      fontFamily: 'var(--studio-font-body)',
                      fontWeight: 800,
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      background: `${accent.from}28`,
                      border: `1px solid ${accent.from}44`,
                      color: accent.from,
                    }}
                  >
                    {item.sectionName}
                  </span>
                )}

                {item.sectionVocalRole && (
                  <span
                    style={{
                      fontFamily: 'var(--studio-font-body)',
                      fontWeight: 700,
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: `${item.sectionVocalRole.color || '#3b82f6'}22`,
                      border: `1px solid ${item.sectionVocalRole.color || '#3b82f6'}44`,
                      color: item.sectionVocalRole.color || '#3b82f6',
                    }}
                  >
                    {item.sectionVocalRole.label || item.sectionVocalRole.type}
                  </span>
                )}
              </div>
            )}

            {/* Line vocal role badge (if line-specific and not section-first) */}
            {item.line.vocalRole && !item.isFirstLineOfSection && (
              <div
                style={{
                  marginBottom: '6px',
                  display: 'flex',
                  justifyContent: isCentered ? 'center' : 'flex-start',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--studio-font-body)',
                    fontWeight: 700,
                    fontSize: '9.5px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    padding: '2px 7px',
                    borderRadius: '9999px',
                    background: `${item.line.vocalRole.color || '#3b82f6'}22`,
                    border: `1px solid ${item.line.vocalRole.color || '#3b82f6'}44`,
                    color: item.line.vocalRole.color || '#3b82f6',
                  }}
                >
                  {item.line.vocalRole.label || item.line.vocalRole.type}
                </span>
              </div>
            )}

            {/* Line Chords + Lyrics Content */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-end',
                justifyContent: isCentered ? 'center' : 'flex-start',
                lineHeight: resolvedLineHeight,
              }}
            >
              {displayMode === 'lyrics_only' ? (
                /* Lyrics Only with fine-grained span formatting support */
                item.line.spans && item.line.spans.length > 0 ? (
                  <span
                    style={{
                      fontFamily: resolvedFontFamily,
                      fontSize: fontSizes.text,
                      lineHeight: resolvedLineHeight,
                      textAlign: isCentered ? 'center' : 'left',
                      whiteSpace: 'pre-wrap',
                      display: 'inline-block',
                      width: '100%',
                    }}
                  >
                    {item.line.spans.map((span, sIdx) => {
                      const spanBold = span.format?.bold ?? isBold;
                      const spanItalic = Boolean(span.format?.italic);
                      const spanUnderline = Boolean(span.format?.underline);
                      const spanColor = span.format?.color || resolvedColor;
                      return (
                        <span
                          key={sIdx}
                          style={{
                            fontWeight: spanBold ? 800 : 500,
                            fontStyle: spanItalic ? 'italic' : 'normal',
                            textDecoration: spanUnderline ? 'underline' : 'none',
                            color: spanColor,
                          }}
                        >
                          {span.text}
                        </span>
                      );
                    })}
                  </span>
                ) : (
                  <span
                    style={{
                      fontFamily: resolvedFontFamily,
                      fontSize: fontSizes.text,
                      fontWeight: isBold ? 800 : 500,
                      color: resolvedColor,
                      lineHeight: resolvedLineHeight,
                      textAlign: isCentered ? 'center' : 'left',
                      whiteSpace: 'pre-wrap',
                      display: 'inline-block',
                      width: '100%',
                    }}
                  >
                    {item.line.text || '\u00A0'}
                  </span>
                )
              ) : (
                /* Chords + Lyrics (lyrics_chord_name or lyrics_chord_diagram) */
                item.chunks.map((chunk, cIdx) => {
                  const chordData =
                    displayMode === 'lyrics_chord_diagram' && chunk.chord
                      ? getChordById(chunk.chord)
                      : null;

                  const subSpans =
                    item.line.spans && item.line.spans.length > 0
                      ? getSubSpansForRange(
                          item.line.spans,
                          chunk.startOffset,
                          chunk.endOffset,
                          chunk.text
                        )
                      : null;

                  return (
                    <div
                      key={cIdx}
                      style={{
                        display: 'inline-flex',
                        flexDirection: 'column',
                        alignItems: isCentered ? 'center' : 'flex-start',
                        verticalAlign: 'bottom',
                      }}
                    >
                      {/* Diagram or Chord Name */}
                      <div
                        style={{
                          minHeight: displayMode === 'lyrics_chord_diagram' ? '54px' : '22px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-end',
                          alignItems: isCentered ? 'center' : 'flex-start',
                          paddingBottom: '2px',
                        }}
                      >
                        {displayMode === 'lyrics_chord_diagram' && chordData?.guitar && (
                          <div
                            style={{
                              transform: 'scale(0.65)',
                              transformOrigin: isCentered ? 'bottom center' : 'bottom left',
                              marginBottom: '-16px',
                              marginRight: isCentered ? '0' : '-14px',
                            }}
                          >
                            <MiniLiveDiagram
                              data={chordData.guitar}
                              accentFrom={accent.from}
                              width={50}
                              height={60}
                            />
                          </div>
                        )}
                        <span
                          style={{
                            fontFamily: 'var(--studio-font-mono, monospace)',
                            fontWeight: 800,
                            fontSize: fontSizes.chord,
                            color: chunk.chord
                              ? isActive
                                ? accent.from
                                : docChordColor
                              : 'transparent',
                            userSelect: 'none',
                          }}
                        >
                          {chunk.chord || '\u00A0'}
                        </span>
                      </div>

                      {/* Syllable text with fine-grained formatting */}
                      {subSpans ? (
                        <span
                          style={{
                            fontFamily: resolvedFontFamily,
                            fontSize: fontSizes.text,
                            lineHeight: resolvedLineHeight,
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {subSpans.map((s, sIdx) => {
                            const spanBold = s.format?.bold ?? isBold;
                            const spanItalic = Boolean(s.format?.italic);
                            const spanUnderline = Boolean(s.format?.underline);
                            const spanColor = s.format?.color || resolvedColor;
                            return (
                              <span
                                key={sIdx}
                                style={{
                                  fontWeight: spanBold ? 800 : 500,
                                  fontStyle: spanItalic ? 'italic' : 'normal',
                                  textDecoration: spanUnderline ? 'underline' : 'none',
                                  color: spanColor,
                                }}
                              >
                                {s.text}
                              </span>
                            );
                          })}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontFamily: resolvedFontFamily,
                            fontSize: fontSizes.text,
                            fontWeight: isBold ? 800 : 500,
                            color: resolvedColor,
                            lineHeight: resolvedLineHeight,
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {chunk.text}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── VISUALIZER DISPATCHER ───────────────────────────────────── */
export function LiveModeVisualizer({ state }: { state: LiveModeState }) {
  const {
    isTeleprompterMode,
    showContext,
    prevChord,
    nextChord,
    visualStyle,
    accent,
    shownIdx,
    sectionLabels,
    shownChord,
    chordStyle,
  } = state;
  const liveModeAnimations = useSettingsStore((s) => s.settings.liveModeAnimations);

  if (isTeleprompterMode) {
    return <TeleprompterView state={state} />;
  }

  // ── Pure Chords Performer Visualizer ──
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Context: prev (left) */}
      {showContext && prevChord && (
        <div
          style={{
            position: 'absolute',
            left: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            opacity: 0.35,
            pointerEvents: 'none',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ color: 'var(--c-text-secondary)', fontSize: '14px' }}
          >
            chevron_left
          </span>
          {(visualStyle === 'diagram' || visualStyle === 'both') && prevChord.guitar && (
            <MiniLiveDiagram data={prevChord.guitar} accentFrom={accent.from} />
          )}
          <p
            style={{
              color: 'var(--c-text-secondary)',
              fontFamily: 'var(--studio-font-body)',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            {prevChord.name.replace(/s/g, '')}
          </p>
        </div>
      )}

      {/* Context: next (right) */}
      {showContext && nextChord && (
        <div
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            opacity: 0.35,
            pointerEvents: 'none',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ color: 'var(--c-text-secondary)', fontSize: '14px' }}
          >
            chevron_right
          </span>
          {(visualStyle === 'diagram' || visualStyle === 'both') && nextChord.guitar && (
            <MiniLiveDiagram data={nextChord.guitar} accentFrom={accent.from} />
          )}
          <p
            style={{
              color: 'var(--c-text-secondary)',
              fontFamily: 'var(--studio-font-body)',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            {nextChord.name.replace(/s/g, '')}
          </p>
        </div>
      )}

      {/* Active chord */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          willChange: 'transform, opacity, filter',
          ...chordStyle,
        }}
      >
        {/* Section label */}
        {sectionLabels[shownIdx] && (
          <p
            style={{
              color: accent.from,
              fontFamily: 'var(--studio-font-body)',
              fontWeight: 700,
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              opacity: 0.7,
              marginBottom: '-2px',
            }}
          >
            {sectionLabels[shownIdx]}
          </p>
        )}

        {/* Full diagram */}
        {(visualStyle === 'diagram' || visualStyle === 'both') && shownChord?.guitar && (
          <div style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                inset: '-20px',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${accent.from}1a 0%, transparent 70%)`,
                pointerEvents: 'none',
              }}
            />
            {liveModeAnimations && (
              <div
                key={`bloom-${shownIdx}`}
                style={{
                  position: 'absolute',
                  inset: '-28px',
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${accent.from}40 0%, ${accent.to}18 50%, transparent 70%)`,
                  pointerEvents: 'none',
                  animation: 'chord-bloom 600ms cubic-bezier(0.22, 1, 0.36, 1) both',
                }}
              />
            )}
            <LiveDiagram data={shownChord.guitar} accentFrom={accent.from} accentTo={accent.to} />
          </div>
        )}

        {/* Chord name + notes */}
        {(visualStyle === 'name' || visualStyle === 'both') && (
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontFamily: 'var(--studio-font-body)',
                fontWeight: 900,
                fontSize: visualStyle === 'name' ? '100px' : '48px',
                lineHeight: 1,
                letterSpacing: '-0.04em',
                background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                paddingBottom: '2px',
              }}
            >
              {shownChord ? shownChord.name.replace(/\s/g, '') : '?'}
            </p>
            {shownChord && (
              <p
                style={{
                  color: 'var(--c-text-secondary)',
                  fontFamily: 'Inter',
                  fontSize: '13px',
                  marginTop: '4px',
                  letterSpacing: '0.06em',
                }}
              >
                {shownChord.notes.join('  ·  ')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── PROGRESS INDICATOR ──────────────────────────────────────── */
export function LiveModeProgress({ state }: { state: LiveModeState }) {
  const {
    total,
    chords,
    currentIdx,
    accent,
    autoPlay,
    msPerChord,
    setDirection,
    setCurrentIdx,
    isTeleprompterMode,
    currentLineIdx,
    totalLines,
    teleprompterLines,
  } = state;

  if (isTeleprompterMode) {
    if (totalLines === 0) return null;
    const currentItem = teleprompterLines[currentLineIdx];
    return (
      <div
        style={{
          position: 'absolute',
          bottom: '84px',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        <div
          style={{
            padding: '5px 16px',
            borderRadius: '9999px',
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <span
            style={{
              color: accent.from,
              fontFamily: 'var(--studio-font-body)',
              fontWeight: 800,
              fontSize: '11px',
            }}
          >
            Line {currentLineIdx + 1} of {totalLines}
          </span>
          {currentItem?.sectionName && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>•</span>
              <span
                style={{
                  color: 'var(--c-text-secondary)',
                  fontFamily: 'var(--studio-font-body)',
                  fontWeight: 600,
                  fontSize: '11px',
                }}
              >
                {currentItem.sectionName}
              </span>
            </>
          )}
        </div>
      </div>
    );
  }

  // Pure Chords progression dots
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '84px',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        gap: '5px',
        alignItems: 'center',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      {total <= 16 ? (
        chords.map((_, i) => {
          const isActive = i === currentIdx;
          return isActive ? (
            <div
              key={`active-${currentIdx}`}
              style={{
                position: 'relative',
                width: '32px',
                height: '6px',
                borderRadius: '9999px',
                background: 'rgba(255,255,255,0.1)',
                overflow: 'hidden',
                pointerEvents: 'all',
                flexShrink: 0,
                transition: 'width 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <div
                key={`fill-${currentIdx}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: '100%',
                  background: `linear-gradient(90deg, ${accent.from}, ${accent.to})`,
                  borderRadius: '9999px',
                  transformOrigin: 'left center',
                  animation: autoPlay ? `chord-countdown ${msPerChord}ms linear forwards` : 'none',
                }}
              />
            </div>
          ) : (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setDirection(i > currentIdx ? 'forward' : 'backward');
                setCurrentIdx(i);
              }}
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '9999px',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                cursor: 'pointer',
                pointerEvents: 'all',
                flexShrink: 0,
                padding: 0,
                transition: 'background 200ms ease',
              }}
            />
          );
        })
      ) : (
        <p style={{ color: 'var(--c-text-muted)', fontFamily: 'Inter', fontSize: '12px' }}>
          {currentIdx + 1} / {total}
        </p>
      )}
    </div>
  );
}

/* ── CONTROLS BAR ────────────────────────────────────────────── */
export function LiveModeControls({ state }: { state: LiveModeState }) {
  const { goPrev, goNext, currentIdx, currentLineIdx, isTeleprompterMode, totalLines, accent } =
    state;
  const isAtStart = isTeleprompterMode ? currentLineIdx === 0 : currentIdx === 0;
  const isAtEnd = isTeleprompterMode ? currentLineIdx >= totalLines - 1 : false;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 28px',
        paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
        flexShrink: 0,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <Button
        variant="secondary"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          goPrev();
        }}
        data-testid="live-prev"
        disabled={isAtStart}
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          borderColor: 'rgba(255,255,255,0.1)',
          opacity: isAtStart ? 0.25 : 1,
          pointerEvents: 'all',
        }}
        icon="arrow-left"
      />
      <div style={{ width: '48px' }} />
      <Button
        variant="primary"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          goNext();
        }}
        data-testid="live-next"
        disabled={isAtEnd}
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
          boxShadow: `0 4px 20px ${accent.to}55`,
          opacity: isAtEnd ? 0.25 : 1,
          pointerEvents: 'all',
        }}
        icon="arrow-right"
      />
    </div>
  );
}

/* ── SETTINGS SHEET ──────────────────────────────────────────── */
export function LiveModeSettings({ state }: { state: LiveModeState }) {
  const {
    setShowSettings,
    displayMode,
    setDisplayMode,
    bpmOverride,
    setBpmOverride,
    beatsPerChord,
    setBeatsPerChord,
    beatsPerLine,
    setBeatsPerLine,
    showContext,
    setShowContext,
    teleprompterFontSize,
    setTeleprompterFontSize,
    teleprompterFontFamily,
    setTeleprompterFontFamily,
    teleprompterLineHeight,
    setTeleprompterLineHeight,
    teleprompterAlignment,
    setTeleprompterAlignment,
    teleprompterMirror,
    setTeleprompterMirror,
    hasChords,
    hasLyrics,
    isTeleprompterMode,
    accent,
  } = state;

  const CHORD_OPTIONS: { value: LiveDisplayMode; label: string; icon: string }[] = [
    { value: 'chords_both', label: 'Diagram + Name', icon: 'tune' },
    { value: 'chords_diagram', label: 'Diagram Only', icon: 'grid_on' },
    { value: 'chords_name', label: 'Name Only', icon: 'title' },
  ];

  const LYRIC_OPTIONS: {
    value: LiveDisplayMode;
    label: string;
    icon: string;
    requiresChords?: boolean;
  }[] = [
    { value: 'lyrics_chord_name', label: 'Lyrics + Chords', icon: 'music_note', requiresChords: true },
    {
      value: 'lyrics_chord_diagram',
      label: 'Lyrics + Diagrams',
      icon: 'auto_stories',
      requiresChords: true,
    },
    { value: 'lyrics_only', label: 'Lyrics Only', icon: 'description' },
  ];

  return (
    <>
      <div
        onClick={(e) => {
          e.stopPropagation();
          setShowSettings(false);
        }}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(8px)',
          zIndex: 10,
        }}
      />

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#111114',
          borderTop: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '1.5rem 1.5rem 0 0',
          zIndex: 11,
          animation: 'sheet-up 350ms cubic-bezier(0.16, 1, 0.3, 1) both',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div
            style={{
              width: '36px',
              height: '4px',
              borderRadius: '9999px',
              background: 'rgba(255,255,255,0.2)',
            }}
          />
        </div>

        {/* Title row */}
        <div
          style={{
            padding: '4px 20px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p
              style={{
                color: 'var(--c-text-primary)',
                fontFamily: 'var(--studio-font-body)',
                fontWeight: 800,
                fontSize: '18px',
              }}
            >
              Live Options
            </p>
            <p
              style={{
                color: 'var(--c-text-secondary)',
                fontFamily: 'Inter',
                fontSize: '12px',
                marginTop: '1px',
              }}
            >
              Intelligent musician presentation
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(false)}
            style={{ color: 'var(--c-text-secondary)' }}
            icon="close"
          />
        </div>

        <div
          style={{
            padding: '8px 20px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* ── 1. PRESENTATION MODE: CHORDS FOCUS ───────────────── */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <p
                style={{
                  color: 'var(--c-text-secondary)',
                  fontFamily: 'var(--studio-font-body)',
                  fontWeight: 700,
                  fontSize: '10.5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                }}
              >
                Chords Focus
              </p>
              {!hasChords && (
                <span
                  style={{
                    color: '#f87171',
                    fontSize: '10px',
                    fontWeight: 600,
                    fontFamily: 'var(--studio-font-body)',
                  }}
                >
                  No chords in song
                </span>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px',
                opacity: hasChords ? 1 : 0.35,
                pointerEvents: hasChords ? 'all' : 'none',
              }}
            >
              {CHORD_OPTIONS.map((opt) => {
                const isSelected = displayMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setDisplayMode(opt.value)}
                    data-testid={`mode-option-${opt.value}`}
                    className="btn-smooth"
                    style={{
                      padding: '12px 6px',
                      borderRadius: '1rem',
                      background: isSelected ? `${accent.from}22` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isSelected ? accent.from + '66' : 'rgba(255,255,255,0.08)'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      transition: 'background 200ms ease, border-color 200ms ease',
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: '20px',
                        color: isSelected ? accent.from : '#acabaa',
                        fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0",
                      }}
                    >
                      {opt.icon}
                    </span>
                    <p
                      style={{
                        color: isSelected ? '#ffffff' : '#888888',
                        fontFamily: 'var(--studio-font-body)',
                        fontWeight: 700,
                        fontSize: '10.5px',
                        textAlign: 'center',
                        lineHeight: 1.2,
                      }}
                    >
                      {opt.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 2. PRESENTATION MODE: LYRICS & TELEPROMPTER FOCUS ─── */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <p
                style={{
                  color: 'var(--c-text-secondary)',
                  fontFamily: 'var(--studio-font-body)',
                  fontWeight: 700,
                  fontSize: '10.5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                }}
              >
                Lyrics & Teleprompter Focus
              </p>
              {!hasLyrics && (
                <span
                  style={{
                    color: '#f87171',
                    fontSize: '10px',
                    fontWeight: 600,
                    fontFamily: 'var(--studio-font-body)',
                  }}
                >
                  No lyrics in song
                </span>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px',
                opacity: hasLyrics ? 1 : 0.35,
                pointerEvents: hasLyrics ? 'all' : 'none',
              }}
            >
              {LYRIC_OPTIONS.map((opt) => {
                const isSelected = displayMode === opt.value;
                const isOptionDisabled = Boolean(opt.requiresChords && !hasChords);

                return (
                  <button
                    key={opt.value}
                    onClick={() => setDisplayMode(opt.value)}
                    data-testid={`mode-option-${opt.value}`}
                    disabled={isOptionDisabled}
                    className="btn-smooth"
                    style={{
                      padding: '12px 6px',
                      borderRadius: '1rem',
                      background: isSelected ? `${accent.from}22` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isSelected ? accent.from + '66' : 'rgba(255,255,255,0.08)'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: isOptionDisabled ? 'not-allowed' : 'pointer',
                      opacity: isOptionDisabled ? 0.35 : 1,
                      transition: 'background 200ms ease, border-color 200ms ease',
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: '20px',
                        color: isSelected ? accent.from : '#acabaa',
                        fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0",
                      }}
                    >
                      {opt.icon}
                    </span>
                    <p
                      style={{
                        color: isSelected ? '#ffffff' : '#888888',
                        fontFamily: 'var(--studio-font-body)',
                        fontWeight: 700,
                        fontSize: '10.5px',
                        textAlign: 'center',
                        lineHeight: 1.2,
                      }}
                    >
                      {opt.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 3. SPEED & TEMPO ─────────────────────────────────── */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <p
                style={{
                  color: 'var(--c-text-secondary)',
                  fontFamily: 'var(--studio-font-body)',
                  fontWeight: 700,
                  fontSize: '10.5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                }}
              >
                Speed
              </p>
              <p
                style={{
                  color: accent.from,
                  fontFamily: 'var(--studio-font-body)',
                  fontWeight: 800,
                  fontSize: '14px',
                }}
              >
                {bpmOverride} BPM
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => setBpmOverride((b: number) => Math.max(20, b - 10))}
                className="btn-smooth"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: 'none',
                  color: 'var(--c-text-primary)',
                  cursor: 'pointer',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  remove
                </span>
              </button>
              <ElasticSlider
                min={20}
                max={300}
                step={5}
                value={bpmOverride}
                onChange={setBpmOverride as any}
                accentColor={accent.from}
                style={{ flex: 1 }}
              />
              <button
                onClick={() => setBpmOverride((b: number) => Math.min(300, b + 10))}
                className="btn-smooth"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: 'none',
                  color: 'var(--c-text-primary)',
                  cursor: 'pointer',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  add
                </span>
              </button>
            </div>
          </div>

          {/* ── 4. PACING (BEATS PER CHORD OR LINE) ──────────────── */}
          <div>
            <p
              style={{
                color: 'var(--c-text-secondary)',
                fontFamily: 'var(--studio-font-body)',
                fontWeight: 700,
                fontSize: '10.5px',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                marginBottom: '10px',
              }}
            >
              {isTeleprompterMode ? 'Beats Per Line (Auto-Scroll)' : 'Beats Per Chord'}
            </p>
            {isTeleprompterMode ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                {[2, 4, 8, 16].map((b) => (
                  <button
                    key={b}
                    onClick={() => setBeatsPerLine(b)}
                    className="btn-smooth"
                    style={{
                      flex: 1,
                      padding: '10px 4px',
                      borderRadius: '0.75rem',
                      background:
                        beatsPerLine === b
                          ? `linear-gradient(135deg, ${accent.from}, ${accent.to})`
                          : 'rgba(255,255,255,0.06)',
                      color: beatsPerLine === b ? '#fff' : '#acabaa',
                      fontFamily: 'var(--studio-font-body)',
                      fontWeight: 800,
                      fontSize: '13px',
                      border: 'none',
                      boxShadow: beatsPerLine === b ? `0 2px 12px ${accent.to}44` : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 4, 8].map((b) => (
                  <button
                    key={b}
                    onClick={() => setBeatsPerChord(b as any)}
                    className="btn-smooth"
                    style={{
                      flex: 1,
                      padding: '10px 4px',
                      borderRadius: '0.75rem',
                      background:
                        beatsPerChord === b
                          ? `linear-gradient(135deg, ${accent.from}, ${accent.to})`
                          : 'rgba(255,255,255,0.06)',
                      color: beatsPerChord === b ? '#fff' : '#acabaa',
                      fontFamily: 'var(--studio-font-body)',
                      fontWeight: 800,
                      fontSize: '14px',
                      border: 'none',
                      boxShadow: beatsPerChord === b ? `0 2px 12px ${accent.to}44` : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── 5. VIEW & TELEPROMPTER OPTIONS ─────────────────────── */}
          {isTeleprompterMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Font Family */}
              <div>
                <p
                  style={{
                    color: 'var(--c-text-secondary)',
                    fontFamily: 'var(--studio-font-body)',
                    fontWeight: 700,
                    fontSize: '10.5px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    marginBottom: '8px',
                  }}
                >
                  Font Style
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {[
                    { id: 'studio', label: 'Studio' },
                    { id: 'sans', label: 'Sans' },
                    { id: 'serif', label: 'Serif' },
                    { id: 'mono', label: 'Mono' },
                  ].map((font) => (
                    <button
                      key={font.id}
                      onClick={() => setTeleprompterFontFamily(font.id as TeleprompterFontFamily)}
                      className="btn-smooth"
                      style={{
                        padding: '10px 4px',
                        borderRadius: '0.75rem',
                        background:
                          teleprompterFontFamily === font.id
                            ? `${accent.from}22`
                            : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${teleprompterFontFamily === font.id ? accent.from + '66' : 'transparent'}`,
                        color: teleprompterFontFamily === font.id ? '#ffffff' : '#acabaa',
                        fontFamily:
                          font.id === 'mono'
                            ? 'var(--studio-font-mono, monospace)'
                            : font.id === 'serif'
                              ? 'Georgia, serif'
                              : 'var(--studio-font-body)',
                        fontWeight: 700,
                        fontSize: '11.5px',
                        cursor: 'pointer',
                      }}
                    >
                      {font.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <p
                  style={{
                    color: 'var(--c-text-secondary)',
                    fontFamily: 'var(--studio-font-body)',
                    fontWeight: 700,
                    fontSize: '10.5px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    marginBottom: '8px',
                  }}
                >
                  Font Size
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['normal', 'large', 'huge'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setTeleprompterFontSize(size)}
                      className="btn-smooth"
                      style={{
                        flex: 1,
                        padding: '10px 6px',
                        borderRadius: '0.75rem',
                        background:
                          teleprompterFontSize === size
                            ? `${accent.from}22`
                            : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${teleprompterFontSize === size ? accent.from + '66' : 'transparent'}`,
                        color: teleprompterFontSize === size ? '#ffffff' : '#acabaa',
                        fontFamily: 'var(--studio-font-body)',
                        fontWeight: 700,
                        fontSize: '12px',
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Spacing */}
              <div>
                <p
                  style={{
                    color: 'var(--c-text-secondary)',
                    fontFamily: 'var(--studio-font-body)',
                    fontWeight: 700,
                    fontSize: '10.5px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    marginBottom: '8px',
                  }}
                >
                  Line Spacing
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['compact', 'normal', 'relaxed'] as const).map((spacing) => (
                    <button
                      key={spacing}
                      onClick={() => setTeleprompterLineHeight(spacing)}
                      className="btn-smooth"
                      style={{
                        flex: 1,
                        padding: '10px 6px',
                        borderRadius: '0.75rem',
                        background:
                          teleprompterLineHeight === spacing
                            ? `${accent.from}22`
                            : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${teleprompterLineHeight === spacing ? accent.from + '66' : 'transparent'}`,
                        color: teleprompterLineHeight === spacing ? '#ffffff' : '#acabaa',
                        fontFamily: 'var(--studio-font-body)',
                        fontWeight: 700,
                        fontSize: '12px',
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                      }}
                    >
                      {spacing}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alignment */}
              <div>
                <p
                  style={{
                    color: 'var(--c-text-secondary)',
                    fontFamily: 'var(--studio-font-body)',
                    fontWeight: 700,
                    fontSize: '10.5px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    marginBottom: '8px',
                  }}
                >
                  Alignment
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['left', 'center'] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() => setTeleprompterAlignment(align)}
                      className="btn-smooth"
                      style={{
                        flex: 1,
                        padding: '10px 6px',
                        borderRadius: '0.75rem',
                        background:
                          teleprompterAlignment === align
                            ? `${accent.from}22`
                            : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${teleprompterAlignment === align ? accent.from + '66' : 'transparent'}`,
                        color: teleprompterAlignment === align ? '#ffffff' : '#acabaa',
                        fontFamily: 'var(--studio-font-body)',
                        fontWeight: 700,
                        fontSize: '12px',
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                      }}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hardware Mirror Mode */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                <div>
                  <p
                    style={{
                      color: 'var(--c-text-primary)',
                      fontFamily: 'var(--studio-font-body)',
                      fontWeight: 700,
                      fontSize: '13px',
                    }}
                  >
                    Hardware Mirror Mode
                  </p>
                  <p
                    style={{
                      color: '#6b6b6b',
                      fontFamily: 'Inter',
                      fontSize: '11px',
                      marginTop: '2px',
                    }}
                  >
                    Horizontal flip for beam splitter glass
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTeleprompterMirror((m: boolean) => !m)}
                  className="btn-smooth"
                  style={{
                    width: '48px',
                    height: '28px',
                    borderRadius: '9999px',
                    background: teleprompterMirror
                      ? `linear-gradient(135deg, ${accent.from}, ${accent.to})`
                      : 'rgba(255,255,255,0.1)',
                    position: 'relative',
                    flexShrink: 0,
                    transition: 'background 300ms ease',
                    boxShadow: teleprompterMirror ? `0 2px 10px ${accent.to}44` : 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: teleprompterMirror ? '23px' : '3px',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    }}
                  />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p
                  style={{
                    color: 'var(--c-text-primary)',
                    fontFamily: 'var(--studio-font-body)',
                    fontWeight: 700,
                    fontSize: '14px',
                  }}
                >
                  Surrounding Chords
                </p>
                <p
                  style={{
                    color: '#6b6b6b',
                    fontFamily: 'Inter',
                    fontSize: '12px',
                    marginTop: '2px',
                  }}
                >
                  Show prev / next at the sides
                </p>
              </div>
              <button
                onClick={() => setShowContext((c: boolean) => !c)}
                className="btn-smooth"
                style={{
                  width: '48px',
                  height: '28px',
                  borderRadius: '9999px',
                  background: showContext
                    ? `linear-gradient(135deg, ${accent.from}, ${accent.to})`
                    : 'rgba(255,255,255,0.1)',
                  position: 'relative',
                  flexShrink: 0,
                  transition: 'background 300ms ease',
                  boxShadow: showContext ? `0 2px 10px ${accent.to}44` : 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: showContext ? '23px' : '3px',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }}
                />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
