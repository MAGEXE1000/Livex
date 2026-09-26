import React, { useState, useEffect, useRef } from 'react';
import { CANONICAL_CONTENT_TRANSITION } from '@workspace/livex-core';
import { useAppReducedMotion } from '../hooks/useAppReducedMotion';
import { InspectorOverlayRenderer } from '../features/devtools/inspector';

export interface SharedNavigationContainerProps {
  activeView: string;
  direction?: 'right' | 'left';
  viewOrder?: readonly string[] | string[];
  children: (viewId: string) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'slide' | 'fade-through' | 'drilldown' | 'tab';
  preMountViews?: string[];
  mode?: 'wait' | 'sync' | 'popLayout';
}

export function SharedNavigationContainer({
  activeView,
  children,
  className = '',
  style,
  direction,
  viewOrder,
  variant = 'tab',
  preMountViews,
}: SharedNavigationContainerProps) {
  const prefersReduced = useAppReducedMotion();

  // Visited views tracking for instant keep-alive preservation
  const [visitedViews, setVisitedViews] = useState<Set<string>>(() => {
    const initial = new Set<string>([activeView]);
    if (preMountViews) {
      for (const v of preMountViews) initial.add(v);
    }
    return initial;
  });

  if (!visitedViews.has(activeView)) {
    const next = new Set(visitedViews);
    next.add(activeView);
    setVisitedViews(next);
  }

  // Active view tracking
  const prevViewRef = useRef(activeView);
  const [exitingView, setExitingView] = useState<string | null>(null);
  const [transitionDir, setTransitionDir] = useState<
    'forward' | 'backward' | 'elevation' | 'elevation-reverse'
  >('elevation');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const viewOrderRef = useRef(viewOrder);
  viewOrderRef.current = viewOrder;
  const variantRef = useRef(variant);
  variantRef.current = variant;
  const directionRef = useRef(direction);
  directionRef.current = direction;

  const activeEpochRef = useRef(0);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prevView = prevViewRef.current;
    if (activeView === prevView) return;
    prevViewRef.current = activeView;

    if (prefersReduced) {
      setExitingView(null);
      setIsTransitioning(false);
      return;
    }

    const currentDirection = directionRef.current;
    const currentViewOrder = viewOrderRef.current;
    const currentVariant = variantRef.current;

    // Calculate transition trajectory based on explicit direction, viewOrder or variant
    let dir: 'forward' | 'backward' | 'elevation' | 'elevation-reverse' = 'elevation';
    if (currentDirection === 'right') {
      dir = 'forward';
    } else if (currentDirection === 'left') {
      dir = 'backward';
    } else if (currentViewOrder && currentViewOrder.length > 0) {
      const oldIdx = (currentViewOrder as readonly string[]).indexOf(prevView);
      const newIdx = (currentViewOrder as readonly string[]).indexOf(activeView);
      if (oldIdx !== -1 && newIdx !== -1) {
        dir = newIdx > oldIdx ? 'forward' : 'backward';
      } else if (currentVariant === 'drilldown') {
        dir =
          newIdx === -1 && (activeView === 'main' || activeView === 'list' || activeView === 'home')
            ? 'elevation-reverse'
            : 'elevation';
      }
    } else if (currentVariant === 'drilldown') {
      dir =
        activeView === 'main' || activeView === 'list' || activeView === 'home'
          ? 'elevation-reverse'
          : 'elevation';
    }

    setTransitionDir(dir);
    setExitingView(prevView);
    setIsTransitioning(true);

    activeEpochRef.current += 1;
    const epoch = activeEpochRef.current;

    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);

    // Outgoing view exits in 150ms to eliminate double-exposure visual muddiness
    exitTimerRef.current = setTimeout(() => {
      if (activeEpochRef.current === epoch) {
        setExitingView(null);
      }
    }, CANONICAL_CONTENT_TRANSITION.EXIT_DURATION_MS);

    // Incoming view finishes settling in 200ms
    settleTimerRef.current = setTimeout(() => {
      if (activeEpochRef.current === epoch) {
        setIsTransitioning(false);
      }
    }, CANONICAL_CONTENT_TRANSITION.ENTER_DURATION_MS);

    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    };
  }, [activeView, prefersReduced]);

  return (
    <div
      className={`shared-nav-container relative w-full h-full overflow-hidden ${className}`.trim()}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <style>{`
        /* Livex Canonical Content Transition Engine */
        @keyframes livex-content-enter-forward {
          0% {
            opacity: 0;
            transform: translate3d(${CANONICAL_CONTENT_TRANSITION.HORIZONTAL_OFFSET_PX}px, 0, 0) scale(${CANONICAL_CONTENT_TRANSITION.SCALE_INCOMING});
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes livex-content-exit-forward {
          0% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(-${CANONICAL_CONTENT_TRANSITION.HORIZONTAL_EXIT_OFFSET_PX}px, 0, 0) scale(${CANONICAL_CONTENT_TRANSITION.SCALE_OUTGOING});
          }
        }
        @keyframes livex-content-enter-backward {
          0% {
            opacity: 0;
            transform: translate3d(-${CANONICAL_CONTENT_TRANSITION.HORIZONTAL_OFFSET_PX}px, 0, 0) scale(${CANONICAL_CONTENT_TRANSITION.SCALE_INCOMING});
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes livex-content-exit-backward {
          0% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(${CANONICAL_CONTENT_TRANSITION.HORIZONTAL_EXIT_OFFSET_PX}px, 0, 0) scale(${CANONICAL_CONTENT_TRANSITION.SCALE_OUTGOING});
          }
        }
        @keyframes livex-content-enter-elevation {
          0% {
            opacity: 0;
            transform: translate3d(0, ${CANONICAL_CONTENT_TRANSITION.VERTICAL_OFFSET_PX}px, 0) scale(${CANONICAL_CONTENT_TRANSITION.SCALE_INCOMING});
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes livex-content-exit-elevation {
          0% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(0, -${CANONICAL_CONTENT_TRANSITION.VERTICAL_EXIT_OFFSET_PX}px, 0) scale(${CANONICAL_CONTENT_TRANSITION.SCALE_OUTGOING});
          }
        }
        @keyframes livex-content-enter-elevation-reverse {
          0% {
            opacity: 0;
            transform: translate3d(0, -${CANONICAL_CONTENT_TRANSITION.VERTICAL_EXIT_OFFSET_PX}px, 0) scale(${CANONICAL_CONTENT_TRANSITION.SCALE_OUTGOING});
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes livex-content-exit-elevation-reverse {
          0% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(0, ${CANONICAL_CONTENT_TRANSITION.VERTICAL_OFFSET_PX}px, 0) scale(${CANONICAL_CONTENT_TRANSITION.SCALE_INCOMING});
          }
        }

        .livex-content-enter-forward {
          animation: livex-content-enter-forward ${CANONICAL_CONTENT_TRANSITION.ENTER_DURATION_MS}ms ${CANONICAL_CONTENT_TRANSITION.ENTER_EASING} both;
        }
        .livex-content-exit-forward {
          animation: livex-content-exit-forward ${CANONICAL_CONTENT_TRANSITION.EXIT_DURATION_MS}ms ${CANONICAL_CONTENT_TRANSITION.EXIT_EASING} both;
        }
        .livex-content-enter-backward {
          animation: livex-content-enter-backward ${CANONICAL_CONTENT_TRANSITION.ENTER_DURATION_MS}ms ${CANONICAL_CONTENT_TRANSITION.ENTER_EASING} both;
        }
        .livex-content-exit-backward {
          animation: livex-content-exit-backward ${CANONICAL_CONTENT_TRANSITION.EXIT_DURATION_MS}ms ${CANONICAL_CONTENT_TRANSITION.EXIT_EASING} both;
        }
        .livex-content-enter-elevation {
          animation: livex-content-enter-elevation ${CANONICAL_CONTENT_TRANSITION.ENTER_DURATION_MS}ms ${CANONICAL_CONTENT_TRANSITION.ENTER_EASING} both;
        }
        .livex-content-exit-elevation {
          animation: livex-content-exit-elevation ${CANONICAL_CONTENT_TRANSITION.EXIT_DURATION_MS}ms ${CANONICAL_CONTENT_TRANSITION.EXIT_EASING} both;
        }
        .livex-content-enter-elevation-reverse {
          animation: livex-content-enter-elevation-reverse ${CANONICAL_CONTENT_TRANSITION.ENTER_DURATION_MS}ms ${CANONICAL_CONTENT_TRANSITION.ENTER_EASING} both;
        }
        .livex-content-exit-elevation-reverse {
          animation: livex-content-exit-elevation-reverse ${CANONICAL_CONTENT_TRANSITION.EXIT_DURATION_MS}ms ${CANONICAL_CONTENT_TRANSITION.EXIT_EASING} both;
        }

        @media (prefers-reduced-motion: reduce) {
          .livex-content-enter-forward,
          .livex-content-exit-forward,
          .livex-content-enter-backward,
          .livex-content-exit-backward,
          .livex-content-enter-elevation,
          .livex-content-exit-elevation,
          .livex-content-enter-elevation-reverse,
          .livex-content-exit-elevation-reverse {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {Array.from(visitedViews).map((viewId) => {
        const isCurrent = viewId === activeView;
        const isExiting = viewId === exitingView;

        if (!isCurrent && !isExiting) {
          return (
            <div
              key={viewId}
              data-view-id={viewId}
              data-pane-state="hidden"
              className="shared-nav-pane shared-nav-pane-hidden"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                display: 'none',
                visibility: 'hidden',
                pointerEvents: 'none',
                contain: 'strict',
              }}
            >
              {children(viewId)}
            </div>
          );
        }

        const animationClass = isCurrent
          ? isTransitioning
            ? `livex-content-enter-${transitionDir}`
            : 'livex-content-settled'
          : `livex-content-exit-${transitionDir}`;

        return (
          <div
            key={viewId}
            data-view-id={viewId}
            data-pane-state={isCurrent ? 'active' : 'exiting'}
            className={`shared-nav-pane ${animationClass}`}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              pointerEvents: isCurrent ? 'auto' : 'none',
              zIndex: isCurrent ? 2 : 1,
              contain: 'strict',
              willChange: isTransitioning || isExiting ? 'transform, opacity' : 'auto',
            }}
          >
            {children(viewId)}
          </div>
        );
      })}
      <InspectorOverlayRenderer />
    </div>
  );
}
