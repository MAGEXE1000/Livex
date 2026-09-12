import React from 'react';

export interface StageBottomPanelSlotProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  isAmoled: boolean;
  children: React.ReactNode;
  role?: string;
  ariaLabel?: string;
  testId?: string;
  maxWidth?: string;
}

export const StageBottomPanelSlot: React.FC<StageBottomPanelSlotProps> = ({
  isOpen,
  onClose,
  isLight,
  isAmoled,
  children,
  role = 'region',
  ariaLabel,
  testId = 'stagex-element-drawer',
  maxWidth = '680px',
}) => {
  return (
    <>
      {/* Tap Outside Backdrop */}
      {isOpen && (
        <div
          data-testid="stagex-drawer-backdrop"
          className="fixed inset-0 z-30"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Floating Bottom Slot Container (Unified Geometry & Material) */}
      <div
        data-testid={testId}
        role={role}
        aria-label={ariaLabel}
        className="fixed z-40 flex flex-col pointer-events-auto"
        style={{
          bottom: 'calc(max(10px, env(safe-area-inset-bottom, 0px)) + 4px)',
          left: 'calc(max(10px, env(safe-area-inset-left, 0px)) + 4px)',
          right: 'calc(max(10px, env(safe-area-inset-right, 0px)) + 4px)',
          maxWidth,
          margin: '0 auto',
          background: isAmoled
            ? 'rgba(10, 10, 14, 0.94)'
            : isLight
              ? 'rgba(255, 255, 255, 0.95)'
              : 'rgba(18, 18, 24, 0.92)',
          border: isAmoled
            ? '1px solid rgba(255, 255, 255, 0.12)'
            : isLight
              ? '1px solid rgba(0, 0, 0, 0.08)'
              : '1px solid rgba(255, 255, 255, 0.10)',
          backdropFilter: 'var(--surface-float-blur)',
          WebkitBackdropFilter: 'var(--surface-float-blur)',
          boxShadow: isLight
            ? '0 12px 36px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04)'
            : '0 16px 40px rgba(0, 0, 0, 0.65), 0 2px 10px rgba(0, 0, 0, 0.40)',
          borderRadius: '24px',
          padding: '10px 12px 12px 12px',
          pointerEvents: isOpen ? 'auto' : 'none',
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'translateY(0px) scale(1)' : 'translateY(12px) scale(0.98)',
          transition:
            'opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {children}
      </div>
    </>
  );
};
