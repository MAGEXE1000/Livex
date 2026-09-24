import {
  useDrumStore,
  useChordStore,
  ACCENT_COLORS,
  resolveAccent,
  useT,
  useScrollHide,
  useIsWebDesktop,
  resetNav,
  useSettingsStore,
  NavigationDispatcher,
} from '@workspace/livex-core';
import { useShallow } from 'zustand/react/shallow';
import { useRef, useState, useEffect } from 'react';
import { Toggle, SectionHeader, SettingRow, StartOnSelector } from '../../../shared/settings/SettingControls';
import { StudioHeader } from '../../../shared/layout/StudioHeader';
import { SharedFloatingHeader } from '../../../shared/layout/StudioLayoutSystem';
import { useOverscrollSpring } from '../../../shared/layout/useOverscrollSpring';
import { Card } from '../../../shared/design-system/StudioDesignSystem';
import { AnimatedNavigationIcon } from '../../hub/navigation/AnimatedNavigationIcon';

function IconDrumSongs({ active }: { active: boolean }) {
  const sw = active ? 2 : 1.6;
  const ao = active ? 0.13 : 0;
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} fill="none" style={{ display: 'block' }}>
      <rect
        x="4"
        y="3"
        width="16"
        height="18"
        rx="2.5"
        stroke="currentColor"
        strokeWidth={sw}
        fill="currentColor"
        fillOpacity={ao}
      />
      <line
        x1="7.5"
        y1="8"
        x2="16.5"
        y2="8"
        stroke="currentColor"
        strokeWidth={sw - 0.4}
        strokeLinecap="round"
      />
      <line
        x1="7.5"
        y1="12"
        x2="16.5"
        y2="12"
        stroke="currentColor"
        strokeWidth={sw - 0.4}
        strokeLinecap="round"
      />
      <line
        x1="7.5"
        y1="16"
        x2="13"
        y2="16"
        stroke="currentColor"
        strokeWidth={sw - 0.4}
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconPatterns({ active }: { active: boolean }) {
  const sw = active ? 2 : 1.6;
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} fill="none" style={{ display: 'block' }}>
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth={sw} />
      <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth={sw * 0.7} />
      <line x1="3" y1="15" x2="21" y2="15" stroke="currentColor" strokeWidth={sw * 0.7} />
      <circle cx="7" cy="6" r="1.2" fill="currentColor" />
      <circle cx="12" cy="6" r="1.2" fill="currentColor" />
      <circle cx="17" cy="12" r="1.2" fill="currentColor" />
      <circle cx="7" cy="12" r="1.2" fill="currentColor" />
      <circle cx="12" cy="18" r="1.2" fill="currentColor" />
      <circle cx="17" cy="18" r="1.2" fill="currentColor" />
    </svg>
  );
}
function IconPrefs({ active }: { active: boolean }) {
  const sw = active ? 2.2 : 1.7;
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} fill="none" style={{ display: 'block' }}>
      <line
        x1="4"
        y1="6"
        x2="20"
        y2="6"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <line
        x1="8"
        y1="3"
        x2="8"
        y2="9"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <line
        x1="4"
        y1="12"
        x2="20"
        y2="12"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <line
        x1="14"
        y1="9"
        x2="14"
        y2="15"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <line
        x1="4"
        y1="18"
        x2="20"
        y2="18"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <line
        x1="10"
        y1="15"
        x2="10"
        y2="21"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface DrumPrefsPanelProps {
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

function PrefsSection({
  title,
  isLight,
  children,
}: {
  title: string;
  isLight: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span
        className={`text-[9.5px] font-extrabold tracking-widest uppercase px-1 ${isLight ? 'text-zinc-500' : 'text-zinc-455'}`}
        style={{
          fontFamily:
            'var(--type-section-font, var(--studio-font-display, "Inter Tight", sans-serif))',
        }}
      >
        {title}
      </span>
      <Card style={{ padding: 0, overflow: 'hidden' }}>{children}</Card>
    </div>
  );
}

function PrefsRow({
  label,
  desc,
  isLight,
  children,
}: {
  label: string;
  desc?: string;
  isLight: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex justify-between items-center px-4 py-3 border-b last:border-none ${isLight ? 'border-zinc-100' : 'border-zinc-900/60'}`}
    >
      <div className="flex-1 pr-4">
        <div
          className={`text-xs font-bold ${isLight ? 'text-zinc-850' : 'text-zinc-200'}`}
          style={{
            fontFamily: 'var(--type-body-font, var(--studio-font-body, "Inter", sans-serif))',
            fontWeight: 600,
          }}
        >
          {label}
        </div>
        {desc && (
          <div
            className={`text-[10px] leading-snug mt-0.5 ${isLight ? 'text-zinc-455' : 'text-zinc-500'}`}
            style={{
              fontFamily: 'var(--type-meta-font, var(--studio-font-body, "Inter", sans-serif))',
              fontWeight: 400,
            }}
          >
            {desc}
          </div>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export default function DrumPrefsPanel({ onScroll }: DrumPrefsPanelProps = {}) {
  const settings = useSettingsStore(
    useShallow((s) => ({
      accentColor: s.settings.accentColor,
      language: s.settings.language,
      perApp: s.settings.perApp,
      theme: s.settings.theme,
      amoledMode: s.settings.amoledMode,
      dynamicLightStart: s.settings.dynamicLightStart,
      dynamicLightEnd: s.settings.dynamicLightEnd,
      defaultDrumTab: s.settings.defaultDrumTab,
    }))
  );

  const drumPrefs = useDrumStore((s) => s.drumPrefs);
  const updateDrumPrefs = useDrumStore((s) => s.updateDrumPrefs);
  const t = useT();
  const dp = t.drumPrefs;
  const isSpanish = (settings.language ?? 'en') === 'es';
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollHide(scrollRef);
  useOverscrollSpring({ scrollContainerRef: scrollRef });

  useEffect(() => {
    resetNav();
  }, []);

  const acc = resolveAccent(settings.accentColor);
  const cardStyle: React.CSSProperties = {
    background: 'var(--app-surface)',
    borderRadius: '1.5rem',
    overflow: 'hidden',
  };

  const isWebDesktop = useIsWebDesktop();
  const [activeCat, setActiveCat] = useState<'all' | 'editor' | 'playback' | 'display' | 'startup'>(
    'all'
  );

  const drumsVis = settings.perApp?.drumex ?? {
    theme: settings.theme ?? 'dark',
    amoledMode: settings.amoledMode ?? false,
  };
  const isLight =
    drumsVis.theme === 'light' ||
    (drumsVis.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: light)').matches) ||
    (drumsVis.theme === 'dynamic' &&
      (() => {
        const h = new Date().getHours();
        const lightStart = settings.dynamicLightStart ?? 7;
        const lightEnd = settings.dynamicLightEnd ?? 20;
        return h >= lightStart && h < lightEnd;
      })());

  function row(key: keyof typeof drumPrefs, label: string, desc: string) {
    if (isWebDesktop) {
      return (
        <PrefsRow label={label} desc={desc} isLight={isLight}>
          <Toggle
            value={drumPrefs[key] as boolean}
            onChange={(v) => updateDrumPrefs({ [key]: v })}
          />
        </PrefsRow>
      );
    }
    return (
      <SettingRow label={label} desc={desc}>
        <Toggle
          value={drumPrefs[key] as boolean}
          onChange={(v) => updateDrumPrefs({ [key]: v })}
          accentFrom={acc.from}
          accentTo={acc.to}
        />
      </SettingRow>
    );
  }

  if (isWebDesktop) {
    return (
      <div
        className={`flex flex-col w-full h-full overflow-hidden p-6 ${isLight ? 'bg-zinc-50' : 'bg-[#000000]'}`}
        style={{ width: '100%', height: '100%', minHeight: 0, fontFamily: 'var(--studio-font-body)' }}
      >
        {/* Category Tabs */}
        <div className="flex gap-1.5 mb-6 flex-wrap">
          {(
            [
              { id: 'all', label: 'All Settings' },
              { id: 'editor', label: 'Editor Behavior' },
              { id: 'playback', label: 'Playback & Dynamics' },
              { id: 'display', label: 'Display & Visuals' },
              { id: 'startup', label: 'Startup & Default' },
            ] as const
          ).map((c) => {
            const active = activeCat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className="px-3.5 py-1.5 rounded-lg text-[9.5px] font-extrabold uppercase tracking-widest transition-all cursor-pointer"
                style={{
                  fontFamily:
                    'var(--type-button-font, var(--studio-font-body, "Inter", sans-serif))',
                  background: active
                    ? 'linear-gradient(135deg, var(--studio-accent-from), var(--studio-accent-to))'
                    : 'var(--c-surface-low)',
                  color: active ? 'var(--color-on-tertiary, #ffffff)' : 'var(--c-text-secondary)',
                  border: active
                    ? '1px solid var(--studio-accent-border)'
                    : '1px solid var(--c-border)',
                  boxShadow: active ? 'var(--studio-accent-glow)' : 'none',
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex-1 w-full overflow-y-auto no-scrollbar"
          style={{
            minHeight: 0,
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorY: 'contain',
            touchAction: 'pan-y',
            paddingBottom: '120px',
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl">
            {/* Column 1: Startup & Editor Behavior */}
            {(activeCat === 'all' || activeCat === 'startup' || activeCat === 'editor') && (
              <div className="space-y-6">
                {(activeCat === 'all' || activeCat === 'startup') && (
                  <PrefsSection title={dp.startOn} isLight={isLight}>
                    <PrefsRow label={dp.startOn} desc={dp.startOnDesc} isLight={isLight}>
                      <StartOnSelector<'beats' | 'patterns' | 'prefs'>
                        currentValue={((settings.defaultDrumTab === 'songs' ? 'beats' : settings.defaultDrumTab) ?? 'beats') as any}
                        options={[
                          { value: 'beats', iconName: 'drum', label: isSpanish ? 'Ritmos' : 'Beats' },
                          { value: 'patterns', iconName: 'blocks', label: isSpanish ? 'Patrones' : 'Patterns' },
                          { value: 'prefs', iconName: 'sliders-horizontal', label: isSpanish ? 'Ajustes' : 'Prefs' },
                        ]}
                        onChange={(value) =>
                          useSettingsStore.getState().updateSettings({ defaultDrumTab: value })
                        }
                        accentColor={settings.accentColor}
                      />
                    </PrefsRow>
                  </PrefsSection>
                )}

                {(activeCat === 'all' || activeCat === 'editor') && (
                  <PrefsSection title={dp.editorBehavior} isLight={isLight}>
                    {row('noteVariationsCycle', dp.noteVariations, dp.noteVariationsDesc)}
                    {row('autoExpandPattern', dp.autoExpand, dp.autoExpandDesc)}
                    {row('snapToGrid', dp.snapToGrid, dp.snapToGridDesc)}
                    {row('dragToFill', dp.dragToFill, dp.dragToFillDesc)}
                  </PrefsSection>
                )}
              </div>
            )}

            {/* Column 2: Playback & Dynamics */}
            {(activeCat === 'all' || activeCat === 'playback') && (
              <div className="space-y-6">
                <PrefsSection title={dp.playback} isLight={isLight}>
                  {row('autoPlayOnEdit', dp.autoPlay, dp.autoPlayDesc)}
                  {row('loopPlayback', dp.loopPlayback, dp.loopPlaybackDesc)}
                  {row('metronome', dp.metronome, dp.metronomeDesc)}
                  {row('countIn', dp.countIn, dp.countInDesc)}
                  {row('humanizeVelocity', dp.humanizeVelocity, dp.humanizeVelocityDesc)}
                </PrefsSection>
              </div>
            )}

            {/* Column 3: Display & Visuals */}
            {(activeCat === 'all' || activeCat === 'display') && (
              <div className="space-y-6">
                <PrefsSection title={dp.interaction} isLight={isLight}>
                  {row('showNoteVariations', dp.showVariations, dp.showVariationsDesc)}
                  {row('highlightActiveInst', dp.highlightActive, dp.highlightActiveDesc)}
                </PrefsSection>

                <PrefsSection title={dp.visual} isLight={isLight}>
                  {row('gridLinesEmphasis', dp.gridEmphasis, dp.gridEmphasisDesc)}
                </PrefsSection>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col w-full h-full overflow-hidden app-bg"
      style={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        fontFamily: 'var(--studio-font-body)',
        position: 'relative',
      }}
    >
      {!isWebDesktop && (
        <SharedFloatingHeader
          title={dp.title}
          scrollContainerRef={scrollRef}
        />
      )}

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 w-full overflow-y-auto no-scrollbar"
        style={{
          minHeight: 0,
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'contain',
          touchAction: 'pan-y',
          padding: '0 24px',
          paddingTop: isWebDesktop
            ? '24px'
            : 'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 92px)',
          paddingBottom: 'calc(max(24px, env(safe-area-inset-bottom, 24px)) + 120px)',
        }}
      >

        <SectionHeader icon="dashboard" title={dp.startOn} />
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <SettingRow label={dp.startOn} desc={dp.startOnDesc}>
            <StartOnSelector<'beats' | 'patterns' | 'prefs'>
              currentValue={((settings.defaultDrumTab === 'songs' ? 'beats' : settings.defaultDrumTab) ?? 'beats') as any}
              options={[
                { value: 'beats', iconName: 'drum', label: isSpanish ? 'Ritmos' : 'Beats' },
                { value: 'patterns', iconName: 'blocks', label: isSpanish ? 'Patrones' : 'Patterns' },
                { value: 'prefs', iconName: 'sliders-horizontal', label: isSpanish ? 'Ajustes' : 'Prefs' },
              ]}
              onChange={(value) =>
                useSettingsStore.getState().updateSettings({ defaultDrumTab: value })
              }
              accentColor={settings.accentColor}
            />
          </SettingRow>
        </Card>

        <SectionHeader icon="edit_note" title={dp.editorBehavior} />
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {row('noteVariationsCycle', dp.noteVariations, dp.noteVariationsDesc)}
          {row('autoExpandPattern', dp.autoExpand, dp.autoExpandDesc)}
          {row('snapToGrid', dp.snapToGrid, dp.snapToGridDesc)}
          {row('dragToFill', dp.dragToFill, dp.dragToFillDesc)}
        </Card>

        <SectionHeader icon="play_circle" title={dp.playback} />
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {row('autoPlayOnEdit', dp.autoPlay, dp.autoPlayDesc)}
          {row('loopPlayback', dp.loopPlayback, dp.loopPlaybackDesc)}
          {row('metronome', dp.metronome, dp.metronomeDesc)}
          {row('countIn', dp.countIn, dp.countInDesc)}
          {row('humanizeVelocity', dp.humanizeVelocity, dp.humanizeVelocityDesc)}
        </Card>

        <SectionHeader icon="touch_app" title={dp.interaction} />
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {row('showNoteVariations', dp.showVariations, dp.showVariationsDesc)}
          {row('highlightActiveInst', dp.highlightActive, dp.highlightActiveDesc)}
        </Card>

        <SectionHeader icon="grid_on" title={dp.visual} />
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {row('gridLinesEmphasis', dp.gridEmphasis, dp.gridEmphasisDesc)}
        </Card>
      </div>
    </div>
  );
}
