import React, { useState } from 'react';
import { type AssistantMessage, useSettingsStore } from '@workspace/livex-core';
import { LivexAssistantMascot } from './LivexAssistantMascot';
import { ChordProgressionCard } from './cards/ChordProgressionCard';
import { ToneRecipeCard } from './cards/ToneRecipeCard';
import { DrumGrooveCard } from './cards/DrumGrooveCard';
import { Copy, Check } from 'lucide-react';

export interface AssistantMessageItemProps {
  message: AssistantMessage;
}

export const AssistantMessageItem: React.FC<AssistantMessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const theme = useSettingsStore((s) => s.settings?.theme);
  const isLight =
    theme === 'light' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: light)').matches);

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
              fontSize: 14.5,
              fontWeight: 650,
              color: isLight ? '#0f172a' : '#f8fafc',
              margin: '10px 0 4px',
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
                fontSize: 13.5,
                color: isLight ? '#334155' : '#cbd5e1',
                lineHeight: 1.55,
              }}
            >
              {formatInlineText(text)}
            </span>
          </div>
        );
      }
      // Blank lines
      if (!line.trim()) {
        return <div key={idx} style={{ height: 6 }} />;
      }
      // Standard paragraph
      return (
        <p
          key={idx}
          style={{
            fontSize: 13.5,
            color: isLight ? '#1e293b' : '#e2e8f0',
            lineHeight: 1.6,
            margin: '3px 0',
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
          justifyContent: 'flex-end',
          margin: '8px 0',
          paddingLeft: '15%',
        }}
      >
        <div
          style={{
            background: isLight ? '#0f172a' : '#1e293b',
            color: '#ffffff',
            border: isLight ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
            padding: '10px 16px',
            borderRadius: '16px 16px 4px 16px',
            fontSize: 14,
            lineHeight: 1.45,
            boxShadow: isLight ? '0 1px 3px rgba(0, 0, 0, 0.12)' : 'none',
            maxWidth: '100%',
            wordBreak: 'break-word',
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        margin: '12px 0',
        paddingRight: '4%',
        position: 'relative',
        alignItems: 'flex-start',
      }}
    >
      {/* Bot Mini Emblem Avatar */}
      <div style={{ marginTop: 2, flexShrink: 0 }}>
        <LivexAssistantMascot
          size={22}
          mode="chat"
          state="idle"
          interactive={false}
        />
      </div>

      {/* Bot Bubble */}
      <div
        style={{
          flex: 1,
          background: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.55)',
          border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 14,
          padding: '14px 18px',
          boxShadow: isLight ? '0 1px 3px rgba(0, 0, 0, 0.04)' : 'none',
          position: 'relative',
        }}
      >
        {/* Copy action */}
        {message.status !== 'streaming' && message.content && (
          <button
            onClick={handleCopy}
            title="Copy response"
            aria-label="Copy message text"
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              background: 'transparent',
              border: 'none',
              color: copied ? '#22c55e' : isLight ? 'rgba(0, 0, 0, 0.35)' : 'rgba(255, 255, 255, 0.4)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              transition: 'color 120ms ease',
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        )}

        {/* Content */}
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

        {/* Structured Recommendations Cards */}
        {message.recommendations && message.recommendations.length > 0 && (
          <div style={{ marginTop: 10 }}>
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
      </div>
    </div>
  );
};

export default AssistantMessageItem;
