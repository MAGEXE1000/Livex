import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  useSettingsStore,
  ACCENT_PRESETS,
  DEFAULT_ACCENT_ID,
  resolveAccent,
  useT,
} from '@workspace/studio-core';
import { useHoverCapable } from '../../../lib/hooks/use-hover-capable';
import { useAppReducedMotion } from '../../../hooks/useAppReducedMotion';

// ── COLOR MATH HELPERS ──────────────────────────────────────
function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s;
  const hh = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0,
    g = 0,
    b = 0;
  if (hh < 1) {
    r = c;
    g = x;
    b = 0;
  } else if (hh < 2) {
    r = x;
    g = c;
    b = 0;
  } else if (hh < 3) {
    r = 0;
    g = c;
    b = x;
  } else if (hh < 4) {
    r = 0;
    g = x;
    b = c;
  } else if (hh < 5) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  const m = v - c;
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const v = max;
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, v };
}

function parseColorToHsv(str: string): { h: number; s: number; v: number } {
  if (!str) return { h: 215, s: 0.52, v: 1 };
  str = String(str).trim();
  if (str.startsWith('#')) {
    const raw = str.slice(1);
    if (raw.length === 3) {
      const r = parseInt(raw[0] + raw[0], 16);
      const g = parseInt(raw[1] + raw[1], 16);
      const b = parseInt(raw[2] + raw[2], 16);
      return rgbToHsv(r, g, b);
    }
    if (raw.length >= 6) {
      const r = parseInt(raw.slice(0, 2), 16);
      const g = parseInt(raw.slice(2, 4), 16);
      const b = parseInt(raw.slice(4, 6), 16);
      return rgbToHsv(r, g, b);
    }
  }
  return { h: 215, s: 0.52, v: 1 };
}

function hsvToHex(h: number, s: number, v: number): string {
  const rgb = hsvToRgb(h, s, v);
  const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * AccentColorPicker
 *
 * Premium, compact, accessible accent color picker for Settings -> Appearance.
 * Supports curated design-system presets, custom arbitrary color picker via native
 * platform input, and immediate live token propagation.
 */
export function AccentColorPicker() {
  const canHover = useHoverCapable();
  const prefersReduced = useAppReducedMotion();
  const currentAccent = useSettingsStore((s) => s.settings.accentColor || DEFAULT_ACCENT_ID);
  const theme = useSettingsStore((s) => s.settings.theme);
  const resolved = resolveAccent(currentAccent);
  const isLight = theme === 'light';
  const t = useT();

  const isCustomActive =
    resolved.id === 'custom' ||
    (!ACCENT_PRESETS.some((p) => p.id === currentAccent) && currentAccent.startsWith('#'));

  const [isPickerOpen, setIsPickerOpen] = useState(() => isCustomActive);
  const [hsv, setHsv] = useState(() => parseColorToHsv(resolved.to));
  const [hexInput, setHexInput] = useState(() => resolved.to);

  const satValRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const latestHsvRef = useRef(hsv);
  const rafIdRef = useRef<number | null>(null);

  // Sync external accent changes when picker is not actively being dragged
  useEffect(() => {
    const parsed = parseColorToHsv(resolved.to);
    setHsv(parsed);
    setHexInput(resolved.to);
    latestHsvRef.current = parsed;
  }, [resolved.to]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const handleSelectPreset = (presetId: string) => {
    useSettingsStore.getState().updateSettings({ accentColor: presetId });
    setIsPickerOpen(false);
  };

  const handleResetDefault = () => {
    useSettingsStore.getState().updateSettings({ accentColor: DEFAULT_ACCENT_ID });
    setIsPickerOpen(false);
  };

  const openPicker = () => {
    const initialHex = isCustomActive ? resolved.to : '#7AAFFF';
    const parsed = parseColorToHsv(initialHex);
    setHsv(parsed);
    setHexInput(initialHex);
    latestHsvRef.current = parsed;
    setIsPickerOpen(true);
  };

  const togglePicker = () => {
    if (!isPickerOpen) {
      openPicker();
    } else {
      setIsPickerOpen(false);
    }
  };

  const scheduleTransientUpdate = (next: Partial<typeof hsv>) => {
    const merged = { ...latestHsvRef.current, ...next };
    latestHsvRef.current = merged;

    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        const current = latestHsvRef.current;
        const hex = hsvToHex(current.h, current.s, current.v);
        setHsv(current);
        setHexInput(hex);
      });
    }
  };

  const commitColor = (finalHsv: typeof hsv) => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    const hex = hsvToHex(finalHsv.h, finalHsv.s, finalHsv.v);
    setHsv(finalHsv);
    setHexInput(hex);
    useSettingsStore.getState().updateSettings({ accentColor: hex });
  };

  // 2D Saturation / Value Drag
  const handleSatValPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = satValRef.current;
    if (!el) return;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {}

    // Cache element bounding rect once on pointerdown to eliminate layout reflow during move
    const cachedRect = el.getBoundingClientRect();
    if (cachedRect.width <= 0 || cachedRect.height <= 0) return;

    const updateFromCoord = (clientX: number, clientY: number) => {
      const x = Math.max(0, Math.min(cachedRect.width, clientX - cachedRect.left));
      const y = Math.max(0, Math.min(cachedRect.height, clientY - cachedRect.top));
      scheduleTransientUpdate({
        s: Math.max(0, Math.min(1, x / cachedRect.width)),
        v: Math.max(0, Math.min(1, 1 - y / cachedRect.height)),
      });
    };

    updateFromCoord(e.clientX, e.clientY);

    const onPointerMove = (ev: PointerEvent) => {
      updateFromCoord(ev.clientX, ev.clientY);
    };

    const onPointerUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      try {
        el.releasePointerCapture(ev.pointerId);
      } catch {}
      commitColor(latestHsvRef.current);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  // Hue Drag
  const handleHuePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = hueRef.current;
    if (!el) return;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {}

    // Cache element bounding rect once on pointerdown to eliminate layout reflow during move
    const cachedRect = el.getBoundingClientRect();
    if (cachedRect.width <= 0) return;

    const updateFromCoord = (clientX: number) => {
      const x = Math.max(0, Math.min(cachedRect.width, clientX - cachedRect.left));
      scheduleTransientUpdate({
        h: Math.max(0, Math.min(360, (x / cachedRect.width) * 360)),
      });
    };

    updateFromCoord(e.clientX);

    const onPointerMove = (ev: PointerEvent) => {
      updateFromCoord(ev.clientX);
    };

    const onPointerUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      try {
        el.releasePointerCapture(ev.pointerId);
      } catch {}
      commitColor(latestHsvRef.current);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInput(val);
    let clean = val.trim();
    if (!clean.startsWith('#')) clean = '#' + clean;
    if (clean.length === 4 || clean.length === 7) {
      const parsed = parseColorToHsv(clean);
      setHsv(parsed);
      latestHsvRef.current = parsed;
      useSettingsStore.getState().updateSettings({ accentColor: clean });
    }
  };

  return (
    <div
      style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Header Row with Active Color preview & Reset action */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${resolved.from}, ${resolved.to})`,
              boxShadow: `0 2px 10px ${resolved.soft}, inset 0 1px 1.5px rgba(255, 255, 255, 0.4)`,
              border: '1.5px solid rgba(255, 255, 255, 0.3)',
              flexShrink: 0,
            }}
          />
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 750,
                color: 'var(--c-text-primary)',
                fontFamily: 'var(--type-body-font, var(--studio-font-body))',
                letterSpacing: '-0.015em',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>
                {isCustomActive
                  ? 'Custom Accent'
                  : ACCENT_PRESETS.find((p) => p.id === currentAccent)?.label || 'Accent Color'}
              </span>
              {currentAccent !== DEFAULT_ACCENT_ID && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 6,
                    background: 'var(--studio-accent-soft)',
                    color: 'var(--studio-accent-from)',
                    border: '1px solid var(--studio-accent-border)',
                  }}
                >
                  Active
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: 'var(--font-section-label, 11.5px)',
                color: 'var(--c-text-secondary)',
                fontFamily: 'Inter, sans-serif',
                marginTop: 2,
              }}
            >
              Choose an accent highlight for buttons, tabs, and controls
            </div>
          </div>
        </div>

        {currentAccent !== DEFAULT_ACCENT_ID && (
          <motion.button
            whileTap={prefersReduced ? undefined : { scale: 0.94 }}
            whileHover={canHover && !prefersReduced ? { scale: 1.03 } : undefined}
            onClick={handleResetDefault}
            className="btn-smooth"
            style={{
              background: 'var(--app-surface-low)',
              border: '1px solid var(--c-border)',
              borderRadius: 8,
              padding: '5px 10px',
              color: 'var(--c-text-secondary)',
              fontSize: 'var(--font-section-label, 11px)',
              fontWeight: 650,
              fontFamily: 'Inter, sans-serif',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
              restart_alt
            </span>
            <span>Reset</span>
          </motion.button>
        )}
      </div>

      {/* Swatches Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(38px, 1fr))',
          gap: 10,
          alignItems: 'center',
          paddingTop: 4,
        }}
      >
        {ACCENT_PRESETS.map((preset) => {
          const isActive = currentAccent === preset.id;
          return (
            <motion.button
              key={preset.id}
              whileTap={prefersReduced ? undefined : { scale: 0.88 }}
              whileHover={canHover && !prefersReduced ? { scale: 1.12 } : undefined}
              onClick={() => handleSelectPreset(preset.id)}
              title={preset.label}
              className="btn-smooth"
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
                border: isActive
                  ? '2.5px solid var(--c-text-primary)'
                  : '2px solid rgba(255, 255, 255, 0.16)',
                boxShadow: isActive
                  ? `0 0 0 2px var(--app-surface), 0 4px 14px ${preset.to}66`
                  : '0 2px 6px rgba(0, 0, 0, 0.15)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                padding: 0,
                outline: 'none',
                transition: 'transform 180ms ease, box-shadow 180ms ease',
              }}
            >
              {isActive && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 25 }}
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 18,
                    color: '#ffffff',
                    fontWeight: 900,
                    textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  check
                </motion.span>
              )}
            </motion.button>
          );
        })}

        {/* Custom Color Swatch Trigger */}
        <div style={{ position: 'relative', width: 38, height: 38 }}>
          <motion.button
            whileTap={prefersReduced ? undefined : { scale: 0.88 }}
            whileHover={canHover && !prefersReduced ? { scale: 1.12 } : undefined}
            onClick={togglePicker}
            title="Choose custom color"
            className="btn-smooth"
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: isCustomActive
                ? `linear-gradient(135deg, ${resolved.from}, ${resolved.to})`
                : 'conic-gradient(from 180deg at 50% 50%, #ff0000, #ff8800, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
              border: isCustomActive
                ? '2.5px solid var(--c-text-primary)'
                : '2px solid rgba(255, 255, 255, 0.25)',
              boxShadow: isCustomActive
                ? `0 0 0 2px var(--app-surface), 0 4px 14px ${resolved.to}66`
                : '0 2px 6px rgba(0, 0, 0, 0.15)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              outline: 'none',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 17,
                color: isCustomActive ? resolved.contrast : '#ffffff',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)',
              }}
            >
              {isCustomActive ? 'check' : 'colorize'}
            </span>
          </motion.button>
        </div>
      </div>

      {/* Fluid Functionalism 2D Color Picker Inline Panel */}
      <AnimatePresence>
        {isPickerOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={prefersReduced ? { duration: 0 } : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              width: '100%',
              paddingTop: 12,
              borderTop: '1px solid var(--c-border)',
              marginTop: 4,
              boxSizing: 'border-box',
            }}
          >
            {/* Inline Subheader */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontFamily: 'var(--type-caption-font, var(--studio-font-body))',
                  fontSize: 'var(--font-section-label)',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  color: 'var(--studio-accent-from, #7aafff)',
                }}
              >
                Custom Palette & Hue
              </span>
              <button
                onClick={() => setIsPickerOpen(false)}
                className="btn-smooth"
                style={{
                  background: 'var(--app-surface-low, rgba(255, 255, 255, 0.05))',
                  border: '1px solid var(--c-border)',
                  borderRadius: 6,
                  color: 'var(--c-text-secondary)',
                  cursor: 'pointer',
                  padding: '2px 8px',
                  fontSize: 'var(--font-section-label)',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                  close
                </span>
                <span>Done</span>
              </button>
            </div>

            {/* 2D Saturation / Value Canvas */}
            <div
              ref={satValRef}
              onPointerDown={handleSatValPointerDown}
              style={{
                position: 'relative',
                width: '100%',
                height: 160,
                borderRadius: 14,
                overflow: 'hidden',
                cursor: 'crosshair',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                border: '1px solid var(--c-border)',
                background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${Math.round(hsv.h)}, 100%, 50%))`,
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: `${hsv.s * 100}%`,
                  top: `${(1 - hsv.v) * 100}%`,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: '2.5px solid #ffffff',
                  boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.7)',
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Controls: Hue Spectrum Track */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div
                ref={hueRef}
                onPointerDown={handleHuePointerDown}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: 16,
                  borderRadius: 9999,
                  background:
                    'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
                  cursor: 'pointer',
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  border: '1px solid var(--c-border)',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: `${(hsv.h / 360) * 100}%`,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: `hsl(${Math.round(hsv.h)}, 100%, 50%)`,
                    border: '2.5px solid #ffffff',
                    boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.6)',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Details Row: Preview + HEX Input */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div
                style={{
                  position: 'relative',
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: '1px solid var(--c-border)',
                  flexShrink: 0,
                  boxSizing: 'border-box',
                  background: hsvToHex(hsv.h, hsv.s, hsv.v),
                  boxShadow: `0 2px 8px ${hsvToHex(hsv.h, hsv.s, hsv.v)}44`,
                }}
              />

              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  value={hexInput}
                  onChange={handleHexChange}
                  maxLength={7}
                  spellCheck={false}
                  placeholder="#7AAFFF"
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 12px',
                    background: 'var(--app-surface-low, rgba(255, 255, 255, 0.04))',
                    border: '1px solid var(--c-border)',
                    borderRadius: 10,
                    fontFamily: 'var(--studio-font-mono)',
                    fontSize: 13,
                    fontWeight: 750,
                    color: 'var(--c-text-primary)',
                    textTransform: 'uppercase',
                    outline: 'none',
                    boxSizing: 'border-box',
                    letterSpacing: '0.05em',
                  }}
                />
              </div>
            </div>

            {/* Presets Chips */}
            <div
              style={{
                display: 'flex',
                gap: 7,
                flexWrap: 'wrap',
                alignItems: 'center',
                paddingTop: 2,
              }}
            >
              {[
                '#7AAFFF',
                '#FF7439',
                '#C5FFC9',
                '#FFD700',
                '#C8A2FF',
                '#FF8DD4',
                '#FF3B30',
                '#10B981',
                '#6366F1',
                '#EC4899',
              ].map((col) => (
                <button
                  key={col}
                  onClick={() => {
                    const parsed = parseColorToHsv(col);
                    setHsv(parsed);
                    setHexInput(col);
                    useSettingsStore.getState().updateSettings({ accentColor: col });
                  }}
                  className="btn-smooth"
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: col,
                    border: '1.5px solid rgba(255, 255, 255, 0.25)',
                    cursor: 'pointer',
                    padding: 0,
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
                    outline: 'none',
                  }}
                  title={col}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
