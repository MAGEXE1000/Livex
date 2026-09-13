import React, { createContext, useContext, useId, useState, useCallback } from 'react';
import { useAppReducedMotion } from '../../hooks/useAppReducedMotion';

// ── Context Types ──────────────────────────────────────────────────────────

interface AccordionContextValue {
  value: string[];
  toggleItem: (id: string) => void;
  isItemOpen: (id: string) => boolean;
  reducedMotion: boolean;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordionContext() {
  const ctx = useContext(AccordionContext);
  if (!ctx) {
    throw new Error('Accordion components must be used within an <Accordion>');
  }
  return ctx;
}

interface AccordionItemContextValue {
  id: string;
  isOpen: boolean;
  triggerId: string;
  panelId: string;
  disabled: boolean;
}

const AccordionItemContext = createContext<AccordionItemContextValue | null>(null);

function useAccordionItemContext() {
  const ctx = useContext(AccordionItemContext);
  if (!ctx) {
    throw new Error('AccordionItem subcomponents must be used within an <AccordionItem>');
  }
  return ctx;
}

// ── Accordion Root Component ───────────────────────────────────────────────

export interface AccordionProps {
  /** Mode: 'single' allows only 1 item open at a time; 'multiple' allows several. Defaults to 'single'. */
  type?: 'single' | 'multiple';
  /** Controlled value (item ID or array of item IDs) */
  value?: string | string[];
  /** Default value for uncontrolled state */
  defaultValue?: string | string[];
  /** Callback fired when open items change */
  onValueChange?: (value: string[]) => void;
  /** Whether items can be collapsed in 'single' mode. Defaults to true. */
  collapsible?: boolean;
  /** Additional CSS class names */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export function Accordion({
  type = 'single',
  value: controlledValue,
  defaultValue,
  onValueChange,
  collapsible = true,
  className = '',
  style,
  children,
}: AccordionProps) {
  const prefersReduced = useAppReducedMotion();

  const normalizeInitial = (): string[] => {
    if (defaultValue === undefined) return [];
    if (Array.isArray(defaultValue)) return defaultValue;
    return [defaultValue];
  };

  const [internalValue, setInternalValue] = useState<string[]>(normalizeInitial);
  const isControlled = controlledValue !== undefined;

  const currentValues = isControlled
    ? Array.isArray(controlledValue)
      ? controlledValue
      : controlledValue
        ? [controlledValue]
        : []
    : internalValue;

  const toggleItem = useCallback(
    (id: string) => {
      let next: string[];
      if (type === 'single') {
        if (currentValues.includes(id)) {
          next = collapsible ? [] : [id];
        } else {
          next = [id];
        }
      } else {
        if (currentValues.includes(id)) {
          next = currentValues.filter((item) => item !== id);
        } else {
          next = [...currentValues, id];
        }
      }

      if (!isControlled) {
        setInternalValue(next);
      }
      onValueChange?.(next);
    },
    [type, collapsible, currentValues, isControlled, onValueChange]
  );

  const isItemOpen = useCallback(
    (id: string) => currentValues.includes(id),
    [currentValues]
  );

  return (
    <AccordionContext.Provider
      value={{
        value: currentValues,
        toggleItem,
        isItemOpen,
        reducedMotion: prefersReduced,
      }}
    >
      <div
        data-accordion-root="true"
        className={`flex flex-col w-full ${className}`}
        style={style}
        data-reduced-motion={prefersReduced ? 'true' : undefined}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

// ── AccordionItem Component ────────────────────────────────────────────────

export interface AccordionItemProps {
  /** Unique identifier for this item */
  value: string;
  /** Whether this item is disabled */
  disabled?: boolean;
  /** Additional CSS class names */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export function AccordionItem({
  value,
  disabled = false,
  className = '',
  style,
  children,
}: AccordionItemProps) {
  const { isItemOpen, reducedMotion } = useAccordionContext();
  const rawId = useId();
  const triggerId = `acc-trigger-${rawId.replace(/:/g, '')}`;
  const panelId = `acc-panel-${rawId.replace(/:/g, '')}`;
  const isOpen = isItemOpen(value);

  return (
    <AccordionItemContext.Provider
      value={{
        id: value,
        isOpen,
        triggerId,
        panelId,
        disabled,
      }}
    >
      <div
        id={`acc-item-${value}`}
        data-open={isOpen ? 'true' : 'false'}
        data-disabled={disabled ? 'true' : undefined}
        data-reduced-motion={reducedMotion ? 'true' : undefined}
        className={`t-acc w-full ${className}`}
        style={style}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

// ── AccordionTrigger Component ─────────────────────────────────────────────

/** Canonical chevron icon (16x16) with scaleY flipping */
export function AccordionChevron({ className = '' }: { className?: string }) {
  return (
    <span className={`t-acc-chevron ${className}`} aria-hidden="true">
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 6l4 4 4-4" />
      </svg>
    </span>
  );
}

export interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  /** Whether to render the canonical flipping chevron. Defaults to true. */
  showChevron?: boolean;
  className?: string;
}

export function AccordionTrigger({
  children,
  showChevron = true,
  className = '',
  onClick,
  onKeyDown,
  ...props
}: AccordionTriggerProps) {
  const { toggleItem } = useAccordionContext();
  const { id, isOpen, triggerId, panelId, disabled } = useAccordionItemContext();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
      const trigger = e.currentTarget;
      const accordion = trigger.closest('[data-accordion-root="true"]');
      if (accordion) {
        const triggers = Array.from(
          accordion.querySelectorAll<HTMLButtonElement>('button[id^="acc-trigger-"]:not(:disabled)')
        );
        const index = triggers.indexOf(trigger);
        if (index !== -1) {
          e.preventDefault();
          if (e.key === 'ArrowDown') {
            const next = triggers[(index + 1) % triggers.length];
            next?.focus();
          } else if (e.key === 'ArrowUp') {
            const prev = triggers[(index - 1 + triggers.length) % triggers.length];
            prev?.focus();
          } else if (e.key === 'Home') {
            triggers[0]?.focus();
          } else if (e.key === 'End') {
            triggers[triggers.length - 1]?.focus();
          }
        }
      }
    }
    onKeyDown?.(e);
  };

  return (
    <button
      type="button"
      id={triggerId}
      aria-expanded={isOpen}
      aria-controls={panelId}
      disabled={disabled}
      onClick={(e) => {
        if (!disabled) {
          toggleItem(id);
        }
        onClick?.(e);
      }}
      onKeyDown={handleKeyDown}
      className={`t-acc-trigger flex w-full items-center justify-between py-3.5 px-4 text-left font-medium outline-none transition-colors select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
      {...props}
    >
      <span className="flex-1 min-w-0">{children}</span>
      {showChevron && <AccordionChevron />}
    </button>
  );
}

// ── AccordionContent Component ─────────────────────────────────────────────

export interface AccordionContentProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * AccordionContent — Native CSS Grid zero-measurement content expansion.
 *
 * Interpolates `grid-template-rows: 0fr` -> `1fr` natively over 250ms cubic-bezier(0.22, 1, 0.36, 1).
 * Inner container uses `overflow: hidden; min-height: 0;` with opacity and 2px blur transitions.
 * Zero JavaScript height calculation or layout thrashing.
 */
export function AccordionContent({
  children,
  className = '',
  style,
}: AccordionContentProps) {
  const { isOpen, triggerId, panelId } = useAccordionItemContext();

  return (
    <div
      id={panelId}
      role="region"
      aria-labelledby={triggerId}
      aria-hidden={!isOpen}
      inert={!isOpen ? true : undefined}
      className="t-acc-panel w-full"
    >
      <div
        className={`t-acc-panel-inner w-full ${className}`}
        style={style}
      >
        {children}
      </div>
    </div>
  );
}

// ── Standalone Simple Accordion Row Helper ──────────────────────────────────

export interface SimpleAccordionItemProps {
  value: string;
  title: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
}

export function SimpleAccordionItem({
  value,
  title,
  icon,
  children,
  disabled,
  className = '',
  triggerClassName = '',
  contentClassName = '',
}: SimpleAccordionItemProps) {
  return (
    <AccordionItem value={value} disabled={disabled} className={className}>
      <AccordionTrigger className={triggerClassName}>
        <div className="flex items-center gap-3 min-w-0">
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="truncate">{title}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className={contentClassName}>
        <div className="px-4 pb-4 text-sm leading-relaxed text-[var(--c-text-secondary)]">
          {children}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
