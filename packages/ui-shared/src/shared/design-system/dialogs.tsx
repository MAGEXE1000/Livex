export const activeOverlaysRegistry = {
  modals: new Set<string>(),
  sheets: new Set<string>(),
  listeners: new Set<() => void>(),

  register(type: 'modal' | 'sheet', id: string) {
    if (type === 'modal') this.modals.add(id);
    else this.sheets.add(id);
    this.notify();
  },
  unregister(type: 'modal' | 'sheet', id: string) {
    if (type === 'modal') this.modals.delete(id);
    else this.sheets.delete(id);
    this.notify();
  },
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  },
  notify() {
    this.listeners.forEach((l) => l());
  },
};

import React, { useEffect } from 'react';
import { BackDispatcher } from '@workspace/studio-core';
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogContainer,
  AlertDialogDialog,
  AlertDialogHeader,
  AlertDialogIcon,
  AlertDialogHeading,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogCloseTrigger,
} from '@heroui/react/alert-dialog';
import { MorphingModal } from '../../components/motion/morphing-modal';

export {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogContainer,
  AlertDialogDialog,
  AlertDialogHeader,
  AlertDialogIcon,
  AlertDialogHeading,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogCloseTrigger,
};

// ── 4. Dialog (Powered by HeroUI AlertDialog) ─────────────────────────────
export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  status?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
  isDestructive?: boolean;
  isDismissable?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'cover';
  placement?: 'auto' | 'top' | 'center' | 'bottom';
  hideCloseButton?: boolean;
  icon?: React.ReactNode;
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  status,
  isDestructive,
  isDismissable,
  size = 'sm',
  placement = 'center',
  hideCloseButton = false,
  icon,
}: DialogProps) {
  useEffect(() => {
    if (open) {
      const id = Math.random().toString();
      activeOverlaysRegistry.register('modal', id);
      const unregisterBack = BackDispatcher.register('modal', () => {
        onClose();
        return true;
      });
      return () => {
        activeOverlaysRegistry.unregister('modal', id);
        unregisterBack();
      };
    }
    return undefined;
  }, [open, onClose]);

  // Determine semantic status: if explicit status is passed, use it. Otherwise infer from isDestructive or title keywords.
  const isDestructiveInferred =
    isDestructive ||
    (typeof title === 'string' &&
      /delete|eliminar|remove|borrar|reset|clear|revocar|revoke/i.test(title));

  const resolvedStatus: 'default' | 'accent' | 'success' | 'warning' | 'danger' =
    status || (isDestructiveInferred ? 'danger' : 'default');

  // For destructive confirmations, prevent accidental outside backdrop dismissal
  const dismissable = isDismissable !== undefined ? isDismissable : !isDestructiveInferred;

  return (
    <AlertDialog
      isOpen={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <AlertDialog.Backdrop
        variant="blur"
        isDismissable={dismissable}
        isKeyboardDismissDisabled={isDestructiveInferred}
      >
        <AlertDialog.Container placement={placement} size={size}>
          <AlertDialog.Dialog className={className}>
            {!hideCloseButton && (
              <AlertDialog.CloseTrigger onClick={onClose} aria-label="Close dialog" />
            )}
            {title && (
              <AlertDialog.Header>
                {(icon || resolvedStatus !== 'default') && (
                  <AlertDialog.Icon status={resolvedStatus}>{icon}</AlertDialog.Icon>
                )}
                <AlertDialog.Heading>{title}</AlertDialog.Heading>
              </AlertDialog.Header>
            )}
            <AlertDialog.Body>{children}</AlertDialog.Body>
            {footer && <AlertDialog.Footer>{footer}</AlertDialog.Footer>}
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

// ── 7. Sheet ───────────────────────────────────────────────────────────────
export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  useEffect(() => {
    if (open) {
      const id = Math.random().toString();
      activeOverlaysRegistry.register('sheet', id);
      const unregisterBack = BackDispatcher.register('sheet', () => {
        onClose();
        return true;
      });
      return () => {
        activeOverlaysRegistry.unregister('sheet', id);
        unregisterBack();
      };
    }
    return undefined;
  }, [open, onClose]);

  return (
    <MorphingModal
      viewId={open ? title || 'sheet' : null}
      onClose={onClose}
      placement="bottom"
      className={className}
    >
      <div
        style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingBottom: '10px' }}
      >
        <div
          style={{
            width: '36px',
            height: '4px',
            borderRadius: '9999px',
            backgroundColor: 'var(--c-text-muted)',
            opacity: 0.4,
          }}
        />
      </div>
      {title && (
        <div
          style={{
            paddingBottom: '14px',
            marginBottom: '14px',
            borderBottom: '1px solid var(--track, var(--c-border))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 'var(--type-section-size, 19px)',
              lineHeight: 'var(--type-section-lh, 24px)',
              fontWeight: 'var(--type-section-weight, 600)' as any,
              fontFamily:
                'var(--type-section-font, var(--studio-font-display, "Inter Tight", sans-serif))',
              letterSpacing: 'var(--type-section-tracking, 0.6px)',
              color: 'var(--c-text-primary, var(--text))',
            }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="touch-target-44"
            style={{
              width: 'var(--btn-size-sm, 38px)',
              height: 'var(--btn-size-sm, 38px)',
              borderRadius: '50%',
              background: 'var(--app-surface-high)',
              border: '1px solid var(--track, var(--c-border))',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--c-text-secondary, var(--muted))',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              close
            </span>
          </button>
        </div>
      )}
      <div
        className="no-scrollbar"
        style={{
          overflowY: 'auto',
          maxHeight: '65vh',
          fontSize: 'var(--type-body-size, 14.5px)',
          lineHeight: 'var(--type-body-lh, 18px)',
          color: 'var(--c-text-secondary, var(--muted))',
          fontFamily: 'var(--type-body-font, var(--studio-font-body, "Inter", sans-serif))',
          letterSpacing: 'var(--type-body-tracking, 0.3px)',
        }}
      >
        {children}
      </div>
    </MorphingModal>
  );
}
