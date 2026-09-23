import React from 'react';
import ElasticSlider from '../../../shared/progress/ElasticSlider';
import { type HarmonizerState } from './useHarmonizerState';
import { useT } from '@workspace/livex-core';
import { HARMONIES, layerSemitones, type HarmonyLayerState } from '../services/harmonyEngine';
import { SharedFloatingHeader } from '../../../shared/layout/StudioLayoutSystem';
import AppSpinner from '../../../shared/loading/AppSpinner';

export function fmt(sec: number): string {
  const m = Math.floor(Math.max(0, sec) / 60);
  const s = Math.floor(Math.max(0, sec) % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function HarmonizerHeader({ state }: { state: HarmonizerState }) {
  const t = useT();
  const { take, accent, detectedKey, activeCount, stopPlayback, onClose } = state;

  return (
    <SharedFloatingHeader
      title={t.vocalex.harmonizerTitle || 'Harmonizer'}
      onBack={() => {
        stopPlayback();
        onClose();
      }}
      toolbarActions={
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {detectedKey && (
            <span
              style={{
                background: `${accent}22`,
                border: `1px solid ${accent}55`,
                borderRadius: 6,
                padding: '2px 7px',
                fontSize: 10,
                fontWeight: 800,
                color: accent,
                fontFamily: 'var(--font-headline)',
                letterSpacing: '0.06em',
                flexShrink: 0,
              }}
            >
              {detectedKey}
            </span>
          )}
          <div
            style={{
              background: 'rgba(255,255,255,0.07)',
              borderRadius: 8,
              padding: '4px 9px',
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.5)',
              flexShrink: 0,
            }}
          >
            {activeCount} layer{activeCount !== 1 ? 's' : ''}
          </div>
        </div>
      }
    />
  );
}

export function HarmonizerPlayer({ state }: { state: HarmonizerState }) {
  const t = useT();
  const {
    take,
    accent,
    playProgress,
    isPlaying,
    isGenerating,
    isBouncing,
    handlePlayStop,
    currentTimeSec,
    totalDuration,
    playError,
  } = state;

  return (
    <div style={{ padding: '14px 16px 0' }}>
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 14,
          padding: '12px 12px 10px',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: 60,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            borderRadius: 8,
            background: 'rgba(0,0,0,0.35)',
            padding: '0 8px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${playProgress * 100}%`,
              background: `${accent}18`,
              borderRight: `2px solid ${accent}`,
              transition: isPlaying ? 'none' : 'width 80ms ease',
            }}
          />
          {take.waveformPeaks.map((h, i) => {
            const played = i / take.waveformPeaks.length < playProgress;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  minWidth: 1.5,
                  height: `${Math.max(8, h)}%`,
                  borderRadius: 9999,
                  position: 'relative',
                  zIndex: 1,
                  background: played ? `${accent}bb` : 'rgba(172,171,170,0.16)',
                }}
              />
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <button
            onClick={handlePlayStop}
            disabled={isBouncing}
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: isGenerating ? `${accent}55` : accent,
              border: 'none',
              cursor: isGenerating || isBouncing ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: `0 4px 14px ${accent}44`,
              transition: 'background 150ms',
            }}
          >
            {isGenerating ? (
              <AppSpinner size={20} color="#fff" />
            ) : (
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 20,
                  color: '#fff',
                  fontVariationSettings: "'FILL' 1",
                }}
              >
                {isPlaying ? 'stop' : 'play_arrow'}
              </span>
            )}
          </button>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 10.5,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              <span>{fmt(currentTimeSec)}</span>
              <span style={{ color: isGenerating ? accent : 'rgba(255,255,255,0.4)' }}>
                {isGenerating
                  ? t.vocalex.statusGenerating || 'Generating…'
                  : isPlaying
                    ? t.vocalex.statusPlaying || 'Playing'
                    : t.vocalex.statusReady || 'Ready'}
              </span>
              <span>−{fmt(totalDuration - currentTimeSec)}</span>
            </div>

            <div
              style={{
                height: 3,
                borderRadius: 9999,
                background: 'rgba(255,255,255,0.08)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: 9999,
                  width: `${playProgress * 100}%`,
                  background: accent,
                  transition: isPlaying ? 'none' : 'width 80ms ease',
                }}
              />
            </div>
          </div>
        </div>

        {playError && (
          <p style={{ fontSize: 11, color: '#ef4444', margin: '8px 0 0', textAlign: 'center' }}>
            {playError}
          </p>
        )}

        <div className="gb-border-ring" aria-hidden="true" />
      </div>
    </div>
  );
}

export function MiniButton({
  active,
  activeColor,
  activeBorder,
  activeTextColor,
  onClick,
  label,
  title,
}: {
  active: boolean;
  activeColor: string;
  activeBorder: string;
  activeTextColor: string;
  onClick: () => void;
  label: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 26,
        height: 26,
        borderRadius: 7,
        background: active ? activeColor : 'var(--app-surface-low)',
        border: `1px solid ${active ? activeBorder : 'var(--c-border)'}`,
        color: active ? activeTextColor : 'var(--c-text-muted)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-headline)',
        fontSize: 9,
        fontWeight: 800,
        transition: 'background 150ms, border-color 150ms, color 150ms',
      }}
    >
      {label}
    </button>
  );
}

export function SliderRow({
  icon,
  label,
  value,
  min,
  max,
  step,
  accent,
  display,
  onChange,
  compact = false,
}: {
  icon: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  accent: string;
  display: string;
  onChange: (v: number) => void;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        marginTop: compact ? 7 : 0,
        padding: compact ? 0 : '9px 13px',
        background: compact ? 'none' : 'rgba(255,255,255,0.04)',
        borderRadius: compact ? 0 : 10,
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.3)',
          fontVariationSettings: "'FILL' 1",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.28)',
          width: 24,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <ElasticSlider
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange as any}
        accentColor={accent}
        style={{ flex: 1 }}
      />
      <span
        style={{
          fontSize: 9.5,
          fontVariantNumeric: 'tabular-nums',
          color: 'rgba(255,255,255,0.3)',
          width: 38,
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        {display}
      </span>
    </div>
  );
}

export function AdvSlider({
  label,
  hint,
  value,
  color,
  icon,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  color: string;
  icon: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 14,
            color,
            fontVariationSettings: "'FILL' 1",
          }}
        >
          {icon}
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', flex: 1 }}>{label}</span>
        <span
          style={{
            fontSize: 10.5,
            fontVariantNumeric: 'tabular-nums',
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          {Math.round(value * 100)}%
        </span>
      </div>
      <ElasticSlider
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={onChange as any}
        accentColor={color}
        style={{ width: '100%' }}
      />
      <p
        style={{
          fontSize: 10,
          color: 'rgba(255,255,255,0.28)',
          margin: '5px 0 0',
          lineHeight: 1.5,
        }}
      >
        {hint}
      </p>
    </div>
  );
}

export function LayerCard({
  layer,
  canDelete,
  onChange,
  onDelete,
}: {
  layer: HarmonyLayerState;
  canDelete: boolean;
  onChange: (patch: Partial<HarmonyLayerState>) => void;
  onDelete: () => void;
}) {
  const t = useT();
  const def = HARMONIES.find((h) => h.id === layer.id)!;
  const semis = layerSemitones(layer);
  const isActive = layer.enabled && !layer.mute;

  return (
    <div
      style={{
        borderRadius: 13,
        background: isActive ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isActive ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.05)'}`,
        padding: '11px 12px',
        opacity: layer.mute ? 0.5 : 1,
        transition: 'opacity 150ms, background 150ms',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <button
          onClick={() => onChange({ enabled: !layer.enabled })}
          title={
            layer.enabled
              ? t.vocalex.disableLayer || 'Disable layer'
              : t.vocalex.enableLayer || 'Enable layer'
          }
          style={{
            width: 11,
            height: 11,
            borderRadius: '50%',
            background: layer.enabled ? def.color : 'rgba(255,255,255,0.18)',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
            boxShadow: layer.enabled ? `0 0 8px ${def.color}80` : 'none',
            transition: 'background 150ms, box-shadow 150ms',
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: layer.enabled ? '#fff' : 'rgba(255,255,255,0.35)',
                fontFamily: 'var(--font-headline)',
              }}
            >
              {def.label}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: def.color,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {semis > 0 ? '+' : ''}
              {semis.toFixed(1)} st
            </span>
          </div>
          <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>
            {def.hint}
          </div>
        </div>

        <MiniButton
          active={layer.mute}
          activeColor="rgba(239,68,68,0.3)"
          activeBorder="rgba(239,68,68,0.5)"
          activeTextColor="#ef4444"
          onClick={() => onChange({ mute: !layer.mute })}
          label="M"
          title={layer.mute ? t.vocalex.unmute || 'Unmute' : t.vocalex.mute || 'Mute'}
        />

        <MiniButton
          active={layer.solo}
          activeColor="rgba(255,204,0,0.2)"
          activeBorder="rgba(255,204,0,0.4)"
          activeTextColor="#ffcc00"
          onClick={() => onChange({ solo: !layer.solo })}
          label="S"
          title={layer.solo ? t.vocalex.unsolo || 'Unsolo' : t.vocalex.solo || 'Solo'}
        />

        {canDelete && (
          <button
            onClick={onDelete}
            title={t.vocalex.removeLayer || 'Remove layer'}
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.22)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              close
            </span>
          </button>
        )}
      </div>

      <SliderRow
        icon="volume_up"
        label="VOL"
        value={layer.gain}
        min={0}
        max={1.5}
        step={0.01}
        accent={def.color}
        display={`${Math.round(layer.gain * 100)}%`}
        onChange={(v) => onChange({ gain: v })}
        compact
      />

      <SliderRow
        icon="spatial_audio"
        label="PAN"
        value={layer.pan}
        min={-1}
        max={1}
        step={0.01}
        accent={def.color}
        display={
          layer.pan === 0
            ? 'C'
            : layer.pan < 0
              ? `L${Math.round(-layer.pan * 100)}`
              : `R${Math.round(layer.pan * 100)}`
        }
        onChange={(v) => onChange({ pan: v })}
        compact
      />

      <SliderRow
        icon="piano"
        label="FINE"
        value={layer.fineTune}
        min={-1}
        max={1}
        step={0.01}
        accent={def.color}
        display={`${layer.fineTune >= 0 ? '+' : ''}${layer.fineTune.toFixed(2)} st`}
        onChange={(v) => onChange({ fineTune: v })}
        compact
      />

      {layer.id === 'custom' && (
        <SliderRow
          icon="tune"
          label="INT"
          value={layer.customSemitones}
          min={-24}
          max={24}
          step={0.5}
          accent={def.color}
          display={`${layer.customSemitones >= 0 ? '+' : ''}${layer.customSemitones} st`}
          onChange={(v) => onChange({ customSemitones: v })}
          compact
        />
      )}
    </div>
  );
}
