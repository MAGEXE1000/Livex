import React, { useState } from 'react';
import { type AssistantMessage, useSettingsStore } from '@workspace/livex-core';
import { StudioIcon } from '../../../shared/icons/StudioIcon';
import { ChordProgressionCard } from './cards/ChordProgressionCard';
import { ToneRecipeCard } from './cards/ToneRecipeCard';
import { DrumGrooveCard } from './cards/DrumGrooveCard';

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
              background: isLight ? 'rgba(2, 132, 199, 0.08)' : 'rgba(56, 189, 248, 0.12)',
              border: isLight ? '1px solid rgba(2, 132, 199, 0.2)' : '1px solid rgba(56, 189, 248, 0.25)',
              color: isLight ? '#0284c7' : '#38bdf8',
              padding: '1px 5px',
              borderRadius: 4,
              fontSize: '0.9em',
              fontFamily: 'ui-monospace, monospace',
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
              fontWeight: 600,
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
              fontWeight: 700,
              color: isLight ? '#0f172a' : '#f8fafc',
              margin: '8px 0 4px',
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
              gap: 6,
              margin: '2px 0',
              paddingLeft: 4,
            }}
          >
            <span style={{ color: isLight ? '#0284c7' : '#38bdf8', fontSize: 13 }}>•</span>
            <span
              style={{
                fontSize: 13,
                color: isLight ? '#334155' : '#e2e8f0',
                lineHeight: 1.5,
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
            lineHeight: 1.55,
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
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            color: '#ffffff',
            padding: '10px 16px',
            borderRadius: '18px 18px 4px 18px',
            fontSize: 14,
            lineHeight: 1.45,
            boxShadow: '0 4px 16px rgba(37, 99, 235, 0.35)',
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
        flexDirection: 'column',
        margin: '10px 0',
        paddingRight: '6%',
        position: 'relative',
      }}
    >
      {/* Bot Bubble */}
      <div
        style={{
          background: isLight ? 'rgba(255, 255, 255, 0.92)' : 'rgba(30, 41, 59, 0.45)',
          border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '4px 18px 18px 18px',
          padding: '14px 16px',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: isLight ? '0 8px 30px rgba(0, 0, 0, 0.08)' : '0 8px 30px rgba(0, 0, 0, 0.25)',
          position: 'relative',
        }}
      >
        {/* Copy button */}
        {message.status !== 'streaming' && message.content && (
          <button
            onClick={handleCopy}
            title="Copy response"
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
            <StudioIcon name={copied ? 'check' : 'content_copy'} size={14} />
          </button>
        )}

        {/* Content */}
        {renderFormattedContent(message.content)}

        {/* Streaming Cursor */}
        {message.status === 'streaming' && (
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 14,
              marginLeft: 4,
              verticalAlign: 'middle',
              background: isLight ? '#0284c7' : '#38bdf8',
              borderRadius: 2,
              animation: 'pulse 1s infinite',
            }}
          />
        )}

        {/* Structured Recommendations Cards */}
        {message.recommendations && message.recommendations.length > 0 && (
          <div style={{ marginTop: 8 }}>
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
