import React from 'react';

export interface LiveCountdownOverlayProps {
  currentBeat: number; // e.g. 4, 3, 2, 1
  totalBeats: number;
  currentBar?: number;
  totalBars?: number;
  bpm: number;
  accent: { from: string; to: string; mid?: string };
  onCancel: () => void;
}

export function LiveCountdownOverlay({
  currentBeat,
  totalBeats,
  currentBar = 1,
  totalBars = 1,
  bpm,
  accent,
  onCancel,
}: LiveCountdownOverlayProps) {
  const isAccent = currentBeat === totalBeats || (totalBars > 1 && (totalBeats - currentBeat) % 4 === 0);

  return (
    <div
      data-testid="live-countdown-overlay"
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        animation: 'countdown-overlay-fade 0.2s ease-out',
      }}
    >
      <style>{`
        @keyframes countdown-overlay-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes countdown-beat-pulse {
          0% {
            transform: scale(0.72);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.12);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes countdown-ring-glow {
          0% {
            box-shadow: 0 0 0 0 ${accent.from}66;
          }
          70% {
            box-shadow: 0 0 0 24px ${accent.from}00;
          }
          100% {
            box-shadow: 0 0 0 0 ${accent.from}00;
          }
        }
      `}</style>

      {/* Main Frosted Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '28px 36px 24px',
          borderRadius: '32px',
          background: 'var(--surface-dialog-bg, rgba(20, 20, 26, 0.88))',
          border: `1.5px solid ${accent.from}55`,
          boxShadow: `0 16px 48px rgba(0,0,0,0.6), 0 0 32px ${accent.from}22`,
          minWidth: '220px',
          position: 'relative',
        }}
      >
        {/* Top Header Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 12px',
            borderRadius: '9999px',
            background: `${accent.from}20`,
            border: `1px solid ${accent.from}40`,
            marginBottom: '12px',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: accent.from,
              boxShadow: `0 0 8px ${accent.from}`,
            }}
          />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: accent.from,
              fontFamily: 'var(--studio-font-body, "Inter", sans-serif)',
            }}
          >
            {totalBars > 1 ? `Lead-In • Bar ${currentBar}/${totalBars}` : `Lead-In • ${bpm} BPM`}
          </span>
        </div>

        {/* Animated Large Beat Counter */}
        <div
          key={currentBeat}
          style={{
            width: '110px',
            height: '110px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `radial-gradient(circle at center, ${accent.from}25, transparent 70%)`,
            border: `2px solid ${isAccent ? accent.from : 'rgba(255,255,255,0.15)'}`,
            animation: 'countdown-beat-pulse 0.3s cubic-bezier(0.16, 1, 0.3, 1), countdown-ring-glow 0.6s ease-out',
            margin: '8px 0',
          }}
        >
          <span
            style={{
              fontSize: '56px',
              fontWeight: 900,
              fontFamily: 'var(--studio-font-display, "Inter Tight", monospace)',
              color: isAccent ? '#ffffff' : 'var(--c-text-primary, #ffffff)',
              textShadow: isAccent ? `0 0 24px ${accent.from}` : '0 2px 10px rgba(0,0,0,0.5)',
              lineHeight: 1,
            }}
          >
            {currentBeat}
          </span>
        </div>

        {/* Visual Beat Dots */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '14px',
          }}
        >
          {Array.from({ length: Math.min(8, totalBeats) }).map((_, i) => {
            const beatNum = totalBeats - i;
            const isCompleted = beatNum > currentBeat;
            const isCurrent = beatNum === currentBeat;

            return (
              <span
                key={i}
                style={{
                  width: isCurrent ? '18px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: isCurrent
                    ? accent.from
                    : isCompleted
                    ? 'rgba(255,255,255,0.15)'
                    : 'rgba(255,255,255,0.3)',
                  boxShadow: isCurrent ? `0 0 8px ${accent.from}` : 'none',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            );
          })}
        </div>

        {/* Cancel Action */}
        <button
          type="button"
          onClick={onCancel}
          style={{
            marginTop: '18px',
            padding: '6px 14px',
            borderRadius: '9999px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: 'var(--c-text-secondary, #94a3b8)',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.15s ease',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>
          Cancel
        </button>
      </div>
    </div>
  );
}
