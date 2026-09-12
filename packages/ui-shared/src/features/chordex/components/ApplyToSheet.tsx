import { Dialog } from '../../../shared/design-system/dialogs';
import { MorphingActionSurface } from '../../../shared/design-system/MorphingActionSurface';
import { NavigationDispatcher } from '@workspace/studio-core';
import {
  useChordStore,
  ACCENT_COLORS,
  resolveAccent,
  type AppKey,
  useT,
  useSettingsStore,
  useShallow,
} from '@workspace/studio-core';
import React, { useState, useEffect } from 'react';
import {
  StudioLogo,
  ChordexLogo,
  DrumexLogo,
  StagexLogoIcon,
  GroovexLogo,
  VocalexLogo,
} from '../icons/ChordexLogo';
import { Button } from '../../../shared/design-system/StudioDesignSystem';

interface AppCard {
  key: AppKey;
  label: string;
  Logo: React.ComponentType<{ size?: number }>;
}

const APP_CARDS: AppCard[] = [
  { key: 'hub', label: 'Studio', Logo: StudioLogo },
  { key: 'chordex', label: 'Chordex', Logo: ChordexLogo },
  { key: 'drumex', label: 'Drumex', Logo: DrumexLogo },
  { key: 'stagex', label: 'Stagex', Logo: StagexLogoIcon },
  { key: 'groovex', label: 'Groovex', Logo: GroovexLogo },
  { key: 'vocalex', label: 'Vocalex', Logo: VocalexLogo },
];

interface ApplyToSheetProps {
  show: boolean;
  onApply: (apps: AppKey[]) => void;
  onClose: () => void;
}

export default function ApplyToSheet({ show, onApply, onClose }: ApplyToSheetProps) {
  const { perApp, accentColor } = useSettingsStore(
    useShallow((s) => ({
      perApp: s.settings.perApp,
      accentColor: s.settings.accentColor,
    }))
  );
  const t = useT();
  const appKey = NavigationDispatcher.currentApp() as AppKey;
  const accent = resolveAccent(accentColor);

  const [selected, setSelected] = useState<Set<AppKey>>(
    new Set(['hub', 'chordex', 'drumex', 'stagex', 'groovex', 'vocalex'])
  );

  useEffect(() => {
    if (show) {
      setSelected(new Set(['hub', 'chordex', 'drumex', 'stagex', 'groovex', 'vocalex']));
    }
  }, [show]);

  function toggle(key: AppKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleApply() {
    onApply(Array.from(selected));
  }

  return (
    <Dialog
      open={show}
      onClose={onClose}
      title={t.applyTo.title}
      footer={
        <Button variant="primary" onClick={handleApply} style={{ width: '100%' }}>
          {t.applyTo.apply}
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p
          style={{
            textAlign: 'center',
            margin: '0 0 4px',
            fontSize: 13,
            color: 'var(--c-text-secondary)',
            fontFamily: 'Inter',
          }}
        >
          {t.applyTo.subtitle}
        </p>

        {/* App cards */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          {APP_CARDS.map(({ key, label, Logo }) => {
            const active = selected.has(key);
            return (
              <button
                key={key}
                onClick={() => toggle(key)}
                className="btn-smooth"
                style={{
                  width: 'calc(33.333% - 8px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '18px 8px',
                  borderRadius: 18,
                  background: active ? `var(--c-accent-from)18` : 'var(--c-surface-high)',
                  border: `2px solid ${active ? 'var(--c-accent-from)' : 'var(--c-border)'}`,
                  transition: 'background 200ms ease, border-color 200ms ease',
                  position: 'relative',
                }}
              >
                {/* Check badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: active ? 'var(--c-accent-from)' : 'rgba(128,128,128,0.15)',
                    border: active ? 'none' : '1.5px solid rgba(128,128,128,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 200ms ease, border 200ms ease',
                  }}
                >
                  {active && (
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: 13,
                        color: '#fff',
                        fontVariationSettings: "'FILL' 1, 'wght' 700",
                      }}
                    >
                      check
                    </span>
                  )}
                </div>

                {/* Logo */}
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: active ? `var(--c-accent-from)22` : 'rgba(128,128,128,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 200ms ease',
                  }}
                >
                  <Logo size={32} />
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: 'var(--studio-font-display)',
                    color: active ? 'var(--c-text-primary)' : 'var(--c-text-secondary)',
                    transition: 'color 200ms ease',
                  }}
                >
                  {label}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}

export function MorphingApplyToSurface({
  buttonLabel = 'Apply to other apps',
  buttonIcon = 'apps',
  onApply,
  accentColor,
}: {
  buttonLabel?: string;
  buttonIcon?: string;
  onApply: (apps: AppKey[]) => void;
  accentColor?: string;
}) {
  const accentColorSetting = useSettingsStore((s) => s.settings.accentColor);
  const t = useT();
  const accent = resolveAccent(accentColorSetting);
  const [selected, setSelected] = useState<Set<AppKey>>(
    new Set(['hub', 'chordex', 'drumex', 'stagex', 'groovex', 'vocalex'])
  );

  function toggle(key: AppKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <MorphingActionSurface
      buttonLabel={buttonLabel}
      buttonIcon={buttonIcon}
      title={t.applyTo.title}
      subtitle={t.applyTo.subtitle}
      accentColor={accentColor || accent.from}
    >
      {({ close }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {APP_CARDS.map(({ key, label, Logo }) => {
              const active = selected.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggle(key)}
                  style={{
                    width: 'calc(33.333% - 7px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '14px 6px',
                    borderRadius: 14,
                    background: active ? `${accent.from}18` : 'var(--c-surface-high, #1e1e24)',
                    border: `1.5px solid ${active ? accent.from : 'var(--c-border, rgba(255,255,255,0.08))'}`,
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  <Logo size={28} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-primary)' }}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
          <Button
            variant="primary"
            onClick={() => {
              onApply(Array.from(selected));
              close();
            }}
            style={{ width: '100%', marginTop: 8 }}
          >
            {t.applyTo.apply}
          </Button>
        </div>
      )}
    </MorphingActionSurface>
  );
}
