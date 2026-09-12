import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useStagexStore, type GearItem } from '../../state/useStagexStore';
import { StageSetupDetailLayout } from './StageSetupDetailLayout';
import { useSettingsStore, useT, useShallow } from '@workspace/studio-core';

interface StageGearViewProps {
  onBack: () => void;
  isLight?: boolean;
  isAmoled?: boolean;
}

const DEFAULT_GEAR_CATEGORIES = [
  { key: 'mics' as const, icon: 'mic', color: '#38bdf8' },
  { key: 'inst' as const, icon: 'piano', color: '#a855f7' },
  { key: 'amps' as const, icon: 'speaker', color: '#f97316' },
  { key: 'mon' as const, icon: 'headphones', color: '#10b981' },
  { key: 'util' as const, icon: 'power', color: '#facc15' },
  { key: 'cables' as const, icon: 'cable', color: '#94a3b8' },
  { key: 'misc' as const, icon: 'category', color: '#ec4899' },
];

export const StageGearView: React.FC<StageGearViewProps> = ({
  onBack,
  isLight: isLightProp,
  isAmoled: isAmoledProp,
}) => {
  const t = useT();
  const tr = t as any;
  const gearTr = tr.stagex?.setup?.gear;
  const settings = useSettingsStore((s) => s.settings);
  const isSpanish = (settings.language ?? 'en') === 'es';

  const GEAR_CATEGORIES = useMemo(
    () => [
      {
        key: 'mics' as const,
        label: gearTr?.catMics || 'Microphones',
        icon: 'mic',
        color: '#38bdf8',
      },
      {
        key: 'inst' as const,
        label: gearTr?.catInst || 'Instruments',
        icon: 'piano',
        color: '#a855f7',
      },
      {
        key: 'amps' as const,
        label: gearTr?.catAmps || 'Amplifiers & Cabs',
        icon: 'speaker',
        color: '#f97316',
      },
      {
        key: 'mon' as const,
        label: gearTr?.catMon || 'Monitoring & IEM',
        icon: 'headphones',
        color: '#10b981',
      },
      {
        key: 'util' as const,
        label: gearTr?.catUtil || 'Utilities & Power',
        icon: 'power',
        color: '#facc15',
      },
      {
        key: 'cables' as const,
        label: gearTr?.catCables || 'Cabling & Snakes',
        icon: 'cable',
        color: '#94a3b8',
      },
      {
        key: 'misc' as const,
        label: gearTr?.catMisc || 'Miscellaneous',
        icon: 'category',
        color: '#ec4899',
      },
    ],
    [gearTr]
  );
  const { gear, addGearItem, updateGearItem, removeGearItem, preferences } = useStagexStore(
    useShallow((s) => ({
      gear: s.gear,
      addGearItem: s.addGearItem,
      updateGearItem: s.updateGearItem,
      removeGearItem: s.removeGearItem,
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

  const prefersReducedMotion = useReducedMotion();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<GearItem['category']>('mics');
  const [model, setModel] = useState('');
  const [qty, setQty] = useState('1');
  const [notes, setNotes] = useState('');

  const totalUnits = useMemo(() => {
    return gear.reduce((acc, g) => acc + (g.qty || 1), 0);
  }, [gear]);

  const packedCount = useMemo(() => {
    return gear.filter((g) => g.packed).length;
  }, [gear]);

  const remainingCount = useMemo(() => {
    return Math.max(0, gear.length - packedCount);
  }, [gear, packedCount]);

  const filteredGear = useMemo(() => {
    let list = gear;
    if (selectedCat !== 'all') {
      list = list.filter((g) => g.category === selectedCat);
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.model && g.model.toLowerCase().includes(q)) ||
        (g.notes && g.notes.toLowerCase().includes(q)) ||
        g.category.toLowerCase().includes(q)
    );
  }, [gear, selectedCat, search]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addGearItem({
      name: name.trim(),
      category,
      model: model.trim() || undefined,
      qty: qty ? parseInt(qty, 10) : 1,
      notes: notes.trim() || undefined,
      packed: false,
    });
    setName('');
    setModel('');
    setQty('1');
    setNotes('');
    setIsAdding(false);
  };

  const togglePacked = (item: GearItem) => {
    updateGearItem(item.id, { packed: !item.packed });
  };

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
      title={gearTr?.title || tr.stagex?.gearTitle || 'Gear Inventory'}
      onBack={onBack}
      isLight={isLight}
      isAmoled={isAmoled}
      toolbarActions={
        <button
          type="button"
          onClick={() => setIsAdding((prev) => !prev)}
          className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 hover:opacity-90"
          style={{
            backgroundColor: isLight ? '#000000' : '#ffffff',
            color: isLight ? '#ffffff' : '#000000',
          }}
          title={isAdding ? gearTr?.cancel || 'Cancel' : gearTr?.addItem || 'Add Item'}
          aria-label={isAdding ? gearTr?.cancel || 'Cancel' : gearTr?.addItem || 'Add Item'}
          data-testid="btn-toggle-add-gear"
        >
          <svg
            className="w-5 h-5 transition-transform duration-200"
            style={{ transform: isAdding ? 'rotate(45deg)' : 'rotate(0deg)' }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      }
    >
      <div className="space-y-4 pb-8">
        {/* Inline Add Gear Form */}
        <AnimatePresence>
          {isAdding && (
            <motion.form
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onSubmit={handleAdd}
              className="p-5 rounded-[24px] border shadow-soft flex flex-col gap-3.5"
              style={{
                backgroundColor: cardBg,
                borderColor: cardBorder,
              }}
              data-testid="form-add-gear"
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: textSecondary }}
                >
                  Add Gear Item
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
                  style={{ color: textSecondary }}
                  aria-label="Close"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Item Name (e.g. Shure SM58) *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none transition-colors"
                  style={{
                    backgroundColor: innerBg,
                    borderColor: innerBorder,
                    color: textPrimary,
                  }}
                  autoFocus
                  required
                  data-testid="input-gear-name"
                />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as GearItem['category'])}
                  className="px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none transition-colors cursor-pointer"
                  style={{
                    backgroundColor: innerBg,
                    borderColor: innerBorder,
                    color: textPrimary,
                  }}
                  data-testid="select-gear-category"
                >
                  {GEAR_CATEGORIES.map((c) => (
                    <option
                      key={c.key}
                      value={c.key}
                      style={{
                        backgroundColor: isLight ? '#ffffff' : '#18181b',
                        color: isLight ? '#000000' : '#ffffff',
                      }}
                    >
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Model / Spec (optional)"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none transition-colors"
                  style={{
                    backgroundColor: innerBg,
                    borderColor: innerBorder,
                    color: textPrimary,
                  }}
                  data-testid="input-gear-model"
                />
                <input
                  type="number"
                  min="1"
                  placeholder="Quantity (default 1)"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none transition-colors"
                  style={{
                    backgroundColor: innerBg,
                    borderColor: innerBorder,
                    color: textPrimary,
                  }}
                  data-testid="input-gear-qty"
                />
                <input
                  type="text"
                  placeholder="Notes / Assignee (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none transition-colors"
                  style={{
                    backgroundColor: innerBg,
                    borderColor: innerBorder,
                    color: textPrimary,
                  }}
                  data-testid="input-gear-notes"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer opacity-70 hover:opacity-100"
                  style={{ color: textSecondary }}
                >
                  {gearTr?.cancel || 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer shadow-sm active:scale-95"
                  style={{
                    backgroundColor: isLight ? '#000000' : '#ffffff',
                    color: isLight ? '#ffffff' : '#000000',
                  }}
                  data-testid="btn-submit-gear"
                >
                  {gearTr?.formAddButton || 'Add to Inventory'}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {gear.length === 0 ? (
          /* ── SECTION 1A: EMPTY STATE CARD (STITCH PARITY) ────────── */
          <section
            className="rounded-[28px] border p-8 flex flex-col items-center justify-center text-center shadow-soft min-h-[300px]"
            style={{
              backgroundColor: cardBg,
              borderColor: cardBorder,
            }}
            data-purpose="empty-state"
            data-testid="gear-empty-state"
          >
            {/* Box Container Icon (Monochrome) */}
            <div
              className="w-20 h-20 mb-5 flex items-center justify-center rounded-2xl border"
              style={{
                backgroundColor: innerBg,
                borderColor: innerBorder,
              }}
            >
              <svg
                className="w-10 h-10"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.6"
                viewBox="0 0 24 24"
                style={{ color: isLight ? '#9ca3af' : '#71717a' }}
              >
                <rect height="4" rx="1.5" width="18" x="3" y="4" />
                <path d="M4 8v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
                <path d="M10 12h4" />
              </svg>
            </div>
            {/* Empty State Headings */}
            <h2
              className="text-sm font-bold tracking-[0.08em] uppercase mb-2"
              style={{ color: textPrimary }}
            >
              {gearTr?.emptyTitle || (isSpanish ? 'No hay equipo registrado' : 'No Gear Items Yet')}
            </h2>
            <p
              className="text-xs sm:text-[13px] max-w-[240px] leading-relaxed font-normal"
              style={{ color: textSecondary }}
            >
              {gearTr?.emptyDesc ||
                (isSpanish
                  ? 'Pulsa "Añadir Equipo" para comenzar tu lista de carga'
                  : 'Click "Add Gear Item" to start your load-in list')}
            </p>
          </section>
        ) : (
          /* ── SECTION 1B: POPULATED GEAR LIST (STITCH PARITY) ──────── */
          <div
            className="p-5 rounded-[28px] border shadow-soft"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            data-testid="gear-populated-container"
          >
            {/* Search Input */}
            <div className="relative mb-3.5">
              <svg
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 select-none pointer-events-none"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: textSecondary }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search gear by name, model or spec..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs border focus:outline-none transition-colors"
                style={{
                  backgroundColor: innerBg,
                  borderColor: innerBorder,
                  color: textPrimary,
                }}
                data-testid="input-search-gear"
              />
            </div>

            {/* Category Filter Pills */}
            <div
              className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-2"
              style={{ scrollbarWidth: 'none' }}
            >
              <button
                type="button"
                onClick={() => setSelectedCat('all')}
                className="px-3 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95 cursor-pointer shrink-0"
                style={{
                  backgroundColor:
                    selectedCat === 'all' ? (isLight ? '#000000' : '#ffffff') : innerBg,
                  color: selectedCat === 'all' ? (isLight ? '#ffffff' : '#000000') : textSecondary,
                  border: `1px solid ${selectedCat === 'all' ? 'transparent' : innerBorder}`,
                }}
                data-testid="pill-filter-all"
              >
                All ({gear.length})
              </button>
              {GEAR_CATEGORIES.map((cat) => {
                const count = gear.filter((g) => g.category === cat.key).length;
                const isCatActive = selectedCat === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCat(cat.key)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95 cursor-pointer shrink-0"
                    style={{
                      backgroundColor: isCatActive ? (isLight ? '#000000' : '#ffffff') : innerBg,
                      color: isCatActive ? (isLight ? '#ffffff' : '#000000') : textSecondary,
                      border: `1px solid ${isCatActive ? 'transparent' : innerBorder}`,
                    }}
                    data-testid={`pill-filter-${cat.key}`}
                  >
                    <span>{cat.label}</span>
                    <span className="opacity-75 text-[10px]">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Categorized List */}
            {filteredGear.length === 0 ? (
              <div className="py-8 text-center" style={{ color: textSecondary }}>
                <p className="text-xs">No gear items found matching &quot;{search}&quot;</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {GEAR_CATEGORIES.map((cat) => {
                  const itemsInCat = filteredGear.filter((g) => g.category === cat.key);
                  if (itemsInCat.length === 0) return null;

                  return (
                    <div key={cat.key} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 px-1">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <h4
                          className="text-[11px] font-bold uppercase tracking-wider"
                          style={{ color: textSecondary }}
                        >
                          {cat.label} ({itemsInCat.length})
                        </h4>
                      </div>

                      <div className="flex flex-col gap-2">
                        <AnimatePresence mode="popLayout">
                          {itemsInCat.map((item) => (
                            <motion.div
                              key={item.id}
                              layout={!prefersReducedMotion}
                              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={
                                prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }
                              }
                              transition={{ duration: 0.2 }}
                              className="flex items-center justify-between p-3.5 rounded-[16px] border transition-all"
                              style={{
                                backgroundColor: innerBg,
                                borderColor: innerBorder,
                                opacity: item.packed ? 0.65 : 1,
                              }}
                              data-testid={`gear-item-${item.id}`}
                            >
                              <div className="flex items-center gap-3 min-w-0 pr-2">
                                {/* Packed Checkbox Toggle */}
                                <button
                                  type="button"
                                  onClick={() => togglePacked(item)}
                                  className="w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0"
                                  style={{
                                    backgroundColor: item.packed ? '#10b981' : 'transparent',
                                    borderColor: item.packed ? '#10b981' : innerBorder,
                                  }}
                                  title={item.packed ? 'Mark Unpacked' : 'Mark Packed'}
                                  data-testid={`btn-toggle-pack-${item.id}`}
                                >
                                  {item.packed && (
                                    <>
                                      <svg
                                        className="w-3.5 h-3.5 text-white stroke-[3]"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                      <span className="sr-only">check</span>
                                    </>
                                  )}
                                </button>

                                <span
                                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0"
                                  style={{
                                    backgroundColor: isLight
                                      ? 'rgba(0, 0, 0, 0.05)'
                                      : 'rgba(255, 255, 255, 0.08)',
                                    color: textPrimary,
                                  }}
                                  data-testid={`gear-qty-${item.id}`}
                                >
                                  {item.qty || 1}×
                                </span>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p
                                      className={`text-xs font-bold truncate ${
                                        item.packed ? 'line-through opacity-70' : ''
                                      }`}
                                      style={{ color: textPrimary }}
                                    >
                                      {item.name}
                                    </p>
                                    {item.model && (
                                      <span
                                        className="text-[11px] truncate opacity-75"
                                        style={{ color: textSecondary }}
                                      >
                                        ({item.model})
                                      </span>
                                    )}
                                  </div>
                                  {item.notes && (
                                    <p
                                      className="text-[10.5px] truncate mt-0.5"
                                      style={{ color: textMuted }}
                                    >
                                      {item.notes}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => removeGearItem(item.id)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 cursor-pointer opacity-60 hover:opacity-100"
                                style={{ color: textSecondary }}
                                title="Delete Gear Item"
                                data-testid={`btn-delete-gear-${item.id}`}
                              >
                                <svg
                                  className="w-4 h-4"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── SECTION 2: 2x2 STATISTICS GRID (STITCH PARITY) ─────────── */}
        <section className="grid grid-cols-2 gap-3.5 w-full" data-purpose="metrics-grid">
          {/* Stat Card 1: TOTAL ITEMS */}
          <article
            className="rounded-2xl border p-4 shadow-soft flex flex-col justify-between h-[104px] transition-all"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            data-testid="stat-total-items"
          >
            <header
              className="text-[11px] font-bold tracking-wider uppercase"
              style={{ color: textSecondary }}
            >
              {gearTr?.statTotalUnits || (isSpanish ? 'Artículos Totales' : 'Total Items')}
            </header>
            <div className="flex items-end justify-between mt-auto">
              <span
                className="text-2xl font-extrabold leading-none"
                style={{ color: textPrimary, fontFamily: 'var(--studio-font-display)' }}
              >
                {gear.length}
              </span>
              <svg
                className="w-5 h-5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
                style={{ color: isLight ? '#1e293b' : '#ffffff' }}
              >
                <rect height="4" rx="1" width="18" x="3" y="4" />
                <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
                <path d="M10 12h4" />
              </svg>
            </div>
          </article>

          {/* Stat Card 2: PACKED */}
          <article
            className="rounded-2xl border p-4 shadow-soft flex flex-col justify-between h-[104px] transition-all"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            data-testid="stat-packed-count"
          >
            <header
              className="text-[11px] font-bold tracking-wider uppercase"
              style={{ color: textSecondary }}
            >
              {gearTr?.statusPacked || (isSpanish ? 'Empacado' : 'Packed')}
            </header>
            <div className="flex items-end justify-between mt-auto">
              <span
                className="text-2xl font-extrabold leading-none"
                style={{
                  color: packedCount > 0 ? '#10b981' : textPrimary,
                  fontFamily: 'var(--studio-font-display)',
                }}
              >
                {packedCount}
              </span>
              <svg
                className="w-5 h-5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                style={{ color: isLight ? '#1e293b' : '#ffffff' }}
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
          </article>

          {/* Stat Card 3: REMAINING */}
          <article
            className="rounded-2xl border p-4 shadow-soft flex flex-col justify-between h-[104px] transition-all"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            data-testid="stat-remaining-count"
          >
            <header
              className="text-[11px] font-bold tracking-wider uppercase"
              style={{ color: textSecondary }}
            >
              {gearTr?.statRemaining || (isSpanish ? 'Restante' : 'Remaining')}
            </header>
            <div className="flex items-end justify-between mt-auto">
              <span
                className="text-2xl font-extrabold leading-none"
                style={{ color: textPrimary, fontFamily: 'var(--studio-font-display)' }}
              >
                {remainingCount}
              </span>
              <svg
                className="w-5 h-5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
                style={{ color: isLight ? '#1e293b' : '#ffffff' }}
              >
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect height="4" rx="1" width="6" x="9" y="3" />
                <path d="M12 12v3l2 1" />
              </svg>
            </div>
          </article>

          {/* Stat Card 4: TOTAL UNITS */}
          <article
            className="rounded-2xl border p-4 shadow-soft flex flex-col justify-between h-[104px] transition-all"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            data-testid="stat-total-units"
          >
            <header
              className="text-[11px] font-bold tracking-wider uppercase"
              style={{ color: textSecondary }}
            >
              {gearTr?.statTotalUnits || (isSpanish ? 'Unidades Totales' : 'Total Units')}
            </header>
            <div className="flex items-end justify-between mt-auto">
              <span
                className="text-2xl font-extrabold leading-none"
                style={{ color: textPrimary, fontFamily: 'var(--studio-font-display)' }}
              >
                {totalUnits}
              </span>
              <svg
                className="w-5 h-5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
                style={{ color: isLight ? '#1e293b' : '#ffffff' }}
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
          </article>
        </section>
      </div>
    </StageSetupDetailLayout>
  );
};
