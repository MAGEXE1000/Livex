import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Pressable,
  Animated,
  StyleSheet,
  AccessibilityInfo,
  Text,
  GestureResponderEvent,
} from 'react-native';
import type { ThemeColors } from './types';

export interface LiquidSwitchProps {
  checked: boolean;
  onValueChange: (value: boolean) => void;
  colors: ThemeColors;
  label?: string;
  description?: string;
  disabled?: boolean;
  reducedMotion?: boolean;
}

// Measured physical dimensions
const TRACK_WIDTH = 54;
const TRACK_HEIGHT = 32;
const TRACK_PADDING = 3;
const THUMB_SIZE = 26;
const TRAVEL_DISTANCE = TRACK_WIDTH - THUMB_SIZE - TRACK_PADDING * 2; // 54 - 26 - 6 = 22px

export const LiquidSwitch = React.memo(function LiquidSwitch({
  checked,
  onValueChange,
  colors,
  label,
  description,
  disabled = false,
  reducedMotion = false,
}: LiquidSwitchProps) {
  // System reduced motion state check fallback
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setSystemReducedMotion(enabled);
    });
  }, []);

  const isReduced = reducedMotion || systemReducedMotion;

  // 1. Primary Thumb Position: 0 (unchecked) to TRAVEL_DISTANCE (checked)
  const thumbAnim = useRef(new Animated.Value(checked ? TRAVEL_DISTANCE : 0)).current;

  // 2. Secondary Drop Blob Position: follows thumb via spring physics
  const followerAnim = useRef(new Animated.Value(checked ? TRAVEL_DISTANCE : 0)).current;

  // Track press scale for immediate tactile response
  const pressScale = useRef(new Animated.Value(1)).current;

  // Animate thumb and follower whenever `checked` changes
  useEffect(() => {
    const targetX = checked ? TRAVEL_DISTANCE : 0;

    if (isReduced) {
      // In reduced motion, instantly or gently snap thumb with zero stretch
      Animated.parallel([
        Animated.timing(thumbAnim, {
          toValue: targetX,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(followerAnim, {
          toValue: targetX,
          duration: 150,
          useNativeDriver: false,
        }),
      ]).start();
      return;
    }

    // Standard Motion: Fast spring on thumb, lagging viscous spring on follower
    Animated.parallel([
      // Primary thumb arrives with high tension
      Animated.spring(thumbAnim, {
        toValue: targetX,
        tension: 180,
        friction: 14,
        useNativeDriver: false,
      }),
      // Follower droplet follows with looser damping to generate real-time velocity delta
      Animated.spring(followerAnim, {
        toValue: targetX,
        tension: 90,
        friction: 11,
        useNativeDriver: false,
      }),
    ]).start();
  }, [checked, isReduced, thumbAnim, followerAnim]);

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    Animated.spring(pressScale, {
      toValue: 0.94,
      tension: 300,
      friction: 20,
      useNativeDriver: true,
    }).start();
  }, [disabled, pressScale]);

  const handlePressOut = useCallback(() => {
    if (disabled) return;
    Animated.spring(pressScale, {
      toValue: 1,
      tension: 300,
      friction: 20,
      useNativeDriver: true,
    }).start();
  }, [disabled, pressScale]);

  const handleToggle = useCallback(() => {
    if (disabled) return;
    onValueChange(!checked);
  }, [disabled, checked, onValueChange]);

  // Derived Liquid Stretch Calculations
  // Delta between thumb and follower produces horizontal elongation
  const deltaX = Animated.subtract(thumbAnim, followerAnim);

  // Absolute stretch factor: scaleX elongates when moving fast (up to 1.40x)
  const stretchX = isReduced
    ? 1
    : deltaX.interpolate({
        inputRange: [-TRAVEL_DISTANCE, 0, TRAVEL_DISTANCE],
        outputRange: [1.38, 1, 1.38],
        extrapolate: 'clamp',
      });

  // Volume preservation: scaleY compresses slightly when scaleX stretches
  const stretchY = isReduced
    ? 1
    : deltaX.interpolate({
        inputRange: [-TRAVEL_DISTANCE, 0, TRAVEL_DISTANCE],
        outputRange: [0.85, 1, 0.85],
        extrapolate: 'clamp',
      });

  // Interpolate Track Background Color between OFF and ON (Accent)
  const trackBg = thumbAnim.interpolate({
    inputRange: [0, TRAVEL_DISTANCE],
    outputRange: [colors.switchTrackOff, colors.accent],
    extrapolate: 'clamp',
  });

  // Track Border Color
  const trackBorder = thumbAnim.interpolate({
    inputRange: [0, TRAVEL_DISTANCE],
    outputRange: [colors.switchTrackOffBorder, colors.accent],
    extrapolate: 'clamp',
  });

  // Thumb Color (Opaque solid)
  const thumbColor = checked ? colors.switchThumbOn : colors.switchThumbOff;

  return (
    <Pressable
      onPress={handleToggle}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessible={true}
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label || 'Toggle switch'}
      style={[styles.container, disabled && styles.disabledContainer]}
    >
      {(label || description) && (
        <View style={styles.textContainer}>
          {label && (
            <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
          )}
          {description && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {description}
            </Text>
          )}
        </View>
      )}

      <Animated.View
        style={[
          styles.track,
          {
            backgroundColor: trackBg,
            borderColor: trackBorder,
            transform: [{ scale: pressScale }],
          },
        ]}
      >
        {/* Secondary Follower Droplet (Drop Blob) - creates fluid bridge */}
        {!isReduced && (
          <Animated.View
            style={[
              styles.followerBlob,
              {
                backgroundColor: thumbColor,
                transform: [{ translateX: followerAnim }],
              },
            ]}
          />
        )}

        {/* Primary Thumb with velocity-induced stretch */}
        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor: thumbColor,
              transform: [
                { translateX: thumbAnim },
                { scaleX: stretchX },
                { scaleY: stretchY },
              ],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  disabledContainer: {
    opacity: 0.4,
  },
  textContainer: {
    flex: 1,
    paddingRight: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
    lineHeight: 18,
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    borderWidth: 1.5,
    padding: TRACK_PADDING,
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    left: TRACK_PADDING,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2.5,
  },
  followerBlob: {
    position: 'absolute',
    left: TRACK_PADDING,
    width: THUMB_SIZE * 0.75,
    height: THUMB_SIZE * 0.75,
    borderRadius: (THUMB_SIZE * 0.75) / 2,
    opacity: 0.85,
  },
});
