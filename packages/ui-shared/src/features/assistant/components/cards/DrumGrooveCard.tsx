import React from 'react';
import {
  type DrumGrooveRecommendation,
  NavigationDispatcher,
  useDrumStore,
} from '@workspace/livex-core';
import { StudioIcon } from '../../../../shared/icons/StudioIcon';

export interface DrumGrooveCardProps {
  data: DrumGrooveRecommendation;
  actionLabel?: string;
  onAction?: () => void;
}

export const DrumGrooveCard: React.FC<DrumGrooveCardProps> = ({
  data,
  actionLabel = 'Load into Drumex',
  onAction,
}) => {
  const handleLoadDrumex = () => {
    if (onAction) {
      onAction();
      return;
    }

    try {
      const drumStore = useDrumStore.getState() as any;
      if (drumStore.setBpm && data.bpm) {
        drumStore.setBpm(data.bpm);
      }
    } catch (e) {
      console.warn('[DrumGrooveCard] Could not update drum store:', e);
    }

    NavigationDispatcher.push({ app: 'drumex', page: 'beats' });
  };

  const pattern = data.patternPreview || {
    kick: [true, false, false, false, false, false, true, false, false, true, false, false, false, false, false, false],
    snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
    hihat: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
  };

  return (
    <div
      style={{
        marginTop: 12,
        borderRadius: 16,
        padding: '14px 16px',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        fontFamily: 'var(--studio-font-body, system-ui, sans-serif)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'rgba(234, 179, 8, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#eab308',
            }}
          >
            <StudioIcon name="graphic_eq" size={16} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
              {data.name}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              {data.genre} • {data.timeSignature}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '3px 8px',
            borderRadius: 6,
            background: 'rgba(234, 179, 8, 0.15)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            fontSize: 11,
            fontWeight: 700,
            color: '#facc15',
          }}
        >
          {data.bpm} BPM
        </div>
      </div>

      {/* 16-Step Visual Mini Grid */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          padding: '8px 10px',
          background: 'rgba(0, 0, 0, 0.25)',
          borderRadius: 12,
        }}
      >
        {(['hihat', 'snare', 'kick'] as const).map((track) => (
          <div key={track} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 28,
                fontSize: 9,
                fontWeight: 700,
                color: '#94a3b8',
                textTransform: 'uppercase',
              }}
            >
              {track === 'hihat' ? 'Hat' : track === 'snare' ? 'Snr' : 'Kck'}
            </span>
            <div style={{ display: 'flex', gap: 3, flex: 1 }}>
              {(pattern[track] || []).slice(0, 16).map((hit, idx) => {
                const isDownbeat = idx % 4 === 0;
                return (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      height: 10,
                      borderRadius: 2,
                      background: hit
                        ? track === 'kick'
                          ? '#f87171'
                          : track === 'snare'
                            ? '#fbbf24'
                            : '#38bdf8'
                        : isDownbeat
                          ? 'rgba(255, 255, 255, 0.12)'
                          : 'rgba(255, 255, 255, 0.04)',
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Kit suggestion */}
      {data.kitRecommendation && (
        <div style={{ fontSize: 11, color: '#cbd5e1' }}>
          Recommended Kit: <strong style={{ color: '#f8fafc' }}>{data.kitRecommendation}</strong>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleLoadDrumex}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          width: '100%',
          padding: '8px 14px',
          borderRadius: 10,
          background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
          color: '#ffffff',
          border: 'none',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(217, 119, 6, 0.35)',
        }}
      >
        <StudioIcon name="graphic_eq" size={14} />
        {actionLabel}
      </button>
    </div>
  );
};

export default DrumGrooveCard;
