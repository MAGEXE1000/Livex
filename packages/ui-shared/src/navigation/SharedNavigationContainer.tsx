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

  // Synchronous transition state engine — eliminates 1-frame settled flash and duplicate animation
  const [transitionState, setTransitionState] = useState<{
    activeView: string;
    exitingView: string | null;
    transitionDir: 'forward' | 'backward' | 'elevation' | 'elevation-reverse';
    isTransitioning: boolean;
    epoch: number;
  }>(() => ({
    activeView,
    exitingView: null,
    transitionDir: 'elevation',
    isTransitioning: false,
    epoch: 0,
  }));

  // Synchronously compute trajectory and trigger transition on prop change during render
  if (activeView !== transitionState.activeView) {
    const prevView = transitionState.activeView;

    let dir: 'forward' | 'backward' | 'elevation' | 'elevation-reverse' = 'elevation';
    if (direction === 'right') {
      dir = 'forward';
    } else if (direction === 'left') {
      dir = 'backward';
    } else if (viewOrder && viewOrder.length > 0) {
      const oldIdx = (viewOrder as readonly string[]).indexOf(prevView);
      const newIdx = (viewOrder as readonly string[]).indexOf(activeView);
      if (oldIdx !== -1 && newIdx !== -1) {
        dir = newIdx > oldIdx ? 'forward' : 'backward';
      } else if (variant === 'drilldown') {
        dir =
          newIdx === -1 && (activeView === 'main' || activeView === 'list' || activeView === 'home')
            ? 'elevation-reverse'
            : 'elevation';
      }
    } else if (variant === 'drilldown') {
      dir =
        activeView === 'main' || activeView === 'list' || activeView === 'home'
          ? 'elevation-reverse'
          : 'elevation';
    }

    if (!visitedViews.has(activeView)) {
      const nextVisited = new Set(visitedViews);
      nextVisited.add(activeView);
      setVisitedViews(nextVisited);
    }

    setTransitionState({
      activeView,
      exitingView: prefersReduced ? null : prevView,
      transitionDir: dir,
      isTransitioning: !prefersReduced,
      epoch: transitionState.epoch + 1,
    });
  }

  // Lifecycle timers for exit (150ms) and settle (200ms)
  useEffect(() => {
    if (!transitionState.isTransitioning) return;
    const epoch = transitionState.epoch;

    const exitTimer = setTimeout(() => {
      setTransitionState((prev) => {
        if (prev.epoch === epoch) {
          return { ...prev, exitingView: null };
        }
        return prev;
      });
    }, CANONICAL_CONTENT_TRANSITION.EXIT_DURATION_MS);

    const settleTimer = setTimeout(() => {
      setTransitionState((prev) => {
        if (prev.epoch === epoch) {
          return { ...prev, isTransitioning: false };
        }
        return prev;
      });
    }, CANONICAL_CONTENT_TRANSITION.ENTER_DURATION_MS);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(settleTimer);
    };
  }, [transitionState.epoch, transitionState.isTransitioning]);

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
        const isCurrent = viewId === transitionState.activeView;
        const isExiting = viewId === transitionState.exitingView;
        const content = children(viewId);
        if (content == null) return null;

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
              {content}
            </div>
          );
        }

        const animationClass = isCurrent
          ? transitionState.isTransitioning
            ? `livex-content-enter-${transitionState.transitionDir}`
            : 'livex-content-settled'
          : `livex-content-exit-${transitionState.transitionDir}`;

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
              willChange: transitionState.isTransitioning || isExiting ? 'transform, opacity' : 'auto',
            }}
          >
            {content}
          </div>
        );
      })}
      <InspectorOverlayRenderer />
    </div>
  );
}
