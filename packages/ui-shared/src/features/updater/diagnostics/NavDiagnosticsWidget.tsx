import React from 'react';
import { useNavigationStore } from '@workspace/livex-core';
import { useShallow } from 'zustand/react/shallow';
import { NavigationDispatcher } from '@workspace/livex-core';
import { TransitionCoordinator } from '@workspace/livex-core';

export default function NavDiagnosticsWidget() {
  const store = useNavigationStore(
    useShallow((s) => ({
      history: s.history,
      isTransitioning: s.isTransitioning,
      transitionType: s.transitionType,
      gestureState: s.gestureState,
      predictiveProgress: s.predictiveProgress,
      activeHandlers: s.activeHandlers,
    }))
  );
  const current = NavigationDispatcher.currentRoute();
  const previous = NavigationDispatcher.previousRoute();

  return (
    <div
      style={{
        background: 'var(--app-surface-low, #1e1e1e)',
        border: '1px solid rgba(128,128,128,0.15)',
        borderRadius: '16px',
        padding: '20px',
        fontFamily: 'var(--studio-font-body)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Title */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(128,128,128,0.1)',
          paddingBottom: '10px',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ color: 'var(--c-accent, #4f46e5)', fontSize: '22px' }}
          >
            explore
          </span>
          Navigation Core Inspector
        </h3>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            background: 'rgba(79, 70, 229, 0.15)',
            color: '#818cf8',
            padding: '2px 8px',
            borderRadius: '9999px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Developer Mode Only
        </span>
      </div>

      {/* Grid of state metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
        }}
      >
        {/* Metric 1 */}
        <div
          style={{
            background: 'rgba(255,255,255,0.02)',
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid rgba(128,128,128,0.05)',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            Stack Depth
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--c-accent, #4f46e5)',
              marginTop: '4px',
            }}
          >
            {store.history.length}
          </div>
        </div>

        {/* Metric 2 */}
        <div
          style={{
            background: 'rgba(255,255,255,0.02)',
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid rgba(128,128,128,0.05)',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            Transition State
          </div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: store.isTransitioning ? '#fbbf24' : '#34d399',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: store.isTransitioning ? '#fbbf24' : '#34d399',
                display: 'inline-block',
              }}
            />
            {store.isTransitioning ? `${store.transitionType || 'transitioning'}` : 'Idle'}
          </div>
        </div>

        {/* Metric 3 */}
        <div
          style={{
            background: 'rgba(255,255,255,0.02)',
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid rgba(128,128,128,0.05)',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            Gesture State
          </div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: store.gestureState !== 'idle' ? '#fbbf24' : 'rgba(255,255,255,0.6)',
              marginTop: '8px',
            }}
          >
            {store.gestureState.toUpperCase()}
          </div>
        </div>

        {/* Metric 4 */}
        <div
          style={{
            background: 'rgba(255,255,255,0.02)',
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid rgba(128,128,128,0.05)',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            Predictive Back
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#60a5fa', marginTop: '8px' }}>
            {Math.round(store.predictiveProgress * 100)}% progress
          </div>
        </div>
      </div>

      {/* Routes details */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          background: 'rgba(0,0,0,0.15)',
          padding: '14px',
          borderRadius: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Current Route:</span>
          <span style={{ fontFamily: 'monospace', color: '#f43f5e', fontWeight: 600 }}>
            {current.app} {current.tab ? `/ ${current.tab}` : ''}{' '}
            {current.page ? `(page: ${current.page})` : ''}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '13px',
            borderTop: '1px solid rgba(128,128,128,0.05)',
            paddingTop: '8px',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Previous Route:</span>
          <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)' }}>
            {previous
              ? `${previous.app} ${previous.tab ? `/ ${previous.tab}` : ''} ${previous.page ? `(page: ${previous.page})` : ''}`
              : 'None'}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '13px',
            borderTop: '1px solid rgba(128,128,128,0.05)',
            paddingTop: '8px',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Registered Priority Handlers:</span>
          <span
            style={{
              fontWeight: 600,
              color: store.activeHandlers.length > 0 ? '#fbbf24' : 'rgba(255,255,255,0.4)',
            }}
          >
            {store.activeHandlers.length} active
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '13px',
            borderTop: '1px solid rgba(128,128,128,0.05)',
            paddingTop: '8px',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Current Navigation Owner:</span>
          <span style={{ fontWeight: 600, color: '#38bdf8' }}>NavigationCore v9.1</span>
        </div>
      </div>

      {/* Stack List */}
      <div>
        <div
          style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
            fontWeight: 600,
            marginBottom: '8px',
          }}
        >
          Stack Trace
        </div>
        <div
          style={{
            maxHeight: '120px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            paddingRight: '4px',
          }}
        >
          {store.history.map((route, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: '8px',
                background:
                  i === store.history.length - 1
                    ? 'rgba(79, 70, 229, 0.15)'
                    : 'rgba(255,255,255,0.02)',
                border:
                  i === store.history.length - 1
                    ? '1px solid rgba(79,70,229,0.3)'
                    : '1px solid transparent',
                fontFamily: 'monospace',
                fontSize: '12px',
              }}
            >
              <span>
                <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: '8px' }}>[{i}]</span>
                <span
                  style={{
                    color: i === store.history.length - 1 ? '#818cf8' : '#fff',
                    fontWeight: i === store.history.length - 1 ? 600 : 400,
                  }}
                >
                  {route.app}
                </span>
                {route.tab && (
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}> / {route.tab}</span>
                )}
                {route.page && (
                  <span style={{ color: 'var(--c-accent, #4f46e5)' }}> / {route.page}</span>
                )}
              </span>
              {route.type && (
                <span
                  style={{
                    fontSize: '9px',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.5)',
                    padding: '1px 5px',
                    borderRadius: '4px',
                  }}
                >
                  {route.type}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
