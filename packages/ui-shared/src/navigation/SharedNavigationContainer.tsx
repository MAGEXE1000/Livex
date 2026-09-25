import React, { useState, useEffect } from 'react';
import { StudioPageTransition } from '../components/StudioPageTransition';
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

function KeepAliveTabContainer({
  activeView,
  children,
  className = '',
  style,
  preMountViews,
}: {
  activeView: string;
  children: (viewId: string) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  preMountViews?: string[];
}) {
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

  return (
    <div
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', ...style }}
    >
      <style>{`
        @keyframes tab-pane-enter {
          from {
            opacity: 0.94;
            transform: scale(0.998);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .shared-nav-pane-active {
          animation: tab-pane-enter 150ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .shared-nav-pane-active {
            animation: none !important;
          }
        }
      `}</style>
      {Array.from(visitedViews).map((viewId) => {
        const isActive = viewId === activeView;
        return (
          <div
            key={viewId}
            data-view-id={viewId}
            className={`shared-nav-pane ${isActive ? 'shared-nav-pane-active' : 'shared-nav-pane-hidden'}`}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              display: isActive ? 'flex' : 'none',
              flexDirection: 'column',
              pointerEvents: isActive ? 'auto' : 'none',
              contain: 'strict',
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

export function SharedNavigationContainer({
  activeView,
  children,
  className = '',
  style,
  variant = 'tab',
  mode,
  preMountViews,
}: SharedNavigationContainerProps) {
  // For tab navigation: Keep-Alive Panel Pattern
  // Visited tabs remain mounted in the DOM to eliminate unmount/remount stalls,
  // preserve scroll positions, prevent skeleton flashes on tab return, and ensure instant 0ms switching.
  if (variant === 'tab') {
    return (
      <KeepAliveTabContainer
        activeView={activeView}
        className={className}
        style={style}
        preMountViews={preMountViews}
      >
        {children}
      </KeepAliveTabContainer>
    );
  }

  // For drilldown, slide, or fade-through push/pop flows, use StudioPageTransition
  return (
    <div
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', ...style }}
    >
      <StudioPageTransition pageKey={activeView} variant={variant} mode={mode}>
        {children(activeView)}
      </StudioPageTransition>
      <InspectorOverlayRenderer />
    </div>
  );
}
