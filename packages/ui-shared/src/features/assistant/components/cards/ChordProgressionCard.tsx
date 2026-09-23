import React, { useState } from 'react';
import {
  type ChordProgressionRecommendation,
  NavigationDispatcher,
  useChordStore,
} from '@workspace/livex-core';
import { StudioIcon } from '../../../../shared/icons/StudioIcon';

export interface ChordProgressionCardProps {
  data: ChordProgressionRecommendation;
  actionLabel?: string;
  onAction?: () => void;
}

export const ChordProgressionCard: React.FC<ChordProgressionCardProps> = ({
  data,
  actionLabel = 'Open in Chordex',
  onAction,
}) => {
  const [copied, setCopied] = useState(false);

  const handleApplyToChordex = () => {
    if (onAction) {
      onAction();
      return;
    }

    try {
      const chordStore = useChordStore.getState() as any;
      if (chordStore.setSelectedKey && data.key) {
        chordStore.setSelectedKey(data.key);
      }
      if (chordStore.setActiveProgression && data.chords) {
        chordStore.setActiveProgression(data.chords);
      }
    } catch (e) {
      console.warn('[ChordProgressionCard] Could not update chord store:', e);
    }

    NavigationDispatcher.push({ app: 'chordex', page: 'practice' });
  };

  const handleCopyChords = () => {
    const text = data.chords.join(' - ');
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              background: 'rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
            }}
          >
            <StudioIcon name="music_note" size={16} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
              Chord Progression
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              Key of {data.key} {data.mode || ''}
            </div>
          </div>
        </div>

        <button
          onClick={handleCopyChords}
          title="Copy chords"
          style={{
            background: 'transparent',
            border: 'none',
            color: copied ? '#4ade80' : '#94a3b8',
            cursor: 'pointer',
            padding: 6,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
          }}
        >
          <StudioIcon name={copied ? 'check' : 'content_copy'} size={14} />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Chords Sequence Grid */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          padding: '8px 10px',
          background: 'rgba(0, 0, 0, 0.25)',
          borderRadius: 12,
        }}
      >
        {data.chords.map((chord, idx) => {
          const numeral = data.romanNumerals?.[idx] || '';
          return (
            <div
              key={`${chord}-${idx}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '6px 12px',
                borderRadius: 8,
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                minWidth: 44,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>{chord}</span>
              {numeral && (
                <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{numeral}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Description / Feel */}
      {data.description && (
        <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.45 }}>
          {data.description}
        </div>
      )}

      {/* Action Footer */}
      <button
        onClick={handleApplyToChordex}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          width: '100%',
          padding: '8px 14px',
          borderRadius: 10,
          background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
          color: '#ffffff',
          border: 'none',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)',
          transition: 'opacity 120ms ease, transform 120ms ease',
        }}
      >
        <StudioIcon name="library" size={14} />
        {actionLabel}
      </button>
    </div>
  );
};

export default ChordProgressionCard;
