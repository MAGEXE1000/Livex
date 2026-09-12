import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { type TakeRecord, useT, BackDispatcher } from '@workspace/studio-core';
import { MorphingActionSurface } from '../../../shared/design-system/MorphingActionSurface';
import { activeOverlaysRegistry } from '../../../shared/design-system/dialogs';
import { useHarmonizerState } from './useHarmonizerState';
import {
  HarmonizerHeader,
  HarmonizerPlayer,
  LayerCard,
  SliderRow,
  AdvSlider,
} from './HarmonizerUI';
import { HARMONIES } from '../services/harmonyEngine';

interface Props {
  take: TakeRecord;
  accent?: string;
  onClose: () => void;
  onBounce: (newTake: TakeRecord) => void | Promise<void>;
}

export default function HarmonizerSheet({ take, accent = '#007aff', onClose, onBounce }: Props) {
  const t = useT();
  const state = useHarmonizerState(take, accent, onClose, onBounce);

  useEffect(() => {
    const id = 'vocalex:harmonizer-sheet';
    activeOverlaysRegistry.register('sheet', id);
    const unregisterBack = BackDispatcher.register('sheet', () => {
      onClose();
      return true;
    });
    return () => {
      activeOverlaysRegistry.unregister('sheet', id);
      unregisterBack();
    };
  }, [onClose]);

  const {
    layers,
    dryGain,
    setDryGain,
    showAdvanced,
    setShowAdvanced,
    humanize,
    setHumanize,
    formant,
    setFormant,
    showAddLayer,
    setShowAddLayer,
    addLayer,
    updateLayer,
    removeLayer,
    bounceError,
    isBouncing,
    activeCount,
    doBounce,
  } = state;

  const content = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'var(--vx-bg, #000000)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-body)',
      }}
    >
      <HarmonizerHeader state={state} />

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 78px)',
        }}
        className="no-scrollbar"
      >
        <HarmonizerPlayer state={state} />

        <div style={{ padding: '10px 16px 0' }}>
          <SliderRow
            icon="mic"
            label={t.vocalex.leadVocal || 'Lead Vocal'}
            value={dryGain}
            min={0}
            max={1.5}
            step={0.01}
            accent="rgba(255,255,255,0.55)"
            display={`${Math.round(dryGain * 100)}%`}
            onChange={setDryGain}
          />
        </div>

        <div style={{ padding: '14px 16px 0' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.35)',
              }}
            >
              {t.vocalex.harmonyLayers || 'Harmony Layers'}
            </span>

            <button
              onClick={() => setShowAddLayer((v) => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 8,
                background: showAddLayer ? `${accent}22` : 'rgba(255,255,255,0.07)',
                border: showAddLayer ? `1px solid ${accent}55` : '1px solid rgba(255,255,255,0.1)',
                color: showAddLayer ? accent : 'rgba(255,255,255,0.55)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                add
              </span>
              {t.vocalex.addLayer || 'Add'}
            </button>
          </div>

          {showAddLayer && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 6,
                marginBottom: 10,
                padding: 10,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {HARMONIES.map((h) => (
                <button
                  key={h.id}
                  onClick={() => addLayer(h.id)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: h.color,
                      margin: '0 auto 4px',
                      boxShadow: `0 0 6px ${h.color}80`,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: '#fff',
                      fontFamily: 'var(--font-headline)',
                    }}
                  >
                    {h.short}
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                    {h.label}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {layers.map((layer, i) => (
              <LayerCard
                key={`${layer.id}-${i}`}
                layer={layer}
                canDelete={layers.length > 1}
                onChange={(patch) => updateLayer(i, patch)}
                onDelete={() => removeLayer(i)}
              />
            ))}
          </div>
        </div>

        <div style={{ padding: '12px 16px 0' }}>
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '10px 13px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.55)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }}
              >
                tune
              </span>
              {t.vocalex.advancedProcessing || 'Advanced Processing'}
            </div>
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 18,
                transform: showAdvanced ? 'rotate(180deg)' : 'none',
                transition: 'transform 200ms ease',
              }}
            >
              expand_more
            </span>
          </button>

          {showAdvanced && (
            <div
              style={{
                marginTop: 6,
                padding: '14px 13px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <AdvSlider
                label={t.vocalex.humanize || 'Humanize'}
                hint={
                  t.vocalex.humanizeDesc ||
                  'Adds natural micro-timing and pitch variation between layers'
                }
                value={humanize}
                color="#32d74b"
                icon="person"
                onChange={setHumanize}
              />
              <AdvSlider
                label={t.vocalex.formantCorrection || 'Formant Correction'}
                hint={
                  t.vocalex.formantCorrectionDesc ||
                  'Preserves vocal character when shifting large intervals'
                }
                value={formant}
                color="#ff9f0a"
                icon="graphic_eq"
                onChange={setFormant}
              />
              <p
                style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.25)',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {t.vocalex.changesApplyHint ||
                  'Changes apply on next playback. Larger corrections increase generation time.'}
              </p>
            </div>
          )}
        </div>

        {bounceError && (
          <div style={{ padding: '10px 16px 0' }}>
            <div
              style={{
                padding: '9px 13px',
                borderRadius: 10,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#ef4444',
                fontSize: 12,
              }}
            >
              {bounceError}
            </div>
          </div>
        )}

        <div style={{ height: 110 }} />
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '11px 16px calc(11px + env(safe-area-inset-bottom, 0px))',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(11,11,17,0.96)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          display: 'flex',
          gap: 8,
        }}
      >
        <button
          onClick={() => doBounce()}
          disabled={isBouncing || activeCount === 0}
          style={{
            flex: 1,
            padding: '12px 14px',
            borderRadius: 12,
            background: isBouncing ? 'rgba(0,122,255,0.08)' : `${accent}22`,
            border: `1px solid ${accent}44`,
            color: activeCount === 0 ? 'rgba(0,122,255,0.35)' : accent,
            fontFamily: 'var(--font-headline)',
            fontWeight: 700,
            fontSize: 13,
            cursor: isBouncing || activeCount === 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            opacity: activeCount === 0 ? 0.5 : 1,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 15,
              animation: isBouncing ? 'hz-spin 1s linear infinite' : 'none',
            }}
          >
            {isBouncing ? 'progress_activity' : 'save'}
          </span>
          {isBouncing ? t.vocalex.saving || 'Saving…' : t.vocalex.saveAsTake || 'Save as Take'}
        </button>

        <MorphingActionSurface
          title={t.vocalex.export || 'Export Track'}
          subtitle="Bounce harmonized vocal track"
          accentColor={accent}
          customTrigger={({ triggerProps }) => (
            <motion.button
              {...triggerProps}
              disabled={isBouncing || activeCount === 0}
              onClick={isBouncing || activeCount === 0 ? undefined : triggerProps.onClick}
              whileTap={isBouncing || activeCount === 0 ? undefined : triggerProps.whileTap}
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: activeCount === 0 ? 'rgba(255,255,255,0.25)' : '#fff',
                fontFamily: 'var(--font-headline)',
                fontWeight: 700,
                fontSize: 13,
                cursor: isBouncing || activeCount === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: activeCount === 0 ? 0.5 : 1,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                download
              </span>
              {t.vocalex.export || 'Export'}
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 13 }}
              >
                expand_more
              </span>
            </motion.button>
          )}
          rows={[
            {
              id: 'full-mix',
              label: t.vocalex.fullMixWav || 'Full Mix (WAV)',
              sublabel: 'Lead vocal + all active harmonies',
              icon: 'audio_file',
              onPress: () => doBounce({ harmonyOnly: false, download: true }),
            },
            {
              id: 'harmony-only',
              label: t.vocalex.harmonyOnlyWav || 'Harmony Only (WAV)',
              sublabel: 'Isolated synthetic harmonies',
              icon: 'music_note',
              onPress: () => doBounce({ harmonyOnly: true, download: true }),
            },
          ]}
        />
      </div>

      <style>{`
        @keyframes hz-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
