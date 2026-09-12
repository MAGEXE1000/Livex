import React, { useState, useEffect, useCallback, useRef, forwardRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Button as HeroUIButton,
  ButtonRoot as HeroUIButtonRoot,
  buttonVariants,
} from '@heroui/react/button';
import {
  ButtonGroup as HeroUIButtonGroup,
  ButtonGroupRoot as HeroUIButtonGroupRoot,
  ButtonGroupSeparator,
  buttonGroupVariants,
} from '@heroui/react/button-group';
import { SpringPresets } from '@workspace/studio-core';
import { AnimatedIcon } from '../icons/AnimatedIcon';
import { EASE_OUT } from '../../lib/ease';
import { useHoverCapable } from '../../lib/hooks/use-hover-capable';
import { useAppReducedMotion } from '../../hooks/useAppReducedMotion';

export {
  HeroUIButton,
  HeroUIButtonRoot,
  HeroUIButtonGroup,
  HeroUIButtonGroupRoot,
  ButtonGroupSeparator,
  buttonVariants,
  buttonGroupVariants,
};

type Ripple = { id: number; x: number; y: number; size: number };

// ── 1. Button (HeroUI Powered) ─────────────────────────────────────────────
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'danger-soft' | 'ghost' | 'outline' | 'tertiary';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  isLoading?: boolean;
  isIconOnly?: boolean;
  fullWidth?: boolean;
  icon?: string | React.ReactNode;
  ripple?: boolean;
  isPill?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      loading = false,
      isLoading = false,
      isIconOnly = false,
      fullWidth = false,
      icon,
      ripple = false,
      isPill = true,
      children,
      style,
      className = '',
      disabled,
      onPointerDown,
      ...props
    },
    ref
  ) => {
    const activeLoading = loading || isLoading;
    const reduce = useAppReducedMotion();
    const canHover = useHoverCapable();
    const [ripples, setRipples] = useState<Ripple[]>([]);
    const nextId = useRef(0);

    const handlePointerDown = useCallback(
      (event: React.PointerEvent<HTMLButtonElement>) => {
        if (ripple && !reduce && !disabled && !activeLoading) {
          const rect = event.currentTarget.getBoundingClientRect();
          const sizeVal = Math.max(rect.width, rect.height) * 2;
          const id = nextId.current++;
          setRipples((prev) => [
            ...prev,
            {
              id,
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
              size: sizeVal,
            },
          ]);
        }
        onPointerDown?.(event);
      },
      [ripple, reduce, disabled, activeLoading, onPointerDown]
    );

    const getColors = () => {
      if (variant === 'primary') {
        return {
          bg: 'linear-gradient(135deg, var(--c-accent-from, #2563eb), var(--c-accent-to, var(--c-accent-from, #2563eb)))',
          text: 'var(--color-on-tertiary, #ffffff)',
          border: 'var(--studio-accent-border, rgba(255, 255, 255, 0.20))',
          shadow: 'var(--studio-accent-glow)',
        };
      }
      if (variant === 'danger' || variant === 'danger-soft') {
        return {
          bg: variant === 'danger' ? 'rgba(239, 68, 68, 0.14)' : 'rgba(239, 68, 68, 0.08)',
          text: 'var(--c-error, #ee7d77)',
          border: variant === 'danger' ? 'rgba(239, 68, 68, 0.28)' : 'rgba(239, 68, 68, 0.15)',
          shadow: variant === 'danger' ? '0 2px 8px rgba(239, 68, 68, 0.15)' : 'none',
        };
      }
      if (variant === 'tertiary') {
        return {
          bg: 'var(--c-surface-low)',
          text: 'var(--c-text-secondary)',
          border: '1px solid transparent',
          shadow: 'none',
        };
      }
      if (variant === 'ghost') {
        return {
          bg: 'transparent',
          text: 'var(--c-text-primary)',
          border: 'transparent',
          shadow: 'none',
        };
      }
      if (variant === 'outline') {
        return {
          bg: 'transparent',
          text: 'var(--c-text-primary)',
          border: 'var(--c-border)',
          shadow: 'none',
        };
      }
      return {
        bg: 'var(--surface-topbar-bg)',
        text: 'var(--c-text-primary)',
        border: '1px solid var(--c-border, rgba(128, 128, 128, 0.12))',
        shadow: 'var(--shadow-control-raised, var(--elevation-low))',
      };
    };

    const colors = getColors();

    // Size mappings matching canonical mobile standards
    const getPaddingAndHeight = () => {
      if (size === 'icon' || isIconOnly) {
        const boxSize =
          size === 'sm'
            ? 'var(--btn-size-sm, 38px)'
            : size === 'lg'
              ? 'var(--btn-size-lg, 46px)'
              : 'var(--btn-size-md, 42px)';
        const rad = isPill
          ? '50%'
          : size === 'lg'
            ? 'var(--radius-card, 16px)'
            : 'var(--radius-compact, 12px)';
        return {
          height: boxSize,
          width: boxSize,
          padding: '0',
          fontSize: '12px',
          borderRadius: rad,
        };
      }
      if (size === 'sm') {
        return {
          height: 'var(--btn-size-sm, 38px)',
          width: fullWidth ? '100%' : undefined,
          padding: isPill ? '0 18px' : '0 14px',
          fontSize: '13px',
          borderRadius: isPill ? '9999px' : 'var(--radius-compact, 12px)',
        };
      }
      if (size === 'lg') {
        return {
          height: 'var(--btn-size-lg, 46px)',
          width: fullWidth ? '100%' : undefined,
          padding: isPill ? '0 24px' : '0 20px',
          fontSize: '15px',
          borderRadius: isPill ? '9999px' : 'var(--radius-card, 16px)',
        };
      }
      return {
        height: 'var(--btn-size-md, 42px)',
        width: fullWidth ? '100%' : undefined,
        padding: isPill ? '0 20px' : '0 16px',
        fontSize: '13.5px',
        borderRadius: isPill ? '9999px' : 'var(--radius-compact, 12px)',
      };
    };

    const dims = getPaddingAndHeight();
    const resolvedSizeClass = size === 'icon' ? 'button--icon-only button--md' : `button--${size}`;
    const iconOnlyClass = isIconOnly ? 'button--icon-only touch-target-44' : '';
    const fullWidthClass = fullWidth ? 'button--full-width' : '';

    return (
      <motion.button
        ref={ref}
        type="button"
        whileTap={disabled || activeLoading || reduce ? undefined : { scale: 0.96 }}
        whileHover={disabled || activeLoading || reduce || !canHover ? undefined : { scale: 1.015 }}
        transition={SpringPresets.soft}
        onPointerDown={handlePointerDown}
        style={{
          height: dims.height,
          width: (dims as any).width,
          padding: dims.padding,
          fontSize: dims.fontSize,
          borderRadius: dims.borderRadius,
          fontFamily: 'var(--type-button-font, var(--studio-font-body, "Inter", sans-serif))',
          fontWeight: 600,
          letterSpacing: 'var(--type-button-tracking, -0.2px)',
          background: colors.bg,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          boxShadow: colors.shadow,
          backdropFilter: variant === 'secondary' ? 'blur(12px)' : undefined,
          WebkitBackdropFilter: variant === 'secondary' ? 'blur(12px)' : undefined,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          cursor: disabled || activeLoading ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.45 : 1,
          outline: 'none',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: ripple && !reduce ? 'hidden' : 'visible',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          transition: 'background-color 200ms ease, border-color 200ms ease, color 200ms ease',
          ...style,
        }}
        disabled={disabled || activeLoading}
        className={`button button--${variant} ${resolvedSizeClass} ${iconOnlyClass} ${fullWidthClass} btn-smooth ${className}`.trim()}
        {...(props as any)}
      >
        {ripple && !reduce ? (
          <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
            <AnimatePresence>
              {ripples.map((r) => (
                <motion.span
                  key={r.id}
                  className="absolute rounded-full bg-current"
                  style={{
                    left: r.x,
                    top: r.y,
                    width: r.size,
                    height: r.size,
                    x: '-50%',
                    y: '-50%',
                  }}
                  initial={{ scale: 0.05, opacity: 0.25 }}
                  animate={{ scale: 1, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: EASE_OUT }}
                  onAnimationComplete={() =>
                    setRipples((prev) => prev.filter((x) => x.id !== r.id))
                  }
                />
              ))}
            </AnimatePresence>
          </span>
        ) : null}

        {activeLoading ? (
          <AnimatedIcon name="loader-circle" state="loading" size={16} />
        ) : icon ? (
          typeof icon === 'string' ? (
            <AnimatedIcon name={icon} size={16} />
          ) : (
            icon
          )
        ) : null}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

// ── 1.2. ButtonGroup (HeroUI Powered) ──────────────────────────────────────
export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'danger-soft' | 'ghost' | 'outline' | 'tertiary';
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  fullWidth?: boolean;
  isDisabled?: boolean;
  children: React.ReactNode;
}

export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      orientation = 'horizontal',
      fullWidth = false,
      isDisabled = false,
      className = '',
      children,
      style,
      ...props
    },
    ref
  ) => {
    return (
      <HeroUIButtonGroup
        ref={ref}
        variant={variant}
        size={size}
        orientation={orientation}
        fullWidth={fullWidth}
        isDisabled={isDisabled}
        className={`button-group button-group--${orientation} ${fullWidth ? 'button-group--full-width' : ''} ${className}`.trim()}
        style={style}
        {...(props as any)}
      >
        {children}
      </HeroUIButtonGroup>
    );
  }
) as React.ForwardRefExoticComponent<ButtonGroupProps & React.RefAttributes<HTMLDivElement>> & {
  Separator: typeof ButtonGroupSeparator;
};

ButtonGroup.Separator = ButtonGroupSeparator;
ButtonGroup.displayName = 'ButtonGroup';

// ── 1.5. IconButton ────────────────────────────────────────────────────────
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string | React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-soft' | 'tertiary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  shape?: 'squircle' | 'circle';
  loading?: boolean;
  isLoading?: boolean;
  'aria-label'?: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      variant = 'secondary',
      size = 'md',
      shape = 'circle',
      loading = false,
      disabled,
      style,
      className = '',
      ...props
    },
    ref
  ) => {
    const reduce = useAppReducedMotion();
    const canHover = useHoverCapable();

    const getDim = () => {
      if (size === 'sm')
        return {
          box: 38,
          icon: 18,
          radius: shape === 'circle' ? '50%' : 'var(--radius-compact, 12px)',
        };
      if (size === 'lg')
        return {
          box: 46,
          icon: 22,
          radius: shape === 'circle' ? '50%' : 'var(--radius-card, 16px)',
        };
      return {
        box: 42,
        icon: 20,
        radius: shape === 'circle' ? '50%' : 'var(--radius-compact, 12px)',
      };
    };

    const dim = getDim();

    const getStyles = () => {
      if (variant === 'primary') {
        return {
          bg: 'linear-gradient(135deg, var(--c-accent-from, #2563eb), var(--c-accent-to, var(--c-accent-from, #2563eb)))',
          color: 'var(--color-on-tertiary, #ffffff)',
          border: '1px solid var(--studio-accent-border, rgba(255, 255, 255, 0.20))',
          shadow: 'var(--studio-accent-glow), inset 0 1px 1.5px rgba(255, 255, 255, 0.35)',
        };
      }
      if (variant === 'danger' || variant === 'danger-soft') {
        return {
          bg: 'rgba(239, 68, 68, 0.12)',
          color: 'var(--c-error, #ef4444)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          shadow: '0 2px 8px rgba(239, 68, 68, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
        };
      }
      if (variant === 'ghost') {
        return {
          bg: 'transparent',
          color: 'var(--c-text-primary)',
          border: '1px solid transparent',
          shadow: 'none',
        };
      }
      return {
        bg: 'var(--btn-surface-bg, var(--surface-topbar-bg))',
        color: 'var(--strong, var(--c-text-primary))',
        border: '1px solid var(--track, var(--c-border))',
        shadow:
          'var(--btn-surface-shadow, 0 2px 8px rgba(0, 0, 0, 0.16)), var(--btn-surface-inset, inset 0 1px 1px rgba(255, 255, 255, 0.16))',
      };
    };

    const s = getStyles();

    return (
      <motion.button
        ref={ref}
        type="button"
        whileTap={disabled || loading || reduce ? undefined : { scale: 0.93 }}
        whileHover={disabled || loading || reduce || !canHover ? undefined : { scale: 1.03 }}
        transition={SpringPresets.soft}
        disabled={disabled || loading}
        style={{
          width: dim.box,
          height: dim.box,
          borderRadius: dim.radius,
          background: s.bg,
          color: s.color,
          border: s.border,
          boxShadow: s.shadow,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          outline: 'none',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          boxSizing: 'border-box',
          ...style,
        }}
        className={`btn-smooth touch-target-44 ${className}`}
        {...(props as any)}
      >
        {loading ? (
          <AnimatedIcon name="loader-circle" state="loading" size={dim.icon} />
        ) : typeof icon === 'string' ? (
          <span className="material-symbols-outlined" style={{ fontSize: dim.icon }}>
            {icon}
          </span>
        ) : (
          icon
        )}
      </motion.button>
    );
  }
);

IconButton.displayName = 'IconButton';

// ── 2. Floating Button ────────────────────────────────────────────────────
export interface FloatingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
}

export function FloatingButton({ icon, style, className = '', ...props }: FloatingButtonProps) {
  const reduce = useAppReducedMotion();
  const canHover = useHoverCapable();

  return (
    <motion.button
      whileHover={reduce || !canHover ? undefined : { scale: 1.03, y: -2 }}
      whileTap={reduce ? undefined : { scale: 0.94, y: 0 }}
      transition={SpringPresets.soft}
      style={{
        width: '56px',
        height: '56px',
        borderRadius: 'var(--radius-major, 18px)',
        background:
          'linear-gradient(135deg, var(--c-accent-from, #7c3aed), var(--c-accent-to, var(--c-accent-from, #7c3aed)))',
        color: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow:
          '0 8px 28px rgba(0, 0, 0, 0.35), 0 0 20px var(--c-accent-from, rgba(124, 58, 237, 0.35)), inset 0 1px 1.5px rgba(255, 255, 255, 0.40)',
        cursor: 'pointer',
        outline: 'none',
        boxSizing: 'border-box',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
      className={`studio-fab ${className}`}
      {...(props as any)}
    >
      <AnimatedIcon name={icon} size={24} />
    </motion.button>
  );
}

// ── 3. Action Button ──────────────────────────────────────────────────────
export type ActionButtonVariant =
  | 'copy'
  | 'share'
  | 'delete'
  | 'save'
  | 'favorite'
  | 'visibility'
  | 'upload'
  | 'download'
  | 'duplicate'
  | 'refresh'
  | 'export'
  | 'import'
  | 'edit';

export interface ActionButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onDragOver' | 'onAnimationStart'
> {
  variant: ActionButtonVariant;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => Promise<boolean | void> | boolean | void;
  isFavorite?: boolean;
  isVisible?: boolean;
  isLoading?: boolean;
  isDisabled?: boolean;
  label?: string;
  iconSize?: number;
  children?: React.ReactNode;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  variant,
  onClick,
  isFavorite = false,
  isVisible = true,
  isLoading = false,
  isDisabled = false,
  label,
  iconSize = 20,
  children,
  style,
  className = '',
  ...props
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const reduce = useAppReducedMotion();
  const canHover = useHoverCapable();

  // Reset success state after a delay
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (success) {
      timer = setTimeout(() => {
        setSuccess(false);
      }, 2000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [success]);

  // Reset delete confirmation after a delay if not confirmed
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (confirmingDelete) {
      timer = setTimeout(() => {
        setConfirmingDelete(false);
      }, 3000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [confirmingDelete]);

  const activeLoading = isLoading || internalLoading;
  const isButtonDisabled = isDisabled || activeLoading;

  const handleTap = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isButtonDisabled) return;

    // Create ripple effect
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rippleId = Date.now();
    setRipples((prev) => [...prev, { id: rippleId, x, y }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== rippleId));
    }, 600);

    // Destructive delete flow safety check
    if (variant === 'delete' && !confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }

    if (onClick) {
      try {
        setInternalLoading(true);
        const result = await onClick(e);
        setInternalLoading(false);

        // Success animation trigger
        if (result !== false) {
          setSuccess(true);
          if (variant === 'delete') {
            setConfirmingDelete(false);
          }
        }
      } catch (err) {
        setInternalLoading(false);
        console.error('ActionButton failed execution:', err);
      }
    } else {
      // Dummy action support for local transitions
      setSuccess(true);
    }
  };

  // Get icon based on state/variant
  const getIconName = (): string => {
    if (success) {
      return variant === 'delete' ? 'delete_forever' : 'check';
    }
    if (activeLoading) return 'progress_activity';

    switch (variant) {
      case 'copy':
        return 'content_copy';
      case 'share':
        return 'share';
      case 'delete':
        return confirmingDelete ? 'warning' : 'delete';
      case 'save':
        return 'save';
      case 'favorite':
        return isFavorite ? 'star' : 'star_outline';
      case 'visibility':
        return isVisible ? 'visibility' : 'visibility_off';
      case 'upload':
        return 'upload';
      case 'download':
        return 'download';
      case 'duplicate':
        return 'content_copy';
      case 'refresh':
        return 'refresh';
      case 'export':
        return 'output';
      case 'import':
        return 'publish';
      case 'edit':
        return 'edit';
      default:
        return 'smart_button';
    }
  };

  // Get accessible labels
  const getAriaLabel = (): string => {
    if (label) return label;
    switch (variant) {
      case 'copy':
        return success ? 'Copied successfully' : 'Copy contents';
      case 'share':
        return 'Share diagnostics or information';
      case 'delete':
        return confirmingDelete ? 'Confirm delete' : 'Delete item';
      case 'save':
        return 'Save current work';
      case 'favorite':
        return isFavorite ? 'Remove from favorites' : 'Add to favorites';
      case 'visibility':
        return isVisible ? 'Hide content' : 'Show content';
      case 'edit':
        return 'Edit name or properties';
      default:
        return `${variant} action button`;
    }
  };

  // Color matching variants
  const getButtonStyles = () => {
    let bg = 'var(--c-surface-low)';
    let border = '1px solid var(--c-border)';
    let color = 'var(--c-text-primary)';
    const shadow = 'var(--shadow-control-raised, var(--elevation-low))';

    if (variant === 'delete') {
      if (confirmingDelete) {
        bg = 'var(--c-error-container, rgba(239, 68, 68, 0.2))';
        border = '1px solid var(--c-error, rgb(239, 68, 68))';
        color = 'var(--c-error-dim, rgb(248, 113, 113))';
      } else if (success) {
        bg = 'rgba(16, 185, 129, 0.15)';
        border = '1px solid rgb(16, 185, 129)';
        color = 'rgb(52, 211, 153)';
      }
    } else if (success) {
      bg = 'rgba(16, 185, 129, 0.15)';
      border = '1px solid rgb(16, 185, 129)';
      color = 'rgb(52, 211, 153)';
    }

    return { bg, border, color, shadow };
  };

  const { bg, border, color, shadow } = getButtonStyles();

  return (
    <motion.button
      type="button"
      onClick={handleTap}
      disabled={isButtonDisabled}
      aria-label={getAriaLabel()}
      whileHover={
        isButtonDisabled || reduce || !canHover
          ? undefined
          : { scale: 1.02, boxShadow: 'var(--shadow-surface-soft)', y: -1 }
      }
      whileTap={isButtonDisabled || reduce ? undefined : { scale: 0.96 }}
      transition={SpringPresets.soft}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        border: border,
        color: color,
        borderRadius: '9999px',
        padding: '8px 14px',
        cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
        outline: 'none',
        overflow: 'hidden',
        boxShadow: shadow,
        fontFamily: 'var(--type-button-font, var(--studio-font-body))',
        fontWeight: 700,
        fontSize: '13px',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        opacity: isDisabled ? 0.5 : 1,
        transition:
          'background 250ms ease, border-color 250ms ease, color 250ms ease, opacity 250ms ease',
        ...style,
      }}
      className={`action-btn-root ${className}`}
      {...props}
    >
      {/* Ripple render */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          style={{
            position: 'absolute',
            left: ripple.x,
            top: ripple.y,
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: 'var(--c-border)',
            transform: 'translate(-50%, -50%) scale(5)',
            transformOrigin: 'center',
            pointerEvents: 'none',
            opacity: 0,
            transition: 'transform 450ms cubic-bezier(0.1, 0.8, 0.3, 1), opacity 450ms ease-out',
          }}
          ref={(el) => {
            if (el) {
              requestAnimationFrame(() => {
                el.style.transform = 'translate(-50%, -50%) scale(12)';
                el.style.opacity = '1';
                setTimeout(() => {
                  el.style.opacity = '0';
                }, 100);
              });
            }
          }}
        />
      ))}

      {/* Animated Icon morph */}
      <AnimatePresence mode="wait" initial={false}>
        <AnimatedIcon
          key={getIconName()}
          name={getIconName()}
          size={iconSize}
          state={success ? 'success' : activeLoading ? 'loading' : 'inactive'}
          color="currentColor"
        />
      </AnimatePresence>

      {children && <span style={{ marginLeft: '8px', lineHeight: 1 }}>{children}</span>}
    </motion.button>
  );
};

ActionButton.displayName = 'ActionButton';

// ── 4. ButtonLink ──────────────────────────────────────────────────────────
export interface ButtonLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  icon?: string;
}

export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  (
    { variant = 'secondary', size = 'md', icon, children, style, className = '', ...props },
    ref
  ) => {
    const reduce = useAppReducedMotion();
    const canHover = useHoverCapable();

    const getColors = () => {
      if (variant === 'primary') {
        return {
          bg: 'linear-gradient(135deg, var(--c-accent-from, #7c3aed), var(--c-accent-to, var(--c-accent-from, #7c3aed)))',
          text: 'var(--color-on-tertiary, #ffffff)',
          border: '1px solid var(--studio-accent-border, rgba(255, 255, 255, 0.20))',
          shadow: 'var(--studio-accent-glow)',
        };
      }
      if (variant === 'danger') {
        return {
          bg: 'rgba(239, 68, 68, 0.12)',
          text: 'var(--c-error, #ef4444)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          shadow: '0 2px 10px rgba(239, 68, 68, 0.15)',
        };
      }
      if (variant === 'ghost') {
        return {
          bg: 'transparent',
          text: 'var(--c-text-primary)',
          border: 'transparent',
          shadow: 'none',
        };
      }
      if (variant === 'outline') {
        return {
          bg: 'transparent',
          text: 'var(--c-text-primary)',
          border: 'var(--c-border)',
          shadow: 'none',
        };
      }
      return {
        bg: 'var(--surface-topbar-bg)',
        text: 'var(--c-text-primary)',
        border: '1px solid var(--c-border)',
        shadow: 'var(--elevation-low)',
      };
    };

    const colors = getColors();

    const getPaddingAndHeight = () => {
      if (size === 'icon') {
        return {
          height: '36px',
          width: '36px',
          padding: '0',
          fontSize: '12px',
          borderRadius: '12px',
        };
      }
      if (size === 'sm') {
        return {
          height: '32px',
          padding: '0 14px',
          fontSize: '12px',
          borderRadius: '16px',
        };
      }
      if (size === 'lg') {
        return {
          height: '48px',
          padding: '0 24px',
          fontSize: '15px',
          borderRadius: '24px',
        };
      }
      return {
        height: '40px',
        padding: '0 18px',
        fontSize: '13.5px',
        borderRadius: '20px',
      };
    };

    const dims = getPaddingAndHeight();

    return (
      <motion.a
        ref={ref}
        whileTap={reduce ? undefined : { scale: 0.96 }}
        whileHover={reduce || !canHover ? undefined : { scale: 1.015 }}
        transition={SpringPresets.soft}
        style={{
          height: dims.height,
          width: (dims as any).width,
          padding: dims.padding,
          fontSize: dims.fontSize,
          borderRadius: dims.borderRadius,
          fontFamily: 'var(--type-button-font, var(--studio-font-body))',
          fontWeight: 750,
          letterSpacing: '-0.01em',
          background: colors.bg,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          boxShadow: colors.shadow,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          cursor: 'pointer',
          outline: 'none',
          boxSizing: 'border-box',
          position: 'relative',
          userSelect: 'none',
          textDecoration: 'none',
          WebkitTapHighlightColor: 'transparent',
          transition: 'background-color 200ms ease, border-color 200ms ease, color 200ms ease',
          ...style,
        }}
        className={`btn-smooth ${className}`}
        {...(props as any)}
      >
        {icon && <AnimatedIcon name={icon} size={16} />}
        {children}
      </motion.a>
    );
  }
);

ButtonLink.displayName = 'ButtonLink';

// ── 5. StatefulButton ──────────────────────────────────────────────────────
export interface StatefulButtonProps extends Omit<ButtonProps, 'onClick'> {
  state: 'idle' | 'loading' | 'success' | 'error';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  successIcon?: string;
  errorIcon?: string;
}

export const StatefulButton = forwardRef<HTMLButtonElement, StatefulButtonProps>(
  (
    {
      state,
      onClick,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      successIcon = 'check',
      errorIcon = 'error',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isActuallyLoading = state === 'loading' || loading;
    const isActuallyDisabled = disabled || isActuallyLoading;

    const getIcon = () => {
      if (state === 'success') return successIcon;
      if (state === 'error') return errorIcon;
      return icon;
    };

    return (
      <Button
        ref={ref}
        variant={state === 'error' ? 'danger' : variant}
        size={size}
        loading={isActuallyLoading}
        icon={getIcon()}
        disabled={isActuallyDisabled}
        onClick={onClick}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

StatefulButton.displayName = 'StatefulButton';
