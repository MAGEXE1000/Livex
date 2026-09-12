import {
  resolveAccent,
  type ActivePanel,
  useScrollHide,
  useT,
  useIsWebDesktop,
  useSettingsStore,
  INSTRUMENT_REGISTRY,
  type InstrumentConfig,
  NavigationDispatcher,
  type Instrument,
  useShallow,
} from '@workspace/studio-core';
import React, { useRef, useMemo } from 'react';
import {
  Toggle,
  SectionHeader,
  SettingRow,
  SettingSection,
} from '../../../shared/settings/SettingControls';
import { IconSongs, IconLibrary, IconSettings } from '../../hub/icons/NavIcons';
import { AnimatedIcon } from '../../../shared/icons/AnimatedIcon';
import { StudioHeader } from '../../../shared/layout/StudioHeader';
import { Button } from '../../../shared/design-system/buttons';
import { Card } from '../../../shared/design-system/StudioDesignSystem';
import {
  MorphingActionSurface,
  type MorphingActionRowItem,
} from '../../../shared/design-system/MorphingActionSurface';

export default function ChordexPreferencesPanel() {
  const settings = useSettingsStore(
    useShallow((s) => ({
      accentColor: s.settings.accentColor,
      language: s.settings.language,
      tuning: s.settings.tuning,
      instrument: s.settings.instrument,
      leftHanded: s.settings.leftHanded,
      showFretNumbers: s.settings.showFretNumbers,
      showFingerNumbers: s.settings.showFingerNumbers,
      showNoteNames: s.settings.showNoteNames,
      showIntervals: s.settings.showIntervals,
      showOpenStrings: s.settings.showOpenStrings,
      showChordQualityColors: s.settings.showChordQualityColors,
      defaultTab: s.settings.defaultTab,
      chordAssistant: s.settings.chordAssistant,
      assistantSmartSuggestions: s.settings.assistantSmartSuggestions,
      assistantProgressionTips: s.settings.assistantProgressionTips,
      assistantConflictDetection: s.settings.assistantConflictDetection,
      assistantLearning: s.settings.assistantLearning,
    }))
  );

  const acc = resolveAccent(settings.accentColor);

  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollHide(scrollRef);
  const t = useT();

  const standardTuning = 'Standard (EADGBE)';

  const tunings = [
    { label: t.settings.tunings.standard, value: standardTuning },
    { label: t.settings.tunings.dropD, value: 'Drop D (DADGBE)' },
    { label: t.settings.tunings.openG, value: 'Open G (DGDGBD)' },
    { label: t.settings.tunings.openD, value: 'Open D (DADF#AD)' },
    { label: 'DADGAD', value: 'DADGAD' },
  ];

  const isWebDesktop = useIsWebDesktop();
  const isSpanish = (settings.language ?? 'en') === 'es';

  const morphingTuningRows: MorphingActionRowItem[] = useMemo(
    () =>
      tunings.map((tun) => ({
        id: tun.value,
        label: tun.label,
        sublabel: tun.value,
        icon: 'tune',
        active: settings.tuning === tun.value,
        badge: settings.tuning === tun.value ? (isSpanish ? 'ACTIVO' : 'ACTIVE') : undefined,
        onPress: () => useSettingsStore.getState().updateSettings({ tuning: tun.value }),
      })),
    [tunings, settings.tuning, isSpanish]
  );

  if (isWebDesktop) {
    return (
      <div
        className="flex flex-col h-full overflow-hidden bg-[var(--app-bg)]"
        style={{ fontFamily: 'var(--studio-font-body)' }}
      >
        <StudioHeader title={t.settings.title} subtitle={t.settings.subtitle} />

        <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar space-y-6 px-6 pb-6">
          {/* ── INSTRUMENT ── */}
          <SettingSection title={isSpanish ? 'Instrumento Global' : 'Global Instrument'}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1">
              {Object.values(INSTRUMENT_REGISTRY).map((inst: InstrumentConfig) => {
                const currentInst = settings.instrument || 'guitar';
                const isActive = currentInst === inst.id;
                const isSoon = inst.status === 'coming_soon';
                const instName = (t.settings.instruments as any)?.[inst.id]?.label || inst.name;
                const instDesc = (t.settings.instruments as any)?.[inst.id]?.desc || inst.subtitle;
                const instBadge =
                  inst.badge === 'NEW'
                    ? isSpanish
                      ? 'NUEVO'
                      : 'NEW'
                    : inst.badge === 'SOON'
                      ? isSpanish
                        ? 'PRONTO'
                        : 'SOON'
                      : inst.badge;

                return (
                  <div
                    key={inst.id}
                    onClick={() => {
                      if (!isSoon) {
                        useSettingsStore
                          .getState()
                          .updateSettings({ instrument: inst.id as Instrument });
                        if (inst.id === 'saxophone') {
                          NavigationDispatcher.replace({
                            app: 'chordex',
                            page: 'practice' as any,
                            tab: 'practice' as any,
                          });
                        } else {
                          NavigationDispatcher.replace({
                            app: 'chordex',
                            page: 'songs' as any,
                            tab: 'songs' as any,
                          });
                        }
                      }
                    }}
                    style={{
                      background: isActive ? 'rgba(245, 158, 11, 0.12)' : 'var(--c-surface-high)',
                      borderColor: isActive ? '#f59e0b' : 'var(--c-border)',
                      cursor: isSoon ? 'not-allowed' : 'pointer',
                      opacity: isSoon ? 0.6 : 1,
                    }}
                    className="flex items-center justify-between p-3.5 rounded-xl border transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: 24,
                          color: isActive ? '#f59e0b' : 'var(--c-text-muted)',
                        }}
                      >
                        {inst.icon}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            style={{
                              fontFamily:
                                'var(--type-body-font, var(--studio-font-body, "Inter", sans-serif))',
                              fontWeight: 600,
                              fontSize: 'var(--type-body-size, 14.5px)',
                              lineHeight: 'var(--type-body-lh, 18px)',
                              color: isActive ? '#f59e0b' : 'var(--c-text-primary)',
                            }}
                          >
                            {instName}
                          </span>
                          {instBadge && (
                            <span
                              style={{
                                fontFamily:
                                  'var(--type-meta-font, var(--studio-font-body, "Inter", sans-serif))',
                                fontSize: 9,
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: 4,
                                background:
                                  inst.badge === 'NEW' ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                                color: inst.badge === 'NEW' ? '#000' : '#a1a1aa',
                              }}
                            >
                              {instBadge}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontFamily:
                              'var(--type-meta-font, var(--studio-font-body, "Inter", sans-serif))',
                            fontSize: 'var(--type-meta-size, 12px)',
                            lineHeight: 'var(--type-meta-lh, 16px)',
                            color: 'var(--c-text-secondary, var(--muted))',
                            marginTop: 2,
                          }}
                        >
                          {instDesc}
                        </div>
                      </div>
                    </div>

                    {isActive && (
                      <AnimatedIcon name="check" size={20} color="#f59e0b" state="success" />
                    )}
                  </div>
                );
              })}
            </div>
          </SettingSection>

          {/* ── TUNING ── */}
          <SettingSection title={t.settings.sections.tuning}>
            <SettingRow
              label={isSpanish ? 'Afinación del Instrumento' : 'Instrument Tuning'}
              desc={
                isSpanish
                  ? 'Cambia el sistema de afinación del mástil para guitarra/bajo'
                  : 'Change the guitar/bass fretboard tuning system'
              }
            >
              <MorphingActionSurface
                buttonLabel={
                  tunings.find((tun) => tun.value === settings.tuning)?.label ||
                  settings.tuning ||
                  standardTuning
                }
                buttonIcon="tune"
                title={t.settings.sections.tuning}
                subtitle={
                  isSpanish
                    ? 'Selecciona el sistema de afinación del mástil'
                    : 'Select instrument fretboard tuning system'
                }
                accentColor={acc.from}
                rows={morphingTuningRows}
              />
            </SettingRow>
          </SettingSection>

          {/* ── CHORD DIAGRAM ── */}
          <SettingSection title={t.settings.sections.chordDiagram}>
            <SettingRow label={t.settings.rows.leftHanded} desc={t.settings.rows.leftHandedDesc}>
              <Toggle
                value={settings.leftHanded}
                onChange={(v) => useSettingsStore.getState().updateSettings({ leftHanded: v })}
                accentFrom={acc.from}
                accentTo={acc.to}
              />
            </SettingRow>
            <SettingRow label={t.settings.rows.fretNumbers} desc={t.settings.rows.fretNumbersDesc}>
              <Toggle
                value={settings.showFretNumbers}
                onChange={(v) => useSettingsStore.getState().updateSettings({ showFretNumbers: v })}
                accentFrom={acc.from}
                accentTo={acc.to}
              />
            </SettingRow>
            <SettingRow
              label={t.settings.rows.fingerNumbers}
              desc={t.settings.rows.fingerNumbersDesc}
            >
              <Toggle
                value={settings.showFingerNumbers}
                onChange={(v) =>
                  useSettingsStore.getState().updateSettings({ showFingerNumbers: v })
                }
                accentFrom={acc.from}
                accentTo={acc.to}
              />
            </SettingRow>
            <SettingRow label={t.settings.rows.noteNames} desc={t.settings.rows.noteNamesDesc}>
              <Toggle
                value={settings.showNoteNames}
                onChange={(v) => useSettingsStore.getState().updateSettings({ showNoteNames: v })}
                accentFrom={acc.from}
                accentTo={acc.to}
              />
            </SettingRow>
            <SettingRow
              label={t.settings.rows.intervalLabels}
              desc={t.settings.rows.intervalLabelsDesc}
            >
              <Toggle
                value={settings.showIntervals}
                onChange={(v) => useSettingsStore.getState().updateSettings({ showIntervals: v })}
                accentFrom={acc.from}
                accentTo={acc.to}
              />
            </SettingRow>
            <SettingRow
              label={t.settings.rows.openStringMarkers}
              desc={t.settings.rows.openStringMarkersDesc}
            >
              <Toggle
                value={settings.showOpenStrings}
                onChange={(v) => useSettingsStore.getState().updateSettings({ showOpenStrings: v })}
                accentFrom={acc.from}
                accentTo={acc.to}
              />
            </SettingRow>
          </SettingSection>

          {/* ── DISPLAY ── */}
          <SettingSection title={t.settings.sections.display}>
            <SettingRow label={t.settings.rows.chordColors} desc={t.settings.rows.chordColorsDesc}>
              <Toggle
                value={settings.showChordQualityColors}
                onChange={(v) =>
                  useSettingsStore.getState().updateSettings({ showChordQualityColors: v })
                }
                accentFrom={acc.from}
                accentTo={acc.to}
              />
            </SettingRow>
            <SettingRow label={t.settings.rows.defaultTab} desc={t.settings.rows.defaultTabDesc}>
              {(() => {
                const cur = settings.defaultTab ?? 'library';
                const tabs: { value: ActivePanel; Icon: React.FC<{ active: boolean }> }[] = [
                  { value: 'songs', Icon: IconSongs },
                  { value: 'library', Icon: IconLibrary },
                  { value: 'preferences', Icon: IconSettings },
                ];
                return (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {tabs.map(({ value, Icon }) => {
                      const active = cur === value;
                      return (
                        <Button
                          key={value}
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            useSettingsStore.getState().updateSettings({ defaultTab: value })
                          }
                          style={{
                            width: 36,
                            height: 36,
                            background: active ? 'var(--c-surface-high)' : 'transparent',
                            color: active ? 'var(--c-text-primary)' : 'var(--c-text-muted)',
                            borderColor: active ? 'var(--c-border-strong)' : 'var(--c-border)',
                            borderRadius: '8px',
                            borderWidth: '1.5px',
                          }}
                        >
                          <Icon active={active} />
                        </Button>
                      );
                    })}
                  </div>
                );
              })()}
            </SettingRow>
          </SettingSection>

          {/* ── INTELLIGENCE ── */}
          <SettingSection title={t.settings.sections.intelligence}>
            <SettingRow
              label={t.settings.rows.chordAssistant}
              desc={t.settings.rows.chordAssistantDesc}
            >
              <Toggle
                value={settings.chordAssistant}
                onChange={(v) => useSettingsStore.getState().updateSettings({ chordAssistant: v })}
                accentFrom={acc.from}
                accentTo={acc.to}
              />
            </SettingRow>
            {settings.chordAssistant && (
              <>
                <SettingRow
                  label={t.settings.rows.smartSuggestions}
                  desc={t.settings.rows.smartSuggestionsDesc}
                >
                  <Toggle
                    value={settings.assistantSmartSuggestions}
                    onChange={(v) =>
                      useSettingsStore.getState().updateSettings({ assistantSmartSuggestions: v })
                    }
                    accentFrom={acc.from}
                    accentTo={acc.to}
                  />
                </SettingRow>
                <SettingRow
                  label={t.settings.rows.progressionTips}
                  desc={t.settings.rows.progressionTipsDesc}
                >
                  <Toggle
                    value={settings.assistantProgressionTips}
                    onChange={(v) =>
                      useSettingsStore.getState().updateSettings({ assistantProgressionTips: v })
                    }
                    accentFrom={acc.from}
                    accentTo={acc.to}
                  />
                </SettingRow>
                <SettingRow
                  label={t.settings.rows.conflictDetection}
                  desc={t.settings.rows.conflictDetectionDesc}
                >
                  <Toggle
                    value={settings.assistantConflictDetection}
                    onChange={(v) =>
                      useSettingsStore.getState().updateSettings({ assistantConflictDetection: v })
                    }
                    accentFrom={acc.from}
                    accentTo={acc.to}
                  />
                </SettingRow>
                <SettingRow
                  label={t.settings.rows.learningMode}
                  desc={t.settings.rows.learningModeDesc}
                >
                  <Toggle
                    value={settings.assistantLearning}
                    onChange={(v) =>
                      useSettingsStore.getState().updateSettings({ assistantLearning: v })
                    }
                    accentFrom={acc.from}
                    accentTo={acc.to}
                  />
                </SettingRow>
              </>
            )}
          </SettingSection>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden app-bg"
      style={{ fontFamily: 'var(--studio-font-body)' }}
    >
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar"
        style={{
          padding: '0 24px',
          paddingBottom: 'calc(max(16px, env(safe-area-inset-bottom, 16px)) + 90px)',
          paddingTop: isWebDesktop ? '20px' : '0',
        }}
      >
        <StudioHeader
          title={t.settings.title}
          subtitle={t.settings.subtitle}
          disableHorizontalPadding={true}
        />

        {/* ── INSTRUMENT ── */}
        <SectionHeader
          icon="music_note"
          title={isSpanish ? 'Instrumento Global' : 'Global Instrument'}
        />
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {Object.values(INSTRUMENT_REGISTRY).map((inst: InstrumentConfig, idx: number) => {
            const currentInst = settings.instrument || 'guitar';
            const isActive = currentInst === inst.id;
            const isSoon = inst.status === 'coming_soon';
            const instName = (t.settings.instruments as any)?.[inst.id]?.label || inst.name;
            const instDesc = (t.settings.instruments as any)?.[inst.id]?.desc || inst.subtitle;
            const instBadge =
              inst.badge === 'NEW'
                ? isSpanish
                  ? 'NUEVO'
                  : 'NEW'
                : inst.badge === 'SOON'
                  ? isSpanish
                    ? 'PRONTO'
                    : 'SOON'
                  : inst.badge;

            return (
              <button
                key={inst.id}
                onClick={() => {
                  if (!isSoon) {
                    useSettingsStore
                      .getState()
                      .updateSettings({ instrument: inst.id as Instrument });
                    if (inst.id === 'saxophone') {
                      NavigationDispatcher.replace({
                        app: 'chordex',
                        page: 'practice' as any,
                        tab: 'practice' as any,
                      });
                    } else {
                      NavigationDispatcher.replace({
                        app: 'chordex',
                        page: 'songs' as any,
                        tab: 'songs' as any,
                      });
                    }
                  }
                }}
                disabled={isSoon}
                className="w-full text-left transition-colors flex items-center justify-between p-4"
                style={{
                  borderBottom:
                    idx < Object.values(INSTRUMENT_REGISTRY).length - 1
                      ? '1px solid var(--c-border-subtle)'
                      : 'none',
                  opacity: isSoon ? 0.5 : 1,
                  background: isActive ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 22,
                      color: isActive ? '#f59e0b' : 'var(--c-text-muted)',
                    }}
                  >
                    {inst.icon}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          fontFamily:
                            'var(--type-body-font, var(--studio-font-body, "Inter", sans-serif))',
                          fontWeight: 600,
                          fontSize: 'var(--type-body-size, 14.5px)',
                          lineHeight: 'var(--type-body-lh, 18px)',
                          color: isActive ? '#f59e0b' : 'var(--c-text-primary)',
                        }}
                      >
                        {instName}
                      </span>
                      {instBadge && (
                        <span
                          style={{
                            fontFamily:
                              'var(--type-meta-font, var(--studio-font-body, "Inter", sans-serif))',
                            fontSize: 9,
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: inst.badge === 'NEW' ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                            color: inst.badge === 'NEW' ? '#000' : '#a1a1aa',
                          }}
                        >
                          {instBadge}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontFamily:
                          'var(--type-meta-font, var(--studio-font-body, "Inter", sans-serif))',
                        fontSize: 'var(--type-meta-size, 12px)',
                        lineHeight: 'var(--type-meta-lh, 16px)',
                        color: 'var(--c-text-secondary)',
                        marginTop: 2,
                      }}
                    >
                      {instDesc}
                    </div>
                  </div>
                </div>

                {isActive && (
                  <span
                    className="material-symbols-outlined"
                    style={{ color: '#f59e0b', fontSize: 20 }}
                  >
                    check_circle
                  </span>
                )}
              </button>
            );
          })}
        </Card>

        {/* ── TUNING ── */}
        <SectionHeader icon="tune" title={t.settings.sections.tuning} />
        <div style={{ marginBottom: 12 }}>
          <MorphingActionSurface
            buttonLabel={`${isSpanish ? 'Afinación:' : 'Tuning:'} ${tunings.find((t) => t.value === settings.tuning)?.label || settings.tuning || standardTuning}`}
            buttonIcon="tune"
            title={t.settings.sections.tuning}
            subtitle={
              isSpanish
                ? 'Selecciona la afinación del mástil para guitarra/bajo'
                : 'Change the guitar/bass fretboard tuning system'
            }
            accentColor={acc.from}
            rows={morphingTuningRows}
          />
        </div>

        {/* ── CHORD DIAGRAM ── */}
        <SectionHeader icon="schema" title={t.settings.sections.chordDiagram} />
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <SettingRow label={t.settings.rows.leftHanded} desc={t.settings.rows.leftHandedDesc}>
            <Toggle
              value={settings.leftHanded}
              onChange={(v) => useSettingsStore.getState().updateSettings({ leftHanded: v })}
              accentFrom={acc.from}
              accentTo={acc.to}
            />
          </SettingRow>
          <SettingRow label={t.settings.rows.fretNumbers} desc={t.settings.rows.fretNumbersDesc}>
            <Toggle
              value={settings.showFretNumbers}
              onChange={(v) => useSettingsStore.getState().updateSettings({ showFretNumbers: v })}
              accentFrom={acc.from}
              accentTo={acc.to}
            />
          </SettingRow>
          <SettingRow
            label={t.settings.rows.fingerNumbers}
            desc={t.settings.rows.fingerNumbersDesc}
          >
            <Toggle
              value={settings.showFingerNumbers}
              onChange={(v) => useSettingsStore.getState().updateSettings({ showFingerNumbers: v })}
              accentFrom={acc.from}
              accentTo={acc.to}
            />
          </SettingRow>
          <SettingRow label={t.settings.rows.noteNames} desc={t.settings.rows.noteNamesDesc}>
            <Toggle
              value={settings.showNoteNames}
              onChange={(v) => useSettingsStore.getState().updateSettings({ showNoteNames: v })}
              accentFrom={acc.from}
              accentTo={acc.to}
            />
          </SettingRow>
          <SettingRow
            label={t.settings.rows.intervalLabels}
            desc={t.settings.rows.intervalLabelsDesc}
          >
            <Toggle
              value={settings.showIntervals}
              onChange={(v) => useSettingsStore.getState().updateSettings({ showIntervals: v })}
              accentFrom={acc.from}
              accentTo={acc.to}
            />
          </SettingRow>
          <SettingRow
            label={t.settings.rows.openStringMarkers}
            desc={t.settings.rows.openStringMarkersDesc}
          >
            <Toggle
              value={settings.showOpenStrings}
              onChange={(v) => useSettingsStore.getState().updateSettings({ showOpenStrings: v })}
              accentFrom={acc.from}
              accentTo={acc.to}
            />
          </SettingRow>
        </Card>

        {/* ── DISPLAY ── */}
        <SectionHeader icon="dashboard" title={t.settings.sections.display} />
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <SettingRow label={t.settings.rows.chordColors} desc={t.settings.rows.chordColorsDesc}>
            <Toggle
              value={settings.showChordQualityColors}
              onChange={(v) =>
                useSettingsStore.getState().updateSettings({ showChordQualityColors: v })
              }
              accentFrom={acc.from}
              accentTo={acc.to}
            />
          </SettingRow>
          <SettingRow label={t.settings.rows.defaultTab} desc={t.settings.rows.defaultTabDesc}>
            {(() => {
              const cur = settings.defaultTab ?? 'library';
              const tabs: { value: ActivePanel; Icon: React.FC<{ active: boolean }> }[] = [
                { value: 'songs', Icon: IconSongs },
                { value: 'library', Icon: IconLibrary },
                { value: 'preferences', Icon: IconSettings },
              ];
              return (
                <div style={{ display: 'flex', gap: '6px' }}>
                  {tabs.map(({ value, Icon }) => {
                    const active = cur === value;
                    return (
                      <Button
                        key={value}
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          useSettingsStore.getState().updateSettings({ defaultTab: value })
                        }
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          border: active ? `2.5px solid ${acc.from}` : '2px solid transparent',
                          background: active
                            ? `linear-gradient(135deg, ${acc.from}22, ${acc.to}18)`
                            : 'var(--app-surface-low)',
                          color: active ? acc.from : 'var(--c-text-secondary)',
                          flexShrink: 0,
                        }}
                      >
                        <Icon active={active} />
                      </Button>
                    );
                  })}
                </div>
              );
            })()}
          </SettingRow>
        </Card>

        {/* ── INTELLIGENCE ── */}
        <SectionHeader icon="psychology" title={t.settings.sections.intelligence} />
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <SettingRow
            label={t.settings.rows.chordAssistant}
            desc={t.settings.rows.chordAssistantDesc}
          >
            <Toggle
              value={settings.chordAssistant}
              onChange={(v) => useSettingsStore.getState().updateSettings({ chordAssistant: v })}
              accentFrom={acc.from}
              accentTo={acc.to}
            />
          </SettingRow>
          {settings.chordAssistant && (
            <div
              style={{
                borderTop: '1px solid rgba(72,72,72,0.1)',
                paddingTop: '4px',
                marginTop: '4px',
              }}
            >
              <SettingRow
                label={t.settings.rows.smartSuggestions}
                desc={t.settings.rows.smartSuggestionsDesc}
                indent
              >
                <Toggle
                  value={settings.assistantSmartSuggestions}
                  onChange={(v) =>
                    useSettingsStore.getState().updateSettings({ assistantSmartSuggestions: v })
                  }
                  accentFrom={acc.from}
                  accentTo={acc.to}
                />
              </SettingRow>
              <SettingRow
                label={t.settings.rows.progressionTips}
                desc={t.settings.rows.progressionTipsDesc}
                indent
              >
                <Toggle
                  value={settings.assistantProgressionTips}
                  onChange={(v) =>
                    useSettingsStore.getState().updateSettings({ assistantProgressionTips: v })
                  }
                  accentFrom={acc.from}
                  accentTo={acc.to}
                />
              </SettingRow>
              <SettingRow
                label={t.settings.rows.conflictDetection}
                desc={t.settings.rows.conflictDetectionDesc}
                indent
              >
                <Toggle
                  value={settings.assistantConflictDetection}
                  onChange={(v) =>
                    useSettingsStore.getState().updateSettings({ assistantConflictDetection: v })
                  }
                  accentFrom={acc.from}
                  accentTo={acc.to}
                />
              </SettingRow>
              <SettingRow
                label={t.settings.rows.learningMode}
                desc={t.settings.rows.learningModeDesc}
                indent
              >
                <Toggle
                  value={settings.assistantLearning}
                  onChange={(v) =>
                    useSettingsStore.getState().updateSettings({ assistantLearning: v })
                  }
                  accentFrom={acc.from}
                  accentTo={acc.to}
                />
              </SettingRow>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
