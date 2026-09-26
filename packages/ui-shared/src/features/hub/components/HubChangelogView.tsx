import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { APP_VERSION, getChangelogSections, RELEASE_HISTORY } from '@workspace/livex-core';
import AppSpinner from '../../../shared/loading/AppSpinner';
import { StudioIcon } from '../../../shared/icons/StudioIcon';
import { useAppReducedMotion } from '../../../hooks/useAppReducedMotion';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ParsedChangeItem {
  id: string;
  title: string;
  detail: string;
  category: string;
  raw: string;
}

export interface ParsedCategoryGroup {
  category: string;
  items: ParsedChangeItem[];
}

export interface EnrichedRelease {
  version: string;
  date: string;
  isLatest: boolean;
  isCurrent: boolean;
  categories: ParsedCategoryGroup[];
  totalChanges: number;
  availableCategories: string[];
}

// ── Category Registry & Color System ─────────────────────────────────────────

interface CategoryMeta {
  label: { en: string; es: string };
  badgeColor: { bg: string; fg: string; border: string; dot: string };
  icon: string;
}

const CATEGORY_REGISTRY: Record<string, CategoryMeta> = {
  'New Features': {
    label: { en: 'New Features', es: 'Novedades' },
    badgeColor: {
      bg: 'rgba(16, 185, 129, 0.12)',
      fg: '#10b981',
      border: 'rgba(16, 185, 129, 0.28)',
      dot: '#10b981',
    },
    icon: 'sparkles',
  },
  'Improvements': {
    label: { en: 'Improvements', es: 'Mejoras' },
    badgeColor: {
      bg: 'rgba(168, 85, 247, 0.12)',
      fg: '#a855f7',
      border: 'rgba(168, 85, 247, 0.28)',
      dot: '#a855f7',
    },
    icon: 'tune',
  },
  'Fixes': {
    label: { en: 'Fixes', es: 'Correcciones' },
    badgeColor: {
      bg: 'rgba(239, 68, 68, 0.12)',
      fg: '#ef4444',
      border: 'rgba(239, 68, 68, 0.28)',
      dot: '#ef4444',
    },
    icon: 'check',
  },
  'Performance': {
    label: { en: 'Performance', es: 'Rendimiento' },
    badgeColor: {
      bg: 'rgba(20, 184, 166, 0.12)',
      fg: '#14b8a6',
      border: 'rgba(20, 184, 166, 0.28)',
      dot: '#14b8a6',
    },
    icon: 'speed',
  },
  'Navigation': {
    label: { en: 'Navigation', es: 'Navegación' },
    badgeColor: {
      bg: 'rgba(59, 130, 246, 0.12)',
      fg: '#3b82f6',
      border: 'rgba(59, 130, 246, 0.28)',
      dot: '#3b82f6',
    },
    icon: 'navigation',
  },
  'UI/UX': {
    label: { en: 'UI / UX', es: 'Interfaz y Diseño' },
    badgeColor: {
      bg: 'rgba(236, 72, 153, 0.12)',
      fg: '#ec4899',
      border: 'rgba(236, 72, 153, 0.28)',
      dot: '#ec4899',
    },
    icon: 'palette',
  },
  'Android': {
    label: { en: 'Android', es: 'Android' },
    badgeColor: {
      bg: 'rgba(34, 197, 94, 0.12)',
      fg: '#22c55e',
      border: 'rgba(34, 197, 94, 0.28)',
      dot: '#22c55e',
    },
    icon: 'android',
  },
  'AI': {
    label: { en: 'AI & Vision', es: 'IA y Visión' },
    badgeColor: {
      bg: 'rgba(139, 92, 246, 0.12)',
      fg: '#8b5cf6',
      border: 'rgba(139, 92, 246, 0.28)',
      dot: '#8b5cf6',
    },
    icon: 'auto_awesome',
  },
  'Security': {
    label: { en: 'Security', es: 'Seguridad' },
    badgeColor: {
      bg: 'rgba(245, 158, 11, 0.12)',
      fg: '#f59e0b',
      border: 'rgba(245, 158, 11, 0.28)',
      dot: '#f59e0b',
    },
    icon: 'security',
  },
};

function getCategoryMeta(cat: string): CategoryMeta {
  return (
    CATEGORY_REGISTRY[cat] || {
      label: { en: cat, es: cat },
      badgeColor: {
        bg: 'rgba(128, 128, 128, 0.12)',
        fg: 'var(--c-text-secondary)',
        border: 'rgba(128, 128, 128, 0.22)',
        dot: 'var(--c-text-tertiary, #888)',
      },
      icon: 'info',
    }
  );
}

// ── Smart Semantic Categorization Engine ─────────────────────────────────────

function categorizeItem(title: string, detail: string, rawHeading?: string): string {
  const heading = (rawHeading || '').toLowerCase();
  const text = `${title} ${detail}`.toLowerCase();

  // Explicit heading matches
  if (heading.includes('fix') || heading.includes('bug') || heading.includes('correcci')) {
    return 'Fixes';
  }
  if (heading.includes('perf') || heading.includes('speed') || heading.includes('rendimiento')) {
    return 'Performance';
  }
  if (heading.includes('secur') || heading.includes('seguridad')) {
    return 'Security';
  }
  if (heading.includes('android') || heading.includes('apk')) {
    return 'Android';
  }

  // Semantic domain keyword detection
  if (
    text.includes('crash') ||
    text.startsWith('fix') ||
    text.startsWith('resolved') ||
    text.startsWith('repaired') ||
    text.startsWith('prevented') ||
    text.includes('bug proof') ||
    text.includes('regression')
  ) {
    return 'Fixes';
  }

  if (
    text.includes('navigation') ||
    text.includes('navbar') ||
    text.includes('bottomnav') ||
    text.includes('bottom nav') ||
    text.includes('dock') ||
    text.includes('tab navigation') ||
    text.includes('back stack') ||
    text.includes('keep-alive')
  ) {
    return 'Navigation';
  }

  if (
    text.includes('performance') ||
    text.includes('120 hz') ||
    text.includes('fps') ||
    text.includes('frame pacing') ||
    text.includes('throughput') ||
    text.includes('latency') ||
    text.includes('layout thrashing') ||
    text.includes('re-render') ||
    text.includes('memoiz') ||
    text.includes('render storm') ||
    text.includes('throttl') ||
    text.includes('cache invalidation') ||
    text.includes('decoupled') ||
    text.includes('fast-path')
  ) {
    return 'Performance';
  }

  if (
    text.includes('ai assistant') ||
    text.includes('multimodal') ||
    text.includes('gemini') ||
    text.includes('llama') ||
    text.includes('thinkingorb') ||
    text.includes('musical vision')
  ) {
    return 'AI';
  }

  if (
    text.includes('android') ||
    text.includes('apk') ||
    text.includes('webview') ||
    text.includes('capacitor') ||
    text.includes('installer') ||
    text.includes('packageinstaller')
  ) {
    return 'Android';
  }

  if (
    text.includes('liquid glass') ||
    text.includes('ui') ||
    text.includes('ux') ||
    text.includes('material') ||
    text.includes('morph') ||
    text.includes('animation') ||
    text.includes('theme') ||
    text.includes('amoled') ||
    text.includes('typography') ||
    text.includes('optical') ||
    text.includes('spring physics')
  ) {
    return 'UI/UX';
  }

  if (
    heading.includes('added') ||
    heading.includes('feature') ||
    heading.includes('novedad') ||
    text.startsWith('add') ||
    text.startsWith('new') ||
    text.startsWith('introduced')
  ) {
    return 'New Features';
  }

  if (heading.includes('improve') || heading.includes('mejora')) {
    return 'Improvements';
  }

  return 'Improvements';
}

function parseChangeItem(rawText: string, sectionHeading?: string, index: number = 0): ParsedChangeItem {
  const clean = rawText.replace(/^[-*•]\s*/, '').trim();
  let title = '';
  let detail = '';

  const colonIdx = clean.indexOf(':');
  if (colonIdx > 0 && colonIdx <= 90) {
    title = clean.slice(0, colonIdx).trim();
    detail = clean.slice(colonIdx + 1).trim();
  } else {
    const periodIdx = clean.indexOf('. ');
    if (periodIdx > 0 && periodIdx <= 80) {
      title = clean.slice(0, periodIdx).trim();
      detail = clean.slice(periodIdx + 2).trim();
    } else {
      title = clean;
      detail = '';
    }
  }

  const category = categorizeItem(title, detail, sectionHeading);
  return {
    id: `item-${index}-${title.slice(0, 20).toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    title,
    detail,
    category,
    raw: rawText,
  };
}

function groupItemsIntoCategories(items: ParsedChangeItem[]): ParsedCategoryGroup[] {
  const groupMap: Record<string, ParsedChangeItem[]> = {};
  const order: string[] = [
    'New Features',
    'Navigation',
    'Performance',
    'UI/UX',
    'Fixes',
    'Android',
    'AI',
    'Security',
    'Improvements',
  ];

  for (const it of items) {
    const cat = it.category;
    if (!groupMap[cat]) groupMap[cat] = [];
    groupMap[cat].push(it);
  }

  const result: ParsedCategoryGroup[] = [];
  for (const cat of order) {
    if (groupMap[cat] && groupMap[cat].length > 0) {
      result.push({ category: cat, items: groupMap[cat] });
    }
  }

  for (const cat of Object.keys(groupMap)) {
    if (!order.includes(cat) && groupMap[cat].length > 0) {
      result.push({ category: cat, items: groupMap[cat] });
    }
  }

  return result;
}

// ── Markdown Parser for GitHub Releases ──────────────────────────────────────

function parseMarkdownRelease(body: string | null | undefined): ParsedCategoryGroup[] {
  if (!body) return [];
  const lines = body.split('\n');
  const allItems: ParsedChangeItem[] = [];
  let currentHeading = 'Improvements';
  let counter = 0;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (line.startsWith('#')) {
      currentHeading = line.replace(/^#+\s*/, '').trim();
    } else if (line.startsWith('-') || line.startsWith('*') || line.startsWith('•')) {
      const it = parseChangeItem(line, currentHeading, counter++);
      allItems.push(it);
    }
  }

  return groupItemsIntoCategories(allItems);
}

// ── Release Item Component ───────────────────────────────────────────────────

function ChangeEntryRow({
  item,
  meta,
}: {
  item: ParsedChangeItem;
  meta: CategoryMeta;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        padding: '8px 10px 8px 12px',
        borderRadius: 10,
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: meta.badgeColor.dot,
            flexShrink: 0,
            marginTop: 6,
            boxShadow: `0 0 6px ${meta.badgeColor.dot}66`,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--c-text-primary, #ffffff)',
              lineHeight: 1.35,
              letterSpacing: '-0.01em',
            }}
          >
            {item.title}
          </span>
          {item.detail ? (
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '12px',
                fontWeight: 400,
                color: 'var(--c-text-secondary, #a1a1aa)',
                lineHeight: 1.45,
                margin: '3px 0 0 0',
                opacity: 0.9,
              }}
            >
              {item.detail}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Main Release Card Component ──────────────────────────────────────────────

function ReleaseCard({
  release,
  isExpanded,
  onToggle,
  lang,
  accent,
  prefersReduced,
}: {
  release: EnrichedRelease;
  isExpanded: boolean;
  onToggle: () => void;
  lang: string;
  accent: { from: string; to: string };
  prefersReduced: boolean;
}) {
  const isEs = lang === 'es';

  return (
    <div
      style={{
        borderRadius: 16,
        background: release.isCurrent
          ? 'var(--c-surface-mid, rgba(255, 255, 255, 0.04))'
          : 'var(--c-surface-low, rgba(255, 255, 255, 0.02))',
        border: release.isCurrent
          ? `1.5px solid ${accent.from}66`
          : '1px solid var(--c-border, rgba(255, 255, 255, 0.08))',
        boxShadow: release.isCurrent ? `0 4px 20px ${accent.from}14` : 'none',
        overflow: 'hidden',
        transition: 'border-color 0.2s ease, background 0.2s ease',
      }}
    >
      {/* Header Button / Tap Target */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '14px 16px',
          background: 'transparent',
          border: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          outline: 'none',
          boxSizing: 'border-box',
          gap: 8,
        }}
      >
        {/* Top Row: Version + Badges + Date + Chevron */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'var(--studio-font-display, Inter)',
                fontSize: '17px',
                fontWeight: 850,
                color: 'var(--c-text-primary, #ffffff)',
                letterSpacing: '-0.02em',
              }}
            >
              v{release.version}
            </span>

            {/* Status Badges */}
            {release.isCurrent && (
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 800,
                  fontFamily: 'Inter, sans-serif',
                  padding: '2px 8px',
                  borderRadius: 9999,
                  background: `${accent.from}1c`,
                  color: accent.from,
                  border: `1px solid ${accent.from}44`,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {isEs ? 'Instalado' : 'Installed'}
              </span>
            )}
            {release.isLatest && !release.isCurrent && (
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 800,
                  fontFamily: 'Inter, sans-serif',
                  padding: '2px 8px',
                  borderRadius: 9999,
                  background: 'rgba(52, 211, 153, 0.14)',
                  color: '#10b981',
                  border: '1px solid rgba(52, 211, 153, 0.28)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {isEs ? 'Más Reciente' : 'Latest'}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span
              style={{
                fontSize: '11.5px',
                color: 'var(--c-text-muted, #71717a)',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
              }}
            >
              {release.date}
            </span>

            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={prefersReduced ? { duration: 0 } : { duration: 0.22, ease: 'easeInOut' }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--c-text-secondary)',
                opacity: 0.7,
              }}
            >
              <StudioIcon name="expand_more" size={18} />
            </motion.div>
          </div>
        </div>

        {/* Sub Row: Category Pill Chips & Total Count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 650,
              fontFamily: 'Inter, sans-serif',
              color: 'var(--c-text-tertiary, #a1a1aa)',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '2px 7px',
              borderRadius: 6,
            }}
          >
            {release.totalChanges} {isEs ? 'cambios' : 'changes'}
          </span>

          {release.categories.map((grp) => {
            const meta = getCategoryMeta(grp.category);
            return (
              <span
                key={grp.category}
                style={{
                  fontSize: '9.5px',
                  fontWeight: 700,
                  fontFamily: 'Inter, sans-serif',
                  padding: '2px 6px',
                  borderRadius: 6,
                  background: meta.badgeColor.bg,
                  color: meta.badgeColor.fg,
                  border: `1px solid ${meta.badgeColor.border}`,
                  letterSpacing: '0.02em',
                }}
              >
                {isEs ? meta.label.es : meta.label.en} ({grp.items.length})
              </span>
            );
          })}
        </div>
      </button>

      {/* Expandable Content Area */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="content"
            initial={prefersReduced ? false : { height: 0, opacity: 0 }}
            animate={prefersReduced ? { height: 'auto', opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={prefersReduced ? { height: 0, opacity: 0 } : { height: 0, opacity: 0 }}
            transition={prefersReduced ? { duration: 0 } : { duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '0 16px 16px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                borderTop: '1px solid var(--c-border, rgba(255, 255, 255, 0.06))',
                paddingTop: 14,
              }}
            >
              {release.categories.length === 0 ? (
                <span
                  style={{
                    fontSize: 12.5,
                    color: 'var(--c-text-secondary)',
                    fontFamily: 'Inter',
                    fontStyle: 'italic',
                  }}
                >
                  {isEs ? 'No hay detalles de cambios disponibles.' : 'No detailed changes available.'}
                </span>
              ) : (
                release.categories.map((grp) => {
                  const meta = getCategoryMeta(grp.category);
                  return (
                    <div
                      key={grp.category}
                      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                    >
                      {/* Category Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            fontFamily: 'Inter, sans-serif',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            color: meta.badgeColor.fg,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <StudioIcon name={meta.icon} size={12} />
                          {isEs ? meta.label.es : meta.label.en}
                        </span>
                        <span
                          style={{
                            fontSize: '9.5px',
                            color: 'var(--c-text-muted)',
                            opacity: 0.8,
                          }}
                        >
                          ({grp.items.length})
                        </span>
                      </div>

                      {/* Items */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {grp.items.map((it) => (
                          <ChangeEntryRow key={it.id} item={it} meta={meta} />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main View Component ──────────────────────────────────────────────────────

export function ChangelogView({
  lang,
  accent,
}: {
  lang: string;
  accent: { from: string; to: string };
}) {
  const isEs = lang === 'es';
  const prefersReduced = useAppReducedMotion();
  const [releases, setReleases] = useState<EnrichedRelease[]>([]);
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    let active = true;

    async function loadChangelog() {
      // 1. Try local storage cache
      try {
        const cached = localStorage.getItem('studio:changelog_cache_v2');
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
          if (age < 1000 * 60 * 60 * 2) {
            const parsed = JSON.parse(cached);
            if (active && parsed && parsed.length > 0) {
              setReleases(parsed);
              setLoading(false);
              setExpandedVersions({ [parsed[0].version]: true });
              return;
            }
          }
        }
      } catch (e) {
        console.warn('Failed to load cached changelog', e);
      }

      // 2. Fetch from GitHub API
      try {
        const res = await fetch('https://api.github.com/repos/MAGEXE1000/Livex/releases');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          const parsedList: EnrichedRelease[] = data.map((rel: any, idx: number) => {
            const vRaw = rel.tag_name ? rel.tag_name.replace(/^v/, '') : '0.0.0';
            const dateStr = rel.published_at
              ? new Date(rel.published_at).toLocaleDateString(isEs ? 'es-ES' : 'en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : 'N/A';

            const categories = parseMarkdownRelease(rel.body);
            const totalChanges = categories.reduce((sum, c) => sum + c.items.length, 0);
            const availableCategories = categories.map((c) => c.category);

            return {
              version: vRaw,
              date: dateStr,
              isLatest: idx === 0,
              isCurrent: vRaw === APP_VERSION,
              categories,
              totalChanges,
              availableCategories,
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
            localStorage.setItem('studio:changelog_cache_v2', JSON.stringify(parsedList));
            localStorage.setItem('studio:changelog_cache_time', String(Date.now()));
            localStorage.setItem('studio:changelog_cache_version', APP_VERSION);
            localStorage.setItem('studio:changelog_cache_lang', lang || 'en');
          } catch (_) {}
          return;
        }
      } catch (err) {
        console.warn('Failed to fetch GitHub releases, loading local release history', err);
      }

      // 3. Fallback: Local Canonical RELEASE_HISTORY
      if (active) {
        const defaultSections = getChangelogSections(lang) || [];
        const currentItems: ParsedChangeItem[] = [];
        let itemCounter = 0;
        for (const sec of defaultSections) {
          for (const raw of sec.items) {
            currentItems.push(parseChangeItem(raw, sec.heading, itemCounter++));
          }
        }
        const currentCategories = groupItemsIntoCategories(currentItems);

        const fallbackList: EnrichedRelease[] = [
          {
            version: APP_VERSION,
            date: isEs ? '25 de septiembre de 2026' : 'Sep 25, 2026',
            isLatest: true,
            isCurrent: true,
            categories: currentCategories,
            totalChanges: currentItems.length,
            availableCategories: currentCategories.map((c) => c.category),
          },
          ...RELEASE_HISTORY.filter((h) => h.version !== APP_VERSION).map((item) => {
            const dateObj = new Date(item.date);
            const dateStr = isNaN(dateObj.getTime())
              ? item.date
              : dateObj.toLocaleDateString(isEs ? 'es-ES' : 'en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                });

            const parsedItems = item.highlights.map((h, i) => parseChangeItem(h, 'Improvements', i));
            const categories = groupItemsIntoCategories(parsedItems);

            return {
              version: item.version,
              date: dateStr,
              isLatest: false,
              isCurrent: item.version === APP_VERSION,
              categories,
              totalChanges: parsedItems.length,
              availableCategories: categories.map((c) => c.category),
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
  }, [lang, isEs]);

  const toggleExpand = (version: string) => {
    setExpandedVersions((prev) => ({
      ...prev,
      [version]: !prev[version],
    }));
  };

  const handleExpandAll = () => {
    const next: Record<string, boolean> = {};
    for (const rel of releases) next[rel.version] = true;
    setExpandedVersions(next);
  };

  const handleCollapseAll = () => {
    setExpandedVersions({});
  };

  // Collect unique categories across all releases for filter chips
  const allAvailableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const r of releases) {
      for (const c of r.availableCategories) set.add(c);
    }
    return Array.from(set);
  }, [releases]);

  // Filter releases if category filter is active
  const filteredReleases = useMemo(() => {
    if (activeFilter === 'all') return releases;
    return releases.map((rel) => {
      const matchedCats = rel.categories.filter((c) => c.category === activeFilter);
      return {
        ...rel,
        categories: matchedCats,
        totalChanges: matchedCats.reduce((sum, c) => sum + c.items.length, 0),
      };
    }).filter((rel) => rel.categories.length > 0);
  }, [releases, activeFilter]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 0',
          gap: 12,
        }}
      >
        <AppSpinner size={32} color={accent.from} />
        <span style={{ fontSize: 13, color: 'var(--c-text-secondary)', fontFamily: 'Inter' }}>
          {isEs ? 'Cargando historial de cambios...' : 'Loading changelog history...'}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        width: '100%',
        maxWidth: 600,
        margin: '0 auto',
        padding: '0 4px',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Filter & Toolbar Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 4,
          flexWrap: 'wrap',
        }}
      >
        {/* Category Filter Chips */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            overflowX: 'auto',
            paddingBottom: 2,
            scrollbarWidth: 'none',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            style={{
              padding: '4px 10px',
              borderRadius: 9999,
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'Inter, sans-serif',
              border: activeFilter === 'all' ? `1px solid ${accent.from}` : '1px solid var(--c-border)',
              background: activeFilter === 'all' ? `${accent.from}22` : 'rgba(255, 255, 255, 0.04)',
              color: activeFilter === 'all' ? accent.from : 'var(--c-text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {isEs ? 'Todos' : 'All'}
          </button>

          {allAvailableCategories.slice(0, 5).map((cat) => {
            const meta = getCategoryMeta(cat);
            const isSelected = activeFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveFilter(isSelected ? 'all' : cat)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 9999,
                  fontSize: '11px',
                  fontWeight: 650,
                  fontFamily: 'Inter, sans-serif',
                  border: isSelected ? `1px solid ${meta.badgeColor.fg}` : '1px solid var(--c-border)',
                  background: isSelected ? meta.badgeColor.bg : 'rgba(255, 255, 255, 0.03)',
                  color: isSelected ? meta.badgeColor.fg : 'var(--c-text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {isEs ? meta.label.es : meta.label.en}
              </button>
            );
          })}
        </div>

        {/* Global Expand / Collapse All */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <button
            type="button"
            onClick={handleExpandAll}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '11px',
              color: 'var(--c-text-secondary)',
              cursor: 'pointer',
              padding: '2px 6px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              opacity: 0.8,
            }}
          >
            {isEs ? 'Expandir todo' : 'Expand all'}
          </button>
          <span style={{ color: 'var(--c-text-muted)', fontSize: 10 }}>•</span>
          <button
            type="button"
            onClick={handleCollapseAll}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '11px',
              color: 'var(--c-text-secondary)',
              cursor: 'pointer',
              padding: '2px 6px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              opacity: 0.8,
            }}
          >
            {isEs ? 'Colapsar todo' : 'Collapse all'}
          </button>
        </div>
      </div>

      {/* Release Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredReleases.map((release) => (
          <ReleaseCard
            key={release.version}
            release={release}
            isExpanded={Boolean(expandedVersions[release.version])}
            onToggle={() => toggleExpand(release.version)}
            lang={lang}
            accent={accent}
            prefersReduced={prefersReduced}
          />
        ))}
      </div>
    </div>
  );
}

export default ChangelogView;
