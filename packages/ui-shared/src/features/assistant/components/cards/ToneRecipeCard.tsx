import React from 'react';
import { type ToneRecipeRecommendation } from '@workspace/livex-core';
import { StudioIcon } from '../../../../shared/icons/StudioIcon';

export interface ToneRecipeCardProps {
  data: ToneRecipeRecommendation;
}

export const ToneRecipeCard: React.FC<ToneRecipeCardProps> = ({ data }) => {
  const dials = [
    { label: 'Gain', val: data.gain, color: '#f87171' },
    { label: 'Bass', val: data.bass, color: '#fb923c' },
    { label: 'Mid', val: data.mid, color: '#facc15' },
    { label: 'Treble', val: data.treble, color: '#4ade80' },
    { label: 'Presence', val: data.presence, color: '#38bdf8' },
    { label: 'Reverb', val: data.reverb, color: '#c084fc' },
  ].filter((d) => d.val !== undefined);

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'rgba(244, 63, 94, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fb7185',
          }}
        >
          <StudioIcon name="electric_guitar" size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {data.title}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            Amp: {data.ampModel || 'Clean Tube Head'}
          </div>
        </div>
      </div>

      {/* Mini Dial EQ Controls */}
      {dials.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))',
            gap: 6,
            padding: '10px',
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: 12,
          }}
        >
          {dials.map((dial) => (
            <div
              key={dial.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '4px',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: `2px solid ${dial.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#f8fafc',
                  boxShadow: `0 0 8px ${dial.color}33`,
                }}
              >
                {dial.val}
              </div>
              <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{dial.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pedal Chain Sequence */}
      {data.pedalChain && data.pedalChain.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Signal Chain Order:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.pedalChain.map((p, i) => (
              <div
                key={p.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: 11,
                  color: '#e2e8f0',
                }}
              >
                <span style={{ color: '#38bdf8', fontWeight: 700 }}>{i + 1}.</span>
                <span>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ToneRecipeCard;
