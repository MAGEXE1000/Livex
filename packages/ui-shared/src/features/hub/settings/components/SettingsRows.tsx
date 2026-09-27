import React, { useState } from 'react';

export function SettingsNavRow({
  icon,
  iconColor,
  title,
  desc,
  onPress,
  last = false,
  placeholder = false,
  delay = 0,
  badge,
}: {
  icon: string;
  iconColor?: string;
  title: string;
  desc?: string;
  onPress: () => void;
  last?: boolean;
  placeholder?: boolean;
  delay?: number;
  badge?: string;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={placeholder ? () => {} : onPress}
      onPointerDown={() => !placeholder && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        width: '100%',
        padding: '13px 16px',
        background: pressed ? 'rgba(128,128,128,0.06)' : 'transparent',
        border: 'none',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        borderBottom: last ? 'none' : '1px solid rgba(128,128,128,0.07)',
        cursor: placeholder ? 'default' : 'pointer',
        textAlign: 'left',
        transform: pressed ? 'scale(0.977)' : 'scale(1)',
        transition: 'background 100ms ease, transform 140ms cubic-bezier(0.34,1.15,0.64,1)',
        boxSizing: 'border-box',
        opacity: placeholder ? 0.38 : 1,
        animation: `hub-row-fade 380ms ease ${delay}ms both`,
        transformOrigin: 'center center',
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: 22,
          flexShrink: 0,
          color: iconColor ?? 'var(--c-text-secondary)',
          fontVariationSettings: "'FILL' 1",
          opacity: 0.75,
          width: 26,
          textAlign: 'center',
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--c-text-primary)',
            margin: 0,
            letterSpacing: '-0.01em',
            fontFamily: 'var(--studio-font-display)',
          }}
        >
          {title}
        </p>
        {desc && (
          <p
            style={{
              fontSize: 12,
              color: 'var(--c-text-secondary)',
              margin: '2px 0 0',
              fontWeight: 500,
              fontFamily: 'Inter',
              lineHeight: 1.3,
            }}
          >
            {desc}
          </p>
        )}
      </div>
      {badge && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            fontFamily: 'var(--type-caption-font, var(--studio-font-body))',
            padding: '3px 7px',
            borderRadius: 999,
            background: 'rgba(128,128,128,0.12)',
            color: 'var(--c-text-secondary)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            flexShrink: 0,
          }}
        >
          {badge}
        </span>
      )}
      {!placeholder && (
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 18, color: 'var(--c-text-secondary)', flexShrink: 0, opacity: 0.45 }}
        >
          chevron_right
        </span>
      )}
    </button>
  );
}

export function SettingsSectionLabel({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'between',
        margin: '28px 0 12px 4px',
      }}
    >
      <span
        style={{
          fontSize: 'var(--font-section-label)',
          fontWeight: 800,
          color: 'var(--c-text-secondary)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          fontFamily: 'var(--type-caption-font, var(--studio-font-body))',
        }}
      >
        {children}
      </span>
      <div
        style={{
          height: '1px',
          flex: 1,
          backgroundColor: 'rgba(128, 128, 128, 0.08)',
          marginLeft: '16px',
        }}
      />
    </div>
  );
}
