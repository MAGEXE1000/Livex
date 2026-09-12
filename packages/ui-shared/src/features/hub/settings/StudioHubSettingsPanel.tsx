import { ThemeToggle } from '../../../components/motion/theme-toggle';
import React from 'react';
import {
  useSettingsStore,
  settingsController,
  useT,
  resolveAccent,
} from '@workspace/studio-core';
import { motion } from 'motion/react';
import { useHoverCapable } from '../../../lib/hooks/use-hover-capable';
import { useAppReducedMotion } from '../../../hooks/useAppReducedMotion';
import { StudioPageTransition } from '../../../components/StudioPageTransition';
import {
  SettingSection,
  SettingRow,
  SegmentedControl,
  Toggle,
} from '../../../shared/settings/SettingControls';
import { SettingsContentContainer } from '../../../shared/layout/StudioLayoutSystem';

import {
  SUPPORTED_LANGUAGES,
  AVAILABLE_LANGUAGES,
} from '../../../shared/settings/LanguagePickerSheet';
import { MorphingActionSurface } from '../../../shared/design-system/MorphingActionSurface';
import { Button } from '../../../shared/design-system/buttons';
import { AccentColorPicker } from './AccentColorPicker';

/**
 * StudioHubSettingsPanel — Completely Rebuilt Settings & Appearance Reference Implementation
 *
 * Design System Specifications:
 * - Cleaner, elevated visual hierarchy matching Drumex/Groovex Preferences.
 * - Reuses existing segmented controls, cards, spacing tokens, and typography.
 * - Premium theme switcher animation via motion wrapper.
 */
export default function StudioHubSettingsPanel() {
  const canHover = useHoverCapable();
  const prefersReduced = useAppReducedMotion();
  const settings = useSettingsStore((s) => s.settings);
  const t = useT();
  const acc = resolveAccent(settings.accentColor);
  const isSpanish = (settings.language ?? 'en') === 'es';

  return (
    <>
      <SettingsContentContainer
        style={{
          paddingTop: 'var(--space-4)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 96px)',
          color: 'var(--c-text-primary)',
        }}
      >
        {/* Theme Section */}
        <SettingSection title={t.settings.rows.appearanceTheme || 'Appearance Theme'}>
          <SettingRow
            label={t.settings.rows.themeMode || 'Theme Mode'}
            desc={t.settings.rows.themeModeDesc || 'Switch between Light, Dark, and AMOLED themes'}
          >
            <ThemeToggle
              variant="circle-blur"
              start="bottom-up"
              className="w-10 h-10 rounded-full bg-[var(--c-surface-high)] border border-[var(--c-border)] text-[var(--c-text-primary)] hover:bg-[var(--c-surface-higher,var(--c-surface-high))] active:scale-95 transition-all shadow-sm flex items-center justify-center cursor-pointer"
              iconClassName="w-5 h-5"
            />
          </SettingRow>
        </SettingSection>

        {/* Accent Color Section */}
        <SettingSection title={t.settings.rows.accentColor || 'Accent Color'}>
          <AccentColorPicker />
        </SettingSection>

        {/* Interface Scaling Section */}
        <SettingSection title={t.settings.rows.interfaceScaling || 'Interface Scaling'}>
          <SettingRow
            label={t.settings.rows.displayDensity || 'Display Density'}
            desc={t.settings.rows.displayDensityDesc || 'Adjust screen layout density'}
          >
            <SegmentedControl
              value={settings.displayDensity || 'comfortable'}
              options={[
                { value: 'compact', label: t.settings.rows.densityCompact || 'Compact' },
                { value: 'comfortable', label: t.settings.rows.densityStandard || 'Standard' },
                { value: 'spacious', label: t.settings.rows.densitySpacious || 'Spacious' },
              ]}
              onChange={(v) => settingsController.updateSettings({ displayDensity: v })}
              layoutId="density-control"
            />
          </SettingRow>
          <SettingRow
            label={t.settings.rows.textSize || 'Text Size'}
            desc={t.settings.rows.textSizeDesc || 'Scale global typography'}
          >
            <SegmentedControl
              value={settings.fontSize || 'medium'}
              options={[
                { value: 'small', label: t.settings.rows.fontSizeSmall || 'Small' },
                { value: 'medium', label: t.settings.rows.fontSizeMedium || 'Medium' },
                { value: 'large', label: t.settings.rows.fontSizeLarge || 'Large' },
              ]}
              onChange={(v) => settingsController.updateSettings({ fontSize: v })}
              layoutId="font-size-control"
            />
          </SettingRow>
        </SettingSection>

        {/* Language Section */}
        <SettingSection title={t.settings.sections.language || 'Language'}>
          <SettingRow
            label={t.settings.rows.appLanguage || 'App Language'}
            desc={t.settings.rows.appLanguageDesc || 'Change the display language for Studio'}
          >
            <MorphingActionSurface
              title={isSpanish ? 'Seleccionar idioma' : 'Select Language'}
              subtitle={isSpanish ? 'Elige el idioma para la interfaz' : 'Choose display language'}
              accentColor={acc.from}
              testId="settings-language-picker-trigger"
              customTrigger={({ triggerProps }) => (
                <motion.button
                  {...triggerProps}
                  data-testid="settings-language-picker-trigger"
                  whileHover={canHover && !prefersReduced ? { scale: 1.02 } : undefined}
                  whileTap={prefersReduced ? undefined : { scale: 0.98 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 9999,
                    border: '1px solid var(--c-border)',
                    background: 'var(--app-surface-low)',
                    boxShadow: 'var(--shadow-pill)',
                    color: 'var(--c-text-primary)',
                    cursor: 'pointer',
                    fontFamily: 'var(--studio-font-display)',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  <span>
                    {SUPPORTED_LANGUAGES.find((l) => l.code === (settings.language ?? 'en'))?.label ||
                      'English'}
                  </span>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 16, color: 'var(--c-text-secondary)' }}
                  >
                    expand_more
                  </span>
                </motion.button>
              )}
              rows={SUPPORTED_LANGUAGES.map(({ code, label }) => {
                const isSelected = (settings.language ?? 'en') === code;
                const isAvailable = AVAILABLE_LANGUAGES.has(code);
                return {
                  id: code,
                  label,
                  sublabel: isAvailable ? undefined : (isSpanish ? 'Próximamente' : 'Coming soon'),
                  badge: isSelected ? (isSpanish ? 'Activo' : 'Active') : undefined,
                  active: isSelected,
                  disabled: !isAvailable,
                  onPress: () => {
                    settingsController.updateSettings({ language: code as any });
                  },
                };
              })}
            />
          </SettingRow>
        </SettingSection>

        {/* Accessibility Section */}
        <SettingSection title={t.settings.rows.accessibility || 'Accessibility'}>
          <SettingRow
            label={t.settings.rows.highContrast || 'High Contrast'}
            desc={
              t.settings.rows.highContrastDesc ||
              'Sharpen text and interface elements for better readability'
            }
          >
            <Toggle
              value={settings.highContrast ?? false}
              onChange={(v) => settingsController.updateSettings({ highContrast: v })}
            />
          </SettingRow>
        </SettingSection>

        {/* Performance Section */}
        <SettingSection
          title={t.settings.rows.performanceAndInteraction || 'Performance & Interaction'}
        >
          <SettingRow
            label={t.settings.rows.haptics || 'Haptics'}
            desc={
              t.settings.rows.hapticsDesc || 'Subtle tactile feedback for gestures and controls'
            }
          >
            <Toggle
              value={settings.hapticFeedback ?? true}
              onChange={(v) => settingsController.updateSettings({ hapticFeedback: v })}
            />
          </SettingRow>
          <SettingRow
            label={t.settings.rows.proMotion || 'ProMotion'}
            desc={
              t.settings.rows.proMotionDesc || 'Enable 120Hz smooth scrolling rendering pipeline'
            }
          >
            <Toggle
              value={settings.highRefreshRate ?? true}
              onChange={(v) => settingsController.updateSettings({ highRefreshRate: v })}
            />
          </SettingRow>
          <SettingRow
            label={t.settings.rows.performanceBoost || 'Performance Boost'}
            desc={
              t.settings.rows.performanceBoostDesc ||
              'Optimize system rendering engine for heavy audio/visual tasks'
            }
          >
            <Toggle
              value={settings.performanceMode ?? false}
              onChange={(v) => settingsController.updateSettings({ performanceMode: v })}
            />
          </SettingRow>
        </SettingSection>
      </SettingsContentContainer>
    </>
  );
}
