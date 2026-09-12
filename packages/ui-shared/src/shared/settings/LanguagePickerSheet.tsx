import React from 'react';
import {
  useSettingsStore,
  settingsController,
  ACCENT_COLORS,
  resolveAccent,
  SpringPresets,
} from '@workspace/studio-core';
import { Dialog } from '../design-system/dialogs';
import { motion } from 'motion/react';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'zh', label: '中文' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
] as const;

export const AVAILABLE_LANGUAGES = new Set(['en', 'es']);

interface LanguagePickerSheetProps {
  open: boolean;
  onClose: () => void;
}

export function LanguagePickerSheet({ open, onClose }: LanguagePickerSheetProps) {
  const language = useSettingsStore((s) => s.settings.language);
  const accentColor = useSettingsStore((s) => s.settings.accentColor);
  const acc = resolveAccent(accentColor);
  const isSpanish = (language ?? 'en') === 'es';
  const title = isSpanish ? 'Seleccionar idioma' : 'Select Language';

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div
        data-testid="language-picker-sheet"
        style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 0' }}
      >
        {SUPPORTED_LANGUAGES.map(({ code, label }) => {
          const isSelected = (language ?? 'en') === code;
          const isAvailable = AVAILABLE_LANGUAGES.has(code);

          return (
            <motion.button
              key={code}
              data-unavailable={!isAvailable ? 'true' : undefined}
              disabled={!isAvailable}
              whileTap={isAvailable ? { scale: 0.98 } : undefined}
              whileHover={isAvailable ? { scale: 1.008 } : undefined}
              transition={SpringPresets.soft}
              onClick={() => {
                if (!isAvailable) return;
                settingsController.updateSettings({ language: code as any });
                onClose();
              }}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 14,
                border: isSelected
                  ? `1px solid ${acc.from}40`
                  : '1px solid rgba(255, 255, 255, 0.05)',
                background: isSelected
                  ? `linear-gradient(135deg, ${acc.from}20, ${acc.to}10)`
                  : 'rgba(255, 255, 255, 0.02)',
                color: isSelected ? 'var(--c-text-primary)' : 'var(--c-text-secondary)',
                cursor: isAvailable ? 'pointer' : 'not-allowed',
                opacity: isAvailable ? 1 : 0.45,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: isSelected
                  ? `0 4px 12px ${acc.from}15, inset 0 1px 1px rgba(255, 255, 255, 0.15)`
                  : 'none',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--type-body-font, var(--studio-font-body))',
                  fontSize: 14,
                  fontWeight: isSelected ? 800 : 600,
                  letterSpacing: isSelected ? '-0.01em' : '0',
                }}
              >
                {label}
              </span>
              {isSelected && (
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: acc.from,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: `0 2px 6px ${acc.from}50`,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 16, lineHeight: 1 }}
                  >
                    check
                  </span>
                </div>
              )}
              {!isAvailable && (
                <span
                  style={{
                    fontFamily: 'var(--type-caption-font, var(--studio-font-body))',
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 9999,
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: 'var(--c-text-secondary)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {isSpanish ? 'Próximamente' : 'Coming soon'}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </Dialog>
  );
}
