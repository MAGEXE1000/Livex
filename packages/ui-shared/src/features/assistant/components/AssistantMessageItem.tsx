import React, { useState } from 'react';
import { type AssistantMessage, useSettingsStore, useAssistantStore } from '@workspace/livex-core';
import { LivexAssistantMascot } from './LivexAssistantMascot';
import { ChordProgressionCard } from './cards/ChordProgressionCard';
import { ToneRecipeCard } from './cards/ToneRecipeCard';
import { DrumGrooveCard } from './cards/DrumGrooveCard';
import { Copy, Check, Paperclip, Globe, ExternalLink, AlertCircle, RotateCw } from 'lucide-react';

export interface AssistantMessageItemProps {
  message: AssistantMessage;
  isLight?: boolean;
  isAmoled?: boolean;
}

export const AssistantMessageItem: React.FC<AssistantMessageItemProps> = ({
  message,
  isLight: propIsLight,
  isAmoled: propIsAmoled,
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const theme = useSettingsStore((s) => s.settings?.theme);
  const amoledMode = useSettingsStore((s) => s.settings?.amoledMode);
  const isLight =
    propIsLight !== undefined
      ? propIsLight
      : theme === 'light' ||
        (theme === 'system' &&
          typeof window !== 'undefined' &&
          window.matchMedia?.('(prefers-color-scheme: light)').matches);
  const isAmoled =
    propIsAmoled !== undefined
      ? propIsAmoled
      : !isLight && Boolean(amoledMode);

  const handleCopy = () => {
    navigator.clipboard?.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper for bold and inline code
  const formatInlineText = (text: string) => {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            style={{
              background: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)',
              border: isLight ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.12)',
              color: isLight ? '#0f172a' : '#f1f5f9',
              padding: '1px 6px',
              borderRadius: 4,
              fontSize: '0.88em',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong
            key={i}
            style={{
              color: isLight ? '#0f172a' : '#ffffff',
              fontWeight: 650,
            }}
          >
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  // Lightweight markdown-to-elements formatter
  const renderFormattedContent = (content: string) => {
    if (!content) return null;

    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Heading 3
      if (line.startsWith('### ')) {
        return (
          <h3
            key={idx}
            style={{
              fontSize: 15,
              fontWeight: 650,
              color: isLight ? '#0f172a' : '#f8fafc',
              margin: '12px 0 6px',
              letterSpacing: '-0.01em',
            }}
          >
            {line.replace('### ', '')}
          </h3>
        );
      }
      // Bullet items
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const text = line.slice(2);
        return (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              margin: '3px 0',
              paddingLeft: 4,
            }}
          >
            <span style={{ color: isLight ? '#64748b' : '#94a3b8', fontSize: 13 }}>•</span>
            <span
              style={{
                fontSize: 14,
                color: isLight ? '#334155' : '#cbd5e1',
                lineHeight: 1.6,
              }}
            >
              {formatInlineText(text)}
            </span>
          </div>
        );
      }
      // Blank lines
      if (!line.trim()) {
        return <div key={idx} style={{ height: 8 }} />;
      }
      // Standard paragraph
      return (
        <p
          key={idx}
          style={{
            fontSize: 14,
            color: isLight ? '#1e293b' : '#e2e8f0',
            lineHeight: 1.65,
            margin: '4px 0',
          }}
        >
          {formatInlineText(line)}
        </p>
      );
    });
  };

  if (isUser) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          margin: '12px 0',
          paddingLeft: '18%',
        }}
      >
        {message.attachments && message.attachments.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginBottom: 6,
              justifyContent: 'flex-end',
            }}
          >
            {message.attachments.map((att) => (
              <div
                key={att.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontSize: 12,
                  background: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                  border: isLight
                    ? '1px solid rgba(0, 0, 0, 0.08)'
                    : '1px solid rgba(255, 255, 255, 0.12)',
                  color: isLight ? '#334155' : '#cbd5e1',
                }}
              >
                <Paperclip size={12} />
                <span
                  style={{
                    maxWidth: 140,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {att.name}
                </span>
              </div>
            ))}
          </div>
        )}
        <div
          style={{
            background: isLight ? '#0f172a' : isAmoled ? '#000000' : '#1e293b',
            color: '#ffffff',
            border: isLight
              ? 'none'
              : isAmoled
                ? '1px solid rgba(255, 255, 255, 0.18)'
                : '1px solid rgba(255, 255, 255, 0.08)',
            padding: '10px 16px',
            borderRadius: '18px 18px 4px 18px',
            fontSize: 14.5,
            lineHeight: 1.45,
            boxShadow: isLight
              ? '0 1px 3px rgba(0, 0, 0, 0.10)'
              : isAmoled
                ? '0 2px 8px rgba(0, 0, 0, 0.6)'
                : 'none',
            maxWidth: '100%',
            wordBreak: 'break-word',
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  // Thinking / Composing state placeholder while awaiting first token
  // Pure ThinkingOrb presentation without fake progress bars or labels
  if (!isUser && message.status === 'streaming' && !message.content) {
    return (
      <div
        style={{
          display: 'flex',
          gap: 12,
          margin: '12px 0 16px',
          alignItems: 'center',
          padding: '6px 2px',
        }}
      >
        <LivexAssistantMascot
          size={24}
          mode="chat"
          state="composing"
          interactive={false}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        margin: '14px 0 18px',
        position: 'relative',
        alignItems: 'flex-start',
      }}
    >
      {/* Bot Mini Orb */}
      <div style={{ marginTop: 3, flexShrink: 0 }}>
        <LivexAssistantMascot
          size={20}
          mode="chat"
          state={message.status === 'streaming' ? 'composing' : 'idle'}
          interactive={false}
        />
      </div>

      {/* Message Content Container - Content-First, Borderless */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          position: 'relative',
        }}
      >
        {/* Error State Card */}
        {message.status === 'error' ? (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: isLight ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.12)',
              border: isLight ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(239, 68, 68, 0.25)',
              color: isLight ? '#b91c1c' : '#fca5a5',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 650, fontSize: 13.5 }}>
              <AlertCircle size={16} style={{ flexShrink: 0, color: isLight ? '#dc2626' : '#f87171' }} />
              <span>Generation Failed</span>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: isLight ? '#7f1d1d' : '#fecaca' }}>
              {message.content}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                onClick={() => useAssistantStore.getState().retryLastMessage()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  background: isLight ? '#dc2626' : '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                }}
              >
                <RotateCw size={13} />
                <span>Retry</span>
              </button>
            </div>
          </div>
        ) : (
          /* Formatted Content */
          <div
            style={{
              color: isLight ? '#0f172a' : '#f1f5f9',
              fontSize: 14,
              lineHeight: 1.65,
              wordBreak: 'break-word',
            }}
          >
            {renderFormattedContent(message.content)}

            {/* Streaming Cursor */}
            {message.status === 'streaming' && (
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 14,
                  marginLeft: 4,
                  verticalAlign: 'middle',
                  background: isLight ? '#0284c7' : '#38bdf8',
                  borderRadius: 1.5,
                  animation: 'pulse 1s infinite',
                }}
              />
            )}
          </div>
        )}

        {/* Structured Recommendations Cards */}
        {message.recommendations && message.recommendations.length > 0 && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {message.recommendations.map((rec) => {
              if (rec.type === 'chord_progression') {
                return (
                  <ChordProgressionCard
                    key={rec.id}
                    data={rec.data as any}
                    actionLabel={rec.actionLabel}
                  />
                );
              }
              if (rec.type === 'tone_recipe') {
                return <ToneRecipeCard key={rec.id} data={rec.data as any} />;
              }
              if (rec.type === 'drum_groove') {
                return (
                  <DrumGrooveCard
                    key={rec.id}
                    data={rec.data as any}
                    actionLabel={rec.actionLabel}
                  />
                );
              }
              return null;
            })}
          </div>
        )}

        {/* Grounding Sources (Google Search Grounding) */}
        {message.sources && message.sources.length > 0 && (
          <div
            style={{
              marginTop: 12,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: isLight ? '#64748b' : '#94a3b8',
                marginRight: 2,
              }}
            >
              <Globe size={12} />
              <span>Sources</span>
            </div>
            {message.sources.map((s, idx) => (
              <a
                key={idx}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11.5,
                  color: isLight ? '#0284c7' : '#38bdf8',
                  background: isLight ? 'rgba(2, 132, 199, 0.08)' : 'rgba(56, 189, 248, 0.1)',
                  border: isLight ? '1px solid rgba(2, 132, 199, 0.16)' : '1px solid rgba(56, 189, 248, 0.2)',
                  borderRadius: 6,
                  padding: '2px 7px',
                  textDecoration: 'none',
                  maxWidth: 200,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={s.title || s.url}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.title || s.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                </span>
                <ExternalLink size={10} style={{ flexShrink: 0, opacity: 0.7 }} />
              </a>
            ))}
          </div>
        )}

        {/* Subtle Action Row with Copy button */}
        {message.status !== 'streaming' && message.status !== 'error' && message.content && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 10,
            }}
          >
            <button
              onClick={handleCopy}
              title="Copy response"
              aria-label="Copy message text"
              style={{
                background: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)',
                border: isLight ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 8,
                padding: '4px 8px',
                color: copied ? '#22c55e' : isLight ? '#64748b' : '#94a3b8',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11.5,
                fontWeight: 500,
                transition: 'all 120ms ease',
              }}
            >
              {copied ? (
                <>
                  <Check size={12} />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssistantMessageItem;
