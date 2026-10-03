import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CustomBarsSheet } from '../../../../shared/design-system/CustomBarsSheet';
import { useLivexPreferences } from '@workspace/livex-core';
import { Check } from 'lucide-react';

export interface BarsAssignmentDockProps {
  active: boolean;
  selectedCount: number;
  onApply: (bars: number | null) => void;
  onClose: () => void;
}

export function BarsAssignmentDock({ active, selectedCount, onApply, onClose }: BarsAssignmentDockProps) {
  const [showCustom, setShowCustom] = useState(false);
  const { preferences } = useLivexPreferences();

  useEffect(() => {
    if (!active) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, onClose]);

  useEffect(() => {
    if (!active) return;
    const handleTapOutside = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('#bars-assignment-dock') || target.closest('.bars-custom-sheet') || target.closest('[data-line-id]')) {
        return;
      }
      onClose();
    };
    document.addEventListener('pointerdown', handleTapOutside);
    return () => document.removeEventListener('pointerdown', handleTapOutside);
  }, [active, onClose]);

  if (!active && !showCustom) return null;

  const noAnim = preferences.reduceMotion;

  const content = (
    <>
      <div
        id="bars-assignment-dock"
        role="toolbar"
        aria-label="Bars per line assignment"
        style={{
          position: 'fixed',
          bottom: 'calc(var(--bottom-nav-height, 0px) + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 16px)',
          left: '50%',
          transform: `translateX(-50%) ${!active ? 'translateY(20px)' : 'translateY(0)'}`,
          opacity: active ? 1 : 0,
          transition: noAnim ? 'none' : 'transform 250ms var(--ease-spring), opacity 250ms ease',
          pointerEvents: active ? 'auto' : 'none',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-2)'
        }}
      >
        <div style={{
          background: 'var(--surface-float-bg, rgba(20, 20, 20, 0.85))',
          backdropFilter: noAnim ? 'none' : 'blur(16px)',
          WebkitBackdropFilter: noAnim ? 'none' : 'blur(16px)',
          padding: 'var(--space-2) var(--space-4)',
          borderRadius: '999px',
          border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
          color: 'var(--text-secondary, #a1a1a1)',
          fontSize: 'var(--font-ui-sm, 13px)',
          fontWeight: 500,
          userSelect: 'none'
        }}>
          {selectedCount} line{selectedCount !== 1 ? 's' : ''} selected &bull; Tap or drag to select
        </div>

        <div style={{
          display: 'flex',
          background: 'var(--surface-float-bg, rgba(20, 20, 20, 0.85))',
          backdropFilter: noAnim ? 'none' : 'blur(16px)',
          WebkitBackdropFilter: noAnim ? 'none' : 'blur(16px)',
          borderRadius: 'var(--radius-3, 12px)',
          border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
          padding: 'var(--space-1)',
          gap: 'var(--space-1)'
        }}>
          {[1, 2, 4].map(bars => (
            <button
              key={bars}
              disabled={selectedCount === 0}
              onClick={() => onApply(bars)}
              aria-label={`Set to ${bars} bar${bars > 1 ? 's' : ''}`}
              style={{
                height: '44px',
                minWidth: '44px',
                padding: '0 var(--space-3)',
                borderRadius: 'var(--radius-2, 8px)',
                background: 'transparent',
                color: selectedCount === 0 ? 'var(--text-disabled, #666)' : 'var(--text-primary, #fff)',
                border: 'none',
                fontSize: 'var(--font-ui-md, 15px)',
                fontWeight: 600,
                cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
                touchAction: 'manipulation'
              }}
            >
              {bars} Bar{bars > 1 ? 's' : ''}
            </button>
          ))}
          <button
            disabled={selectedCount === 0}
            onClick={() => setShowCustom(true)}
            aria-label="Set custom bars"
            style={{
              height: '44px',
              minWidth: '44px',
              padding: '0 var(--space-3)',
              borderRadius: 'var(--radius-2, 8px)',
              background: 'transparent',
              color: selectedCount === 0 ? 'var(--text-disabled, #666)' : 'var(--text-primary, #fff)',
              border: 'none',
              fontSize: 'var(--font-ui-md, 15px)',
              fontWeight: 600,
              cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
              touchAction: 'manipulation'
            }}
          >
            Custom&hellip;
          </button>
          
          <div style={{ width: '1px', background: 'var(--border-subtle, rgba(255,255,255,0.1))', margin: 'var(--space-1) var(--space-1)' }} />
          
          <button
            onClick={onClose}
            aria-label="Done"
            style={{
              height: '44px',
              width: '44px',
              borderRadius: 'var(--radius-2, 8px)',
              background: 'var(--accent-primary, #3b82f6)',
              color: '#fff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              touchAction: 'manipulation'
            }}
          >
            <Check size={20} />
          </button>
        </div>
      </div>
      
      {showCustom && (
        <div className="bars-custom-sheet">
          <CustomBarsSheet
            open={showCustom}
            onClose={() => setShowCustom(false)}
            onConfirm={(bars) => {
              onApply(bars);
              setShowCustom(false);
            }}
            initialBars={4}
          />
        </div>
      )}
    </>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}
