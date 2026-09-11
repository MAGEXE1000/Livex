import { useT, useBackHandler, useSettingsStore } from '@workspace/studio-core';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

interface Tip {
  title: string;
  body: string;
}

interface Section {
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
  tips: Tip[];
}

const SECTION_META = [
  {
    id: 'warmup',
    icon: 'local_fire_department',
    color: '#f59e0b',
    nameKey: 'sectionWarmup',
    descEn: 'Gentle lip trills and sirens to awaken vocal cords',
    descEs: 'Vibración labial suave y sirenas para activar las cuerdas',
    tipKeys: ['tipWarmup1', 'tipWarmup2', 'tipWarmup3', 'tipWarmup4', 'tipWarmup5'],
  },
  {
    id: 'breath',
    icon: 'air',
    color: '#34d399',
    nameKey: 'sectionBreath',
    descEn: 'Diaphragmatic support and airflow management',
    descEs: 'Soporte diafragmático y control del flujo de aire',
    tipKeys: ['tipBreath1', 'tipBreath2', 'tipBreath3', 'tipBreath4', 'tipBreath5'],
  },
  {
    id: 'pitch',
    icon: 'music_note',
    color: '#007aff',
    nameKey: 'sectionPitch',
    descEn: 'Interval matching and scale accuracy',
    descEs: 'Afinación de intervalos y precisión en escalas',
    tipKeys: ['tipPitch1', 'tipPitch2', 'tipPitch3', 'tipPitch4', 'tipPitch5'],
  },
  {
    id: 'resonance',
    icon: 'record_voice_over',
    color: '#a78bfa',
    nameKey: 'sectionResonance',
    descEn: 'Chest, mask, and head voice acoustic placement',
    descEs: 'Colocación acústica de voz de pecho, máscara y cabeza',
    tipKeys: ['tipResonance1', 'tipResonance2', 'tipResonance3', 'tipResonance4', 'tipResonance5'],
  },
  {
    id: 'range',
    icon: 'unfold_more',
    color: '#ec4899',
    nameKey: 'sectionRange',
    descEn: 'Passaggio blending and high register release',
    descEs: 'Unión del passaggio y notas agudas cómodas',
    tipKeys: ['tipRange1', 'tipRange2', 'tipRange3', 'tipRange4', 'tipRange5'],
  },
  {
    id: 'performance',
    icon: 'theater_comedy',
    color: '#ef4444',
    nameKey: 'sectionPerformance',
    descEn: 'Dynamics, vibrato control, and articulation',
    descEs: 'Dinámicas, control de vibrato y articulación',
    tipKeys: [
      'tipPerformance1',
      'tipPerformance2',
      'tipPerformance3',
      'tipPerformance4',
      'tipPerformance5',
    ],
  },
  {
    id: 'harmonies',
    icon: 'graphic_eq',
    color: '#10b981',
    nameKey: 'sectionHarmonies',
    descEn: 'Intervals, chords, and multi-part blending',
    descEs: 'Terceras, quintas y armonización de voces',
    tipKeys: [
      'tipHarmonies1',
      'tipHarmonies2',
      'tipHarmonies3',
      'tipHarmonies4',
      'tipHarmonies5',
      'tipHarmonies6',
      'tipHarmonies7',
      'tipHarmonies8',
      'tipHarmonies9',
      'tipHarmonies10',
    ],
  },
  {
    id: 'health',
    icon: 'health_and_safety',
    color: '#06b6d4',
    nameKey: 'sectionHealth',
    descEn: 'Hydration, vocal cord recovery, and fatigue protection',
    descEs: 'Hidratación, descanso y cuidado de las cuerdas vocales',
    tipKeys: ['tipHealth1', 'tipHealth2', 'tipHealth3', 'tipHealth4', 'tipHealth5'],
  },
] as const;

function buildSections(v: Record<string, any>, language: string): Section[] {
  const isEs = language === 'es';
  return SECTION_META.map((m) => ({
    id: m.id,
    name: v[m.nameKey] ?? m.id,
    desc: isEs ? m.descEs : m.descEn,
    icon: m.icon,
    color: m.color,
    tips: m.tipKeys.map((k) => ({
      title: v[k + 'Title'] ?? k,
      body: v[k + 'Body'] ?? '',
    })),
  }));
}

const ANIM_CSS = `
@keyframes pp-fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pp-slide-in {
  from { opacity: 0; transform: translateX(30px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pp-slide-out {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(-30px); }
}
@keyframes pp-expand {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

function useAnimStyle() {
  const injected = useRef(false);
  useEffect(() => {
    if (injected.current) return;
    injected.current = true;
    const s = document.createElement('style');
    s.textContent = ANIM_CSS;
    document.head.appendChild(s);
    return () => {
      s.remove();
      injected.current = false;
    };
  }, []);
}

function TipCard({
  tip,
  color,
  index,
  isLight,
  isAmoled,
}: {
  tip: Tip;
  color: string;
  index: number;
  isLight: boolean;
  isAmoled: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [bodyH, setBodyH] = useState(0);

  useEffect(() => {
    if (expanded && bodyRef.current) {
      setBodyH(bodyRef.current.scrollHeight);
    }
  }, [expanded]);

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: isLight
          ? '#ffffff'
          : isAmoled
            ? '#000000'
            : 'var(--app-surface-low, rgba(255,255,255,0.04))',
        borderRadius: 18,
        padding: '16px 18px',
        cursor: 'pointer',
        border: `1px solid ${expanded ? color + '44' : 'var(--c-border, rgba(128,128,128,0.14))'}`,
        transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: expanded ? 'var(--shadow-surface-raised)' : 'var(--shadow-surface-soft)',
        animation: `pp-fade-up 350ms cubic-bezier(0.22,1,0.36,1) ${index * 45}ms both`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            fontFamily: 'var(--studio-font-mono)',
            fontWeight: 800,
            fontSize: 12,
            color: color,
            background: `${color}16`,
            borderRadius: 9999,
            padding: '2px 8px',
            minWidth: 20,
            textAlign: 'center',
            transition: 'opacity 180ms ease',
          }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <span
          style={{
            fontFamily: 'var(--studio-font-display)',
            fontWeight: 700,
            fontSize: 14.5,
            color: 'var(--c-text-primary)',
            flex: 1,
            letterSpacing: '-0.01em',
          }}
        >
          {tip.title}
        </span>
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 20,
            color: expanded ? color : 'var(--c-text-secondary)',
            transition: 'transform 260ms cubic-bezier(0.34,1.56,0.64,1), color 200ms ease',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          expand_more
        </span>
      </div>
      <div
        style={{
          overflow: 'hidden',
          maxHeight: expanded ? bodyH + 30 : 0,
          transition: 'max-height 300ms cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <div ref={bodyRef}>
          <div
            style={{
              marginTop: 12,
              paddingLeft: 34,
              paddingTop: 8,
              borderTop: `1px solid ${expanded ? color + '20' : 'transparent'}`,
            }}
          >
            <p
              style={{
                fontFamily: 'var(--studio-font-body)',
                fontSize: 13.5,
                color: 'var(--c-text-secondary)',
                lineHeight: 1.65,
                margin: 0,
                animation: expanded ? 'pp-expand 250ms cubic-bezier(0.22,1,0.36,1) both' : 'none',
              }}
            >
              {tip.body}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionView({
  section,
  isLight,
  isAmoled,
}: {
  section: Section;
  isLight: boolean;
  isAmoled: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {section.tips.map((tip, i) => (
        <TipCard
          key={i}
          tip={tip}
          color={section.color}
          index={i}
          isLight={isLight}
          isAmoled={isAmoled}
        />
      ))}
    </div>
  );
}

export default function PracticePanel() {
  useAnimStyle();
  const t = useT();
  const settings = useSettingsStore((s) => s.settings);
  const language = settings.language;
  const activeVis = settings.perApp?.vocalex ?? { theme: 'dark', amoledMode: false };
  const isLight =
    activeVis.theme === 'light' ||
    (activeVis.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: light)').matches);
  const isAmoled = !isLight && Boolean(settings.amoledMode || activeVis.amoledMode);

  const sections = useMemo(() => buildSections(t.vocalex as any, language), [t, language]);
  const [transitioning, setTransitioning] = useState(false);
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [displaySection, setDisplaySection] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const goToSection = useCallback((id: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setDirection('in');
    setTransitioning(true);
    setDisplaySection(id);
    timerRef.current = setTimeout(() => {
      setTransitioning(false);
      timerRef.current = null;
    }, 350);
  }, []);

  const goBack = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setDirection('out');
    setTransitioning(true);
    timerRef.current = setTimeout(() => {
      setDisplaySection(null);
      setTransitioning(false);
      timerRef.current = null;
    }, 220);
  }, []);

  useBackHandler(
    'nested',
    () => {
      if (displaySection) {
        goBack();
        return true;
      }
      return false;
    },
    [displaySection, goBack]
  );

  if (displaySection) {
    const section = sections.find((s) => s.id === displaySection)!;
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding:
            '0 16px calc(var(--bottom-nav-height, 68px) + env(safe-area-inset-bottom, 16px) + 24px)',
          minHeight: '100%',
          boxSizing: 'border-box',
          animation:
            direction === 'in'
              ? 'pp-slide-in 300ms cubic-bezier(0.22,1,0.36,1) both'
              : transitioning
                ? 'pp-slide-out 220ms cubic-bezier(0.22,1,0.36,1) both'
                : 'none',
        }}
      >
        <div style={{ width: '100%', maxWidth: 440 }}>
          {/* Section Detail Header Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 14,
              paddingTop: 0,
              animation: 'pp-fade-up 350ms cubic-bezier(0.22,1,0.36,1) 40ms both',
            }}
          >
            <button
              type="button"
              onClick={goBack}
              style={{
                width: 40,
                height: 40,
                borderRadius: 9999,
                background: isLight
                  ? '#ffffff'
                  : isAmoled
                    ? '#000000'
                    : 'var(--app-surface-low, rgba(255,255,255,0.06))',
                border: '1px solid var(--c-border, rgba(128,128,128,0.18))',
                color: 'var(--c-text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                boxShadow: 'var(--shadow-control-raised)',
                transition: 'all 150ms ease',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                arrow_back
              </span>
            </button>

            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                background: `${section.color}18`,
                border: `1px solid ${section.color}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 20, color: section.color }}
              >
                {section.icon}
              </span>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h2
                style={{
                  fontFamily: 'var(--studio-font-display)',
                  fontWeight: 800,
                  fontSize: 18,
                  color: 'var(--c-text-primary)',
                  margin: 0,
                  letterSpacing: '-0.02em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {section.name}
              </h2>
              <span
                style={{
                  fontFamily: 'var(--studio-font-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  color: section.color,
                  background: `${section.color}16`,
                  border: `1px solid ${section.color}28`,
                  borderRadius: 9999,
                  padding: '2px 8px',
                  display: 'inline-block',
                  marginTop: 2,
                }}
              >
                {t.vocalex.tipsCount(section.tips.length)}
              </span>
            </div>
          </div>

          <SectionView section={section} isLight={isLight} isAmoled={isAmoled} />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding:
          '0 16px calc(var(--bottom-nav-height, 68px) + env(safe-area-inset-bottom, 16px) + 24px)',
        minHeight: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Categories List */}
        <div
          data-purpose="exercise-categories"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {sections.map((section, i) => (
            <div
              key={section.id}
              role="button"
              tabIndex={0}
              onClick={() => goToSection(section.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  goToSection(section.id);
                }
              }}
              style={{
                background: isLight
                  ? '#ffffff'
                  : isAmoled
                    ? '#000000'
                    : 'var(--app-surface-low, rgba(255,255,255,0.04))',
                borderRadius: 20,
                padding: '16px 18px',
                cursor: 'pointer',
                border: '1px solid var(--c-border, rgba(128,128,128,0.14))',
                transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                boxShadow: 'var(--shadow-surface-soft)',
                animation: `pp-fade-up 350ms cubic-bezier(0.22,1,0.36,1) ${i * 40}ms both`,
              }}
            >
              {/* Category Icon Badge */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  background: `${section.color}15`,
                  border: `1px solid ${section.color}28`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 24, color: section.color }}
                >
                  {section.icon}
                </span>
              </div>

              {/* Category Titles & Meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    marginBottom: 3,
                  }}
                >
                  <h2
                    style={{
                      fontFamily: 'var(--studio-font-display)',
                      fontWeight: 700,
                      fontSize: 15,
                      color: 'var(--c-text-primary)',
                      margin: 0,
                      letterSpacing: '-0.01em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {section.name}
                  </h2>
                  <span
                    style={{
                      fontFamily: 'var(--studio-font-mono)',
                      fontSize: 11,
                      fontWeight: 700,
                      color: section.color,
                      background: `${section.color}16`,
                      border: `1px solid ${section.color}28`,
                      borderRadius: 9999,
                      padding: '2px 8px',
                      flexShrink: 0,
                    }}
                  >
                    {t.vocalex.tipsCount(section.tips.length)}
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: 'var(--studio-font-body)',
                    fontSize: 12,
                    color: 'var(--c-text-secondary)',
                    margin: 0,
                    lineHeight: 1.4,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {section.desc}
                </p>
              </div>

              {/* Navigation Chevron */}
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 20,
                  color: 'var(--c-text-secondary)',
                  opacity: 0.45,
                  flexShrink: 0,
                }}
              >
                chevron_right
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
