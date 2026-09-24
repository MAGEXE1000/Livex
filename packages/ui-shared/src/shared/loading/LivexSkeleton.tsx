import React from 'react';
import { Skeleton } from '../design-system/StudioDesignSystem';

// ── GLOBAL RESUSABLE SKELETON WIDGETS ─────────────────────────────────────────

export function StudioSkeletonCard({
  height = 120,
  borderRadius = '1.25rem',
  style,
}: {
  height?: number | string;
  borderRadius?: string;
  style?: React.CSSProperties;
}) {
  return <Skeleton width="100%" height={height} style={{ borderRadius, ...style }} />;
}

export function StudioSkeletonRow({
  circleSize = 40,
  circleRadius = '50%',
  style,
}: {
  circleSize?: number;
  circleRadius?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <Skeleton
        variant="circle"
        width={circleSize}
        height={circleSize}
        style={{ borderRadius: circleRadius, flexShrink: 0 }}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton variant="text" width="65%" height={13} />
        <Skeleton variant="text" width="40%" height={9} />
      </div>
    </div>
  );
}

export function StudioSkeletonList({
  count = 4,
  circleSize = 40,
  circleRadius = '50%',
  style,
}: {
  count?: number;
  circleSize?: number;
  circleRadius?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', ...style }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            background: 'var(--app-surface)',
            borderRadius: '1rem',
            border: '1px solid rgba(128,128,128,0.07)',
          }}
        >
          <StudioSkeletonRow circleSize={circleSize} circleRadius={circleRadius} />
        </div>
      ))}
    </div>
  );
}

export function StudioSkeletonHeader({
  titleWidth = 140,
  showButtons = true,
  style,
}: {
  titleWidth?: number;
  showButtons?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '24px 20px 8px',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <Skeleton variant="text" width={titleWidth} height={26} />
      {showButtons && (
        <div style={{ display: 'flex', gap: 8 }}>
          <Skeleton variant="circle" width={34} height={34} />
          <Skeleton variant="circle" width={34} height={34} />
        </div>
      )}
    </div>
  );
}

export function StudioSkeletonProfile({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        padding: '28px 20px 24px',
        background: 'var(--app-surface)',
        borderRadius: '1.25rem',
        border: '1px solid rgba(128,128,128,0.07)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {/* Avatar circle */}
      <Skeleton
        variant="circle"
        width={72}
        height={72}
        style={{ marginBottom: 14, background: 'var(--app-surface-highest)' }}
      />
      {/* Display name bar */}
      <Skeleton variant="text" width="45%" height={16} style={{ marginBottom: 8 }} />
      {/* Email bar */}
      <Skeleton variant="text" width="60%" height={11} />
    </div>
  );
}

export function StudioSkeletonGrid({
  count = 4,
  columns = 2,
  height = 100,
  style,
}: {
  count?: number;
  columns?: number;
  height?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 12,
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <StudioSkeletonCard key={i} height={height} />
      ))}
    </div>
  );
}

// ── CUSTOM STUDIO HUB LOADING SKELETON ─────────────────────────────────────────

export function StudioHubSkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0 20px',
        paddingBottom: 'var(--content-bottom-pad)',
        background: 'var(--app-bg)',
        minHeight: '100dvh',
        boxSizing: 'border-box',
      }}
    >
      {/* Logo Area */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 'clamp(36px, 7vh, 56px)',
        }}
      >
        <div
          data-intro-target="studio"
          className="studio-shimmer"
          style={{ width: 56, height: 56, borderRadius: '28%', marginBottom: 12 }}
        />
        <div className="studio-shimmer" style={{ width: 90, height: 20, borderRadius: 4 }} />
      </div>

      {/* Main Apps Combined Card */}
      <div
        className="studio-shimmer"
        style={{
          width: '100%',
          maxWidth: 380,
          borderRadius: 24,
          background: 'var(--app-surface)',
          border: '1px solid rgba(128,128,128,0.07)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          marginTop: 'clamp(28px, 6vh, 48px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Welcome greeting */}
        <div
          style={{ padding: '22px 22px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          <div className="studio-shimmer" style={{ width: '55%', height: 18, borderRadius: 4 }} />
          <div className="studio-shimmer" style={{ width: '75%', height: 11, borderRadius: 4 }} />
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(128,128,128,0.08)', margin: '0 16px' }} />

        {/* Apps List rows */}
        <div style={{ padding: '8px 12px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '13px 12px',
                gap: 14,
              }}
            >
              {/* App icon circle */}
              <div
                data-intro-target={['chords', 'drums', 'stage', 'groovex', 'vocalex'][i]}
                className="studio-shimmer"
                style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0 }}
              />
              {/* Info text details */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div
                  className="studio-shimmer"
                  style={{ width: '35%', height: 13, borderRadius: 4 }}
                />
                <div
                  className="studio-shimmer"
                  style={{ width: '70%', height: 9, borderRadius: 4 }}
                />
              </div>
              {/* Arrow */}
              <div
                className="studio-shimmer"
                style={{ width: 14, height: 14, borderRadius: '50%' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Floating Bottom Nav Outlines */}
      <div
        style={{
          position: 'fixed',
          bottom: 'var(--nav-safe-bottom)',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: 380,
          height: 64,
          background: 'rgba(28,28,30,0.3)',
          backdropFilter: 'var(--surface-float-blur)',
          WebkitBackdropFilter: 'var(--surface-float-blur)',
          border: '1px solid rgba(128,128,128,0.08)',
          borderRadius: 22,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '0 10px',
        }}
      >
        <div className="studio-shimmer" style={{ width: 38, height: 38, borderRadius: 10 }} />
        <div className="studio-shimmer" style={{ width: 38, height: 38, borderRadius: 10 }} />
        <div className="studio-shimmer" style={{ width: 38, height: 38, borderRadius: 10 }} />
      </div>
    </div>
  );
}

// ── CUSTOM VOCALEX TAKES LOADING SKELETON ──────────────────────────────────────

export function VocalexTakesSkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="studio-shimmer"
          style={{
            background: 'var(--vx-edge)',
            borderRadius: 14,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            height: 68,
            boxSizing: 'border-box',
          }}
        >
          {/* Circular play button skeleton */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'var(--vx-card-2)',
              flexShrink: 0,
            }}
          />
          {/* Text details */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div
              style={{ width: '60%', height: 14, background: 'var(--vx-card-2)', borderRadius: 4 }}
            />
            <div
              style={{ width: '40%', height: 10, background: 'var(--vx-card-2)', borderRadius: 4 }}
            />
          </div>
          {/* Mini waveform representation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              height: 24,
              flexShrink: 0,
              opacity: 0.15,
            }}
          >
            {[14, 28, 42, 21, 35, 48, 17, 30].map((h, j) => (
              <div
                key={j}
                style={{
                  width: 2,
                  height: `${h}%`,
                  background: 'var(--vx-text)',
                  borderRadius: 9999,
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── CUSTOM GROOVEX SESSIONS SKELETON ──────────────────────────────────────────

export function GroovexAppSkeleton() {
  return (
    <div
      style={{
        padding: '0 20px',
        paddingBottom: 'var(--content-bottom-pad)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <section
        style={{
          paddingTop: 32,
          marginBottom: 32,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div className="studio-shimmer" style={{ width: 150, height: 32, borderRadius: 6 }} />
        <div className="studio-shimmer" style={{ width: 100, height: 12, borderRadius: 4 }} />
      </section>

      {/* Search Input + Chips */}
      <section style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="studio-shimmer" style={{ width: '100%', height: 46, borderRadius: 14 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="studio-shimmer" style={{ width: 85, height: 38, borderRadius: 14 }} />
          <div className="studio-shimmer" style={{ width: 75, height: 38, borderRadius: 14 }} />
        </div>
      </section>

      {/* Song rows catalog */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="studio-shimmer" style={{ width: 110, height: 11, borderRadius: 3 }} />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="studio-shimmer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              background: 'var(--gx-surface-low)',
              borderRadius: 14,
              boxSizing: 'border-box',
              height: 66,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
              {/* Album art circle */}
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: 'var(--gx-surface-lowest)',
                  flexShrink: 0,
                }}
              />
              {/* Title & Artist lines */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div
                  style={{
                    width: '55%',
                    height: 13,
                    background: 'var(--gx-surface-lowest)',
                    borderRadius: 4,
                  }}
                />
                <div
                  style={{
                    width: '35%',
                    height: 9,
                    background: 'var(--gx-surface-lowest)',
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>
            {/* Audio Stem tag markers */}
            <div style={{ display: 'flex', gap: 4, flexShrink: 0, opacity: 0.4 }}>
              <div
                style={{
                  width: 26,
                  height: 14,
                  borderRadius: 4,
                  background: 'var(--gx-surface-lowest)',
                }}
              />
              <div
                style={{
                  width: 26,
                  height: 14,
                  borderRadius: 4,
                  background: 'var(--gx-surface-lowest)',
                }}
              />
              <div
                style={{
                  width: 26,
                  height: 14,
                  borderRadius: 4,
                  background: 'var(--gx-surface-lowest)',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CUSTOM STAGEX PLOT BUILDER SKELETON ───────────────────────────────────────

export function StagexPanelSkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        padding: '24px 20px',
        gap: 16,
        background: 'var(--app-bg)',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Title Action Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="studio-shimmer" style={{ width: 36, height: 36, borderRadius: '50%' }} />
          <div className="studio-shimmer" style={{ width: 120, height: 24, borderRadius: 6 }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="studio-shimmer" style={{ width: 34, height: 34, borderRadius: '50%' }} />
          <div className="studio-shimmer" style={{ width: 34, height: 34, borderRadius: '50%' }} />
        </div>
      </div>

      {/* Main grid Plot Stage layout */}
      <div
        className="studio-shimmer"
        style={{
          flex: 1,
          borderRadius: 20,
          background: 'var(--app-surface-low)',
          border: '2px dashed rgba(128,128,128,0.15)',
          position: 'relative',
          minHeight: 280,
          boxSizing: 'border-box',
        }}
      >
        {/* Stage layout node representations */}
        <div
          style={{
            position: 'absolute',
            top: '25%',
            left: '20%',
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'var(--app-surface-highest)',
            opacity: 0.4,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            width: 50,
            height: 32,
            borderRadius: 6,
            background: 'var(--app-surface-highest)',
            opacity: 0.4,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '25%',
            right: '20%',
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'var(--app-surface-highest)',
            opacity: 0.4,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '25%',
            left: '35%',
            width: 38,
            height: 38,
            borderRadius: 6,
            background: 'var(--app-surface-highest)',
            opacity: 0.4,
          }}
        />
      </div>

      {/* Plots lists preview row */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'hidden',
          flexShrink: 0,
          paddingBottom: 'var(--nav-safe-bottom)',
        }}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="studio-shimmer"
            style={{
              width: 140,
              height: 72,
              borderRadius: 14,
              background: 'var(--app-surface-high)',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 6,
              flexShrink: 0,
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: '80%',
                height: 12,
                background: 'var(--app-surface-highest)',
                borderRadius: 3,
              }}
            />
            <div
              style={{
                width: '50%',
                height: 9,
                background: 'var(--app-surface-highest)',
                borderRadius: 3,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CUSTOM DRUMEX SEQUENCER SKELETON ──────────────────────────────────────────

export function DrumEditorSkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        padding: '24px 20px',
        gap: 16,
        background: 'var(--app-bg)',
        boxSizing: 'border-box',
      }}
    >
      {/* Kit headers */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div className="studio-shimmer" style={{ width: 130, height: 24, borderRadius: 6 }} />
        <div className="studio-shimmer" style={{ width: 80, height: 28, borderRadius: 14 }} />
      </div>

      {/* MPC Pads Grid selection */}
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, flexShrink: 0 }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="studio-shimmer"
            style={{
              aspectRatio: '1',
              borderRadius: 16,
              background: 'var(--app-surface-low)',
              border: '1px solid rgba(128,128,128,0.08)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: 10,
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: '60%',
                height: 10,
                background: 'var(--app-surface-highest)',
                borderRadius: 3,
              }}
            />
          </div>
        ))}
      </div>

      {/* Step drum Sequencer tracks listing */}
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflow: 'hidden' }}
      >
        <div className="studio-shimmer" style={{ width: 110, height: 14, borderRadius: 4 }} />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="studio-shimmer"
            style={{
              height: 48,
              borderRadius: 12,
              background: 'var(--app-surface-low)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
            }}
          >
            {/* Pad label outline */}
            <div
              style={{
                width: 80,
                height: 12,
                background: 'var(--app-surface-highest)',
                borderRadius: 3,
              }}
            />
            {/* Sequential step circle placeholders */}
            <div style={{ display: 'flex', gap: 6, opacity: 0.35 }}>
              {Array.from({ length: 8 }).map((_, j) => (
                <div
                  key={j}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background:
                      j % 4 === 0 ? 'var(--app-surface-highest)' : 'var(--app-surface-high)',
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SECTION-SPECIFIC CHORDEX SKELETONS ─────────────────────────────────────────

export function ChordexSongsSkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        padding: '20px 16px',
        gap: 14,
        background: 'var(--app-bg)',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Top Header & Search Capsule */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="studio-shimmer" style={{ width: 110, height: 26, borderRadius: 8 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="studio-shimmer" style={{ width: 34, height: 34, borderRadius: '50%' }} />
            <div className="studio-shimmer" style={{ width: 34, height: 34, borderRadius: '50%' }} />
          </div>
        </div>
        <div
          className="studio-shimmer"
          style={{ width: '100%', height: 46, borderRadius: 9999 }}
        />
      </div>

      {/* Song Cards List (matching PresetCard) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              borderRadius: 24,
              background: 'var(--surface-card-bg, var(--app-surface))',
              border: '1px solid rgba(128,128,128,0.08)',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              boxSizing: 'border-box',
            }}
          >
            {/* Leading music icon box (w-11 h-11 rounded-2xl) */}
            <div
              className="studio-shimmer"
              style={{
                width: 44,
                height: 44,
                borderRadius: 16,
                flexShrink: 0,
              }}
            />
            {/* Song title, artist & metadata pills */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div
                className="studio-shimmer"
                style={{
                  width: `${60 - (i % 3) * 10}%`,
                  height: 16,
                  borderRadius: 4,
                }}
              />
              <div
                className="studio-shimmer"
                style={{
                  width: `${40 - (i % 2) * 8}%`,
                  height: 11,
                  borderRadius: 3,
                }}
              />
              {/* Badge pills row */}
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <div
                  className="studio-shimmer"
                  style={{ width: 44, height: 18, borderRadius: 6 }}
                />
                <div
                  className="studio-shimmer"
                  style={{ width: 54, height: 18, borderRadius: 6 }}
                />
                <div
                  className="studio-shimmer"
                  style={{ width: 62, height: 18, borderRadius: 6 }}
                />
              </div>
            </div>
            {/* Right chevron affordance */}
            <div
              className="studio-shimmer"
              style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChordexLibrarySkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        padding: '20px 16px',
        gap: 14,
        background: 'var(--app-bg)',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Header bar and search layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="studio-shimmer" style={{ width: 120, height: 26, borderRadius: 8 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="studio-shimmer" style={{ width: 34, height: 34, borderRadius: '50%' }} />
            <div className="studio-shimmer" style={{ width: 34, height: 34, borderRadius: '50%' }} />
          </div>
        </div>
        <div className="studio-shimmer" style={{ width: '100%', height: 46, borderRadius: 9999 }} />
      </div>

      {/* Hero Chord of the Day Card */}
      <div
        style={{
          borderRadius: 24,
          background: 'var(--surface-card-bg, var(--app-surface))',
          border: '1px solid rgba(128,128,128,0.08)',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            className="studio-shimmer"
            style={{ width: 56, height: 56, borderRadius: 14, flexShrink: 0 }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="studio-shimmer" style={{ width: 80, height: 10, borderRadius: 3 }} />
            <div className="studio-shimmer" style={{ width: 60, height: 22, borderRadius: 6 }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="studio-shimmer" style={{ width: 38, height: 38, borderRadius: '50%' }} />
          <div className="studio-shimmer" style={{ width: 80, height: 38, borderRadius: 9999 }} />
        </div>
      </div>

      {/* Recent Chords row */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
        <div className="studio-shimmer" style={{ width: 120, height: 14, borderRadius: 4 }} />
        <div style={{ display: 'flex', gap: 10, overflow: 'hidden' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="studio-shimmer"
              style={{
                width: 90,
                height: 56,
                borderRadius: 16,
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      </div>

      {/* Categories 2-Column Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflow: 'hidden' }}>
        <div className="studio-shimmer" style={{ width: 90, height: 14, borderRadius: 4 }} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
            flex: 1,
            overflow: 'hidden',
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="studio-shimmer"
              style={{
                height: 72,
                borderRadius: 18,
                background: 'var(--surface-card-bg, var(--app-surface))',
                border: '1px solid rgba(128,128,128,0.08)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChordexPreferencesSkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        padding: '20px 16px',
        gap: 16,
        background: 'var(--app-bg)',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div className="studio-shimmer" style={{ width: 130, height: 26, borderRadius: 8 }} />
      </div>

      {/* Grouped Settings Section 1 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
        <div className="studio-shimmer" style={{ width: 90, height: 12, borderRadius: 3 }} />
        <div
          style={{
            borderRadius: 20,
            background: 'var(--surface-card-bg, var(--app-surface))',
            border: '1px solid rgba(128,128,128,0.08)',
            padding: '4px 16px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 0',
                borderBottom: i < 2 ? '1px solid rgba(128,128,128,0.07)' : 'none',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div className="studio-shimmer" style={{ width: 130, height: 14, borderRadius: 4 }} />
                <div className="studio-shimmer" style={{ width: 190, height: 10, borderRadius: 3 }} />
              </div>
              <div
                className="studio-shimmer"
                style={{ width: 48, height: 26, borderRadius: 9999, flexShrink: 0 }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Grouped Settings Section 2 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflow: 'hidden' }}>
        <div className="studio-shimmer" style={{ width: 110, height: 12, borderRadius: 3 }} />
        <div
          style={{
            borderRadius: 20,
            background: 'var(--surface-card-bg, var(--app-surface))',
            border: '1px solid rgba(128,128,128,0.08)',
            padding: '4px 16px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 0',
                borderBottom: i < 2 ? '1px solid rgba(128,128,128,0.07)' : 'none',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div className="studio-shimmer" style={{ width: 140, height: 14, borderRadius: 4 }} />
                <div className="studio-shimmer" style={{ width: 210, height: 10, borderRadius: 3 }} />
              </div>
              <div
                className="studio-shimmer"
                style={{ width: 70, height: 28, borderRadius: 8, flexShrink: 0 }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChordexPracticeSkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        padding: '20px 16px',
        gap: 14,
        background: 'var(--app-bg)',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div className="studio-shimmer" style={{ width: 130, height: 26, borderRadius: 8 }} />
        <div className="studio-shimmer" style={{ width: 34, height: 34, borderRadius: '50%' }} />
      </div>

      {/* Mode selector pills */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <div className="studio-shimmer" style={{ width: 72, height: 32, borderRadius: 9999 }} />
        <div className="studio-shimmer" style={{ width: 72, height: 32, borderRadius: 9999 }} />
        <div className="studio-shimmer" style={{ width: 72, height: 32, borderRadius: 9999 }} />
      </div>

      {/* Main instrument view container */}
      <div
        className="studio-shimmer"
        style={{
          flex: 1,
          borderRadius: 24,
          background: 'var(--surface-card-bg, var(--app-surface))',
          border: '1px solid rgba(128,128,128,0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 260,
        }}
      />

      {/* Bottom control bar */}
      <div
        className="studio-shimmer"
        style={{
          width: '100%',
          height: 56,
          borderRadius: 16,
          flexShrink: 0,
        }}
      />
    </div>
  );
}

// Retain ChordexPanelSkeleton alias for backwards compatibility
export const ChordexPanelSkeleton = ChordexLibrarySkeleton;

// ── SECTION-SPECIFIC DRUMEX SKELETONS ─────────────────────────────────────────

export function DrumSongsSkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        padding: '20px 16px',
        gap: 14,
        background: 'var(--app-bg)',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Top Header & Search Capsule */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="studio-shimmer" style={{ width: 120, height: 26, borderRadius: 8 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="studio-shimmer" style={{ width: 34, height: 34, borderRadius: '50%' }} />
            <div className="studio-shimmer" style={{ width: 34, height: 34, borderRadius: '50%' }} />
          </div>
        </div>
        <div
          className="studio-shimmer"
          style={{ width: '100%', height: 44, borderRadius: 9999 }}
        />
        {/* Kit filter pills */}
        <div style={{ display: 'flex', gap: 8, overflow: 'hidden' }}>
          <div className="studio-shimmer" style={{ width: 68, height: 30, borderRadius: 9999, flexShrink: 0 }} />
          <div className="studio-shimmer" style={{ width: 76, height: 30, borderRadius: 9999, flexShrink: 0 }} />
          <div className="studio-shimmer" style={{ width: 84, height: 30, borderRadius: 9999, flexShrink: 0 }} />
          <div className="studio-shimmer" style={{ width: 72, height: 30, borderRadius: 9999, flexShrink: 0 }} />
        </div>
      </div>

      {/* Drum Beat Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflow: 'hidden' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              borderRadius: 20,
              background: 'var(--surface-card-bg, var(--app-surface))',
              border: '1px solid rgba(128,128,128,0.08)',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              boxSizing: 'border-box',
            }}
          >
            {/* Play preview button circle */}
            <div
              className="studio-shimmer"
              style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0 }}
            />
            {/* Info */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div
                className="studio-shimmer"
                style={{ width: `${55 - (i % 2) * 10}%`, height: 15, borderRadius: 4 }}
              />
              <div
                className="studio-shimmer"
                style={{ width: `${38 - (i % 3) * 6}%`, height: 11, borderRadius: 3 }}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                <div className="studio-shimmer" style={{ width: 50, height: 16, borderRadius: 4 }} />
                <div className="studio-shimmer" style={{ width: 42, height: 16, borderRadius: 4 }} />
              </div>
            </div>
            {/* More options button */}
            <div
              className="studio-shimmer"
              style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DrumMetronomeSkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        padding: '24px 20px',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--app-bg)',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="studio-shimmer" style={{ width: 110, height: 26, borderRadius: 8 }} />
        <div className="studio-shimmer" style={{ width: 68, height: 28, borderRadius: 9999 }} />
      </div>

      {/* Large circular tempo dial */}
      <div
        className="studio-shimmer"
        style={{
          width: 'clamp(200px, 28vh, 250px)',
          height: 'clamp(200px, 28vh, 250px)',
          borderRadius: '50%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          border: '6px solid rgba(128,128,128,0.12)',
        }}
      >
        <div className="studio-shimmer" style={{ width: 80, height: 42, borderRadius: 8 }} />
        <div className="studio-shimmer" style={{ width: 44, height: 12, borderRadius: 4 }} />
      </div>

      {/* Beat indicator dots */}
      <div style={{ display: 'flex', gap: 14 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="studio-shimmer"
            style={{ width: 16, height: 16, borderRadius: '50%' }}
          />
        ))}
      </div>

      {/* Transport button */}
      <div
        className="studio-shimmer"
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          marginBottom: 'calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 16px)',
        }}
      />
    </div>
  );
}

export function DrumPreferencesSkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        padding: '20px 16px',
        gap: 16,
        background: 'var(--app-bg)',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div className="studio-shimmer" style={{ width: 140, height: 26, borderRadius: 8 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflow: 'hidden' }}>
        <div className="studio-shimmer" style={{ width: 100, height: 12, borderRadius: 3 }} />
        <div
          style={{
            borderRadius: 20,
            background: 'var(--surface-card-bg, var(--app-surface))',
            border: '1px solid rgba(128,128,128,0.08)',
            padding: '4px 16px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 0',
                borderBottom: i < 3 ? '1px solid rgba(128,128,128,0.07)' : 'none',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div className="studio-shimmer" style={{ width: 130, height: 14, borderRadius: 4 }} />
                <div className="studio-shimmer" style={{ width: 180, height: 10, borderRadius: 3 }} />
              </div>
              <div
                className="studio-shimmer"
                style={{ width: 48, height: 26, borderRadius: 9999, flexShrink: 0 }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── SECTION-SPECIFIC DEVTOOLS SKELETON ────────────────────────────────────────

export function DevToolsSkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        padding: '20px 16px',
        gap: 14,
        background: 'var(--app-bg)',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div className="studio-shimmer" style={{ width: 150, height: 26, borderRadius: 8 }} />
        <div className="studio-shimmer" style={{ width: 34, height: 34, borderRadius: '50%' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, flexShrink: 0 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="studio-shimmer"
            style={{ height: 68, borderRadius: 16 }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <div className="studio-shimmer" style={{ width: 68, height: 32, borderRadius: 8 }} />
        <div className="studio-shimmer" style={{ width: 78, height: 32, borderRadius: 8 }} />
        <div className="studio-shimmer" style={{ width: 72, height: 32, borderRadius: 8 }} />
      </div>
      <div
        className="studio-shimmer"
        style={{ flex: 1, borderRadius: 18, minHeight: 180 }}
      />
    </div>
  );
}

// ── SECTION-SPECIFIC VOCALEX SKELETONS ────────────────────────────────────────

export function VocalexCoachSkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        padding: '24px 20px',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--app-bg)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="studio-shimmer" style={{ width: 120, height: 26, borderRadius: 8 }} />
        <div className="studio-shimmer" style={{ width: 34, height: 34, borderRadius: '50%' }} />
      </div>
      <div
        className="studio-shimmer"
        style={{
          width: 'clamp(180px, 25vh, 230px)',
          height: 'clamp(180px, 25vh, 230px)',
          borderRadius: '50%',
          border: '6px solid rgba(128,128,128,0.12)',
        }}
      />
      <div
        className="studio-shimmer"
        style={{ width: '100%', height: 100, borderRadius: 18 }}
      />
      <div
        className="studio-shimmer"
        style={{ width: 68, height: 68, borderRadius: '50%', marginBottom: 16 }}
      />
    </div>
  );
}

export const VocalexPreferencesSkeleton = ChordexPreferencesSkeleton;

// ── SECTION-SPECIFIC GROOVEX SKELETONS ────────────────────────────────────────

export function GroovexLibrarySkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        padding: '20px 16px',
        gap: 14,
        background: 'var(--app-bg)',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div className="studio-shimmer" style={{ width: 130, height: 26, borderRadius: 8 }} />
        <div className="studio-shimmer" style={{ width: 34, height: 34, borderRadius: '50%' }} />
      </div>
      <div
        className="studio-shimmer"
        style={{ width: '100%', height: 44, borderRadius: 9999, flexShrink: 0 }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflow: 'hidden' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              borderRadius: 20,
              background: 'var(--surface-card-bg, var(--app-surface))',
              border: '1px solid rgba(128,128,128,0.08)',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              className="studio-shimmer"
              style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0 }}
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="studio-shimmer" style={{ width: '55%', height: 16, borderRadius: 4 }} />
              <div className="studio-shimmer" style={{ width: '35%', height: 11, borderRadius: 3 }} />
            </div>
            <div
              className="studio-shimmer"
              style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export const GroovexPreferencesSkeleton = ChordexPreferencesSkeleton;

export function GroovexMixerSkeleton({ tracksCount = 4 }: { tracksCount?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {Array.from({ length: tracksCount }).map((_, i) => (
        <div
          key={i}
          className="studio-shimmer"
          style={{
            height: 52,
            borderRadius: 12,
            background: 'var(--gx-surface-low)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}
        >
          {/* Track name label skeleton */}
          <div
            style={{ width: 70, height: 12, background: 'var(--gx-surface-high)', borderRadius: 3 }}
          />
          {/* Slider and M/S controls skeleton */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flex: 1,
              justifyContent: 'flex-end',
              maxWidth: '70%',
            }}
          >
            {/* Slider bar */}
            <div
              style={{
                flex: 1,
                height: 4,
                background: 'var(--gx-surface-high)',
                borderRadius: 2,
                maxWidth: 120,
              }}
            />
            {/* M/S button circles */}
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: 'var(--gx-surface-high)',
              }}
            />
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: 'var(--gx-surface-high)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export const LivexSkeletonCard = StudioSkeletonCard;
export const LivexSkeletonRow = StudioSkeletonRow;
export const LivexSkeletonList = StudioSkeletonList;
export const LivexSkeletonHeader = StudioSkeletonHeader;
export const LivexSkeletonProfile = StudioSkeletonProfile;
export const LivexSkeletonGrid = StudioSkeletonGrid;
export const LivexHubSkeleton = StudioHubSkeleton;

