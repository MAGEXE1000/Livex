import React, { useState, useEffect } from 'react';
import { type AppKey } from '@workspace/livex-core';
import { Loader } from '../../components/motion/loader';
import {
  LivexLogo,
  ChordexLogo,
  DrumexLogo,
  StagexLogoIcon,
  GroovexLogo,
  VocalexLogo,
} from '../../features/chordex/icons/ChordexLogo';

interface SmartLoadingProps {
  fallbackSkeleton?: React.ReactNode;
  subtleLoading?: React.ReactNode;
  delayMs?: number; // threshold for showing subtle loading (150ms)
  skeletonMs?: number; // threshold for showing full skeleton (400ms)
  app?: AppKey;
}

export function AppLoadingScreen({ app }: { app?: AppKey | string }) {
  const logos: Record<
    string,
    { Logo: React.ComponentType<{ size?: number }>; name: string; desc: string; color: string }
  > = {
    chordex: {
      Logo: ChordexLogo,
      name: 'Chordex',
      desc: 'Preparing chord theory engine...',
      color: '#a855f7',
    },
    chords: {
      Logo: ChordexLogo,
      name: 'Chordex',
      desc: 'Preparing chord theory engine...',
      color: '#a855f7',
    },
    drumex: {
      Logo: DrumexLogo,
      name: 'Drumex',
      desc: 'Loading drum patterns...',
      color: '#ec4899',
    },
    drums: {
      Logo: DrumexLogo,
      name: 'Drumex',
      desc: 'Loading drum patterns...',
      color: '#ec4899',
    },
    stagex: {
      Logo: StagexLogoIcon,
      name: 'Stagex',
      desc: 'Initializing stage plot canvas...',
      color: '#3b82f6',
    },
    stage: {
      Logo: StagexLogoIcon,
      name: 'Stagex',
      desc: 'Initializing stage plot canvas...',
      color: '#3b82f6',
    },
    groovex: {
      Logo: GroovexLogo,
      name: 'Groovex',
      desc: 'Loading audio channels...',
      color: '#10b981',
    },
    vocalex: {
      Logo: VocalexLogo,
      name: 'Vocalex',
      desc: 'Preparing vocal recorder...',
      color: '#f59e0b',
    },
    hub: {
      Logo: LivexLogo,
      name: 'Livex Hub',
      desc: 'Loading Livex...',
      color: '#3b82f6',
    },
  };

  const defaultLivexConfig = {
    Logo: LivexLogo,
    name: 'Livex',
    desc: 'Loading workspace...',
    color: '#3b82f6',
  };

  const config = (app && logos[app]) || defaultLivexConfig;
  const Logo = config.Logo;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: 'var(--c-background)', // Responsive background token
        color: 'var(--c-text-primary)', // Responsive text token
        fontFamily: 'var(--studio-font-body, "Inter", sans-serif)',
        animation: 'fade-in 200ms ease-out forwards',
      }}
    >
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse-logo {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
      `}</style>
      <div
        style={
          {
            '--shadow-color': config.color,
            animation: 'pulse-logo 2s infinite ease-in-out',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          } as any
        }
      >
        <Logo size={80} />
      </div>
      <h1
        style={{
          fontSize: '24px',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          marginBottom: '8px',
          background: `linear-gradient(135deg, var(--c-text-primary) 0%, ${config.color} 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {config.name}
      </h1>
      <p
        style={{
          fontSize: '13px',
          color: 'var(--c-text-secondary)',
          fontWeight: 500,
          margin: 0,
          marginBottom: '16px',
        }}
      >
        {config.desc}
      </p>
      <Loader variant="comet" size={28} />
    </div>
  );
}

export default function SmartLoading({
  fallbackSkeleton,
  subtleLoading,
  delayMs = 150,
  skeletonMs = 400,
  app,
}: SmartLoadingProps) {
  const [loadState, setLoadState] = useState<'none' | 'subtle' | 'skeleton'>(
    app || fallbackSkeleton ? 'skeleton' : 'none'
  );

  useEffect(() => {
    if (app || fallbackSkeleton) return; // Skip timers if app loading screen or fallback skeleton is present

    const subtleTimer = setTimeout(() => {
      setLoadState('subtle');
    }, delayMs);

    const skeletonTimer = setTimeout(() => {
      setLoadState('skeleton');
    }, skeletonMs);

    return () => {
      clearTimeout(subtleTimer);
      clearTimeout(skeletonTimer);
    };
  }, [delayMs, skeletonMs, app, fallbackSkeleton]);

  if (loadState === 'none') {
    return null;
  }

  if (loadState === 'subtle') {
    return subtleLoading ? (
      <>{subtleLoading}</>
    ) : (
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}
      >
        <Loader variant="spinner" size={24} />
      </div>
    );
  }

  if (app) {
    return <AppLoadingScreen app={app} />;
  }

  return (
    <div style={{ animation: 'skeleton-fade-in 300ms ease both' }}>
      <style>{`
        @keyframes skeleton-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {fallbackSkeleton}
    </div>
  );
}
