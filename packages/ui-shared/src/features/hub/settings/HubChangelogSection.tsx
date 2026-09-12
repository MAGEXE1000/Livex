import React from 'react';
import {
  RELEASE_HISTORY,
  APP_VERSION_LABEL,
  ACCENT_COLORS,
  resolveAccent,
  useSettingsStore,
  sanitizeUTF8String,
} from '@workspace/studio-core';
import { SectionHeader } from '../../../shared/settings/SettingControls';

export default function HubChangelogSection() {
  const accentColor = useSettingsStore((s) => s.settings.accentColor);
  const acc = resolveAccent(accentColor);

  const cardStyle: React.CSSProperties = {
    background: 'var(--app-surface, rgba(255, 255, 255, 0.03))',
    borderRadius: '1.5rem',
    overflow: 'hidden',
    border: '1px solid rgba(128, 128, 128, 0.12)',
    padding: '16px',
    transition: 'background-color 700ms cubic-bezier(0.4,0,0.2,1)',
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <SectionHeader icon="history" title="Changelog & Release Notes" />
      <div style={cardStyle}>
        <div className="flex flex-col gap-4 max-h-[420px] overflow-y-auto no-scrollbar pr-1">
          {RELEASE_HISTORY.map((rel, index) => {
            const isLatest = index === 0;
            return (
              <div
                key={rel.version}
                style={{
                  background: isLatest ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                  border: isLatest
                    ? `1px solid ${acc.from}40`
                    : '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'border-color 200ms ease',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        background: isLatest
                          ? `linear-gradient(135deg, ${acc.from}, ${acc.to})`
                          : 'rgba(255, 255, 255, 0.12)',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '12px',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        letterSpacing: '0.02em',
                      }}
                    >
                      v{rel.version}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--c-text-secondary)',
                        fontWeight: 600,
                      }}
                    >
                      {rel.date}
                    </span>
                  </div>
                  {isLatest && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: acc.from,
                        background: `${acc.from}15`,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                      }}
                    >
                      Latest Release
                    </span>
                  )}
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  {rel.highlights.map((h, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: '13px',
                        color: 'var(--c-text-primary)',
                        lineHeight: '1.45',
                      }}
                    >
                      {sanitizeUTF8String(h)}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
