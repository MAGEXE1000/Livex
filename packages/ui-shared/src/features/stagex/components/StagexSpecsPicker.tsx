import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { useT, useSettingsStore } from '@workspace/livex-core';

export type SpecsPickerType = 'performer' | 'channel' | 'source' | 'destination';

export interface SpecsPickerOption {
  id: string;
  value: string;
  label: string;
  detail?: string;
  icon?: string;
  color?: string;
  disabled?: boolean;
  badge?: string;
}

export const CANONICAL_SOURCES: Array<{ id: string; label: string; desc: string; type: string }> = [
  { id: 'SL01', label: 'SL01', desc: 'XLR-M Stage Left 01', type: 'xlr' },
  { id: 'SL02', label: 'SL02', desc: 'XLR-M Stage Left 02', type: 'xlr' },
  { id: 'SL03', label: 'SL03', desc: 'XLR-M Stage Left 03', type: 'xlr' },
  { id: 'SL04', label: 'SL04', desc: 'XLR-M Stage Left 04', type: 'xlr' },
  { id: 'SR01', label: 'SR01', desc: 'XLR-M Stage Right 01', type: 'xlr' },
  { id: 'SR02', label: 'SR02', desc: 'XLR-M Stage Right 02', type: 'xlr' },
  { id: 'SR03', label: 'SR03', desc: 'XLR-M Stage Right 03', type: 'xlr' },
  { id: 'WRA', label: 'WRA', desc: 'Wireless Rack A (RF)', type: 'wireless' },
  { id: 'WRB', label: 'WRB', desc: 'Wireless Rack B (RF)', type: 'wireless' },
  { id: 'DNT1', label: 'DNT1', desc: 'Dante Primary 01 (Cat6)', type: 'dante' },
  { id: 'DNT2', label: 'DNT2', desc: 'Dante Primary 02 (Cat6)', type: 'dante' },
  { id: 'DI', label: 'DI', desc: 'Direct Inject Box (DI)', type: 'di' },
];

export const CANONICAL_DESTINATIONS: Array<{
  id: string;
  label: string;
  desc: string;
  type: string;
}> = [
  { id: 'FOH', label: 'FOH', desc: 'Front of House (Main PA)', type: 'pa' },
  { id: 'MON 1', label: 'MON 1', desc: 'Stage Wedge (Downstage Center)', type: 'wedge' },
  { id: 'MON 2', label: 'MON 2', desc: 'Stage Wedge (Stage Left)', type: 'wedge' },
  { id: 'MON 3', label: 'MON 3', desc: 'Stage Wedge (Stage Right)', type: 'wedge' },
  { id: 'MON 4', label: 'MON 4', desc: 'Stage Wedge (Upstage / Drums)', type: 'wedge' },
  { id: 'IEM 1', label: 'IEM 1', desc: 'Wireless Stereo In-Ear Mix 1', type: 'iem' },
  { id: 'IEM 2', label: 'IEM 2', desc: 'Wireless Stereo In-Ear Mix 2', type: 'iem' },
  { id: 'IEM 3', label: 'IEM 3', desc: 'Wireless Stereo In-Ear Mix 3', type: 'iem' },
  { id: 'IEM 4', label: 'IEM 4', desc: 'Wireless Stereo In-Ear Mix 4', type: 'iem' },
  { id: 'BROADCAST', label: 'BROADCAST', desc: 'Live Stream / Broadcast Feed', type: 'aux' },
  { id: 'RECORDING', label: 'RECORDING', desc: 'Multi-Track DAW Recording', type: 'aux' },
];

// ─────────────────────────────────────────────────────────────────────────────
// SpecsSelectorControl
// ─────────────────────────────────────────────────────────────────────────────
export interface SpecsSelectorControlProps {
  label: string;
  value: string;
  displayValue?: string;
  placeholder?: string;
  icon?: string;
  testId: string;
  secondaryTestId?: string;
  onClick: () => void;
  isLight: boolean;
  layoutId?: string;
  isActive?: boolean;
}

export const SpecsSelectorControl: React.FC<SpecsSelectorControlProps> = ({
  label,
  value,
  displayValue,
  placeholder = '— None —',
  icon,
  testId,
  secondaryTestId,
  onClick,
  isLight,
  layoutId,
  isActive = false,
}) => {
  const hasValue = Boolean(value && value.trim());
  const text = displayValue || value;

  return (
    <div className="flex flex-col gap-1">
      <label
        className="text-[9px] font-bold uppercase tracking-wider select-none"
        style={{ color: isLight ? '#71717a' : '#a1a1aa' }}
      >
        {label}
      </label>
      <motion.button
        type="button"
        layoutId={layoutId}
        data-testid={testId}
        {...(secondaryTestId ? { 'data-secondary-testid': secondaryTestId } : {})}
        onClick={onClick}
        className="w-full px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center justify-between gap-1.5 transition-all text-left cursor-pointer active:scale-[0.98] outline-none"
        style={{
          background: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)',
          border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
          color: isLight ? '#09090b' : '#ffffff',
          height: '32px',
          visibility: isActive ? 'hidden' : 'visible',
          pointerEvents: isActive ? 'none' : 'auto',
        }}
        title={`Select ${label}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {icon && (
            <span
              className="material-symbols-outlined text-[14px] flex-shrink-0"
              style={{ color: isLight ? '#71717a' : '#a1a1aa' }}
            >
              {icon}
            </span>
          )}
          <span
            className={`truncate flex-1 ${hasValue ? 'font-semibold' : 'opacity-40 font-normal italic'}`}
          >
            {hasValue ? text : placeholder}
          </span>
        </div>
        <span
          className="material-symbols-outlined text-[15px] opacity-40 flex-shrink-0"
          style={{ color: isLight ? '#71717a' : '#a1a1aa' }}
        >
          unfold_more
        </span>
      </motion.button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// StagexSpecsPicker
// ─────────────────────────────────────────────────────────────────────────────
export interface StagexSpecsPickerProps {
  type: SpecsPickerType;
  currentValue: string;
  options: SpecsPickerOption[];
  onSelect: (value: string) => void;
  onBack: () => void;
  isLight: boolean;
  isAmoled: boolean;
}

export const StagexSpecsPicker: React.FC<StagexSpecsPickerProps> = ({
  type,
  currentValue,
  options,
  onSelect,
  onBack,
  isLight,
  isAmoled: _isAmoled,
}) => {
  const t = useT();
  const tr = t as any;
  const language = useSettingsStore((s) => s.settings.language) ?? 'en';
  const isSpanish = language === 'es';

  const [searchQuery, setSearchQuery] = useState('');
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customVal, setCustomVal] = useState('');
  const customInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isCustomOpen && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [isCustomOpen]);

  const titleMap: Record<SpecsPickerType, { title: string; icon: string; customLabel: string }> = {
    performer: {
      title: tr.stagex?.picker?.selectPerformer || 'Select Performer',
      icon: 'person',
      customLabel: tr.stagex?.picker?.customPerformer || 'Custom Performer',
    },
    channel: {
      title: tr.stagex?.picker?.selectChannel || 'Select Channel',
      icon: 'tune',
      customLabel: tr.stagex?.picker?.customChannel || 'Custom Channel',
    },
    source: {
      title: tr.stagex?.picker?.selectSource || 'Select Source',
      icon: 'cable',
      customLabel: tr.stagex?.picker?.customSource || 'Custom Source',
    },
    destination: {
      title: tr.stagex?.picker?.selectDestination || 'Select Destination',
      icon: 'volume_up',
      customLabel: tr.stagex?.picker?.customDestination || 'Custom Destination',
    },
  };

  const meta = titleMap[type];

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.detail && opt.detail.toLowerCase().includes(q)) ||
        opt.value.toLowerCase().includes(q)
    );
  }, [options, searchQuery]);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customVal.trim();
    if (trimmed) {
      onSelect(trimmed);
      setIsCustomOpen(false);
      setCustomVal('');
    }
  };

  const normalizedCurrent = (currentValue || '').trim().toLowerCase();

  return (
    <div
      data-testid="stagex-specs-picker"
      className="flex flex-col w-full animate-in fade-in duration-150"
      style={{
        maxHeight: '340px',
      }}
    >
      {/* Picker Header */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            data-testid="specs-picker-back"
            onClick={onBack}
            className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition-all flex-shrink-0"
            style={{
              background: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
              color: isLight ? '#18181b' : '#ffffff',
            }}
            aria-label={isSpanish ? 'Volver a especificaciones' : 'Back to Specs'}
            title={isSpanish ? 'Volver' : 'Back'}
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          </button>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="material-symbols-outlined text-[16px] text-pink-400 flex-shrink-0">
              {meta.icon}
            </span>
            <span
              className="text-[13px] font-bold truncate"
              style={{ color: isLight ? '#09090b' : '#ffffff' }}
            >
              {meta.title}
            </span>
          </div>
        </div>

        <button
          type="button"
          data-testid="specs-picker-close"
          onClick={onBack}
          className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition-all flex-shrink-0"
          style={{
            background: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
            color: isLight ? '#71717a' : '#a1a1aa',
          }}
          aria-label={isSpanish ? 'Cerrar' : 'Close'}
          title={isSpanish ? 'Listo' : 'Done'}
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>

      {/* Quick Search Bar (shown when > 5 options) */}
      {options.length > 5 && !isCustomOpen && (
        <div className="pt-2 pb-1.5 flex-shrink-0">
          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-xl"
            style={{
              background: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)',
              border: isLight
                ? '1px solid rgba(0, 0, 0, 0.08)'
                : '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <span
              className="material-symbols-outlined text-[14px] opacity-40 flex-shrink-0"
              style={{ color: isLight ? '#71717a' : '#a1a1aa' }}
            >
              search
            </span>
            <input
              type="text"
              data-testid="specs-picker-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                tr.stagex?.picker?.searchFilter ||
                (isSpanish ? 'Buscar o filtrar...' : `Filter ${type}s...`)
              }
              className="w-full text-[11px] font-medium bg-transparent outline-none"
              style={{ color: isLight ? '#09090b' : '#ffffff' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[14px] opacity-40 hover:opacity-80 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Options Scroll Area */}
      <div
        data-testid="specs-picker-options-list"
        className="overflow-y-auto py-1 space-y-1 flex-1 pr-0.5"
        style={{
          maxHeight: '220px',
          scrollbarWidth: 'thin',
        }}
      >
        {filteredOptions.length > 0 ? (
          filteredOptions.map((opt) => {
            const optNormalized = (opt.value || '').trim().toLowerCase();
            const isSelected =
              opt.value === currentValue ||
              (optNormalized === normalizedCurrent && normalizedCurrent !== '');

            return (
              <button
                key={opt.id || opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={opt.disabled}
                data-testid={`specs-option-${opt.value || 'unassigned'}`}
                data-selected={isSelected ? 'true' : 'false'}
                onClick={() => {
                  if (!opt.disabled) {
                    onSelect(opt.value);
                  }
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all ${
                  opt.disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'cursor-pointer active:scale-[0.99]'
                }`}
                style={{
                  background: isSelected
                    ? 'rgba(236, 72, 153, 0.16)'
                    : isLight
                      ? 'transparent'
                      : 'transparent',
                  border: isSelected
                    ? '1px solid rgba(236, 72, 153, 0.35)'
                    : '1px solid transparent',
                }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Avatar / Icon */}
                  {opt.color ? (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white shadow-sm"
                      style={{ background: opt.color }}
                    >
                      {opt.label.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <div
                      className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 text-zinc-400"
                      style={{
                        background: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {opt.icon || meta.icon}
                      </span>
                    </div>
                  )}

                  {/* Label & Detail */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[11.5px] font-bold truncate leading-tight"
                        style={{
                          color: isSelected ? '#ec4899' : isLight ? '#09090b' : '#ffffff',
                        }}
                      >
                        {opt.label}
                      </span>
                      {opt.badge && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-500/20 text-zinc-400">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    {opt.detail && (
                      <p
                        className="text-[9.5px] truncate leading-tight"
                        style={{
                          color: isSelected
                            ? 'rgba(236, 72, 153, 0.8)'
                            : isLight
                              ? '#71717a'
                              : '#a1a1aa',
                        }}
                      >
                        {opt.detail}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Side Indicator (Checkmark or Disabled tag) */}
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  {opt.disabled && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      {isSpanish ? 'En uso' : 'In Use'}
                    </span>
                  )}
                  {isSelected && (
                    <span
                      data-testid="specs-option-check"
                      className="material-symbols-outlined text-[16px] text-pink-400 font-bold"
                    >
                      check
                    </span>
                  )}
                </div>
              </button>
            );
          })
        ) : (
          <div className="py-4 text-center text-[11px] text-zinc-500">
            {isSpanish ? 'No se encontraron opciones coincidentes.' : 'No matching options found.'}
          </div>
        )}
      </div>

      {/* Custom Value Entry Area */}
      <div className="pt-2 border-t border-white/5 flex-shrink-0">
        {isCustomOpen ? (
          <form onSubmit={handleCustomSubmit} className="flex items-center gap-1.5">
            <input
              ref={customInputRef}
              type="text"
              data-testid="specs-picker-custom-input"
              value={customVal}
              onChange={(e) => setCustomVal(e.target.value)}
              placeholder={
                isSpanish
                  ? `Ingresar ${meta.customLabel.toLowerCase()}...`
                  : `Enter custom ${type}...`
              }
              className="flex-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold outline-none"
              style={{
                background: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)',
                border: '1px solid #ec4899',
                color: isLight ? '#09090b' : '#ffffff',
                height: '30px',
              }}
            />
            <button
              type="submit"
              data-testid="specs-picker-custom-submit"
              disabled={!customVal.trim()}
              className="h-[30px] px-2.5 rounded-xl text-[10.5px] font-bold bg-pink-500 text-white cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">check</span>
              <span>{tr.stagex?.picker?.save || (isSpanish ? 'Aplicar' : 'Apply')}</span>
            </button>
            <button
              type="button"
              data-testid="specs-picker-custom-cancel"
              onClick={() => {
                setIsCustomOpen(false);
                setCustomVal('');
              }}
              className="h-[30px] px-2 rounded-xl text-[10.5px] font-semibold cursor-pointer active:scale-95"
              style={{
                background: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                color: isLight ? '#71717a' : '#a1a1aa',
              }}
            >
              {tr.stagex?.picker?.cancel || (isSpanish ? 'Cancelar' : 'Cancel')}
            </button>
          </form>
        ) : (
          <button
            type="button"
            data-testid="specs-picker-custom-btn"
            onClick={() => {
              setIsCustomOpen(true);
              setCustomVal(currentValue || '');
            }}
            className="w-full py-1 text-[10px] font-bold uppercase tracking-wider text-pink-400 hover:text-pink-300 flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[13px]">add</span>
            <span>+ {meta.customLabel}...</span>
          </button>
        )}
      </div>
    </div>
  );
};
