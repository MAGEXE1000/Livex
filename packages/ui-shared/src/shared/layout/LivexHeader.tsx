import React from 'react';

export interface StudioHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  disableTopInset?: boolean;
  disableHorizontalPadding?: boolean;
  titleClassName?: string;
  subtitleClassName?: string;
  titleStyle?: React.CSSProperties;
  subtitleStyle?: React.CSSProperties;
  containerStyle?: React.CSSProperties;
  staggerInterval?: number;
  delayOffset?: number;
}

export function StudioHeader({
  title,
  subtitle,
  actions,
  badge,
  disableTopInset = false,
  disableHorizontalPadding = false,
  titleClassName = '',
  subtitleClassName = '',
  titleStyle = {},
  subtitleStyle = {},
  containerStyle = {},
}: StudioHeaderProps) {
  const mergedTitleStyle: React.CSSProperties = {
    fontFamily: 'var(--type-title-font, var(--font-title, "Inter Tight", sans-serif))',
    color: 'var(--c-text-primary)',
    lineHeight: 'var(--type-title-lh, 28px)',
    fontSize: 'var(--type-title-size, 22px)',
    fontWeight: 'var(--type-title-weight, 700)' as any,
    letterSpacing: 'var(--type-title-tracking, -0.7px)',
    textAlign: 'left',
    marginTop: 0,
    marginBottom: 0,
    ...titleStyle,
  };

  const mergedSubtitleStyle: React.CSSProperties = {
    fontFamily: 'var(--type-body-font, var(--font-body, "Inter", sans-serif))',
    color: 'var(--c-text-secondary)',
    lineHeight: 'var(--type-body-lh, 18px)',
    fontSize: 'var(--type-body-size, 14.5px)',
    fontWeight: 400,
    letterSpacing: 'var(--type-body-tracking, 0.3px)',
    marginTop: '4px',
    marginBottom: 0,
    ...subtitleStyle,
  };

  const textContent = (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
      {badge && <div style={{ marginBottom: 4 }}>{badge}</div>}
      {typeof title === 'string' ? (
        <h2 className={titleClassName} data-testid="studio-header-title" style={mergedTitleStyle}>
          {title}
        </h2>
      ) : (
        <div className={titleClassName} data-testid="studio-header-title" style={mergedTitleStyle}>
          {title}
        </div>
      )}
      {subtitle &&
        (typeof subtitle === 'string' ? (
          <p className={subtitleClassName} style={mergedSubtitleStyle}>
            {subtitle}
          </p>
        ) : (
          <div className={subtitleClassName} style={mergedSubtitleStyle}>
            {subtitle}
          </div>
        ))}
    </div>
  );

  return (
    <div
      style={{
        paddingTop: disableTopInset
          ? 0
          : 'var(--page-header-top-inset, calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 28px))',
        paddingBottom: 'var(--page-header-bottom-inset, 16px)',
        paddingLeft: disableHorizontalPadding
          ? 0
          : 'var(--page-header-inset-h, var(--page-pad-h, 16px))',
        paddingRight: disableHorizontalPadding
          ? 0
          : 'var(--page-header-inset-h, var(--page-pad-h, 16px))',
        display: 'flex',
        flexDirection: actions ? 'row' : 'column',
        alignItems: actions ? 'flex-end' : 'flex-start',
        justifyContent: actions ? 'space-between' : 'flex-start',
        gap: actions ? 12 : 0,
        boxSizing: 'border-box',
        width: '100%',
        ...containerStyle,
      }}
      className="studio-header-container"
    >
      {textContent}
      {actions && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
            marginBottom: 2,
          }}
        >
          {actions}
        </div>
      )}
    </div>
  );
}
