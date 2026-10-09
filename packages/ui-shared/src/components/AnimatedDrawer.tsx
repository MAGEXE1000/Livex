import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, type PanInfo } from 'motion/react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { BackDispatcher } from '@workspace/livex-core';
import { useAppReducedMotion } from '../hooks/useAppReducedMotion';
import { activeOverlaysRegistry } from '../shared/design-system/dialogs';

export interface AnimatedDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  testId?: string;
  confirmTestId?: string;
  cancelTestId?: string;
}

export function shouldDismissDrawer(
  offsetY: number,
  velocityY: number,
  thresholdDistance = 80,
  thresholdVelocity = 300
): boolean {
  return offsetY > thresholdDistance || velocityY > thresholdVelocity;
}

export function AnimatedDrawer({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = true,
  isLoading = false,
  icon,
  children,
  testId = 'animated-drawer',
  confirmTestId,
  cancelTestId,
}: AnimatedDrawerProps) {
  const reducedMotion = useAppReducedMotion();
  const drawerId = useId();
  const titleId = `${drawerId}-title`;
  const descId = `${drawerId}-desc`;

  // Focus, back-button and keyboard dismiss handling
  useEffect(() => {
    if (!isOpen) return;

    const overlayId = `drawer-${drawerId}`;
    activeOverlaysRegistry.register('sheet', overlayId);

    const unregisterBack = BackDispatcher.register('modal', () => {
      onClose();
      return true;
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      activeOverlaysRegistry.unregister('sheet', overlayId);
      unregisterBack();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, drawerId, onClose]);

  // SSR safety
  if (typeof document === 'undefined') return null;

  const springTransition = reducedMotion
    ? { duration: 0.15 }
    : { type: 'spring' as const, damping: 28, stiffness: 300, mass: 0.8 };

  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Dismiss if dragged down past threshold (80px) or with downward velocity (> 300px/s)
    if (shouldDismissDrawer(info.offset.y, info.velocity.y)) {
      onClose();
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
          data-testid={testId}
        >
          {/* Dimmed Blurred Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
            data-testid={`${testId}-backdrop`}
          />

          {/* Spring-Driven Surface with Drag-to-Dismiss */}
          <motion.div
            className="relative z-10 w-full max-w-lg mx-auto rounded-t-3xl border-t border-white/10 shadow-[0_-8px_32px_rgba(0,0,0,0.6)] outline-none overflow-hidden"
            style={{
              background: 'var(--studio-surface-0, #0a0a0c)',
              paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springTransition}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.15}
            dragSnapToOrigin
            onDragEnd={handleDragEnd}
            data-testid={`${testId}-surface`}
          >
            {/* Drag Handle Bar */}
            <div className="w-full flex items-center justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none">
              <div
                className="w-12 h-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                aria-hidden="true"
              />
            </div>

            {/* Content Area */}
            <div className="px-6 pt-2 pb-3">
              {/* Header with Icon and Title */}
              <div className="flex items-center gap-3.5 mb-3">
                {icon ? (
                  <div className="flex-shrink-0">{icon}</div>
                ) : isDestructive ? (
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-400 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-5 h-5 text-rose-400" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-400 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3
                    id={titleId}
                    className="text-lg font-semibold text-white tracking-tight leading-snug truncate"
                  >
                    {title}
                  </h3>
                  {description && (
                    <div
                      id={descId}
                      className="text-sm text-zinc-400 mt-0.5 leading-relaxed"
                    >
                      {description}
                    </div>
                  )}
                </div>
              </div>

              {/* Children Slot */}
              {children && <div className="mt-2 mb-4">{children}</div>}

              {/* Ergonomic Thumb Action Buttons */}
              {onConfirm && (
                <div className="flex items-center gap-3 mt-5 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    data-testid={cancelTestId || `${testId}-cancel-btn`}
                    className="flex-1 min-h-[48px] h-12 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-[0.98] text-white/90 text-sm font-semibold tracking-wide flex items-center justify-center transition-all border border-white/5 cursor-pointer disabled:opacity-50 select-none"
                  >
                    {cancelText}
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={isLoading}
                    data-testid={confirmTestId || `${testId}-confirm-btn`}
                    className={`flex-1 min-h-[48px] h-12 rounded-2xl text-sm font-semibold tracking-wide flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98] select-none ${
                      isDestructive
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/40 border border-rose-500/30'
                        : 'bg-white hover:bg-zinc-200 text-black shadow-lg border border-white/20'
                    }`}
                  >
                    {isLoading ? (
                      <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    ) : null}
                    {confirmText}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
