import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  BackHandler,
  Dimensions,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import type { ThemeColors } from './types';

export interface ActionRowItem {
  id: string;
  label: string;
  sublabel?: string;
  icon?: string;
  badge?: string;
  onPress: () => void;
}

export interface MorphingActionSurfaceProps {
  buttonLabel: string;
  buttonIcon?: string;
  title: string;
  subtitle?: string;
  rows: ActionRowItem[];
  colors: ThemeColors;
  reducedMotion?: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Closed Pill Geometry
const PILL_WIDTH = Math.min(220, SCREEN_WIDTH * 0.58);
const PILL_HEIGHT = 48;
const PILL_RADIUS = 24;

// Open Panel Geometry
const PANEL_WIDTH = Math.min(360, SCREEN_WIDTH - 32);
const PANEL_HEIGHT = 340;
const PANEL_RADIUS = 20;

export const MorphingActionSurface = React.memo(function MorphingActionSurface({
  buttonLabel,
  buttonIcon,
  title,
  subtitle,
  rows,
  colors,
  reducedMotion = false,
}: MorphingActionSurfaceProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPressing, setIsPressing] = useState(false);

  // 1. Unified Morph Progress: 0 (Closed Pill) -> 1 (Open Panel)
  const morphProgress = useRef(new Animated.Value(0)).current;

  // 2. Press Acknowledgement Scale: 1 -> 0.94
  const pressScale = useRef(new Animated.Value(1)).current;

  // 3. Staggered Content Reveal Progress: 0 -> 1
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(12)).current;

  // Backdrop overlay fade
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Close Action Handler
  const handleClose = useCallback(() => {
    if (!isOpen) return;

    if (reducedMotion) {
      Animated.timing(contentFade, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
        morphProgress.setValue(0);
        backdropOpacity.setValue(0);
        setIsOpen(false);
      });
      return;
    }

    // Coordinated Reverse Transformation:
    // 1. Content fades out quickly (~80ms)
    // 2. Shell contracts back into pill geometry smoothly with overdamped spring (zero bounce)
    Animated.parallel([
      Animated.timing(contentFade, {
        toValue: 0,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(morphProgress, {
        toValue: 0,
        tension: 260,
        friction: 26, // Overdamped to prevent geometric overshoot on return
        useNativeDriver: false,
      }),
    ]).start(() => {
      setIsOpen(false);
    });
  }, [isOpen, reducedMotion, contentFade, backdropOpacity, morphProgress]);

  // Android Hardware Back Handler Integration
  useEffect(() => {
    if (!isOpen) return;

    const onBackPress = () => {
      handleClose();
      return true; // Consumes event to prevent exiting app
    };

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSubscription.remove();
  }, [isOpen, handleClose]);

  // Press-In (0.94 scale acknowledgement)
  const handlePressIn = useCallback(() => {
    if (isOpen) return;
    setIsPressing(true);
    Animated.timing(pressScale, {
      toValue: 0.94,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [isOpen, pressScale]);

  // Press-Out without opening
  const handlePressCancel = useCallback(() => {
    setIsPressing(false);
    Animated.spring(pressScale, {
      toValue: 1,
      tension: 300,
      friction: 20,
      useNativeDriver: true,
    }).start();
  }, [pressScale]);

  // Press-Up: Triggers coordinated expansion
  const handleTrigger = useCallback(() => {
    if (isOpen) return;
    setIsOpen(true);
    setIsPressing(false);

    if (reducedMotion) {
      morphProgress.setValue(1);
      backdropOpacity.setValue(1);
      pressScale.setValue(1);
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
      return;
    }

    // Coordinated Opening Choreography:
    // Reset pressScale as expansion starts immediately (overlapping the tail)
    Animated.spring(pressScale, { toValue: 1, tension: 200, friction: 18, useNativeDriver: true }).start();

    // 1. Backdrop smoothly fades in
    Animated.timing(backdropOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

    // 2. Geometry spring: width, height, and corner radius transform as ONE object
    Animated.spring(morphProgress, {
      toValue: 1,
      tension: 210,
      friction: 20, // Critical damping: no geometric overshoot on container bounds
      useNativeDriver: false,
    }).start();

    // 3. Content enters shortly after the shell begins expanding (+40ms delay)
    contentFade.setValue(0);
    contentTranslateY.setValue(14);
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(contentFade, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(contentTranslateY, {
          toValue: 0,
          tension: 240,
          friction: 18,
          useNativeDriver: true,
        }),
      ]).start();
    }, 45);
  }, [isOpen, reducedMotion, pressScale, backdropOpacity, morphProgress, contentFade, contentTranslateY]);

  // Geometric Interpolations for ONE coherent spatial surface
  const surfaceWidth = morphProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [PILL_WIDTH, PANEL_WIDTH],
  });

  const surfaceHeight = morphProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [PILL_HEIGHT, PANEL_HEIGHT],
  });

  const surfaceRadius = morphProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [PILL_RADIUS, PANEL_RADIUS],
  });

  // Crossfade between Pill Label and Expanded Content
  const pillLabelOpacity = morphProgress.interpolate({
    inputRange: [0, 0.25],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <>
      {/* Outside Press Backdrop Dimmer (Modal Layer) */}
      {isOpen && (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            styles.backdrop,
            {
              backgroundColor: colors.surfaceOverlay,
              opacity: backdropOpacity,
            },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleClose}
            accessible={true}
            accessibilityLabel="Dismiss surface"
            accessibilityRole="button"
          />
        </Animated.View>
      )}

      {/* The Single Continuous Morphing Surface */}
      <View style={[styles.anchorContainer, isOpen && styles.openAnchorContainer]}>
        <Animated.View
          style={[
            styles.surface,
            {
              width: surfaceWidth,
              height: surfaceHeight,
              borderRadius: surfaceRadius,
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              transform: [{ scale: pressScale }],
            },
          ]}
        >
          {/* State A: Closed Pill Mode */}
          {!isOpen && (
            <Pressable
              onPress={handleTrigger}
              onPressIn={handlePressIn}
              onPressOut={handlePressCancel}
              style={styles.pillPressable}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={buttonLabel}
            >
              <Animated.View style={[styles.pillContent, { opacity: pillLabelOpacity }]}>
                {buttonIcon && (
                  <Text style={[styles.pillIcon, { color: colors.accent }]}>{buttonIcon}</Text>
                )}
                <Text style={[styles.pillText, { color: colors.textPrimary }]}>
                  {buttonLabel}
                </Text>
              </Animated.View>
            </Pressable>
          )}

          {/* State B: Expanded Content Mode */}
          {isOpen && (
            <Animated.View
              style={[
                styles.panelContent,
                {
                  opacity: contentFade,
                  transform: [{ translateY: contentTranslateY }],
                },
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTextContainer}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
                  {subtitle && (
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                      {subtitle}
                    </Text>
                  )}
                </View>
                <Pressable
                  onPress={handleClose}
                  hitSlop={12}
                  style={[styles.closeIconBtn, { backgroundColor: colors.switchTrackOff }]}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Text style={[styles.closeX, { color: colors.textSecondary }]}>✕</Text>
                </Pressable>
              </View>

              {/* Staggered Nested Rows */}
              <View style={styles.rowsContainer}>
                {rows.map((row, index) => (
                  <Pressable
                    key={row.id}
                    onPress={() => {
                      row.onPress();
                      handleClose();
                    }}
                    style={({ pressed }) => [
                      styles.row,
                      {
                        backgroundColor: pressed ? colors.switchTrackOff : 'transparent',
                        borderColor: colors.cardBorder,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${row.label} ${row.sublabel || ''}`}
                  >
                    {row.icon && (
                      <Text style={[styles.rowIcon, { color: colors.accent }]}>{row.icon}</Text>
                    )}
                    <View style={styles.rowTextCol}>
                      <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                        {row.label}
                      </Text>
                      {row.sublabel && (
                        <Text style={[styles.rowSublabel, { color: colors.textSecondary }]}>
                          {row.sublabel}
                        </Text>
                      )}
                    </View>
                    {row.badge && (
                      <View style={[styles.badge, { backgroundColor: colors.switchTrackOff }]}>
                        <Text style={[styles.badgeText, { color: colors.accent }]}>
                          {row.badge}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    zIndex: 100,
  },
  anchorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  openAnchorContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 101,
    justifyContent: 'center',
    alignItems: 'center',
  },
  surface: {
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  pillPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillIcon: {
    fontSize: 18,
    marginRight: 8,
    fontWeight: '700',
  },
  pillText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  panelContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  closeIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  closeX: {
    fontSize: 12,
    fontWeight: '700',
  },
  rowsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginVertical: 3,
    borderWidth: 0.5,
  },
  rowIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  rowTextCol: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSublabel: {
    fontSize: 12,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
