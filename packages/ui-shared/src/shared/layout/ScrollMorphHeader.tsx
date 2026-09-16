import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { SpringPresets, useSettingsStore, useShallow } from '@workspace/studio-core';
import { useHoverCapable } from '../../lib/hooks/use-hover-capable';
import { useAppReducedMotion } from '../../hooks/useAppReducedMotion';
import { useScrollMorph } from './useScrollMorph';

export interface ScrollMorphHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  hideBack?: boolean;
  toolbarActions?: React.ReactNode;
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  morphDistance?: number;
  startOffset?: number;
  titleTestId?: string;
  backBtnTestId?: string;
  isLight?: boolean;
  isAmoled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function ScrollMorphHeader({
  title,
  subtitle,
  onBack,
  hideBack = false,
  toolbarActions,
  scrollContainerRef,
  morphDistance = 80,
  startOffset = 0,
  titleTestId,
  backBtnTestId,
  isLight: isLightProp,
  isAmoled: isAmoledProp,
  className = '',
  style = {},
}: ScrollMorphHeaderProps) {
  const canHover = useHoverCapable();
  const prefersReduced = useAppReducedMotion();

  const { theme, amoledMode } = useSettingsStore(
    useShallow((s) => ({
      theme: s.settings.theme,
      amoledMode: s.settings.amoledMode,
    }))
  );

  const isLight = isLightProp !== undefined ? isLightProp : theme === 'light';
  const isAmoled = isAmoledProp !== undefined ? isAmoledProp : amoledMode;

  const headerRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const spectralRef = useRef<HTMLDivElement | null>(null);
  const specularRef = useRef<HTMLDivElement | null>(null);

  const hasBack = Boolean(onBack && !hideBack);

  useScrollMorph({
    scrollContainerRef,
    headerRef,
    titleRef,
    spectralRef,
    specularRef,
    morphDistance,
    startOffset,
    enabled: true,
    isLight,
    isAmoled,
    expandedLeftInset: hasBack ? 56 : 20,
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 var(--page-inset-h, 24px)',
        zIndex: 110,
        pointerEvents: 'none',
        boxSizing: 'border-box',
        ...style,
      }}
      className={`studio-scroll-morph-container ${className}`}
    >
      <header
        ref={headerRef}
        data-testid="scroll-morph-header"
        style={{
          width: '100%',
          maxWidth: 'calc(var(--content-max-w) - calc(var(--page-inset-h, 24px) * 2))',
          height: '58px',
          borderRadius: '0px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          position: 'relative',
          background: 'transparent',
          border: '1px solid transparent',
          boxSizing: 'border-box',
          pointerEvents: 'auto',
          userSelect: 'none',
          willChange: 'transform, border-radius, background-color, backdrop-filter',
          contain: 'paint layout',
        }}
      >
        {/* Specular Rim Highlight (Settles at p = 1.0) */}
        <div
          ref={specularRef}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            background: isLight
              ? 'radial-gradient(ellipse 80% 65% at 50% 0%, rgba(255, 255, 255, 0.14) 0%, transparent 100%)'
              : 'radial-gradient(ellipse 80% 65% at 50% 0%, rgba(255, 255, 255, 0.05) 0%, transparent 100%)',
            pointerEvents: 'none',
            opacity: 0,
          }}
        />

        {/* Subtle Chromatic Aberration & Spectral Refraction Peak Layer */}
        <div
          ref={spectralRef}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            background:
              'radial-gradient(ellipse 65% 55% at 24% 45%, rgba(16, 185, 129, 0.32) 0%, rgba(56, 189, 248, 0.20) 34%, rgba(244, 63, 94, 0.12) 65%, transparent 100%)',
            pointerEvents: 'none',
            opacity: 0,
            willChange: 'opacity, transform',
          }}
        />

        {/* Left Back Button */}
        {hasBack ? (
          <motion.button
            type="button"
            data-testid={backBtnTestId || 'scroll-morph-header-back-btn'}
            onClick={onBack}
            aria-label="Go back"
            whileTap={prefersReduced ? undefined : { scale: 0.92 }}
            whileHover={canHover && !prefersReduced ? { scale: 1.04 } : undefined}
            transition={prefersReduced ? { duration: 0 } : SpringPresets.soft}
            style={{
              width: 'var(--btn-size-md, 42px)',
              height: 'var(--btn-size-md, 42px)',
              minWidth: '42px',
              minHeight: '42px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)',
              border: isLight
                ? '1px solid rgba(0, 0, 0, 0.05)'
                : '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: 'var(--btn-surface-shadow, 0 1px 3px rgba(0,0,0,0.12))',
              color: 'var(--c-text-primary)',
              cursor: 'pointer',
              zIndex: 2,
              pointerEvents: 'auto',
              outline: 'none',
              WebkitTapHighlightColor: 'transparent',
              flexShrink: 0,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: 'block' }}
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </motion.button>
        ) : (
          <div style={{ width: 42, height: 42, flexShrink: 0 }} />
        )}

        {/* Continuous Morphing Title (Left-aligned -> Centered) */}
        <div
          ref={titleRef}
          data-testid="scroll-morph-header-title"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingLeft: toolbarActions ? '104px' : '56px',
            paddingRight: toolbarActions ? '104px' : '56px',
            pointerEvents: 'none',
            zIndex: 1,
            willChange: 'transform',
          }}
        >
          {subtitle ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 0,
                textAlign: 'center',
                maxWidth: '100%',
              }}
            >
              <span
                data-testid={titleTestId}
                style={{
                  fontSize: 'var(--type-title-size, 21px)',
                  lineHeight: '1.2',
                  fontWeight: 700,
                  color: 'var(--c-text-primary)',
                  letterSpacing: 'var(--type-title-tracking, -0.7px)',
                  fontFamily:
                    'var(--type-section-font, var(--studio-font-display, "Inter Tight", sans-serif))',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {title}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  lineHeight: '1.2',
                  fontWeight: 500,
                  color: 'var(--c-text-muted)',
                  fontFamily: 'var(--font-body, "Inter", sans-serif)',
                  marginTop: '1.5px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {subtitle}
              </span>
            </div>
          ) : (
            <span
              data-testid={titleTestId}
              style={{
                fontSize: 'var(--type-title-size, 21px)',
                lineHeight: 'var(--type-title-lh, 28px)',
                fontWeight: 700,
                color: 'var(--c-text-primary)',
                letterSpacing: 'var(--type-title-tracking, -0.7px)',
                fontFamily:
                  'var(--type-section-font, var(--studio-font-display, "Inter Tight", sans-serif))',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textAlign: 'center',
                maxWidth: '100%',
              }}
            >
              {title}
            </span>
          )}
        </div>

        {/* Right Toolbar Actions */}
        {toolbarActions ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              zIndex: 2,
              pointerEvents: 'auto',
              flexShrink: 0,
            }}
          >
            {toolbarActions}
          </div>
        ) : (
          <div style={{ width: 40, height: 40, flexShrink: 0 }} />
        )}
      </header>
    </div>
  );
}
