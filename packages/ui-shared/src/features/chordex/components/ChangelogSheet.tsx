import { Dialog } from '../../../shared/design-system/dialogs';
import {
  useChordStore,
  ACCENT_COLORS,
  useT,
  useSettingsStore,
} from '@workspace/studio-core';
import React from 'react';
import {
  APP_VERSION,
  APP_VERSION_DATE,
  APP_CHANGELOG_SECTIONS,
  getChangelogSections,
  type ChangelogSection,
  sanitizeUTF8String,
} from '@workspace/studio-core';
type Props = {
  open: boolean;
  onClose: () => void;
  /** Version to label the entry with. Defaults to APP_VERSION. */
  version?: string;
  /** ISO date for the entry. Defaults to APP_VERSION_DATE. */
  date?: string;
  /** Sections to render. Defaults to the current bundle's changelog. */
  sections?: ChangelogSection[];
};

export default function ChangelogSheet({
  open,
  onClose,
  version = APP_VERSION,
  date = APP_VERSION_DATE,
  sections,
}: Props) {
  const t = useT();
  const language = useSettingsStore((s) => s.settings.language);
  const renderSections: ChangelogSection[] =
    sections ?? getChangelogSections(language ?? 'en');
  void APP_CHANGELOG_SECTIONS; // keep import compatibility for any consumer relying on the re-export shape


  return (
    <Dialog open={open} onClose={onClose} title={`v${version}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Date / Category line */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <span
            style={{
              fontFamily: 'Inter',
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 999,
              background: 'var(--c-accent-from)22',
              color: 'var(--c-accent-from)',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}
          >
            {t.hub.changelogTitle ?? 'Changelog'}
          </span>
          <span
            style={{
              fontFamily: 'Inter',
              fontSize: 12,
              color: 'var(--c-text-muted)',
            }}
          >
            {date}
          </span>
        </div>

        {/* Sections list */}
        <div>
          {renderSections.map((sec, i) => (
            <section
              key={i}
              style={{
                marginBottom: i === renderSections.length - 1 ? 0 : 22,
              }}
            >
              <h3
                style={{
                  margin: '0 0 10px',
                  fontFamily: 'var(--studio-font-display)',
                  fontWeight: 700,
                  fontSize: 11,
                  color: 'var(--c-text-muted)',
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                }}
              >
                {sec.heading}
              </h3>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {sec.items.map((line, j) => {
                  const cleanedLine = sanitizeUTF8String(line.replace(/^[-*•]\s*/, '')).trim();
                  return (
                    <li
                      key={j}
                      style={{
                        display: 'flex',
                        gap: 12,
                        fontFamily: 'Inter',
                        fontSize: 14,
                        lineHeight: '1.6',
                        color: 'var(--c-text-secondary)',
                        padding: '2px 0',
                      }}
                    >
                      <span
                        style={{
                          flexShrink: 0,
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          marginTop: 9,
                          background: 'var(--c-accent-from)',
                        }}
                      />
                      <span>{cleanedLine}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
