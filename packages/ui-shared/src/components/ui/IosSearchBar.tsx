import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface IosSearchBarProps {
  /** Current search input value. */
  value: string;
  /** Text change handler. */
  onChange: (value: string) => void;
  /** Submit handler fired on Enter. */
  onSubmit?: (value: string) => void;
  /** Optional clear handler called when the clear (X) or Cancel button is tapped. */
  onClear?: () => void;
  /** Optional cancel handler called when the Cancel button is tapped. */
  onCancel?: () => void;
  /** Optional focus handler. */
  onFocus?: () => void;
  /** Optional blur handler. */
  onBlur?: () => void;
  /** Placeholder text. Default is "Search...". */
  placeholder?: string;
  /** Disables input. */
  disabled?: boolean;
  /** Auto focus on mount. */
  autoFocus?: boolean;
  /** Whether to show the iOS animated Cancel button on focus. Defaults to true. */
  showCancelButton?: boolean;
  /** Custom label for the cancel button. Defaults to 'Cancel'. */
  cancelText?: string;
  /** Custom accent colors for focus state. */
  accent?: { from: string; to?: string; mid?: string };
  /** Custom CSS class names for the outer wrapper. */
  className?: string;
  /** Custom style for the outer container. */
  style?: React.CSSProperties;
  /** Custom style for the inner input element. */
  inputStyle?: React.CSSProperties;
  /** Optional HTML element id. */
  id?: string;
  /** Optional HTML element name. */
  name?: string;
  /** Optional test identifier. */
  'data-testid'?: string;
  /** Optional purpose identifier. */
  'data-purpose'?: string;
}

export interface IosSearchBarHandle {
  focus: () => void;
  blur: () => void;
  clear: () => void;
  input: HTMLInputElement | null;
}

export const IosSearchBar = forwardRef<IosSearchBarHandle, IosSearchBarProps>(
  (
    {
      value,
      onChange,
      onSubmit,
      onClear,
      onCancel,
      onFocus,
      onBlur,
      placeholder = 'Search...',
      disabled = false,
      autoFocus = false,
      showCancelButton = true,
      cancelText = 'Cancel',
      accent,
      className,
      style,
      inputStyle,
      id,
      name,
      'data-testid': dataTestId,
      'data-purpose': dataPurpose,
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      clear: handleClear,
      input: inputRef.current,
    }));

    const activeAccent = accent?.from || 'var(--c-accent-from, #7c3aed)';

    const handleClear = () => {
      onChange('');
      onClear?.();
      inputRef.current?.focus();
    };

    const handleCancel = () => {
      onChange('');
      onClear?.();
      onCancel?.();
      setIsFocused(false);
      inputRef.current?.blur();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        if (onSubmit) {
          e.preventDefault();
          onSubmit(value);
        }
      } else if (e.key === 'Escape') {
        setIsFocused(false);
        inputRef.current?.blur();
      }
    };

    const hasValue = Boolean(value && value.length > 0);
    const isExpanded = isFocused || hasValue;

    return (
      <div
        className={cn('relative flex items-center w-full select-none', className)}
        style={style}
        data-purpose={dataPurpose}
      >
        {/* Search Input Pill Container */}
        <div
          className={cn(
            'relative flex-1 flex items-center h-[44px] px-3.5 rounded-full border transition-all duration-200 backdrop-blur-md',
            isFocused
              ? 'border-white/25 shadow-sm'
              : 'border-white/10 hover:border-white/20'
          )}
          style={{
            backgroundColor: 'var(--surface-container-low, rgba(255, 255, 255, 0.08))',
            borderColor: isFocused
              ? (accent ? activeAccent : 'rgba(255, 255, 255, 0.25)')
              : 'var(--c-border, rgba(255, 255, 255, 0.1))',
            boxShadow: isFocused && accent ? `0 0 0 1px ${activeAccent}` : 'none',
          }}
        >
          {/* Magnifying Glass Icon */}
          <Search
            className="w-4 h-4 shrink-0 transition-colors pointer-events-none mr-2.5 text-neutral-500"
            aria-hidden="true"
          />

          {/* Native Text Input */}
          <input
            ref={inputRef}
            type="search"
            id={id}
            name={name}
            data-testid={dataTestId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              onFocus?.();
            }}
            onBlur={() => {
              setIsFocused(false);
              onBlur?.();
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            autoFocus={autoFocus}
            placeholder={placeholder}
            aria-label={placeholder}
            enterKeyHint="search"
            inputMode="search"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            data-no-focus-ring=""
            className={cn(
              'no-focus-ring w-full bg-transparent border-0 outline-none ring-0 shadow-none text-[16px] md:text-[14px] leading-normal focus:outline-none focus:ring-0 focus:border-0 focus:shadow-none select-text',
              '[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:appearance-none',
              '[&::-webkit-search-decoration]:hidden [&::-webkit-search-results-button]:hidden [&::-webkit-search-results-decoration]:hidden',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
            style={{
              color: 'var(--c-text-primary, #ffffff)',
              fontFamily: 'var(--studio-font-body, system-ui, sans-serif)',
              WebkitAppearance: 'none',
              appearance: 'none',
              backgroundColor: 'transparent',
              border: 0,
              boxShadow: 'none',
              outline: 'none',
              ...inputStyle,
            }}
          />

          {/* Interactive Clear (X) Button — Min 44x44px touch hit area */}
          <AnimatePresence>
            {hasValue && (
              <motion.button
                type="button"
                onClick={handleClear}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                aria-label="Clear search"
                className="shrink-0 -mr-2 w-[44px] h-[44px] flex items-center justify-center outline-none cursor-pointer touch-manipulation focus-visible:ring-1 focus-visible:ring-white rounded-full"
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center transition-colors bg-white/10 text-neutral-500 hover:text-neutral-300"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* iOS-Style Animated Cancel Button */}
        <AnimatePresence>
          {showCancelButton && isExpanded && (
            <motion.div
              initial={{ width: 0, opacity: 0, marginLeft: 0 }}
              animate={{ width: 'auto', opacity: 1, marginLeft: 8 }}
              exit={{ width: 0, opacity: 0, marginLeft: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320, mass: 0.7 }}
              className="overflow-hidden shrink-0 flex items-center"
            >
              <button
                type="button"
                onMouseDown={(e) => {
                  // Prevent blur before click executes
                  e.preventDefault();
                }}
                onClick={handleCancel}
                aria-label={cancelText}
                className={cn(
                  "h-[44px] px-2 flex items-center justify-center text-sm font-medium transition-colors active:opacity-60 cursor-pointer touch-manipulation whitespace-nowrap outline-none",
                  accent ? "" : "text-neutral-400 hover:text-white dark:text-neutral-300"
                )}
                style={accent ? { color: activeAccent } : undefined}
              >
                {cancelText}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

IosSearchBar.displayName = 'IosSearchBar';
export default IosSearchBar;
