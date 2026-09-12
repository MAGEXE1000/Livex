import React, { useState, useRef, useEffect } from 'react';

export interface CopyDropdownProps {
  onCopyEverything: () => string | Promise<string>;
  onCopySection: () => string | Promise<string>;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

export const CopyDropdown: React.FC<CopyDropdownProps> = ({
  onCopyEverything,
  onCopySection,
  size = 'sm',
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [copiedText, setCopiedText] = useState('Copied!');
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = async (actionFn: () => string | Promise<string>, label: string) => {
    setIsOpen(false);
    try {
      const text = await actionFn();
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setIsCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIsCopied(false);
      }, 1200);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const isSmall = size === 'sm';

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block', ...style }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="btn-smooth"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: isSmall ? '5px 12px' : '8px 16px',
          borderRadius: '999px',
          background: isCopied
            ? 'rgba(16, 185, 129, 0.18)'
            : 'var(--app-surface-high, rgba(255, 255, 255, 0.08))',
          border: `1px solid ${isCopied ? 'rgba(16, 185, 129, 0.4)' : 'rgba(128, 128, 128, 0.12)'}`,
          color: isCopied ? '#10b981' : 'var(--c-text-primary, #ffffff)',
          fontSize: isSmall ? '11px' : '12px',
          fontWeight: 700,
          fontFamily: 'var(--type-button-font, var(--studio-font-body))',
          cursor: 'pointer',
          boxShadow: isCopied
            ? '0 2px 10px rgba(16, 185, 129, 0.2)'
            : '0 2px 8px rgba(0, 0, 0, 0.15)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          outline: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: isSmall ? 15 : 17,
            color: isCopied ? '#10b981' : 'var(--c-text-secondary, #94a3b8)',
          }}
        >
          {isCopied ? 'check' : 'content_copy'}
        </span>
        <span>{isCopied ? copiedText : 'Copy'}</span>
        {!isCopied && (
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 14, color: 'var(--c-text-secondary, #94a3b8)' }}
          >
            {isOpen ? 'expand_less' : 'expand_more'}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            background: 'var(--app-surface)',
            backdropFilter: 'var(--surface-float-blur)',
            WebkitBackdropFilter: 'var(--surface-float-blur)',
            border: '1px solid var(--c-border)',
            borderRadius: '12px',
            padding: '6px',
            minWidth: '160px',
            boxShadow: '0 10px 32px rgba(0, 0, 0, 0.2)',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <button
            type="button"
            onClick={() => handleAction(onCopyEverything, 'Copied All!')}
            style={itemStyle}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#3b82f6' }}>
              select_all
            </span>
            <span>Copy Everything</span>
          </button>
          <button
            type="button"
            onClick={() => handleAction(onCopySection, 'Copied Section!')}
            style={itemStyle}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#10b981' }}>
              crop_free
            </span>
            <span>Copy Section</span>
          </button>
        </div>
      )}
    </div>
  );
};

const itemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  borderRadius: '8px',
  border: 'none',
  background: 'transparent',
  color: 'var(--c-text-primary)',
  fontSize: '12px',
  fontWeight: 600,
  fontFamily: 'var(--type-button-font, var(--studio-font-body))',
  cursor: 'pointer',
  textAlign: 'left',
  width: '100%',
  transition: 'background 0.15s ease',
};

export default CopyDropdown;
