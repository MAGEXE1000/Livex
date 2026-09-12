import React from 'react';
import { LiveDiagram, MiniLiveDiagram } from './LiveDiagrams';
import { Button } from '../../../shared/design-system/buttons';
import ElasticSlider from '../../../shared/progress/ElasticSlider';
import { type LiveModeState } from './useLiveModeState';
import { useSettingsStore } from '@workspace/studio-core';

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
  } = state;
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

      <div style={{ textAlign: 'center' }}>
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
        <p style={{ color: 'var(--c-text-secondary)', fontFamily: 'Inter', fontSize: '12px' }}>
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
          Auto
        </Button>
      </div>
    </div>
  );
}

export function LiveModeVisualizer({ state }: { state: LiveModeState }) {
  const {
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

      {/* ── Active chord ── */}
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

export function LiveModeProgress({ state }: { state: LiveModeState }) {
  const { total, chords, currentIdx, accent, autoPlay, msPerChord, setDirection, setCurrentIdx } =
    state;
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

export function LiveModeControls({ state }: { state: LiveModeState }) {
  const { goPrev, goNext, currentIdx, accent } = state;
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
        disabled={currentIdx === 0}
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          borderColor: 'rgba(255,255,255,0.1)',
          opacity: currentIdx === 0 ? 0.25 : 1,
          pointerEvents: 'all',
        }}
        icon="arrow_back"
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
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
          boxShadow: `0 4px 20px ${accent.to}55`,
          pointerEvents: 'all',
        }}
        icon="arrow_forward"
      />
    </div>
  );
}

export function LiveModeSettings({ state }: { state: LiveModeState }) {
  const {
    setShowSettings,
    visualStyle,
    setVisualStyle,
    bpmOverride,
    setBpmOverride,
    beatsPerChord,
    setBeatsPerChord,
    showContext,
    setShowContext,
    accent,
  } = state;
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
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)',
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
          background: '#111',
          borderRadius: '1.5rem 1.5rem 0 0',
          zIndex: 11,
          animation: 'sheet-up 400ms cubic-bezier(0.16, 1, 0.3, 1) both',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div
            style={{
              width: '36px',
              height: '4px',
              borderRadius: '9999px',
              background: 'rgba(255,255,255,0.15)',
            }}
          />
        </div>

        <div
          style={{
            padding: '4px 20px 6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
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
            padding: '4px 20px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div>
            <p
              style={{
                color: 'var(--c-text-secondary)',
                fontFamily: 'var(--studio-font-body)',
                fontWeight: 700,
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                marginBottom: '10px',
              }}
            >
              Visual
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {(
                [
                  { value: 'both', label: 'Diagram + Name', icon: 'tune' },
                  { value: 'diagram', label: 'Diagram Only', icon: 'grid_on' },
                  { value: 'name', label: 'Name Only', icon: 'title' },
                ] as { value: any; label: string; icon: string }[]
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setVisualStyle(opt.value)}
                  className="btn-smooth"
                  style={{
                    padding: '10px 6px',
                    borderRadius: '0.875rem',
                    background:
                      visualStyle === opt.value ? `${accent.from}22` : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${visualStyle === opt.value ? accent.from + '55' : 'transparent'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'background 200ms ease, border-color 200ms ease',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: '20px',
                      color: visualStyle === opt.value ? accent.from : '#acabaa',
                      fontVariationSettings: visualStyle === opt.value ? "'FILL' 1" : "'FILL' 0",
                    }}
                  >
                    {opt.icon}
                  </span>
                  <p
                    style={{
                      color: visualStyle === opt.value ? '#e7e5e4' : '#6b6b6b',
                      fontFamily: 'var(--studio-font-body)',
                      fontWeight: 700,
                      fontSize: '10px',
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}
                  >
                    {opt.label}
                  </p>
                </button>
              ))}
            </div>
          </div>

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
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
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
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ color: 'var(--c-text-primary)', fontSize: '20px' }}
                >
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
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ color: 'var(--c-text-primary)', fontSize: '20px' }}
                >
                  add
                </span>
              </button>
            </div>
          </div>

          <div>
            <p
              style={{
                color: 'var(--c-text-secondary)',
                fontFamily: 'var(--studio-font-body)',
                fontWeight: 700,
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                marginBottom: '10px',
              }}
            >
              Beats Per Chord
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {([1, 2, 4, 8] as any[]).map((b) => (
                <button
                  key={b}
                  onClick={() => setBeatsPerChord(b)}
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
                    transition: 'background 200ms ease',
                  }}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

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
        </div>
      </div>
    </>
  );
}
