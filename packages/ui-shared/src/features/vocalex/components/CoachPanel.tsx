import { useT, resolveAccent, useSettingsStore, useShallow } from '@workspace/studio-core';
import { useState } from 'react';
import { StudioHeader } from '../../../shared/layout/StudioHeader';
import PitchPanel from './PitchPanel';
import PracticePanel from './PracticePanel';

export default function CoachPanel({ active = true }: { active?: boolean }) {
  const t = useT();
  const settings = useSettingsStore(
    useShallow((s) => ({
      perApp: s.settings.perApp,
      accentColor: s.settings.accentColor,
      amoledMode: s.settings.amoledMode,
      language: s.settings.language,
    }))
  );
  const activeVis = settings.perApp?.vocalex ?? { theme: 'dark', amoledMode: false };
  const acc = resolveAccent(settings.accentColor);
  const isLight =
    activeVis.theme === 'light' ||
    (activeVis.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: light)').matches);
  const isAmoled = !isLight && Boolean(settings.amoledMode || activeVis.amoledMode);

  const [subView, setSubView] = useState<'pitch' | 'practice'>('pitch');
  const vt = t.vocalex as any;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Vocalex Coach Top Navigation & Header ── */}
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          margin: '0 auto',
          padding:
            'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 8px) var(--page-header-inset-h, var(--page-inset-h, 20px)) 0',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        {/* 1. Compact Vocalex Sub-Tab Switcher (Pill-Based) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '8px',
          }}
        >
          <div
            className="studio-pill-container"
            style={{
              position: 'relative',
              display: 'flex',
              width: '100%',
              maxWidth: 320,
              background: 'var(--control-track-bg, rgba(0,0,0,0.06))',
              padding: 3,
              borderRadius: 9999,
              border: '1px solid var(--c-border, rgba(128,128,128,0.12))',
              boxShadow: 'var(--shadow-inset-soft, inset 0 1px 2px rgba(0,0,0,0.15))',
              userSelect: 'none',
              boxSizing: 'border-box',
            }}
          >
            {/* Sliding Pill Indicator */}
            <div
              style={{
                position: 'absolute',
                left: 3,
                top: 3,
                bottom: 3,
                width: 'calc(50% - 3px)',
                transform: subView === 'pitch' ? 'translateX(0)' : 'translateX(100%)',
                background: isLight
                  ? '#ffffff'
                  : isAmoled
                    ? '#000000'
                    : 'var(--surface-card-bg, rgba(255,255,255,0.14))',
                borderRadius: 9999,
                transition: 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: 'var(--shadow-control-raised, 0 2px 8px rgba(0,0,0,0.25))',
                zIndex: 0,
              }}
            />

            <button
              type="button"
              onClick={() => setSubView('pitch')}
              style={{
                position: 'relative',
                zIndex: 1,
                flex: 1,
                height: 34,
                borderRadius: 9999,
                fontWeight: 600,
                fontSize: 13,
                fontFamily: 'var(--studio-font-body)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                cursor: 'pointer',
                border: 'none',
                background: 'transparent',
                color: subView === 'pitch' ? 'var(--c-text-primary)' : 'var(--c-text-secondary)',
                transition: 'color 200ms ease',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 17,
                  color: subView === 'pitch' ? acc.from : 'inherit',
                  transition: 'color 200ms ease',
                }}
              >
                query_stats
              </span>
              <span>{settings.language === 'es' ? 'Monitor' : 'Monitor'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSubView('practice')}
              style={{
                position: 'relative',
                zIndex: 1,
                flex: 1,
                height: 34,
                borderRadius: 9999,
                fontWeight: 600,
                fontSize: 13,
                fontFamily: 'var(--studio-font-body)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                cursor: 'pointer',
                border: 'none',
                background: 'transparent',
                color: subView === 'practice' ? 'var(--c-text-primary)' : 'var(--c-text-secondary)',
                transition: 'color 200ms ease',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 17,
                  color: subView === 'practice' ? acc.from : 'inherit',
                  transition: 'color 200ms ease',
                }}
              >
                school
              </span>
              <span>{settings.language === 'es' ? 'Ejercicios' : 'Exercises'}</span>
            </button>
          </div>
        </div>

        {/* 2. Page title and short description (canonical StudioHeader) */}
        <StudioHeader
          title={
            subView === 'pitch'
              ? vt.tabMonitor || (settings.language === 'es' ? 'Monitor de Voz' : 'Vocal Monitor')
              : vt.tabExercises ||
                (settings.language === 'es' ? 'Ejercicios Vocales' : 'Vocal Exercises')
          }
          subtitle={
            subView === 'pitch'
              ? vt.coachSubtitle ||
                (settings.language === 'es'
                  ? 'Detección y afinación vocal en tiempo real.'
                  : 'Real-time pitch detection and tuning.')
              : vt.tipsSubtitle ||
                (settings.language === 'es'
                  ? 'Técnicas vocales para mejorar tu voz.'
                  : 'Vocal techniques to improve your voice.')
          }
          disableTopInset={true}
          disableHorizontalPadding={true}
          titleStyle={{
            fontFamily: 'var(--type-title-font, var(--studio-font-display))',
            fontSize: 'var(--type-title-size, 22px)',
            lineHeight: 'var(--type-title-lh, 28px)',
            fontWeight: 'var(--type-title-weight, 700)',
            letterSpacing: 'var(--type-title-tracking, -0.7px)',
          }}
          subtitleStyle={{
            fontFamily: 'var(--type-meta-font, var(--studio-font-body))',
            fontSize: 'var(--type-metadata-size, 12.5px)',
            lineHeight: 'var(--type-metadata-lh, 16px)',
            letterSpacing: 'var(--type-metadata-tracking, 0.15px)',
            color: 'var(--c-text-secondary)',
            marginTop: '2px',
          }}
          containerStyle={{
            paddingTop: '0px',
            paddingBottom: '2px',
            marginBottom: '6px',
          }}
        />
      </div>

      {/* View Content */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: subView === 'pitch' ? 'flex' : 'none',
            flexDirection: 'column',
            flex: 1,
            width: '100%',
            height: '100%',
            minHeight: 0,
          }}
        >
          <PitchPanel active={active && subView === 'pitch'} />
        </div>
        <div
          style={{
            display: subView === 'practice' ? 'block' : 'none',
            height: '100%',
          }}
        >
          <PracticePanel />
        </div>
      </div>
    </div>
  );
}
