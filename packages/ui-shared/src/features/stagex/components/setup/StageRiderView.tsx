import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import { useStagexStore, type RiderNeed } from '../../state/useStagexStore';
import { StageSetupDetailLayout } from './StageSetupDetailLayout';
import { StageSetupEmptyState } from './StageSetupEmptyState';
import { useSettingsStore, useT, EasingPresets } from '@workspace/studio-core';
import { useAppReducedMotion } from '../../../../hooks/useAppReducedMotion';


export interface StageRiderViewProps {
  onBack: () => void;
  isLight?: boolean;
  isAmoled?: boolean;
}

const CATEGORY_KEYS: RiderNeed['type'][] = ['foh', 'monitor', 'power', 'hospitality', 'custom'];

export const StageRiderView: React.FC<StageRiderViewProps> = ({
  onBack,
  isLight: isLightProp,
  isAmoled: isAmoledProp,
}) => {
  const t = useT();
  const tr = t as any;
  const settings = useSettingsStore(
    useShallow((s) => ({
      language: s.settings.language,
      perApp: s.settings.perApp,
      amoledMode: s.settings.amoledMode,
    }))
  );
  const isSpanish = (settings.language ?? 'en') === 'es';
  const riderTr = tr.stagex?.setup?.rider;

  const TYPE_CONFIG = useMemo<
    Record<
      RiderNeed['type'],
      { label: string; color: string; icon: string; defaultPlaceholder: string }
    >
  >(
    () => ({
      foh: {
        label: riderTr?.typeFoh || 'FOH PROTOCOL',
        color: '#2563eb',
        icon: 'graphic_eq',
        defaultPlaceholder:
          riderTr?.placeholderFoh || 'e.g. Dante Primary/Secondary @ 96kHz, Cat6 homerun',
      },
      monitor: {
        label: riderTr?.typeMonitor || 'MONITOR / IEM',
        color: '#8b5cf6',
        icon: 'headphones',
        defaultPlaceholder:
          riderTr?.placeholderMonitor || 'e.g. Minimum 4 discrete stereo wireless IEM mixes',
      },
      power: {
        label: riderTr?.typePower || 'POWER REQUIREMENT',
        color: '#f59e0b',
        icon: 'bolt',
        defaultPlaceholder: riderTr?.placeholderPower || 'e.g. 2× 20A circuits, distro Stage Left',
      },
      hospitality: {
        label: riderTr?.typeHospitality || 'HOSPITALITY',
        color: '#10b981',
        icon: 'local_cafe',
        defaultPlaceholder:
          riderTr?.placeholderHospitality ||
          'e.g. 12 bottles still water, clean stage towels, green room access',
      },
      custom: {
        label: riderTr?.typeCustom || 'PRODUCTION SPEC',
        color: '#64748b',
        icon: 'sticky_note_2',
        defaultPlaceholder:
          riderTr?.placeholderCustom || 'e.g. Drum riser 8x8 ft, clearance height min 14 ft',
      },
    }),
    [riderTr]
  );

  const PRESETS_BY_TYPE = useMemo<Record<RiderNeed['type'], { label: string; value: string }[]>>(
    () => ({
      foh: [
        { label: 'Dante 96kHz', value: riderTr?.presetDante || 'Dante Primary/Secondary @ 96kHz' },
        {
          label: isSpanish ? 'Analógico 32ch' : 'Analog 32ch min',
          value: riderTr?.presetAnalog || 'Analog 32-channel split snake minimum',
        },
        {
          label: isSpanish ? 'Digital 48ch' : 'Digital 48ch min',
          value: riderTr?.presetDigital || 'Digital 48-channel desk with recallable preamps',
        },
        {
          label: 'MADI / Dante',
          value: riderTr?.presetMadi || 'MADI / Dante hybrid optical redundant link',
        },
        {
          label: isSpanish ? 'Consola propia' : 'Console by band',
          value: riderTr?.presetConsole || 'FOH desk and stage boxes provided by band',
        },
      ],
      monitor: [
        {
          label: isSpanish ? '4 IEM Estéreo' : '4 Stereo IEM min',
          value: riderTr?.presetIem || 'Minimum 4 discrete stereo IEM mixes',
        },
        {
          label: isSpanish ? '5 Cuñas' : '5 Wedge mixes',
          value: riderTr?.presetWedges || '5 bi-amped wedge mixes on independent auxes',
        },
        {
          label: isSpanish ? '2 IEM + 4 Cuñas' : '2 Stereo IEM + 4 Wedge',
          value: riderTr?.presetHybridMon || '2 stereo IEM pairs + 4 floor wedges',
        },
        {
          label: isSpanish ? '8 Mezclas Aux' : '8 Aux mixes',
          value: riderTr?.presetAux || '8 balanced XLR aux sends from stage rack',
        },
        {
          label: isSpanish ? 'Sin monitores' : 'No monitors',
          value: riderTr?.presetNoMon || 'In-ear system completely self-contained',
        },
      ],
      power: [
        {
          label: '2× 20A SL',
          value: riderTr?.presetPowerSl || '2× 20A circuits, distro Stage Left',
        },
        {
          label: '3× 20A SC',
          value: riderTr?.presetPowerSc || '3× 20A isolated sound power Stage Center',
        },
        {
          label: isSpanish ? '4× 15A circuitos' : '4× 15A circuits',
          value: riderTr?.presetPowerCircuits || '4× 15A circuits distributed SL/SR',
        },
        {
          label: isSpanish ? 'Acometida banda' : 'Band Distro',
          value: riderTr?.presetPowerDistro || '100A 3-phase camlock service for band distro',
        },
        {
          label: isSpanish ? 'Recinto estándar' : 'Standard Venue',
          value: riderTr?.presetPowerVenue || 'Standard 120V/240V clean stage power',
        },
      ],
      hospitality: [
        {
          label: isSpanish ? '12 Aguas' : '12 Still Water',
          value: riderTr?.presetHospWater || '12 bottles still spring water, room temp',
        },
        {
          label: isSpanish ? 'Toallas limpias' : 'Clean Towels',
          value: riderTr?.presetHospTowels || '6 black stage towels laundered fresh',
        },
        {
          label: isSpanish ? 'Acceso camerino' : 'Green Room Access',
          value: riderTr?.presetHospGreenRoom || 'Secure green room with lockable storage',
        },
        {
          label: isSpanish ? 'Cena caliente' : 'Hot Meals',
          value: riderTr?.presetHospHotMeals || 'Hot post-soundcheck dinner for crew & band',
        },
        {
          label: isSpanish ? 'Hospitalidad base' : 'Standard Hospitality',
          value: riderTr?.presetHospVenue || 'Standard venue hospitality package',
        },
      ],
      custom: [
        {
          label: isSpanish ? 'Tarima 8x8' : 'Drum Riser 8x8',
          value: riderTr?.presetSpecRiser || 'Drum riser 8x8 ft, height 18-24 in',
        },
        {
          label: isSpanish ? 'Despeje 14ft' : 'Clearance 14ft min',
          value: riderTr?.presetSpecClearance || 'Minimum stage clearance height 14 ft',
        },
        {
          label: isSpanish ? 'Aviso estrobo' : 'Strobe Warning',
          value: riderTr?.presetSpecStrobe || 'Strobe lighting warning signage posted',
        },
        {
          label: isSpanish ? 'Muelle carga B' : 'Loading Dock B',
          value: riderTr?.presetSpecLoadingDock || 'Load-in via Loading Dock B strictly',
        },
      ],
    }),
    [riderTr, isSpanish]
  );
  const {
    projectName,
    elements,
    scenes,
    currentSceneIdx,
    riderNeeds,
    setRiderNeeds,
    addRiderNeed,
    updateRiderNeed,
    removeRiderNeed,
    riderConfig,
    updateRiderConfig,
    riderChannels,
    members,
    gear,
    preferences,
  } = useStagexStore(
    useShallow((s) => ({
      projectName: s.projectName,
      elements: s.elements,
      scenes: s.scenes,
      currentSceneIdx: s.currentSceneIdx,
      riderNeeds: s.riderNeeds,
      setRiderNeeds: s.setRiderNeeds,
      addRiderNeed: s.addRiderNeed,
      updateRiderNeed: s.updateRiderNeed,
      removeRiderNeed: s.removeRiderNeed,
      riderConfig: s.riderConfig,
      updateRiderConfig: s.updateRiderConfig,
      riderChannels: s.riderChannels,
      members: s.members,
      gear: s.gear,
      preferences: s.preferences,
    }))
  );

  const activeVis = settings.perApp?.stagex;
  const isLight =
    isLightProp !== undefined ? isLightProp : activeVis ? activeVis.theme === 'light' : false;
  const isAmoled =
    isAmoledProp !== undefined
      ? isAmoledProp
      : !isLight && Boolean(settings.amoledMode || activeVis?.amoledMode || preferences?.amoled);

  const prefersReducedMotion = useAppReducedMotion();

  // Add requirement form state
  const [isAdding, setIsAdding] = useState(false);
  const [newType, setNewType] = useState<RiderNeed['type']>('foh');
  const [newValue, setNewValue] = useState('');

  // Per-card custom input text state
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});

  const handleCustomInputChange = (id: string, val: string) => {
    setCustomInputs((prev) => ({ ...prev, [id]: val }));
  };

  const handleApplyCustomInput = (id: string, index?: number) => {
    const val = customInputs[id];
    if (val && val.trim()) {
      if (riderNeeds.some((n) => n.id === id)) {
        updateRiderNeed(id, { value: val.trim() });
      } else if (typeof index === 'number') {
        const next = [...riderNeeds];
        next[index] = { ...next[index], value: val.trim(), id };
        setRiderNeeds(next);
      }
      setCustomInputs((prev) => ({ ...prev, [id]: '' }));
    }
  };

  const handleCycleType = (id: string, current: RiderNeed['type'], index?: number) => {
    const nextIdx = (CATEGORY_KEYS.indexOf(current) + 1) % CATEGORY_KEYS.length;
    const nextType = CATEGORY_KEYS[nextIdx];
    if (riderNeeds.some((n) => n.id === id)) {
      updateRiderNeed(id, { type: nextType });
    } else if (typeof index === 'number') {
      const next = [...riderNeeds];
      next[index] = { ...next[index], type: nextType, id };
      setRiderNeeds(next);
    }
  };

  const handleRemoveNeed = (id: string, index: number) => {
    if (riderNeeds.some((n) => n.id === id)) {
      removeRiderNeed(id);
    } else {
      const next = [...riderNeeds];
      next.splice(index, 1);
      setRiderNeeds(next);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim()) return;
    addRiderNeed({
      type: newType,
      value: newValue.trim(),
    });
    setNewValue('');
    setIsAdding(false);
  };

  // Scene metadata
  const currentScene = scenes[currentSceneIdx] || { name: 'Main Stage' };

  // Audio channels derived from riderChannels or elements
  const patchList = useMemo(() => {
    if (riderChannels && riderChannels.length > 0) {
      return riderChannels;
    }
    if (!elements || elements.length === 0) return [];
    return elements.map((el, idx) => ({
      ch: idx + 1,
      source: el.label || el.name || el.type || `Input ${idx + 1}`,
      transducer:
        el.transducer ||
        (el.type?.includes('mic')
          ? 'Dynamic Mic'
          : el.type?.includes('di')
            ? 'Direct Box (DI)'
            : 'Line / XLR'),
      phantom: Boolean(el.phantom || el.type?.includes('condenser')),
      stand: el.stand || 'Standard',
      notes: el.notes || `Mix ${(idx % 4) + 1}`,
    }));
  }, [riderChannels, elements]);

  // Theme Design Tokens
  const cardBg = isLight ? '#ffffff' : isAmoled ? '#000000' : 'var(--c-bg-card, #111115)';
  const cardBorder = isLight
    ? '#eaecef'
    : isAmoled
      ? 'rgba(255, 255, 255, 0.12)'
      : 'var(--c-border, rgba(255, 255, 255, 0.08))';
  const innerBg = isLight
    ? '#f9fafb'
    : isAmoled
      ? 'rgba(255, 255, 255, 0.04)'
      : 'rgba(255, 255, 255, 0.03)';
  const innerBorder = isLight
    ? '#e5e7eb'
    : isAmoled
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(255, 255, 255, 0.06)';
  const textPrimary = isLight ? '#111827' : '#ffffff';
  const textSecondary = isLight ? '#6b7280' : '#a1a1aa';
  const textMuted = isLight ? '#9ca3af' : '#71717a';

  return (
    <StageSetupDetailLayout
      title={riderTr?.title || tr.stagex?.techRiderTitle || 'Technical Rider'}
      onBack={onBack}
      isLight={isLight}
      isAmoled={isAmoled}
    >
      <div className="space-y-3.5 pb-10">
        {/* ── SECTION 1: HERO CARD & METRICS ─────────────────────── */}
        <section className="space-y-2.5" data-purpose="stage-summary">
          {/* Main Hero Card */}
          <div
            className="rounded-[20px] border p-4 shadow-sm transition-all"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          >
            {elements.length === 0 ? (
              <div className="text-center space-y-1.5 py-1">
                <span
                  className="text-[10px] font-black uppercase tracking-widest block"
                  style={{ color: textPrimary, letterSpacing: '0.12em' }}
                >
                  {riderTr?.noElementsTitle || 'NO STAGE ELEMENTS YET'}
                </span>
                <p
                  className="text-[11px] font-medium leading-relaxed"
                  style={{ color: textSecondary }}
                >
                  {riderTr?.noElementsDesc ||
                    'Add elements to the stage — they appear here automatically'}
                </p>
                <div
                  className="w-full h-1 rounded-full mt-3"
                  style={{ backgroundColor: isLight ? '#111827' : '#ffffff' }}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span
                    className="text-[9.5px] font-black uppercase tracking-widest block text-blue-600 dark:text-blue-400"
                    style={{ letterSpacing: '0.12em' }}
                  >
                    {riderTr?.specTitle || 'TECHNICAL RIDER & STAGE SPECIFICATION'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border"
                      style={{
                        backgroundColor: isLight ? '#111827' : '#ffffff',
                        color: isLight ? '#ffffff' : '#111827',
                        borderColor: isLight ? '#111827' : '#ffffff',
                      }}
                    >
                      {currentScene.name || 'Main Stage'}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[9px] font-bold border"
                      style={{
                        backgroundColor: innerBg,
                        color: textSecondary,
                        borderColor: innerBorder,
                      }}
                    >
                      {new Date()
                        .toLocaleDateString(undefined, {
                          month: 'short',
                          day: '2-digit',
                          year: 'numeric',
                        })
                        .toUpperCase()}
                    </span>
                  </div>
                </div>

                <h2
                  data-testid="rider-hero-title"
                  className="text-xl font-black uppercase tracking-tight"
                  style={{ color: textPrimary, fontFamily: 'var(--studio-font-display)' }}
                >
                  {projectName || 'MAIN STAGE'}
                </h2>

                <p className="text-[11.5px] leading-relaxed" style={{ color: textSecondary }}>
                  {isSpanish
                    ? 'Configura las especificaciones de producción en vivo detallando audio, distribución de energía, monitores y logística.'
                    : 'Configure live production specifications detailing audio requirements, power distribution, monitoring channels, and venue logistics.'}
                </p>

                <div
                  className="w-full h-1 rounded-full mt-2"
                  style={{ backgroundColor: isLight ? '#111827' : '#ffffff' }}
                />
              </div>
            )}
          </div>

          {/* Metrics Row: Channels & Elements */}
          <div className="grid grid-cols-2 gap-2.5">
            <div
              className="rounded-[18px] border p-3.5 shadow-2xs transition-all"
              style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            >
              <p
                className="text-[9px] font-bold uppercase tracking-wider"
                style={{ color: textMuted }}
              >
                {riderTr?.statChannels || 'CHANNELS'}
              </p>
              <p
                className="text-base font-black mt-0.5"
                style={{ color: textPrimary, fontFamily: 'var(--studio-font-display)' }}
              >
                {patchList.length} / 32
              </p>
            </div>
            <div
              className="rounded-[18px] border p-3.5 shadow-2xs transition-all"
              style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            >
              <p
                className="text-[9px] font-bold uppercase tracking-wider"
                style={{ color: textMuted }}
              >
                {riderTr?.statElements || 'ELEMENTS'}
              </p>
              <p
                className="text-base font-black mt-0.5"
                style={{ color: textPrimary, fontFamily: 'var(--studio-font-display)' }}
              >
                {elements.length}
              </p>
            </div>
          </div>
        </section>

        {/* ── SECTION 2: TECHNICAL REQUIREMENTS ─────────────────── */}
        <section
          className="rounded-[20px] border p-4 space-y-3.5 shadow-sm transition-all"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          data-purpose="technical-requirements"
        >
          {/* Section Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg" style={{ color: textPrimary }}>
                tune
              </span>
              <h2
                className="text-xs font-black tracking-wider uppercase"
                style={{ color: textPrimary, letterSpacing: '0.06em' }}
              >
                {riderTr?.prodRequirementsTitle || 'TECHNICAL REQUIREMENTS'}
              </h2>
            </div>
            <button
              type="button"
              data-testid="btn-add-rider-need"
              onClick={() => setIsAdding((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer shrink-0"
              style={{
                backgroundColor: isAdding ? (isLight ? '#111827' : '#ffffff') : innerBg,
                borderColor: isAdding ? (isLight ? '#111827' : '#ffffff') : innerBorder,
                color: isAdding ? (isLight ? '#ffffff' : '#111827') : textPrimary,
              }}
            >
              <span>{isAdding ? '✕' : '+'}</span>
              <span>
                {isAdding
                  ? isSpanish
                    ? 'CANCELAR'
                    : 'CANCEL'
                  : isSpanish
                    ? 'AÑADIR REQUISITO'
                    : 'ADD NEED'}
              </span>
            </button>
          </div>

          {/* Add Need Inline Animated Form */}
          <AnimatePresence>
            {isAdding && (
              <motion.form
                key="add-need-form"
                initial={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: [0.2, 0, 0, 1] }}
                onSubmit={handleAddSubmit}
                className="rounded-xl border p-3 space-y-3 overflow-hidden"
                style={{ backgroundColor: innerBg, borderColor: innerBorder }}
              >
                {/* Category Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {CATEGORY_KEYS.map((type) => {
                    const isSelected = newType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        data-testid={`rider-type-btn-${type}`}
                        onClick={() => {
                          setNewType(type);
                          if (PRESETS_BY_TYPE[type]?.[0]) {
                            setNewValue(PRESETS_BY_TYPE[type][0].value);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border"
                        style={{
                          backgroundColor: isSelected
                            ? isLight
                              ? '#111827'
                              : '#ffffff'
                            : 'transparent',
                          borderColor: isSelected ? (isLight ? '#111827' : '#ffffff') : innerBorder,
                          color: isSelected ? (isLight ? '#ffffff' : '#111827') : textSecondary,
                        }}
                      >
                        {TYPE_CONFIG[type].label}
                      </button>
                    );
                  })}
                </div>

                {/* Quick Presets for New Type */}
                <div>
                  <p
                    className="text-[8px] font-bold uppercase tracking-wider mb-1.5"
                    style={{ color: textMuted }}
                  >
                    {isSpanish ? 'Plantillas Rápidas' : 'Quick Presets'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESETS_BY_TYPE[newType]?.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setNewValue(preset.value)}
                        className="px-2 py-0.5 text-[9px] font-medium rounded-md border transition-all cursor-pointer"
                        style={{
                          backgroundColor:
                            newValue === preset.value ? (isLight ? '#111827' : '#ffffff') : innerBg,
                          borderColor:
                            newValue === preset.value
                              ? isLight
                                ? '#111827'
                                : '#ffffff'
                              : innerBorder,
                          color:
                            newValue === preset.value
                              ? isLight
                                ? '#ffffff'
                                : '#111827'
                              : textSecondary,
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input & Submit */}
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    data-testid="input-rider-need-value"
                    placeholder={TYPE_CONFIG[newType].defaultPlaceholder}
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="flex-1 text-[11px] rounded-lg px-2.5 py-1.5 border focus:outline-none transition-colors"
                    style={{
                      backgroundColor: isLight ? '#ffffff' : 'rgba(0, 0, 0, 0.4)',
                      borderColor: innerBorder,
                      color: textPrimary,
                    }}
                    autoFocus
                  />
                  <button
                    type="submit"
                    data-testid="btn-save-rider-need"
                    disabled={!newValue.trim()}
                    className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
                    style={{
                      backgroundColor: isLight ? '#111827' : '#ffffff',
                      color: isLight ? '#ffffff' : '#111827',
                    }}
                  >
                    {riderTr?.save || 'SAVE'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Requirements Cards List with Smooth Motion */}
          <div className="space-y-3">
            {riderNeeds.length === 0 ? (
              <StageSetupEmptyState
                icon="bolt"
                title={riderTr?.emptyRequirementsTitle || 'No requirements added yet'}
                description={
                  riderTr?.emptyRequirementsDesc ||
                  'Add specifications for power distribution, audio protocols, IEMs, or hospitality'
                }
                actionLabel={riderTr?.addRequirement || 'Add Requirement'}
                onAction={() => setIsAdding(true)}
                iconColor="#f59e0b"
                isLight={isLight}
              />
            ) : (
              <AnimatePresence mode="popLayout">
                {riderNeeds.map((need, needIdx) => {
                  const needId = need.id || `rn_${needIdx}`;
                  const cfg = TYPE_CONFIG[need.type] || TYPE_CONFIG.custom;
                  const presets = PRESETS_BY_TYPE[need.type] || PRESETS_BY_TYPE.custom;
                  const customText = customInputs[needId] ?? '';

                  return (
                    <motion.div
                      key={needId}
                      layout={!prefersReducedMotion}
                      initial={
                        prefersReducedMotion ? undefined : { opacity: 0, y: 12, scale: 0.98 }
                      }
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={
                        prefersReducedMotion
                          ? undefined
                          : { opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.15 } }
                      }
                      transition={{
                        duration: prefersReducedMotion ? 0 : 0.22,
                        ease: EasingPresets.emphasized,
                      }}
                      data-testid={`rider-need-${needId}`}
                      className="rounded-xl border p-3 space-y-3 shadow-2xs transition-colors duration-150"
                      style={{
                        backgroundColor: cardBg,
                        borderColor: cardBorder,
                      }}
                    >
                      {/* Top Row: Category Title with chevron & Remove button */}
                      <div className="flex items-center justify-between">
                        <div
                          className="flex items-center gap-1.5 cursor-pointer select-none"
                          onClick={() => handleCycleType(needId, need.type, needIdx)}
                          title={
                            isSpanish ? 'Toca para alternar categoría' : 'Click to cycle category'
                          }
                        >
                          <span
                            className="text-[10px] font-extrabold tracking-wider uppercase"
                            style={{ color: textPrimary }}
                          >
                            {cfg.label}
                          </span>
                          <span
                            className="material-symbols-outlined text-sm"
                            style={{ color: textMuted }}
                          >
                            expand_more
                          </span>
                        </div>
                        <button
                          type="button"
                          aria-label={isSpanish ? 'Eliminar requisito' : 'Remove requirement'}
                          data-testid={`btn-delete-need-${needId}`}
                          onClick={() => handleRemoveNeed(needId, needIdx)}
                          className="p-1 rounded-md transition-colors cursor-pointer"
                          style={{ color: textMuted }}
                        >
                          <span className="material-symbols-outlined text-base leading-none">
                            close
                          </span>
                        </button>
                      </div>

                      {/* Active Specification Box */}
                      <div
                        className="rounded-lg border p-2.5 flex items-center justify-between"
                        style={{
                          backgroundColor: innerBg,
                          borderColor: innerBorder,
                        }}
                      >
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <span
                            className="text-[8px] font-extrabold uppercase tracking-wider block"
                            style={{ color: textSecondary }}
                          >
                            {isSpanish ? 'Especificación Activa' : 'Active Specification'}
                          </span>
                          <p className="text-xs font-bold truncate" style={{ color: textPrimary }}>
                            {need.value}
                          </p>
                        </div>
                      </div>

                      {/* Quick Presets */}
                      <div>
                        <p
                          className="text-[8px] font-bold uppercase tracking-wider mb-1.5"
                          style={{ color: textMuted }}
                        >
                          {isSpanish ? 'Plantillas Rápidas' : 'Quick Presets'}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {presets.map((preset) => {
                            const isActive =
                              need.value === preset.value || need.value === preset.label;
                            return (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => {
                                  if (riderNeeds.some((n) => n.id === needId)) {
                                    updateRiderNeed(needId, { value: preset.value });
                                  } else {
                                    const next = [...riderNeeds];
                                    next[needIdx] = { ...need, value: preset.value, id: needId };
                                    setRiderNeeds(next);
                                  }
                                }}
                                className="px-2.5 py-0.5 text-[9px] rounded-md transition-all cursor-pointer font-medium border"
                                style={{
                                  backgroundColor: isActive
                                    ? isLight
                                      ? '#111827'
                                      : '#ffffff'
                                    : innerBg,
                                  borderColor: isActive
                                    ? isLight
                                      ? '#111827'
                                      : '#ffffff'
                                    : innerBorder,
                                  color: isActive
                                    ? isLight
                                      ? '#ffffff'
                                      : '#111827'
                                    : textSecondary,
                                  fontWeight: isActive ? 600 : 500,
                                }}
                              >
                                {preset.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom Specification Input */}
                      <div
                        className="mt-2 pt-2.5 border-t flex items-center gap-1.5"
                        style={{ borderColor: innerBorder }}
                      >
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder={
                              isSpanish
                                ? 'Especificación personalizada (ej. Ravenna, AES67...)'
                                : 'Custom specification (e.g. Ravenna, AES67...)'
                            }
                            value={customText}
                            onChange={(e) => handleCustomInputChange(needId, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleApplyCustomInput(needId, needIdx);
                              }
                            }}
                            className="w-full text-[11px] rounded-lg px-2.5 py-1.5 border focus:outline-none transition-colors"
                            style={{
                              backgroundColor: innerBg,
                              borderColor: innerBorder,
                              color: textPrimary,
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplyCustomInput(needId, needIdx)}
                          disabled={!customText.trim()}
                          className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
                          style={{
                            backgroundColor: isLight ? '#111827' : '#ffffff',
                            color: isLight ? '#ffffff' : '#111827',
                          }}
                        >
                          {isSpanish ? 'Fijar' : 'Set'}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </section>

        {/* ── SECTION 3: TECHNICAL NOTES ─────────────────────────── */}
        <section
          className="rounded-[20px] border p-4 space-y-2.5 shadow-sm transition-all"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          data-purpose="technical-notes"
        >
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base" style={{ color: textSecondary }}>
              description
            </span>
            <h2
              className="text-xs font-black tracking-wider uppercase"
              style={{ color: textPrimary }}
            >
              {isSpanish ? 'NOTAS TÉCNICAS' : 'TECHNICAL NOTES'}
            </h2>
          </div>

          {/* Notes Container with vertical indicator bar */}
          <div className="relative flex items-stretch">
            <textarea
              rows={3}
              data-testid="input-rider-notes"
              placeholder={
                isSpanish
                  ? 'El artista proporciona todos los instrumentos, transmisores IEM y rack de pistas. El recinto suministra micrófonos, pies y cableado XLR. La PA debe mantener 105 dB continuos en FOH.'
                  : 'Artist provides all instruments, IEM transmitters, and playback rack. Venue supplies microphones, stands, and XLR cabling. PA must sustain 105 dB continuous at FOH.'
              }
              value={riderConfig.notes || ''}
              onChange={(e) => updateRiderConfig({ notes: e.target.value })}
              className="w-full text-[11px] font-normal leading-relaxed pr-2 border-none bg-transparent resize-none focus:outline-none"
              style={{
                color: textPrimary,
              }}
            />
            <div
              className="w-1 rounded-full shrink-0 my-0.5 ml-1"
              style={{ backgroundColor: isLight ? '#1f2937' : '#e5e7eb' }}
            />
          </div>
        </section>

        {/* ── SECTION 4: PRODUCTION CONTACT & VENUE ─────────────── */}
        <section
          className="rounded-[20px] border p-4 space-y-3 shadow-sm transition-all"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          data-purpose="production-contact"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span
                className="material-symbols-outlined text-base"
                style={{ color: textSecondary }}
              >
                badge
              </span>
              <h2
                className="text-xs font-black tracking-wider uppercase"
                style={{ color: textPrimary }}
              >
                {isSpanish ? 'CONTACTO DE PRODUCCIÓN Y RECINTO' : 'PRODUCTION CONTACT & VENUE'}
              </h2>
            </div>
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
              style={{
                backgroundColor: isLight ? 'rgba(37, 99, 235, 0.08)' : 'rgba(59, 130, 246, 0.15)',
                color: isLight ? '#2563eb' : '#60a5fa',
                borderColor: isLight ? 'rgba(37, 99, 235, 0.2)' : 'rgba(59, 130, 246, 0.3)',
              }}
            >
              {riderConfig.contactName
                ? isSpanish
                  ? 'CONFIRMADO'
                  : 'CONFIRMED'
                : isSpanish
                  ? 'MONTAJE'
                  : 'SETUP'}
            </span>
          </div>

          <div className="space-y-2 pt-0.5">
            {/* Field: Contact Name */}
            <div
              className="flex items-start gap-2.5 rounded-lg border p-2.5"
              style={{ backgroundColor: innerBg, borderColor: innerBorder }}
            >
              <span
                className="material-symbols-outlined text-base mt-0.5"
                style={{ color: textMuted }}
              >
                person
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className="text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: textMuted }}
                >
                  {isSpanish ? 'NOMBRE DE CONTACTO' : 'CONTACT NAME'}
                </p>
                <input
                  type="text"
                  data-testid="input-rider-contact-name"
                  placeholder={
                    isSpanish
                      ? 'ej. Alex Miller — Ingeniero FOH'
                      : 'e.g. Alex Miller — FOH Engineer'
                  }
                  value={riderConfig.contactName || ''}
                  onChange={(e) => updateRiderConfig({ contactName: e.target.value })}
                  className="w-full text-xs font-bold mt-0.5 bg-transparent border-none focus:outline-none"
                  style={{ color: textPrimary }}
                />
              </div>
            </div>

            {/* Field: Phone & Email */}
            <div
              className="flex items-start gap-2.5 rounded-lg border p-2.5"
              style={{ backgroundColor: innerBg, borderColor: innerBorder }}
            >
              <span
                className="material-symbols-outlined text-base mt-0.5"
                style={{ color: textMuted }}
              >
                contact_phone
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className="text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: textMuted }}
                >
                  {isSpanish ? 'TELÉFONO / CORREO' : 'PHONE / EMAIL'}
                </p>
                <input
                  type="text"
                  data-testid="input-rider-contact-phone"
                  placeholder="e.g. +1 (555) 019-2834 / alex@crew.live"
                  value={riderConfig.contactPhone || ''}
                  onChange={(e) => updateRiderConfig({ contactPhone: e.target.value })}
                  className="w-full text-xs font-bold mt-0.5 bg-transparent border-none focus:outline-none"
                  style={{ color: textPrimary }}
                />
              </div>
            </div>

            {/* Field: Venue / Festival */}
            <div
              className="flex items-start gap-2.5 rounded-lg border p-2.5"
              style={{ backgroundColor: innerBg, borderColor: innerBorder }}
            >
              <span
                className="material-symbols-outlined text-base mt-0.5"
                style={{ color: textMuted }}
              >
                location_on
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className="text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: textMuted }}
                >
                  {isSpanish ? 'RECINTO / FESTIVAL' : 'VENUE / FESTIVAL'}
                </p>
                <input
                  type="text"
                  data-testid="input-rider-venue"
                  placeholder="e.g. The Paramount Theater — Main Stage"
                  value={riderConfig.venue || ''}
                  onChange={(e) => updateRiderConfig({ venue: e.target.value })}
                  className="w-full text-xs font-bold mt-0.5 bg-transparent border-none focus:outline-none"
                  style={{ color: textPrimary }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 5: STAGE PLOT ELEMENTS ─────────────────────── */}
        <section
          className="rounded-[20px] border p-4 space-y-3 shadow-sm transition-all"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          data-purpose="stage-plot-elements"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span
                className="material-symbols-outlined text-base"
                style={{ color: textSecondary }}
              >
                layers
              </span>
              <h2
                className="text-xs font-black tracking-wider uppercase"
                style={{ color: textPrimary }}
              >
                {isSpanish ? 'ELEMENTOS DEL PLANO DE ESCENARIO' : 'STAGE PLOT ELEMENTS'}
              </h2>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-md"
              style={{
                backgroundColor: innerBg,
                color: textSecondary,
              }}
            >
              {elements.length}{' '}
              {elements.length === 1
                ? isSpanish
                  ? 'Elemento'
                  : 'Element'
                : isSpanish
                  ? 'Elementos'
                  : 'Elements'}
            </span>
          </div>

          {elements.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {elements.map((el, i) => (
                <div
                  key={el.id || i}
                  className="p-2.5 rounded-xl border flex items-center justify-between gap-2.5"
                  style={{
                    backgroundColor: innerBg,
                    borderColor: innerBorder,
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                        borderColor: innerBorder,
                      }}
                    >
                      <span
                        className="material-symbols-outlined text-[15px]"
                        style={{ color: textPrimary }}
                      >
                        {el.type?.includes('drum')
                          ? 'album'
                          : el.type?.includes('mic')
                            ? 'mic'
                            : el.type?.includes('amp')
                              ? 'speaker'
                              : el.type?.includes('key')
                                ? 'piano'
                                : 'queue_music'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: textPrimary }}>
                        {el.label || el.name || el.type || `Element ${i + 1}`}
                      </p>
                      <span
                        className="text-[9.5px] font-medium block"
                        style={{ color: textSecondary }}
                      >
                        {isSpanish
                          ? `Posición: X: ${Math.round(el.x || 0)}% · Y: ${Math.round(el.y || 0)}%`
                          : `Position: X: ${Math.round(el.x || 0)}% · Y: ${Math.round(el.y || 0)}%`}
                      </span>
                    </div>
                  </div>

                  <span
                    className="text-[9.5px] font-black uppercase px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: innerBg,
                      color: textMuted,
                    }}
                  >
                    #{i + 1}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 flex flex-col items-center justify-center text-center">
              <span
                className="material-symbols-outlined text-2xl mb-1"
                style={{ color: textMuted }}
              >
                alt_route
              </span>
              <p className="text-xs font-bold" style={{ color: textPrimary }}>
                {isSpanish ? 'Sin elementos colocados en el escenario' : 'No Stage Elements Placed'}
              </p>
              <p className="text-[11px] max-w-xs mt-0.5" style={{ color: textSecondary }}>
                {isSpanish
                  ? 'Añade instrumentos y micrófonos al escenario para poblar esta sección.'
                  : 'Add instruments and microphones to the stage to populate this section.'}
              </p>
            </div>
          )}
        </section>

        {/* ── SECTION 6: INPUT CHANNEL & PATCH LIST ──────────────── */}
        <section
          className="rounded-[20px] border p-4 space-y-3 shadow-sm transition-all"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          data-purpose="input-channels"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span
                className="material-symbols-outlined text-base"
                style={{ color: textSecondary }}
              >
                graphic_eq
              </span>
              <h2
                className="text-xs font-black tracking-wider uppercase"
                style={{ color: textPrimary }}
              >
                {riderTr?.inputPatchTitle || 'INPUT CHANNELS & PATCH LIST'}
              </h2>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-md"
              style={{
                backgroundColor: innerBg,
                color: textSecondary,
              }}
            >
              {patchList.length} {isSpanish ? 'Canales' : 'Channels'}
            </span>
          </div>

          {patchList.length > 0 ? (
            <div className="space-y-1.5">
              {patchList.map((ch, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl border flex items-center justify-between gap-2"
                  style={{
                    backgroundColor: innerBg,
                    borderColor: innerBorder,
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 border"
                      style={{
                        backgroundColor: isLight ? '#111827' : '#ffffff',
                        color: isLight ? '#ffffff' : '#111827',
                        borderColor: isLight ? '#111827' : '#ffffff',
                      }}
                    >
                      {ch.ch || idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: textPrimary }}>
                        {ch.source || (ch as any).name || `Input ${idx + 1}`}
                      </p>
                      <span
                        className="text-[10px] font-medium block"
                        style={{ color: textSecondary }}
                      >
                        {ch.transducer || (ch as any).mic || 'Dynamic Mic'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border"
                      style={{
                        backgroundColor: ch.phantom ? 'rgba(16, 185, 129, 0.12)' : innerBg,
                        borderColor: ch.phantom ? 'rgba(16, 185, 129, 0.25)' : innerBorder,
                        color: ch.phantom ? '#10b981' : textMuted,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: ch.phantom ? '#10b981' : textMuted }}
                      />
                      +48V
                    </span>

                    <span
                      className="text-[9.5px] font-semibold px-2 py-0.5 rounded border"
                      style={{
                        backgroundColor: innerBg,
                        borderColor: innerBorder,
                        color: textSecondary,
                      }}
                    >
                      {ch.notes || (ch as any).mix || 'Mix 1'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs py-3 text-center" style={{ color: textSecondary }}>
              {isSpanish
                ? 'No hay canales definidos. Añade instrumentos al escenario para generar la lista de entradas.'
                : 'No channels defined. Add instruments to the stage to generate the input patch list.'}
            </p>
          )}
        </section>

        {/* ── SECTION 7: BAND & CREW ROSTER ──────────────────────── */}
        <section
          className="rounded-[20px] border p-4 space-y-3 shadow-sm transition-all"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          data-purpose="band-crew-roster"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span
                className="material-symbols-outlined text-base"
                style={{ color: textSecondary }}
              >
                group
              </span>
              <h2
                className="text-xs font-black tracking-wider uppercase"
                style={{ color: textPrimary }}
              >
                {isSpanish ? 'PLANTILLA DE BANDA Y EQUIPO' : 'BAND & CREW ROSTER'}
              </h2>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-md"
              style={{
                backgroundColor: innerBg,
                color: textSecondary,
              }}
            >
              {members.length} {isSpanish ? 'Miembros' : 'Members'}
            </span>
          </div>

          {members.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="p-2.5 rounded-xl border flex items-center gap-2.5"
                  style={{
                    backgroundColor: innerBg,
                    borderColor: innerBorder,
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0"
                    style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
                  >
                    {m.name ? m.name.charAt(0).toUpperCase() : 'M'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: textPrimary }}>
                      {m.name}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: textSecondary }}>
                      {m.role || 'Performer'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs py-2 text-center" style={{ color: textSecondary }}>
              {isSpanish
                ? 'No hay integrantes añadidos aún. Configúralos en Montaje > Banda y Equipo.'
                : 'No band or crew members added yet. Configure in Setup > Band & Crew.'}
            </p>
          )}
        </section>

        {/* ── SECTION 8: GEAR INVENTORY & LOAD-IN SUMMARY ────────── */}
        <section
          className="rounded-[20px] border p-4 space-y-3 shadow-sm transition-all"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          data-purpose="gear-inventory"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span
                className="material-symbols-outlined text-base"
                style={{ color: textSecondary }}
              >
                inventory_2
              </span>
              <h2
                className="text-xs font-black tracking-wider uppercase"
                style={{ color: textPrimary }}
              >
                {isSpanish ? 'INVENTARIO Y CARGA DE EQUIPAMIENTO' : 'GEAR INVENTORY & LOAD-IN'}
              </h2>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-md"
              style={{
                backgroundColor: innerBg,
                color: textSecondary,
              }}
            >
              {gear.length} {isSpanish ? 'Elementos Listados' : 'Items Listed'}
            </span>
          </div>

          {gear.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {gear.slice(0, 6).map((g) => (
                <div
                  key={g.id}
                  className="py-2 px-2.5 rounded-lg flex items-center justify-between text-xs border"
                  style={{
                    backgroundColor: innerBg,
                    borderColor: innerBorder,
                  }}
                >
                  <span
                    className="font-medium truncate pr-2 text-xs"
                    style={{ color: textPrimary }}
                  >
                    {g.name}
                  </span>
                  <span
                    className="text-[9px] font-bold uppercase px-2 py-0.5 rounded shrink-0 border"
                    style={{
                      backgroundColor: g.packed
                        ? 'rgba(16, 185, 129, 0.12)'
                        : 'rgba(245, 158, 11, 0.12)',
                      borderColor: g.packed
                        ? 'rgba(16, 185, 129, 0.25)'
                        : 'rgba(245, 158, 11, 0.25)',
                      color: g.packed ? '#10b981' : '#f59e0b',
                    }}
                  >
                    {g.packed
                      ? isSpanish
                        ? 'empacado'
                        : 'packed'
                      : isSpanish
                        ? 'pendiente'
                        : 'pending'}
                  </span>
                </div>
              ))}
              {gear.length > 6 && (
                <span className="text-[10.5px] text-center pt-1" style={{ color: textSecondary }}>
                  {isSpanish
                    ? `+ ${gear.length - 6} elementos más en Inventario`
                    : `+ ${gear.length - 6} more gear items in Inventory`}
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs py-2 text-center" style={{ color: textSecondary }}>
              {isSpanish
                ? 'No hay elementos de equipamiento listados. Configúralos en Montaje > Equipamiento.'
                : 'No gear items listed in inventory. Configure in Setup > Gear.'}
            </p>
          )}
        </section>
      </div>
    </StageSetupDetailLayout>
  );
};

export default StageRiderView;
