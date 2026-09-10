import React, { useState, useEffect } from 'react';
import { BouncyAccordion } from '../../../components/motion/bouncy-accordion';
import { APP_VERSION, getChangelogSections, RELEASE_HISTORY } from '@workspace/studio-core';

function getCategoryIcon(category: string): string {
  switch (category) {
    case 'app_update':
    case 'ota_update':
      return 'system_update';
    case 'download_complete':
      return 'download_done';
    case 'install_ready':
      return 'install_mobile';
    case 'install_failed':
      return 'error';
    case 'sync_event':
      return 'sync';
    case 'backup_event':
      return 'backup';
    case 'cloud_event':
      return 'cloud';
    case 'account_event':
      return 'account_circle';
    case 'tip':
      return 'lightbulb';
    case 'feature_announcement':
      return 'campaign';
    case 'system_message':
      return 'info';
    default:
      return 'notifications';
  }
}

function getCategoryColor(category: string): { bg: string; text: string } {
  switch (category) {
    case 'install_failed':
      return { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' };
    case 'install_ready':
    case 'app_update':
    case 'ota_update':
      return { bg: 'rgba(168, 85, 247, 0.1)', text: '#a855f7' };
    case 'sync_event':
    case 'backup_event':
      return { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' };
    case 'tip':
      return { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' };
    case 'feature_announcement':
      return { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981' };
    default:
      return { bg: 'rgba(128, 128, 128, 0.1)', text: 'var(--c-text-secondary)' };
  }
}

function formatTimestamp(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'Just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / 86400000);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function parseMarkdownToSections(body: string | null | undefined) {
  if (!body) return [];
  const lines = body.split('\n');
  const sections: { heading: string; items: string[] }[] = [];
  let currentSec: { heading: string; items: string[] } | null = null;
  const defaultItems: string[] = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (line.startsWith('#')) {
      const headingText = line.replace(/^#+\s*/, '').trim();
      let friendlyHeading = headingText;
      const lower = headingText.toLowerCase();
      if (lower.includes('added') || lower.includes('feature')) {
        friendlyHeading = 'New Features';
      } else if (lower.includes('improve') || lower.includes('polish')) {
        friendlyHeading = 'Improvements';
      } else if (lower.includes('fix') || lower.includes('bug')) {
        friendlyHeading = 'Bug Fixes';
      } else if (lower.includes('perf') || lower.includes('speed') || lower.includes('optimis')) {
        friendlyHeading = 'Performance';
      } else if (
        lower.includes('ui') ||
        lower.includes('ux') ||
        lower.includes('appear') ||
        lower.includes('style')
      ) {
        friendlyHeading = 'UI / UX';
      } else if (lower.includes('break') || lower.includes('chang')) {
        friendlyHeading = 'Breaking Changes';
      }

      if (currentSec && currentSec.items.length > 0) {
        sections.push(currentSec);
      }
      currentSec = { heading: friendlyHeading, items: [] };
    } else if (line.startsWith('-') || line.startsWith('*') || line.startsWith('•')) {
      const cleanLine = line.replace(/^[-*•]\s*/, '').trim();
      if (cleanLine) {
        if (currentSec) {
          currentSec.items.push(cleanLine);
        } else {
          defaultItems.push(cleanLine);
        }
      }
    }
  }

  if (currentSec && currentSec.items.length > 0) {
    sections.push(currentSec);
  }

  if (defaultItems.length > 0) {
    sections.unshift({ heading: 'General Updates', items: defaultItems });
  }

  return sections;
}

interface ParsedRelease {
  version: string;
  date: string;
  isLatest: boolean;
  isCurrent: boolean;
  sections: { heading: string; items: string[] }[];
}

export function ChangelogView({
  lang,
  accent,
}: {
  lang: string;
  accent: { from: string; to: string };
}) {
  const [releases, setReleases] = useState<ParsedRelease[]>([]);
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadChangelog() {
      try {
        const cached = localStorage.getItem('studio:changelog_cache');
        const cachedTime = localStorage.getItem('studio:changelog_cache_time');
        const cachedVersion = localStorage.getItem('studio:changelog_cache_version');
        const cachedLang = localStorage.getItem('studio:changelog_cache_lang');
        if (
          cached &&
          cachedTime &&
          cachedVersion === APP_VERSION &&
          cachedLang === (lang || 'en')
        ) {
          const age = Date.now() - parseInt(cachedTime, 10);
          if (age < 1000 * 60 * 60) {
            const parsed = JSON.parse(cached);
            if (active && parsed && parsed.length > 0) {
              setReleases(parsed);
              setLoading(false);
              if (parsed[0]) {
                setExpandedVersions({ [parsed[0].version]: true });
              }
              return;
            }
          }
        }
      } catch (e) {
        console.warn('Failed to load cached changelog', e);
      }

      try {
        const res = await fetch('https://api.github.com/repos/MAGEXE1000/Livex/releases');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          const parsedList: ParsedRelease[] = data.map((rel: any, idx: number) => {
            const vRaw = rel.tag_name ? rel.tag_name.replace(/^v/, '') : '0.0.0';
            const dateStr = rel.published_at
              ? new Date(rel.published_at).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : 'N/A';
            const sections = parseMarkdownToSections(rel.body);

            return {
              version: vRaw,
              date: dateStr,
              isLatest: idx === 0,
              isCurrent: vRaw === APP_VERSION,
              sections,
            };
          });

          if (active) {
            setReleases(parsedList);
            setLoading(false);
            if (parsedList[0]) {
              setExpandedVersions({ [parsedList[0].version]: true });
            }
          }

          try {
            localStorage.setItem('studio:changelog_cache', JSON.stringify(parsedList));
            localStorage.setItem('studio:changelog_cache_time', String(Date.now()));
            localStorage.setItem('studio:changelog_cache_version', APP_VERSION);
            localStorage.setItem('studio:changelog_cache_lang', lang || 'en');
          } catch (e) {}
          return;
        }
      } catch (err) {
        console.warn('Failed to fetch from GitHub, using fallback', err);
      }

      if (active) {
        const defaultSections = getChangelogSections(lang) || [];
        const fallbackList: ParsedRelease[] = [
          {
            version: APP_VERSION,
            date: lang === 'es' ? '1 de agosto de 2026' : 'August 1, 2026',
            isLatest: true,
            isCurrent: true,
            sections: defaultSections.map((s) => ({
              heading: s.heading === 'Added' ? 'New Features' : s.heading,
              items: s.items,
            })),
          },
          ...RELEASE_HISTORY.map((item) => {
            const dateObj = new Date(item.date);
            const dateStr = isNaN(dateObj.getTime())
              ? item.date
              : dateObj.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                });

            return {
              version: item.version,
              date: dateStr,
              isLatest: false,
              isCurrent: item.version === APP_VERSION,
              sections: [{ heading: 'General Updates', items: item.highlights }],
            };
          }),
        ];

        setReleases(fallbackList);
        setLoading(false);
        if (fallbackList[0]) {
          setExpandedVersions({ [fallbackList[0].version]: true });
        }
      }
    }

    loadChangelog();
    return () => {
      active = false;
    };
  }, [lang]);

  const toggleExpand = (version: string) => {
    setExpandedVersions((prev) => ({
      ...prev,
      [version]: !prev[version],
    }));
  };

  const getCategoryStyles = (heading: string) => {
    const lower = heading.toLowerCase();
    if (lower.includes('feature') || lower.includes('added')) {
      return { bg: 'rgba(52, 211, 153, 0.12)', fg: '#10b981' };
    }
    if (lower.includes('improve') || lower.includes('polish')) {
      return { bg: 'rgba(168, 85, 247, 0.12)', fg: '#a855f7' };
    }
    if (lower.includes('fix') || lower.includes('bug')) {
      return { bg: 'rgba(239, 68, 68, 0.12)', fg: '#ef4444' };
    }
    if (lower.includes('perf') || lower.includes('speed')) {
      return { bg: 'rgba(45, 212, 191, 0.12)', fg: '#0d9488' };
    }
    if (lower.includes('ui') || lower.includes('ux') || lower.includes('appear')) {
      return { bg: 'rgba(244, 114, 182, 0.12)', fg: '#db2777' };
    }
    if (lower.includes('break') || lower.includes('chang')) {
      return { bg: 'rgba(245, 158, 11, 0.12)', fg: '#d97706' };
    }
    return { bg: 'var(--app-surface-low, rgba(128,128,128,0.08))', fg: 'var(--c-text-secondary)' };
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-10) 0',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: `3px solid rgba(128,128,128,0.1)`,
            borderTopColor: accent.from,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <span style={{ fontSize: 13, color: 'var(--c-text-secondary)', fontFamily: 'Inter' }}>
          {lang === 'es' ? 'Cargando historial de cambios...' : 'Loading changelog history...'}
        </span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: 16 }}
    >
      <div
        style={{
          position: 'absolute',
          left: 4,
          top: 8,
          bottom: 24,
          width: 2,
          background: 'rgba(128, 128, 128, 0.08)',
          borderRadius: 1,
        }}
      />

      <BouncyAccordion
        items={releases.map((rel) => ({
          id: rel.version,
          title: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'var(--c-text-primary)',
                  fontFamily: 'var(--studio-font-display)',
                  letterSpacing: '-0.02em',
                }}
              >
                v{rel.version}
              </span>
              {rel.isCurrent && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    fontFamily: 'var(--type-caption-font, var(--studio-font-body))',
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: `linear-gradient(135deg, ${accent.from}1a, ${accent.to}1a)`,
                    color: accent.from,
                    border: `1px solid ${accent.from}33`,
                    textTransform: 'uppercase',
                  }}
                >
                  {lang === 'es' ? 'Instalado' : 'Installed'}
                </span>
              )}
              {rel.isLatest && !rel.isCurrent && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    fontFamily: 'var(--type-caption-font, var(--studio-font-body))',
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'rgba(52, 211, 153, 0.12)',
                    color: '#10b981',
                    border: '1px solid rgba(52, 211, 153, 0.2)',
                    textTransform: 'uppercase',
                  }}
                >
                  {lang === 'es' ? 'Más Reciente' : 'Latest'}
                </span>
              )}
              <span
                style={{
                  fontSize: 'var(--font-section-label)',
                  color: 'var(--c-text-secondary)',
                  fontFamily: 'var(--studio-font-body)',
                  opacity: 0.8,
                  marginLeft: 'auto',
                }}
              >
                {rel.date}
              </span>
            </div>
          ),
          description:
            rel.sections.length === 0 ? (
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--c-text-secondary)',
                  fontFamily: 'var(--studio-font-body)',
                  fontStyle: 'italic',
                  paddingLeft: 4,
                }}
              >
                {lang === 'es'
                  ? 'No hay detalles de cambios disponibles.'
                  : 'No detailed changes available.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {rel.sections.map((sec, sIdx) => {
                  const cStyle = getCategoryStyles(sec.heading);
                  return (
                    <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex' }}>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            fontFamily: 'var(--type-caption-font, var(--studio-font-body))',
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: cStyle.bg,
                            color: cStyle.fg,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {sec.heading}
                        </span>
                      </div>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: 16,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                        }}
                      >
                        {sec.items.map((item, iIdx) => (
                          <li
                            key={iIdx}
                            style={{
                              fontSize: 12.5,
                              color: 'var(--c-text-secondary)',
                              fontFamily: 'Inter',
                              lineHeight: 1.4,
                            }}
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            ),
        }))}
        value={Object.keys(expandedVersions).find((v) => expandedVersions[v]) || null}
        onValueChange={(val) => setExpandedVersions(val ? { [val]: true } : {})}
      />
    </div>
  );
}

export default ChangelogView;
