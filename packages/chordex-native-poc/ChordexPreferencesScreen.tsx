import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { LiquidSwitch } from './LiquidSwitch';
import { MorphingActionSurface, type ActionRowItem } from './MorphingActionSurface';
import {
  THEME_PALETTES,
  type ColorTheme,
  type ChordexPreferencesState,
} from './types';

export function ChordexPreferencesScreen() {
  const [state, setState] = useState<ChordexPreferencesState>({
    theme: 'dark',
    reducedMotion: false,
    leftHanded: false,
    showFingerNumbers: true,
    showIntervals: false,
    amoledCanvas: false,
    autoscrollPractice: true,
    keepScreenAwake: true,
    activeTuning: 'standard',
    capoFret: 0,
  });

  // Active Theme Colors
  const colors = useMemo(() => {
    // If amoledCanvas is toggled ON while in dark mode, elevate to pure AMOLED
    if (state.theme === 'dark' && state.amoledCanvas) {
      return THEME_PALETTES.amoled;
    }
    return THEME_PALETTES[state.theme];
  }, [state.theme, state.amoledCanvas]);

  // Generic Preference Toggle Helper
  const togglePref = useCallback((key: keyof ChordexPreferencesState) => {
    setState((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const setTheme = useCallback((theme: ColorTheme) => {
    setState((prev) => ({ ...prev, theme }));
  }, []);

  // Representative Menu Action Rows for MorphingActionSurface
  const morphingRows: ActionRowItem[] = useMemo(
    () => [
      {
        id: 'tuning_std',
        label: 'Standard E Tuning',
        sublabel: 'E - A - D - G - B - E',
        icon: '🎸',
        badge: state.activeTuning === 'standard' ? 'ACTIVE' : undefined,
        onPress: () => setState((p) => ({ ...p, activeTuning: 'standard' })),
      },
      {
        id: 'tuning_drop_d',
        label: 'Drop D Tuning',
        sublabel: 'D - A - D - G - B - E (Alternative Rock / Heavy)',
        icon: '⚡',
        badge: state.activeTuning === 'dropD' ? 'ACTIVE' : undefined,
        onPress: () => setState((p) => ({ ...p, activeTuning: 'dropD' })),
      },
      {
        id: 'capo_stepper',
        label: `Capo Position: Fret ${state.capoFret}`,
        sublabel: 'Tap to cycle transposition offset (0 to 5)',
        icon: '🪢',
        badge: `+${state.capoFret}`,
        onPress: () =>
          setState((p) => ({ ...p, capoFret: (p.capoFret + 1) % 6 })),
      },
      {
        id: 'tuning_half_step',
        label: 'Half Step Down (Eb)',
        sublabel: 'Eb - Ab - Db - Gb - Bb - Eb (Jimi Hendrix / SRV)',
        icon: '🎶',
        badge: state.activeTuning === 'halfStepDown' ? 'ACTIVE' : undefined,
        onPress: () => setState((p) => ({ ...p, activeTuning: 'halfStepDown' })),
      },
    ],
    [state.activeTuning, state.capoFret]
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={state.theme === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={colors.background}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen Header */}
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>CHORDEX STUDIO</Text>
          <Text style={[styles.mainTitle, { color: colors.textPrimary }]}>
            Preferences
          </Text>
          <Text style={[styles.mainSubtitle, { color: colors.textSecondary }]}>
            High-fidelity React Native interaction architecture proof-of-concept.
          </Text>
        </View>

        {/* Theme Segmented Control (Light, Dark, AMOLED) */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Appearance Mode</Text>
          <View style={[styles.segmentedTrack, { backgroundColor: colors.switchTrackOff }]}>
            {(['light', 'dark', 'amoled'] as ColorTheme[]).map((mode) => {
              const isSelected = state.theme === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setTheme(mode)}
                  style={[
                    styles.segmentButton,
                    isSelected && [
                      styles.segmentActive,
                      { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    ],
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to ${mode} mode`}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: isSelected ? colors.accent : colors.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {mode.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Section 1: Instrument & Diagram Preferences (Multiple LiquidSwitch instances) */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Fretboard & Diagrams
          </Text>

          <LiquidSwitch
            label="Left-Handed Fretboard"
            description="Mirrors string layout horizontally for left-handed guitarists."
            checked={state.leftHanded}
            onValueChange={() => togglePref('leftHanded')}
            colors={colors}
            reducedMotion={state.reducedMotion}
          />
          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <LiquidSwitch
            label="Show Finger Numbers"
            description="Renders fingering indices (1-4) on chord diagram fret dots."
            checked={state.showFingerNumbers}
            onValueChange={() => togglePref('showFingerNumbers')}
            colors={colors}
            reducedMotion={state.reducedMotion}
          />
          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <LiquidSwitch
            label="Interval Degrees"
            description="Replaces note names with scale intervals (R, 3rd, 5th, b7th)."
            checked={state.showIntervals}
            onValueChange={() => togglePref('showIntervals')}
            colors={colors}
            reducedMotion={state.reducedMotion}
          />
        </View>

        {/* Section 2: Stage & Performance Controls */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Stage & Performance
          </Text>

          <LiquidSwitch
            label="True AMOLED Canvas"
            description="Enforces pure #000000 background pixels for zero OLED glare."
            checked={state.amoledCanvas}
            onValueChange={() => togglePref('amoledCanvas')}
            colors={colors}
            reducedMotion={state.reducedMotion}
          />
          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <LiquidSwitch
            label="Auto-scroll Practice"
            description="Smooth vertical scroll tracking during song chord progression play."
            checked={state.autoscrollPractice}
            onValueChange={() => togglePref('autoscrollPractice')}
            colors={colors}
            reducedMotion={state.reducedMotion}
          />
          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <LiquidSwitch
            label="Keep Screen Awake"
            description="Prevents display sleep during active chord practice sessions."
            checked={state.keepScreenAwake}
            onValueChange={() => togglePref('keepScreenAwake')}
            colors={colors}
            reducedMotion={state.reducedMotion}
          />
          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          {/* Reduced Motion Toggle */}
          <LiquidSwitch
            label="Reduced Motion Mode"
            description="Disables fluid velocity-stretch and spatial morphing geometry."
            checked={state.reducedMotion}
            onValueChange={() => togglePref('reducedMotion')}
            colors={colors}
            reducedMotion={state.reducedMotion}
          />
        </View>

        {/* MorphingActionSurface Demo Anchor */}
        <View style={styles.actionSurfaceArea}>
          <Text style={[styles.actionSurfaceHint, { color: colors.textSecondary }]}>
            Tap below to test the unified spatial MorphingActionSurface:
          </Text>

          <MorphingActionSurface
            buttonLabel="Quick Tuning & Tools"
            buttonIcon="⚙️"
            title="Stage Tuning & Tools"
            subtitle={`Active: ${state.activeTuning.toUpperCase()} · Capo: Fret ${state.capoFret}`}
            rows={morphingRows}
            colors={colors}
            reducedMotion={state.reducedMotion}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    marginTop: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  mainSubtitle: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
    opacity: 0.6,
  },
  segmentedTrack: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 4,
    padding: 3,
    borderRadius: 12,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  segmentActive: {
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  segmentText: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  actionSurfaceArea: {
    marginTop: 12,
    alignItems: 'center',
  },
  actionSurfaceHint: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
});
