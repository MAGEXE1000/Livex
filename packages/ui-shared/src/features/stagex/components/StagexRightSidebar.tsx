import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useT, useSettingsStore, resolveAccent } from '@workspace/livex-core';
import { useStagexStore } from '../state/useStagexStore';
import {
  STAGEX_LIBRARY,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  STAGEX_ICON_MAP,
  localizeElementName,
} from '../constants';
import { CANONICAL_SOURCES, CANONICAL_DESTINATIONS } from './StagexSpecsPicker';
import { StageLibraryItem } from '../types';

export type RightSidebarTab = 'elements' | 'specs';

export interface StagexRightSidebarProps {
  isLight: boolean;
  isAmoled: boolean;
  accent: { from: string; to: string };
  isExpanded: boolean;
  isPinned: boolean;
  onTogglePin: () => void;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onAnimationComplete: () => void;
  handleAddElement: (item: StageLibraryItem) => void;
  customElements: StageLibraryItem[];
  selectedElement: any | null;
  onUpdateElement: (updates: Record<string, any>) => void;
  onDuplicateElement: () => void;
  onDeleteElement: () => void;
  onToggleLock: () => void;
  onTogglePinElement: () => void;
  onSavePreset: () => void;
  bandMembers: any[];
  onDeselectElement?: () => void;
  activeTab: RightSidebarTab;
  setActiveTab: (tab: RightSidebarTab) => void;
  onSearchFocusChange?: (focused: boolean) => void;
}

const ELEMENT_CATEGORIES = [
  { id: 'all', label: 'All', labelEs: 'Todo', icon: 'apps' },
  { id: 'mics', label: 'Mics', labelEs: 'Mics', icon: 'mic' },
  { id: 'drums', label: 'Drums', labelEs: 'Batería', icon: 'album' },
  { id: 'inst', label: 'Instruments', labelEs: 'Instrumentos', icon: 'piano' },
  { id: 'amps', label: 'Amps', labelEs: 'Amplis', icon: 'speaker' },
  { id: 'mon', label: 'Monitors', labelEs: 'Monitores', icon: 'surround_sound' },
  { id: 'util', label: 'DI & Gear', labelEs: 'DI y Equipos', icon: 'settings_input_component' },
  { id: 'people', label: 'People', labelEs: 'Gente', icon: 'person' },
  { id: 'presets', label: 'Presets', labelEs: 'Presets', icon: 'bookmark' },
  { id: 'custom', label: 'Custom', labelEs: 'Personalizado', icon: 'palette' },
] as const;

export const StagexRightSidebar: React.FC<StagexRightSidebarProps> = ({
  isLight,
  isAmoled,
  accent,
  isExpanded,
  isPinned,
  onTogglePin,
  onClose,
  onMouseEnter,
  onMouseLeave,
  onAnimationComplete,
  handleAddElement,
  customElements,
  selectedElement,
  onUpdateElement,
  onDuplicateElement,
  onDeleteElement,
  onToggleLock,
  onTogglePinElement,
  onSavePreset,
  bandMembers,
  onDeselectElement,
  activeTab,
  setActiveTab,
  onSearchFocusChange,
}) => {
  const t = useT();
  const tr = t as any;
  const language = useSettingsStore((s) => s.settings.language) ?? 'en';
  const isSpanish = language === 'es';

  // Elements search & category filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Specs state
  const preferences = useStagexStore((s) => s.preferences);
  const riderChannels = useStagexStore((s) => s.riderChannels);
  const riderMixes = useStagexStore((s) => s.riderMixes);
  const riderNeeds = useStagexStore((s) => s.riderNeeds);
  const elements = useStagexStore((s) => s.elements);
  const scenes = useStagexStore((s) => s.scenes);
  const currentSceneIdx = useStagexStore((s) => s.currentSceneIdx);
  const projectName = useStagexStore((s) => s.projectName);

  // Search dictionary pre-computation for instant filtering
  const searchDictionary = useMemo(() => {
    const dict: { item: StageLibraryItem; category: string; searchStr: string }[] = [];
    Object.entries(STAGEX_LIBRARY).forEach(([catKey, catItems]) => {
      catItems.forEach((item) => {
        dict.push({
          item,
          category: catKey,
          searchStr: `${item.name} ${item.type || ''} ${catKey}`.toLowerCase(),
        });
      });
    });
    return dict;
  }, []);

  const customDictionary = useMemo(() => {
    return customElements.map((item) => ({
      item,
      category: 'custom',
      searchStr: `${item.name} ${item.type || ''} custom`.toLowerCase(),
    }));
  }, [customElements]);

  // Filtered elements based on category and search
  const filteredElements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let pool = [...searchDictionary, ...customDictionary];

    if (selectedCategory !== 'all') {
      pool = pool.filter((entry) => entry.category === selectedCategory);
    }

    if (!q) {
      return pool.map((e) => e.item);
    }

    return pool
      .filter((entry) => entry.searchStr.includes(q))
      .map((e) => e.item);
  }, [searchQuery, selectedCategory, searchDictionary, customDictionary]);

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    onSearchFocusChange?.(true);
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
    onSearchFocusChange?.(false);
  };

  const renderItemIcon = (item: StageLibraryItem) => {
    if (item.isCustom) {
      if (item.imageData) {
        return (
          <img
            src={item.imageData}
            style={{ width: '22px', height: '22px', objectFit: 'contain' }}
            alt=""
          />
        );
      }
      return <span style={{ fontSize: '20px', lineHeight: 1 }}>{item.emoji || '🎵'}</span>;
    }
    const svgPath = STAGEX_ICON_MAP[item.icon as keyof typeof STAGEX_ICON_MAP] || item.icon;
    if (svgPath) {
      const isRaster =
        svgPath.endsWith('.png') || svgPath.endsWith('.webp') || svgPath.endsWith('.svg');
      const filterStyle = isRaster
        ? undefined
        : isLight
          ? 'opacity(0.75)'
          : 'invert(1) opacity(0.85)';
      return (
        <img
          src={svgPath}
          style={{ width: '22px', height: '22px', objectFit: 'contain', filter: filterStyle }}
          alt=""
        />
      );
    }
    return (
      <span
        className="material-symbols-outlined"
        style={{ fontSize: '22px', color: isLight ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.75)' }}
      >
        {item.icon || 'widgets'}
      </span>
    );
  };

  const currentScene = scenes?.[currentSceneIdx] || scenes?.[0];
  const stageUnitsLabel = preferences?.stageUnits === 'feet' ? 'ft' : 'm';
  const stageDimString = `${preferences?.stageWidth || 12}${stageUnitsLabel} × ${preferences?.stageDepth || 8}${stageUnitsLabel}`;

  return (
    <motion.div
      initial={false}
      animate={{ width: isExpanded ? 320 : 48 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onAnimationComplete={onAnimationComplete}
      className="flex flex-col h-full flex-shrink-0 box-border overflow-hidden select-none relative z-10"
      style={{
        borderLeft: isLight
          ? '1px solid rgba(0, 0, 0, 0.08)'
          : isAmoled
            ? '1px solid rgba(255, 255, 255, 0.10)'
            : '1px solid rgba(255, 255, 255, 0.08)',
        background: isLight
          ? 'rgba(255, 255, 255, 0.82)'
          : isAmoled
            ? 'rgba(8, 8, 10, 0.92)'
            : 'rgba(18, 18, 22, 0.82)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: isLight
          ? '-4px 0 24px rgba(0, 0, 0, 0.04)'
          : '-4px 0 28px rgba(0, 0, 0, 0.40)',
        willChange: 'width',
      }}
    >
      <div
        style={{
          width: 320,
          minWidth: 320,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            /* ── Collapsed Vertical Icon Rail ────────────────────────────── */
            <motion.div
              key="collapsed-rail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="w-12 h-full flex flex-col items-center pt-3 pb-3 gap-3 cursor-pointer"
            >
              {/* Elements Tab Icon */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('elements');
                  onMouseEnter();
                }}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all relative outline-none border-none cursor-pointer active:scale-95"
                style={{
                  background:
                    activeTab === 'elements'
                      ? isLight
                        ? 'rgba(0, 0, 0, 0.08)'
                        : 'rgba(255, 255, 255, 0.12)'
                      : isLight
                        ? 'rgba(0, 0, 0, 0.03)'
                        : 'rgba(255, 255, 255, 0.05)',
                  color: activeTab === 'elements' ? accent.from : isLight ? '#4b5563' : '#9ca3af',
                }}
                title={isSpanish ? 'Elementos de Escenario' : 'Stage Elements'}
              >
                <span className="material-symbols-outlined text-[20px]">widgets</span>
              </button>

              {/* Specs Tab Icon */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('specs');
                  onMouseEnter();
                }}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all relative outline-none border-none cursor-pointer active:scale-95"
                style={{
                  background:
                    activeTab === 'specs'
                      ? isLight
                        ? 'rgba(0, 0, 0, 0.08)'
                        : 'rgba(255, 255, 255, 0.12)'
                      : isLight
                        ? 'rgba(0, 0, 0, 0.03)'
                        : 'rgba(255, 255, 255, 0.05)',
                  color: activeTab === 'specs' ? accent.from : isLight ? '#4b5563' : '#9ca3af',
                }}
                title={isSpanish ? 'Especificaciones Técnicas' : 'Stage & Element Specs'}
              >
                <span className="material-symbols-outlined text-[20px]">tune</span>
                {selectedElement && (
                  <span
                    className="absolute top-1 right-1 w-2 h-2 rounded-full ring-1"
                    style={{
                      background: selectedElement.color || accent.from,
                      borderColor: isLight ? '#fff' : '#000',
                    }}
                  />
                )}
              </button>

              {/* Vertical orientation text indicator */}
              <div
                className="text-[9px] font-extrabold uppercase tracking-widest opacity-40 select-none mt-2"
                style={{
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed',
                  letterSpacing: '0.14em',
                  color: isLight ? '#000' : '#fff',
                }}
              >
                {activeTab === 'elements'
                  ? isSpanish
                    ? 'ELEMENTOS'
                    : 'ELEMENTS'
                  : isSpanish
                    ? 'ESPECIFICACIONES'
                    : 'SPECS'}
              </div>
            </motion.div>
          ) : (
            /* ── Expanded Full Sidebar Panel ────────────────────────────── */
            <motion.div
              key="expanded-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full flex flex-col overflow-hidden"
            >
              {/* ── Top Header with Tab Switcher & Window Actions ─────────── */}
              <div
                className="flex items-center justify-between px-3 py-2.5 border-b"
                style={{
                  borderColor: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)',
                }}
              >
                {/* Segmented Switcher (Elements ↔ Specs) */}
                <div
                  className="flex items-center p-0.5 rounded-lg text-xs font-semibold"
                  style={{
                    background: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <button
                    onClick={() => setActiveTab('elements')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer border-none outline-none"
                    style={{
                      background:
                        activeTab === 'elements'
                          ? isLight
                            ? '#ffffff'
                            : 'rgba(255, 255, 255, 0.15)'
                          : 'transparent',
                      color:
                        activeTab === 'elements'
                          ? accent.from
                          : isLight
                            ? 'rgba(0,0,0,0.6)'
                            : 'rgba(255,255,255,0.6)',
                      boxShadow:
                        activeTab === 'elements' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    <span className="material-symbols-outlined text-[15px]">widgets</span>
                    {isSpanish ? 'Elementos' : 'Elements'}
                  </button>

                  <button
                    onClick={() => setActiveTab('specs')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer border-none outline-none relative"
                    style={{
                      background:
                        activeTab === 'specs'
                          ? isLight
                            ? '#ffffff'
                            : 'rgba(255, 255, 255, 0.15)'
                          : 'transparent',
                      color:
                        activeTab === 'specs'
                          ? accent.from
                          : isLight
                            ? 'rgba(0,0,0,0.6)'
                            : 'rgba(255,255,255,0.6)',
                      boxShadow: activeTab === 'specs' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    <span className="material-symbols-outlined text-[15px]">tune</span>
                    {isSpanish ? 'Specs' : 'Specs'}
                    {selectedElement && (
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: selectedElement.color || accent.from }}
                      />
                    )}
                  </button>
                </div>

                {/* Pin & Collapse buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={onTogglePin}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer border-none outline-none"
                    style={{
                      background: isPinned
                        ? isLight
                          ? 'rgba(0,0,0,0.08)'
                          : 'rgba(255,255,255,0.12)'
                        : 'transparent',
                      color: isPinned ? accent.from : isLight ? '#71717a' : '#a1a1aa',
                    }}
                    title={
                      isPinned
                        ? isSpanish
                          ? 'Desfijar panel lateral'
                          : 'Unpin sidebar'
                        : isSpanish
                          ? 'Fijar panel abierto'
                          : 'Pin sidebar open'
                    }
                  >
                    <span
                      className="material-symbols-outlined text-[17px]"
                      style={{
                        transform: isPinned ? 'rotate(-45deg)' : 'none',
                        transition: 'transform 150ms ease',
                      }}
                    >
                      push_pin
                    </span>
                  </button>

                  <button
                    onClick={onClose}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer border-none outline-none hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: isLight ? '#71717a' : '#a1a1aa' }}
                    title={isSpanish ? 'Colapsar panel' : 'Collapse panel'}
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>

              {/* ── Content: Elements Tab ─────────────────────────────────── */}
              {activeTab === 'elements' && (
                <div className="flex-1 flex flex-col overflow-hidden p-3 gap-2.5">
                  {/* Search input with clear button */}
                  <div className="relative flex items-center w-full">
                    <span
                      className="material-symbols-outlined absolute left-2.5 text-[17px] pointer-events-none"
                      style={{ color: isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)' }}
                    >
                      search
                    </span>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={handleSearchFocus}
                      onBlur={handleSearchBlur}
                      placeholder={isSpanish ? 'Buscar elementos...' : 'Search elements...'}
                      className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border outline-none transition-all"
                      style={{
                        background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
                        borderColor: isSearchFocused
                          ? accent.from
                          : isLight
                            ? 'rgba(0,0,0,0.08)'
                            : 'rgba(255,255,255,0.08)',
                        color: isLight ? '#18181b' : '#f4f4f5',
                      }}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          searchInputRef.current?.focus();
                        }}
                        className="absolute right-2 text-xs flex items-center justify-center border-none bg-transparent cursor-pointer p-0.5"
                        style={{ color: isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)' }}
                        title="Clear search"
                      >
                        <span className="material-symbols-outlined text-[15px]">close</span>
                      </button>
                    )}
                  </div>

                  {/* Category Filter Chips */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar flex-shrink-0">
                    {ELEMENT_CATEGORIES.map((cat) => {
                      const isActive = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight whitespace-nowrap transition-all border-none outline-none cursor-pointer flex-shrink-0"
                          style={{
                            background: isActive
                              ? accent.from
                              : isLight
                                ? 'rgba(0,0,0,0.04)'
                                : 'rgba(255,255,255,0.06)',
                            color: isActive
                              ? '#ffffff'
                              : isLight
                                ? 'rgba(0,0,0,0.65)'
                                : 'rgba(255,255,255,0.65)',
                          }}
                        >
                          <span className="material-symbols-outlined text-[13px]">{cat.icon}</span>
                          {isSpanish ? cat.labelEs : cat.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Element Cards Grid */}
                  <div className="flex-1 overflow-y-auto pr-1">
                    {filteredElements.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                        <span
                          className="material-symbols-outlined text-3xl mb-1.5"
                          style={{ opacity: 0.35 }}
                        >
                          search_off
                        </span>
                        <p
                          className="text-xs font-semibold"
                          style={{ color: isLight ? '#71717a' : '#a1a1aa' }}
                        >
                          {isSpanish
                            ? 'No se encontraron elementos'
                            : 'No matching stage elements'}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 pb-4">
                        {filteredElements.map((item) => {
                          const displayName = localizeElementName(
                            item.name,
                            item.type,
                            isSpanish ? 'es' : 'en'
                          );
                          return (
                            <button
                              key={item.id || item.name}
                              onClick={() => handleAddElement(item)}
                              className="group relative flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer outline-none hover:scale-[1.02] active:scale-[0.98]"
                              title={isSpanish ? `Añadir ${displayName}` : `Add ${item.name}`}
                              style={{
                                background: isLight
                                  ? 'rgba(0,0,0,0.02)'
                                  : 'rgba(255,255,255,0.03)',
                                borderColor: isLight
                                  ? 'rgba(0,0,0,0.06)'
                                  : 'rgba(255,255,255,0.06)',
                                minHeight: '82px',
                              }}
                            >
                              <div className="h-7 flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110">
                                {renderItemIcon(item)}
                              </div>
                              <span
                                className="text-[10px] font-bold truncate w-full px-1 uppercase tracking-tight"
                                style={{
                                  color: isLight ? '#27272a' : '#e4e4e7',
                                }}
                              >
                                {displayName}
                              </span>
                              <span
                                className="text-[8px] font-semibold opacity-40 uppercase tracking-widest mt-0.5"
                                style={{ color: isLight ? '#71717a' : '#a1a1aa' }}
                              >
                                {item.type || 'item'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Content: Specs Tab ────────────────────────────────────── */}
              {activeTab === 'specs' && (
                <div className="flex-1 flex flex-col overflow-y-auto p-3 gap-3">
                  {selectedElement ? (
                    /* Context A: Selected Element Specs */
                    <div className="flex flex-col gap-3">
                      {/* Selected Element Header */}
                      <div
                        className="p-3 rounded-xl border flex flex-col gap-2"
                        style={{
                          background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)',
                          borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ background: selectedElement.color || accent.from }}
                            />
                            <h3
                              className="text-xs font-bold truncate max-w-[170px]"
                              style={{ color: isLight ? '#18181b' : '#f4f4f5' }}
                            >
                              {selectedElement.label || selectedElement.name}
                            </h3>
                          </div>
                          <span
                            className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded"
                            style={{
                              background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)',
                              color: isLight ? '#52525b' : '#d4d4d8',
                            }}
                          >
                            {selectedElement.type || 'Element'}
                          </span>
                        </div>

                        {/* Quick Actions Row */}
                        <div
                          className="flex items-center justify-between pt-1 border-t"
                          style={{
                            borderColor: isLight
                              ? 'rgba(0,0,0,0.05)'
                              : 'rgba(255,255,255,0.05)',
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <button
                              onClick={onDuplicateElement}
                              className="w-7 h-7 rounded-lg flex items-center justify-center border-none cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                              style={{ color: isLight ? '#52525b' : '#d4d4d8' }}
                              title={isSpanish ? 'Duplicar elemento' : 'Duplicate element'}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                content_copy
                              </span>
                            </button>
                            <button
                              onClick={onToggleLock}
                              className="w-7 h-7 rounded-lg flex items-center justify-center border-none cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                              style={{
                                color: selectedElement.locked
                                  ? '#ef4444'
                                  : isLight
                                    ? '#52525b'
                                    : '#d4d4d8',
                              }}
                              title={
                                selectedElement.locked
                                  ? isSpanish
                                    ? 'Desbloquear'
                                    : 'Unlock'
                                  : isSpanish
                                    ? 'Bloquear posición'
                                    : 'Lock position'
                              }
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {selectedElement.locked ? 'lock' : 'lock_open'}
                              </span>
                            </button>
                            <button
                              onClick={onTogglePinElement}
                              className="w-7 h-7 rounded-lg flex items-center justify-center border-none cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                              style={{
                                color: selectedElement.pinned
                                  ? accent.from
                                  : isLight
                                    ? '#52525b'
                                    : '#d4d4d8',
                              }}
                              title={
                                selectedElement.pinned
                                  ? isSpanish
                                    ? 'Desfijar'
                                    : 'Unpin'
                                  : isSpanish
                                    ? 'Fijar en escena'
                                    : 'Pin to scene'
                              }
                            >
                              <span className="material-symbols-outlined text-[16px]">push_pin</span>
                            </button>
                            <button
                              onClick={onSavePreset}
                              className="w-7 h-7 rounded-lg flex items-center justify-center border-none cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                              style={{ color: isLight ? '#52525b' : '#d4d4d8' }}
                              title={isSpanish ? 'Guardar como preset' : 'Save as preset'}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                bookmark_add
                              </span>
                            </button>
                          </div>

                          <button
                            onClick={onDeleteElement}
                            className="w-7 h-7 rounded-lg flex items-center justify-center border-none cursor-pointer text-red-500 hover:bg-red-500/10"
                            title={isSpanish ? 'Eliminar elemento' : 'Delete element'}
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>

                      {/* Element Label Name Input */}
                      <div className="flex flex-col gap-1">
                        <label
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: isLight ? '#71717a' : '#a1a1aa' }}
                        >
                          {isSpanish ? 'Nombre / Etiqueta' : 'Element Label'}
                        </label>
                        <input
                          type="text"
                          value={selectedElement.label || selectedElement.name || ''}
                          onChange={(e) => onUpdateElement({ label: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl border outline-none font-semibold"
                          style={{
                            background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.04)',
                            borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
                            color: isLight ? '#18181b' : '#f4f4f5',
                          }}
                        />
                      </div>

                      {/* Assigned Musician / Performer */}
                      <div className="flex flex-col gap-1">
                        <label
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: isLight ? '#71717a' : '#a1a1aa' }}
                        >
                          {isSpanish ? 'Músico / Intérprete' : 'Performer Assignment'}
                        </label>
                        <select
                          value={selectedElement.performer || ''}
                          onChange={(e) => onUpdateElement({ performer: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl border outline-none font-semibold cursor-pointer"
                          style={{
                            background: isLight ? '#ffffff' : '#18181b',
                            borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                            color: isLight ? '#18181b' : '#f4f4f5',
                          }}
                        >
                          <option value="">{isSpanish ? '— Sin Asignar —' : '— Unassigned —'}</option>
                          {bandMembers.map((bm: any) => (
                            <option key={bm.id || bm.name} value={bm.name}>
                              {bm.name} {bm.role ? `(${bm.role})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Patch Channel */}
                      <div className="flex flex-col gap-1">
                        <label
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: isLight ? '#71717a' : '#a1a1aa' }}
                        >
                          {isSpanish ? 'Canal de Audio (Rider Patch)' : 'Audio Patch Channel'}
                        </label>
                        <select
                          value={selectedElement.channel || ''}
                          onChange={(e) => onUpdateElement({ channel: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl border outline-none font-semibold cursor-pointer"
                          style={{
                            background: isLight ? '#ffffff' : '#18181b',
                            borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                            color: isLight ? '#18181b' : '#f4f4f5',
                          }}
                        >
                          <option value="">{isSpanish ? '— Sin Canal —' : '— No Channel —'}</option>
                          {riderChannels.map((rc) => (
                            <option key={rc.ch} value={String(rc.ch)}>
                              CH {rc.ch}: {rc.source} {rc.mic ? `(${rc.mic})` : ''}
                            </option>
                          ))}
                          {Array.from({ length: 32 }).map((_, i) => (
                            <option key={`ch-${i + 1}`} value={String(i + 1)}>
                              CH {i + 1}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Source Patch Selection */}
                      <div className="flex flex-col gap-1">
                        <label
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: isLight ? '#71717a' : '#a1a1aa' }}
                        >
                          {isSpanish ? 'Fuente / Snake Entrada' : 'Source Connection'}
                        </label>
                        <select
                          value={selectedElement.source || ''}
                          onChange={(e) => onUpdateElement({ source: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl border outline-none font-semibold cursor-pointer"
                          style={{
                            background: isLight ? '#ffffff' : '#18181b',
                            borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                            color: isLight ? '#18181b' : '#f4f4f5',
                          }}
                        >
                          <option value="">{isSpanish ? '— Ninguno —' : '— None —'}</option>
                          {CANONICAL_SOURCES.map((src) => (
                            <option key={src.id} value={src.id}>
                              {src.label} — {src.desc}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Destination Mix Selection */}
                      <div className="flex flex-col gap-1">
                        <label
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: isLight ? '#71717a' : '#a1a1aa' }}
                        >
                          {isSpanish ? 'Destino de Monitoreo / PA' : 'Output Destination'}
                        </label>
                        <select
                          value={selectedElement.destination || ''}
                          onChange={(e) => onUpdateElement({ destination: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl border outline-none font-semibold cursor-pointer"
                          style={{
                            background: isLight ? '#ffffff' : '#18181b',
                            borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                            color: isLight ? '#18181b' : '#f4f4f5',
                          }}
                        >
                          <option value="">{isSpanish ? '— Ninguno —' : '— None —'}</option>
                          {CANONICAL_DESTINATIONS.map((dst) => (
                            <option key={dst.id} value={dst.id}>
                              {dst.label} — {dst.desc}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Mic Model & Phantom Power Row */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <label
                            className="text-[9px] font-bold uppercase tracking-wider"
                            style={{ color: isLight ? '#71717a' : '#a1a1aa' }}
                          >
                            {isSpanish ? 'Micrófono' : 'Microphone'}
                          </label>
                          <input
                            type="text"
                            value={selectedElement.mic || ''}
                            onChange={(e) => onUpdateElement({ mic: e.target.value })}
                            placeholder="e.g. SM58, Beta 52"
                            className="w-full px-2 py-1.5 text-xs rounded-xl border outline-none"
                            style={{
                              background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.04)',
                              borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
                              color: isLight ? '#18181b' : '#f4f4f5',
                            }}
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label
                            className="text-[9px] font-bold uppercase tracking-wider"
                            style={{ color: isLight ? '#71717a' : '#a1a1aa' }}
                          >
                            +48V Phantom
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateElement({ phantom: !selectedElement.phantom })
                            }
                            className="w-full py-1.5 text-xs rounded-xl border font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all outline-none"
                            style={{
                              background: selectedElement.phantom
                                ? '#f59e0b'
                                : isLight
                                  ? 'rgba(0,0,0,0.02)'
                                  : 'rgba(255,255,255,0.04)',
                              borderColor: selectedElement.phantom
                                ? '#d97706'
                                : isLight
                                  ? 'rgba(0,0,0,0.08)'
                                  : 'rgba(255,255,255,0.08)',
                              color: selectedElement.phantom
                                ? '#ffffff'
                                : isLight
                                  ? '#71717a'
                                  : '#a1a1aa',
                            }}
                          >
                            <span className="material-symbols-outlined text-[14px]">bolt</span>
                            {selectedElement.phantom ? 'Active (+48V)' : 'Off'}
                          </button>
                        </div>
                      </div>

                      {/* Technical Notes */}
                      <div className="flex flex-col gap-1">
                        <label
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: isLight ? '#71717a' : '#a1a1aa' }}
                        >
                          {isSpanish ? 'Notas Técnicas' : 'Technical Notes'}
                        </label>
                        <textarea
                          rows={2}
                          value={selectedElement.notes || ''}
                          onChange={(e) => onUpdateElement({ notes: e.target.value })}
                          placeholder={
                            isSpanish
                              ? 'Detalles de soporte, cables, etc.'
                              : 'Boom stand, DI model, special routing...'
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl border outline-none resize-none font-normal"
                          style={{
                            background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.04)',
                            borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
                            color: isLight ? '#18181b' : '#f4f4f5',
                          }}
                        />
                      </div>

                      {/* Button to return to Stage Specs overview */}
                      {onDeselectElement && (
                        <button
                          onClick={onDeselectElement}
                          className="w-full mt-1 py-1.5 text-[11px] font-bold rounded-xl border cursor-pointer transition-all outline-none"
                          style={{
                            background: 'transparent',
                            borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
                            color: isLight ? '#71717a' : '#a1a1aa',
                          }}
                        >
                          {isSpanish ? 'Ver Resumen General de Escenario' : 'View Stage Overview'}
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Context B: Stage Specifications Overview */
                    <div className="flex flex-col gap-3">
                      {/* Stage Summary Banner */}
                      <div
                        className="p-3 rounded-xl border flex flex-col gap-1"
                        style={{
                          background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)',
                          borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <h3
                            className="text-xs font-bold truncate max-w-[190px]"
                            style={{ color: isLight ? '#18181b' : '#f4f4f5' }}
                          >
                            {projectName || (isSpanish ? 'Plano de Escenario' : 'Stage Plot')}
                          </h3>
                          <span
                            className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded"
                            style={{ background: `${accent.from}22`, color: accent.from }}
                          >
                            {currentScene?.name || 'Scene 1'}
                          </span>
                        </div>
                        <p
                          className="text-[10px] m-0"
                          style={{ color: isLight ? '#71717a' : '#a1a1aa' }}
                        >
                          {isSpanish
                            ? 'Selecciona un elemento en el escenario para ver sus specs individuales.'
                            : 'Select any element on canvas to inspect its audio & channel specs.'}
                        </p>
                      </div>

                      {/* Stage Dimensions Card */}
                      <div
                        className="p-3 rounded-xl border flex flex-col gap-2"
                        style={{
                          background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)',
                          borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
                        }}
                      >
                        <h4
                          className="text-[9.5px] font-extrabold uppercase tracking-wider m-0 flex items-center gap-1.5"
                          style={{ color: isLight ? '#52525b' : '#d4d4d8' }}
                        >
                          <span className="material-symbols-outlined text-[15px]">straighten</span>
                          {isSpanish ? 'Dimensiones del Escenario' : 'Stage Dimensions'}
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div
                            className="p-2 rounded-lg"
                            style={{
                              background: isLight
                                ? 'rgba(0,0,0,0.03)'
                                : 'rgba(255,255,255,0.04)',
                            }}
                          >
                            <span
                              className="text-[9px] font-bold block opacity-60 uppercase tracking-wider"
                              style={{ color: isLight ? '#71717a' : '#a1a1aa' }}
                            >
                              {isSpanish ? 'Tamaño Total' : 'Total Area'}
                            </span>
                            <span
                              className="font-extrabold text-sm"
                              style={{ color: isLight ? '#18181b' : '#f4f4f5' }}
                            >
                              {stageDimString}
                            </span>
                          </div>
                          <div
                            className="p-2 rounded-lg"
                            style={{
                              background: isLight
                                ? 'rgba(0,0,0,0.03)'
                                : 'rgba(255,255,255,0.04)',
                            }}
                          >
                            <span
                              className="text-[9px] font-bold block opacity-60 uppercase tracking-wider"
                              style={{ color: isLight ? '#71717a' : '#a1a1aa' }}
                            >
                              {isSpanish ? 'Forma' : 'Geometry'}
                            </span>
                            <span
                              className="font-extrabold capitalize text-sm"
                              style={{ color: isLight ? '#18181b' : '#f4f4f5' }}
                            >
                              {preferences?.stageShape || 'Rectangular'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Equipment Counts Summary */}
                      <div
                        className="p-3 rounded-xl border flex flex-col gap-2"
                        style={{
                          background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)',
                          borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
                        }}
                      >
                        <h4
                          className="text-[9.5px] font-extrabold uppercase tracking-wider m-0 flex items-center gap-1.5"
                          style={{ color: isLight ? '#52525b' : '#d4d4d8' }}
                        >
                          <span className="material-symbols-outlined text-[15px]">inventory_2</span>
                          {isSpanish ? 'Elementos en Escena' : 'Stage Elements Placed'}
                        </h4>
                        <div className="grid grid-cols-3 gap-1.5 text-center">
                          <div
                            className="p-2 rounded-lg"
                            style={{
                              background: isLight
                                ? 'rgba(0,0,0,0.03)'
                                : 'rgba(255,255,255,0.04)',
                            }}
                          >
                            <span
                              className="text-base font-extrabold block"
                              style={{ color: accent.from }}
                            >
                              {elements?.length || 0}
                            </span>
                            <span
                              className="text-[8.5px] font-bold uppercase tracking-wider opacity-60"
                              style={{ color: isLight ? '#71717a' : '#a1a1aa' }}
                            >
                              {isSpanish ? 'Total' : 'Total'}
                            </span>
                          </div>
                          <div
                            className="p-2 rounded-lg"
                            style={{
                              background: isLight
                                ? 'rgba(0,0,0,0.03)'
                                : 'rgba(255,255,255,0.04)',
                            }}
                          >
                            <span
                              className="text-base font-extrabold block"
                              style={{ color: '#ec4899' }}
                            >
                              {elements?.filter(
                                (e) =>
                                  e.type === 'mic' ||
                                  e.type === 'instrument' ||
                                  e.type === 'drums'
                              ).length || 0}
                            </span>
                            <span
                              className="text-[8.5px] font-bold uppercase tracking-wider opacity-60"
                              style={{ color: isLight ? '#71717a' : '#a1a1aa' }}
                            >
                              {isSpanish ? 'Instrumentos' : 'Gear'}
                            </span>
                          </div>
                          <div
                            className="p-2 rounded-lg"
                            style={{
                              background: isLight
                                ? 'rgba(0,0,0,0.03)'
                                : 'rgba(255,255,255,0.04)',
                            }}
                          >
                            <span
                              className="text-base font-extrabold block"
                              style={{ color: '#10b981' }}
                            >
                              {elements?.filter(
                                (e) => e.type === 'monitor' || e.type === 'amp'
                              ).length || 0}
                            </span>
                            <span
                              className="text-[8.5px] font-bold uppercase tracking-wider opacity-60"
                              style={{ color: isLight ? '#71717a' : '#a1a1aa' }}
                            >
                              {isSpanish ? 'Monitores' : 'Monitors'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Technical Rider & Mixes Summary */}
                      <div
                        className="p-3 rounded-xl border flex flex-col gap-2"
                        style={{
                          background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)',
                          borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
                        }}
                      >
                        <h4
                          className="text-[9.5px] font-extrabold uppercase tracking-wider m-0 flex items-center gap-1.5"
                          style={{ color: isLight ? '#52525b' : '#d4d4d8' }}
                        >
                          <span className="material-symbols-outlined text-[15px]">speaker_group</span>
                          {isSpanish ? 'Rider y Canales de Audio' : 'Audio Patch & Mixes'}
                        </h4>
                        <div className="flex flex-col gap-1 text-xs">
                          <div className="flex items-center justify-between py-1">
                            <span style={{ color: isLight ? '#71717a' : '#a1a1aa' }}>
                              {isSpanish ? 'Canales de Entrada' : 'Patch Channels'}:
                            </span>
                            <span
                              className="font-bold"
                              style={{ color: isLight ? '#18181b' : '#f4f4f5' }}
                            >
                              {riderChannels?.length || 0} CH
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-1">
                            <span style={{ color: isLight ? '#71717a' : '#a1a1aa' }}>
                              {isSpanish ? 'Mezclas de Monitoreo' : 'Aux Monitor Mixes'}:
                            </span>
                            <span
                              className="font-bold"
                              style={{ color: isLight ? '#18181b' : '#f4f4f5' }}
                            >
                              {riderMixes?.length || 0} Mixes
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-1">
                            <span style={{ color: isLight ? '#71717a' : '#a1a1aa' }}>
                              {isSpanish ? 'Requerimientos Técnicos' : 'Technical Needs'}:
                            </span>
                            <span
                              className="font-bold"
                              style={{ color: isLight ? '#18181b' : '#f4f4f5' }}
                            >
                              {riderNeeds?.length || 0} Specs
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
