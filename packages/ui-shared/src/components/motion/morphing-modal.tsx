'use client';
// beui.dev/components/motion/morphing-modal

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { EASE_OUT, SPRING_PANEL } from '../../lib/ease';
import { cn } from '../../lib/utils';

export interface MorphingModalProps {
  /** Which view is currently shown. `null` closes the modal. */
  viewId: string | null;
  onClose: () => void;
  children: ReactNode;
  /** "bottom" anchors to the viewport bottom (mobile-like). "center" centers vertically. */
  placement?: 'bottom' | 'center';
  className?: string;
}

export function MorphingModal({
  viewId,
  onClose,
  children,
  placement = 'bottom',
  className,
}: MorphingModalProps) {
  const open = viewId !== null;
  const reduce = useReducedMotion();
  const enterY = reduce ? 0 : placement === 'bottom' ? 40 : 20;
  const enterScale = reduce ? 1 : 0.97;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const modalContent = (
    <div
      aria-hidden={!open}
      inert={!open}
      className={cn(
        'fixed inset-0 z-[80] overscroll-contain',
        open ? 'pointer-events-auto' : 'pointer-events-none'
      )}
      style={{ touchAction: 'none' }}
    >
      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            aria-label="Close modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            onClick={onClose}
            className="absolute inset-0 pointer-events-auto"
            style={{
              background: 'var(--surface-modal-bg, var(--app-surface-scrim, rgba(0, 0, 0, 0.65)))',
              backdropFilter: 'var(--surface-scrim-blur, none)',
              WebkitBackdropFilter: 'var(--surface-scrim-blur, none)',
            }}
          />
        )}
      </AnimatePresence>

      <div
        className={cn(
          'pointer-events-none absolute inset-0 flex justify-center px-4',
          placement === 'bottom' ? 'items-end pb-8' : 'items-center'
        )}
      >
        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key="panel"
              layout
              initial={{ opacity: 0, y: enterY, scale: enterScale }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{
                opacity: 0,
                y: enterY,
                scale: reduce ? 1 : 0.98,
                transition: { duration: 0.18, ease: EASE_OUT },
              }}
              transition={SPRING_PANEL}
              className={cn(
                'pointer-events-auto relative w-full max-w-sm overflow-hidden will-change-transform overscroll-contain',
                className
              )}
              style={{
                touchAction: 'pan-y',
                borderRadius: 'var(--radius-major, 18px)',
                background:
                  'var(--surface-dialog-bg, var(--app-surface-high, var(--c-surface-high)))',
                border: '1px solid var(--track, var(--c-border))',
                color: 'var(--c-text-primary)',
                boxShadow:
                  '0 24px 64px -8px rgba(0, 0, 0, 0.5), 0 8px 24px -4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                backdropFilter: 'var(--surface-float-blur, none)',
                WebkitBackdropFilter: 'var(--surface-float-blur, none)',
              }}
            >
              <motion.div layout="position" className="p-5">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={viewId}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: 'blur(4px)' }}
                    animate={
                      reduce
                        ? {
                            opacity: 1,
                            transition: {
                              duration: 0.18,
                              ease: EASE_OUT,
                            },
                          }
                        : {
                            opacity: 1,
                            y: 0,
                            filter: 'blur(0px)',
                            transition: {
                              duration: 0.24,
                              ease: EASE_OUT,
                            },
                          }
                    }
                    exit={
                      reduce
                        ? {
                            opacity: 0,
                            transition: {
                              duration: 0.14,
                              ease: EASE_OUT,
                            },
                          }
                        : {
                            opacity: 0,
                            y: -8,
                            filter: 'blur(4px)',
                            transition: {
                              duration: 0.16,
                              ease: EASE_OUT,
                            },
                          }
                    }
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
