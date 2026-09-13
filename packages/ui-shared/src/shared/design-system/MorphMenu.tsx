import React, { useEffect, useRef, useState, useCallback, useId } from 'react';
import { BackDispatcher } from '@workspace/studio-core';
import { activeOverlaysRegistry } from './dialogs';
import { useAppReducedMotion } from '../../hooks/useAppReducedMotion';

export interface MorphMenuRowItem {
  id: string;
  label: string;
  sublabel?: string;
  icon?: string | React.ReactNode;
  badge?: string;
  destructive?: boolean;
  disabled?: boolean;
  active?: boolean;
  onPress: () => void;
}

export interface MorphMenuProps {
  /** Controlled open state */
  open?: boolean;
  /** Uncontrolled default open state */
  defaultOpen?: boolean;
  /** Callback fired when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Width when expanded (defaults to 183px per reference) */
  openWidth?: number | string;
  /** Height when expanded (defaults to 172px per reference) */
  openHeight?: number | string;
  /** Square size when closed (defaults to 40px per reference) */
  closedSize?: number | string;
  /** Width when closed (defaults to closedSize) */
  closedWidth?: number | string;
  /** Height when closed (defaults to closedSize) */
  closedHeight?: number | string;
  /** Border radius when closed (defaults to 40px per reference) */
  closedRadius?: number | string;
  /** Border radius when expanded (defaults to 20px per reference) */
  openRadius?: number | string;
  /** Anchor corner for expansion (default: 'top-left') */
  anchor?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Accessible label for the trigger button */
  triggerAriaLabel?: string;
  /** Custom trigger icon (defaults to canonical 20x20 plus SVG) */
  triggerIcon?: React.ReactNode;
  /** Optional text label inside the trigger */
  triggerLabel?: string;
  /** Optional trigger CSS class name */
  triggerClassName?: string;
  /** Optional trigger inline style */
  triggerStyle?: React.CSSProperties;
  /** Optional header title in expanded menu */
  title?: string;
  /** Optional subtitle in expanded menu */
  subtitle?: string;
  /** Quick action row items */
  rows?: MorphMenuRowItem[];
  /**
   * Whether this menu acts as a foreground overlay.
   * When true, integrates with activeOverlaysRegistry and BackDispatcher (Android hardware back closes the morph).
   * Defaults to true.
   */
  asOverlay?: boolean;
  /** Additional CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Menu content or render-prop helper */
  children?: React.ReactNode | ((helpers: { close: () => void; isOpen: boolean }) => React.ReactNode);
  /** Test identifier */
  testId?: string;
}

/**
 * PlusIcon — Canonical SVG plus icon matching reference geometry
 * (20x20, strokeWidth 1.75, round caps).
 */
export function PlusIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M10 4V16M4 10H16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * MorphMenu / PlusMenu — Canonical in-place spatial morph interaction primitive.
 *
 * The originating trigger container physically morphs its dimensions and border-radius
 * following Transitions.dev behavioral specifications:
 * - Closed: compact button (40x40 circle default or custom)
 * - Open: rounded menu surface (183x172 r20 default or custom)
 * - Open: 350ms cubic-bezier(0.34, 1.25, 0.64, 1)
 * - Close: 250ms cubic-bezier(0.22, 1, 0.36, 1)
 * - Plus icon: slides left 40px, blurs 2px, and rotates 45deg
 * - Menu items: resolve from translateX(40px) scale(0.97) blur(2px)
 *
 * Zero detached modals. Trigger stays mounted in DOM with stable geometry.
 */
export const MorphMenu = React.forwardRef<HTMLDivElement, MorphMenuProps>(
  (
    {
      open: controlledOpen,
      defaultOpen = false,
      onOpenChange,
      openWidth = 183,
      openHeight = 172,
      closedSize = 40,
      closedWidth,
      closedHeight,
      closedRadius = 40,
      openRadius = 20,
      anchor = 'top-left',
      triggerAriaLabel = 'Open menu',
      triggerIcon,
      triggerLabel,
      triggerClassName = '',
      triggerStyle,
      title,
      subtitle,
      rows,
      asOverlay = true,
      className = '',
      style,
      children,
      testId,
    },
    forwardedRef
  ) => {
    const isControlled = controlledOpen !== undefined;
    const [internalOpen, setInternalOpen] = useState(defaultOpen);
    const isOpen = isControlled ? controlledOpen : internalOpen;

    const rawId = useId();
    const surfaceId = `morph-menu-${rawId.replace(/:/g, '')}`;
    const localRef = useRef<HTMLDivElement | null>(null);
    const prefersReduced = useAppReducedMotion();

    const setOpen = useCallback(
      (next: boolean | ((prev: boolean) => boolean)) => {
        const resolved = typeof next === 'function' ? next(isOpen) : next;
        if (!isControlled) {
          setInternalOpen(resolved);
        }
        onOpenChange?.(resolved);
      },
      [isControlled, isOpen, onOpenChange]
    );

    const handleClose = useCallback(() => {
      setOpen(false);
    }, [setOpen]);

    const handleToggle = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        setOpen((v) => !v);
      },
      [setOpen]
    );

    // Outside pointer dismissal & Escape key handling when open
    useEffect(() => {
      if (!isOpen) return;

      const onPointerDown = (e: MouseEvent | TouchEvent) => {
        const target = e.target as Node | null;
        if (localRef.current && target && !localRef.current.contains(target)) {
          handleClose();
        }
      };

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          handleClose();
        }
      };

      document.addEventListener('mousedown', onPointerDown, true);
      document.addEventListener('touchstart', onPointerDown, true);
      document.addEventListener('keydown', onKeyDown, true);

      return () => {
        document.removeEventListener('mousedown', onPointerDown, true);
        document.removeEventListener('touchstart', onPointerDown, true);
        document.removeEventListener('keydown', onKeyDown, true);
      };
    }, [isOpen, handleClose]);

    // Overlay Lifecycle: activeOverlaysRegistry & BackDispatcher
    useEffect(() => {
      if (!isOpen || !asOverlay) return;

      activeOverlaysRegistry.register('sheet', surfaceId);

      const unregisterBack = BackDispatcher.register('modal', () => {
        handleClose();
        return true; // Consume hardware back press
      });

      return () => {
        activeOverlaysRegistry.unregister('sheet', surfaceId);
        unregisterBack();
      };
    }, [isOpen, asOverlay, surfaceId, handleClose]);

    const resolvedOpenW = typeof openWidth === 'number' ? `${openWidth}px` : openWidth;
    const resolvedOpenH = typeof openHeight === 'number' ? `${openHeight}px` : openHeight;
    const resolvedClosedW =
      typeof (closedWidth ?? closedSize) === 'number'
        ? `${closedWidth ?? closedSize}px`
        : (closedWidth ?? closedSize);
    const resolvedClosedH =
      typeof (closedHeight ?? closedSize) === 'number'
        ? `${closedHeight ?? closedSize}px`
        : (closedHeight ?? closedSize);
    const resolvedClosedR = typeof closedRadius === 'number' ? `${closedRadius}px` : closedRadius;
    const resolvedOpenR = typeof openRadius === 'number' ? `${openRadius}px` : openRadius;

    const dynamicVars = {
      '--morph-w-open': resolvedOpenW,
      '--morph-h-open': resolvedOpenH,
      '--morph-w-closed': resolvedClosedW,
      '--morph-h-closed': resolvedClosedH,
      '--morph-r-closed': resolvedClosedR,
      '--morph-r-open': resolvedOpenR,
      ...style,
    } as React.CSSProperties;

    return (
      <div
        ref={(node) => {
          localRef.current = node;
          if (typeof forwardedRef === 'function') {
            forwardedRef(node);
          } else if (forwardedRef) {
            forwardedRef.current = node;
          }
        }}
        id={surfaceId}
        data-testid={testId}
        data-open={isOpen ? 'true' : 'false'}
        data-anchor={anchor}
        data-reduced-motion={prefersReduced ? 'true' : undefined}
        className={`t-morph ${className}`}
        style={dynamicVars}
      >
        {/* Expanded Menu Container */}
        <div
          className="t-morph-menu"
          role="menu"
          aria-hidden={!isOpen}
        >
          {rows && rows.length > 0 ? (
            <div className="flex flex-col p-1.5 gap-0.5 w-full h-full overflow-y-auto no-scrollbar justify-center">
              {title && (
                <div className="px-2.5 pt-1 pb-1 flex items-center justify-between border-b border-white/5 mb-1">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white tracking-wide truncate">{title}</div>
                    {subtitle && <div className="text-[10px] text-zinc-400 truncate">{subtitle}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer ml-1"
                    aria-label="Close menu"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              )}
              {rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  role="menuitem"
                  disabled={row.disabled}
                  data-destructive={row.destructive ? 'true' : undefined}
                  onClick={() => {
                    if (row.disabled) return;
                    row.onPress();
                    handleClose();
                  }}
                  className="t-morph-row"
                >
                  {row.icon && (
                    typeof row.icon === 'string' ? (
                      <span
                        className="material-symbols-outlined text-[16px] shrink-0"
                        style={{ color: row.destructive ? '#ef4444' : undefined }}
                      >
                        {row.icon}
                      </span>
                    ) : (
                      row.icon
                    )
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{row.label}</div>
                    {row.sublabel && <div className="text-[10px] text-zinc-400 truncate">{row.sublabel}</div>}
                  </div>
                  {row.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 shrink-0">
                      {row.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : typeof children === 'function' ? (
            children({ close: handleClose, isOpen })
          ) : (
            children
          )}
        </div>

        {/* Trigger Button (Remains permanently mounted in DOM) */}
        <button
          type="button"
          className={`t-morph-plus ${triggerClassName}`}
          style={triggerStyle}
          aria-expanded={isOpen}
          aria-label={triggerAriaLabel}
          aria-haspopup="menu"
          onClick={handleToggle}
          tabIndex={isOpen ? -1 : 0}
        >
          {triggerIcon || <PlusIcon />}
          {triggerLabel && <span className="ml-1 text-xs font-semibold">{triggerLabel}</span>}
        </button>
      </div>
    );
  }
);

MorphMenu.displayName = 'MorphMenu';

/** Export alias for behavioral parity with reference naming */
export const PlusMenu = MorphMenu;
