import React, { useState } from 'react';
import {
  type AssistantActionPayload,
  executeAssistantAction,
  useSettingsStore,
} from '@workspace/livex-core';
import {
  Check,
  Play,
  RotateCw,
  AlertCircle,
  Layers,
  Music,
  Sliders,
  Mic,
  Disc,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export interface AssistantActionCardProps {
  action: AssistantActionPayload;
  isLight?: boolean;
  isAmoled?: boolean;
  onExecuted?: () => void;
}

export const AssistantActionCard: React.FC<AssistantActionCardProps> = ({
  action,
  isLight = false,
  isAmoled = false,
  onExecuted,
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(!action.requiresConfirmation);

  const theme = useSettingsStore((s) => s.settings?.theme);
  const amoledMode = useSettingsStore((s) => s.settings?.amoledMode);
  const effectiveIsLight =
    isLight !== undefined
      ? isLight
      : theme === 'light';
  const effectiveIsAmoled =
    isAmoled !== undefined
      ? isAmoled
      : !effectiveIsLight && Boolean(amoledMode);

  // App Theme Config
  const appConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    stagex: {
      label: 'Stagex',
      color: '#a855f7',
      bg: 'rgba(168, 85, 247, 0.12)',
      icon: <Layers size={14} />,
    },
    drumex: {
      label: 'Drumex',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
      icon: <Disc size={14} />,
    },
    chordex: {
      label: 'Chordex',
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.12)',
      icon: <Music size={14} />,
    },
    groovex: {
      label: 'Groovex',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.12)',
      icon: <Sliders size={14} />,
    },
    vocalex: {
      label: 'Vocalex',
      color: '#f43f5e',
      bg: 'rgba(244, 63, 94, 0.12)',
      icon: <Mic size={14} />,
    },
  };

  const currentApp = appConfig[action.app] || {
    label: action.app.toUpperCase(),
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.12)',
    icon: <Play size={14} />,
  };

  const handleExecute = async () => {
    if (isExecuting || isSuccess) return;
    if (action.requiresConfirmation && !isConfirmed) {
      setErrorMessage('Please confirm before executing this action');
      return;
    }

    setIsExecuting(true);
    setErrorMessage(null);

    try {
      const result = await executeAssistantAction(action, { confirmed: isConfirmed });
      if (result.success) {
        setIsSuccess(true);
        setSuccessMessage(result.message || 'Action executed successfully');
        onExecuted?.();
      } else {
        setErrorMessage(result.error || 'Failed to execute action');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unexpected execution error');
    } finally {
      setIsExecuting(false);
    }
  };

  // Render Preview by Action Type
  const renderPreview = () => {
    // 1. Reorder Setlist Preview
    if (action.actionType === 'stagex:reorder_setlist') {
      const songs: Array<{ id?: string; title?: string; key?: string; bpm?: number; energy?: number }> =
        action.params.songs ||
        (Array.isArray(action.params.songIds)
          ? action.params.songIds.map((id: string) => ({ id, title: id }))
          : []);

      if (songs.length === 0) return null;

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 650,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: effectiveIsLight ? '#64748b' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Suggested Song Order</span>
            <span>{songs.length} songs</span>
          </div>

          <div
            style={{
              maxHeight: 180,
              overflowY: 'auto',
              borderRadius: 10,
              border: effectiveIsLight
                ? '1px solid rgba(0, 0, 0, 0.08)'
                : '1px solid rgba(255, 255, 255, 0.08)',
              background: effectiveIsLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(0, 0, 0, 0.25)',
              padding: '6px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {songs.map((song, idx) => (
              <div
                key={song.id || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '5px 8px',
                  borderRadius: 6,
                  background: effectiveIsLight ? '#ffffff' : 'rgba(255, 255, 255, 0.04)',
                  fontSize: 12.5,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      background: currentApp.bg,
                      color: currentApp.color,
                      fontSize: 10,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      color: effectiveIsLight ? '#0f172a' : '#f8fafc',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {song.title || song.id}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {song.key && (
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontSize: 10.5,
                        fontWeight: 600,
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: '#60a5fa',
                      }}
                    >
                      {song.key}
                    </span>
                  )}
                  {song.bpm && (
                    <span
                      style={{
                        fontSize: 10.5,
                        color: effectiveIsLight ? '#64748b' : '#94a3b8',
                      }}
                    >
                      {song.bpm} BPM
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 2. Stage Plot Arrangement Preview
    if (action.actionType === 'stagex:arrange_stage') {
      const elements: Array<{ name?: string; label?: string; x?: number; y?: number }> =
        action.params.elements || action.params.arrangement || [];

      if (elements.length === 0) return null;

      return (
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: 120,
              borderRadius: 10,
              border: effectiveIsLight
                ? '1px dashed rgba(0, 0, 0, 0.15)'
                : '1px dashed rgba(255, 255, 255, 0.2)',
              background: effectiveIsLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
            }}
          >
            {/* Stage Back Indicator */}
            <div
              style={{
                position: 'absolute',
                top: 4,
                width: '100%',
                textAlign: 'center',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: effectiveIsLight ? '#94a3b8' : '#64748b',
                textTransform: 'uppercase',
              }}
            >
              ▲ Upstage (Back)
            </div>

            {/* Positioned Elements */}
            {elements.map((el, i) => {
              const leftPercent = typeof el.x === 'number' ? el.x : 50;
              const topPercent = typeof el.y === 'number' ? el.y : 50;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 7,
                      background: currentApp.color,
                      border: '2px solid #ffffff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: effectiveIsLight ? '#1e293b' : '#f1f5f9',
                      whiteSpace: 'nowrap',
                      marginTop: 2,
                    }}
                  >
                    {el.label || el.name}
                  </span>
                </div>
              );
            })}

            {/* Stage Front Indicator */}
            <div
              style={{
                position: 'absolute',
                bottom: 4,
                width: '100%',
                textAlign: 'center',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: effectiveIsLight ? '#94a3b8' : '#64748b',
                textTransform: 'uppercase',
              }}
            >
              ▼ Downstage / Audience (Front)
            </div>
          </div>
        </div>
      );
    }

    // 3. Drum Groove Grid Preview
    if (action.actionType === 'drumex:create_pattern') {
      const preview = action.params.patternPreview || action.params.pattern;
      if (!preview) return null;

      const instruments = ['kick', 'snare', 'hihat'];

      return (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {instruments.map((inst) => {
            const steps: boolean[] = preview[inst] || [];
            if (!steps || steps.length === 0) return null;

            return (
              <div key={inst} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 44,
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: effectiveIsLight ? '#64748b' : '#94a3b8',
                  }}
                >
                  {inst}
                </span>
                <div style={{ display: 'flex', gap: 3, flex: 1 }}>
                  {steps.slice(0, 16).map((active, stepIdx) => (
                    <div
                      key={stepIdx}
                      style={{
                        flex: 1,
                        height: 12,
                        borderRadius: 3,
                        background: active
                          ? currentApp.color
                          : effectiveIsLight
                            ? 'rgba(0, 0, 0, 0.08)'
                            : 'rgba(255, 255, 255, 0.08)',
                        border: stepIdx % 4 === 0
                          ? `1px solid ${effectiveIsLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'}`
                          : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return null;
  };

  return (
    <div
      style={{
        marginTop: 10,
        borderRadius: 14,
        padding: '12px 14px',
        background: effectiveIsAmoled
          ? '#000000'
          : effectiveIsLight
            ? '#ffffff'
            : 'rgba(20, 24, 33, 0.95)',
        border: effectiveIsAmoled
          ? '1px solid rgba(255, 255, 255, 0.16)'
          : effectiveIsLight
            ? '1px solid rgba(0, 0, 0, 0.08)'
            : '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: effectiveIsLight
          ? '0 2px 10px rgba(0, 0, 0, 0.05)'
          : '0 8px 24px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        fontFamily: 'var(--studio-font-body, system-ui, sans-serif)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              padding: '4px 8px',
              borderRadius: 6,
              background: currentApp.bg,
              color: currentApp.color,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              fontWeight: 750,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {currentApp.icon}
            <span>{currentApp.label}</span>
          </div>

          <div
            style={{
              fontSize: 13.5,
              fontWeight: 700,
              color: effectiveIsLight ? '#0f172a' : '#f8fafc',
            }}
          >
            {action.title}
          </div>
        </div>
      </div>

      {/* Description */}
      {action.description && (
        <div
          style={{
            fontSize: 12.5,
            lineHeight: 1.45,
            color: effectiveIsLight ? '#475569' : '#cbd5e1',
          }}
        >
          {action.description}
        </div>
      )}

      {/* Visual Preview */}
      {renderPreview()}

      {/* Error state */}
      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#ef4444',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success feedback */}
      {isSuccess && successMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 10px',
            borderRadius: 8,
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            color: '#22c55e',
            fontSize: 12.5,
            fontWeight: 650,
          }}
        >
          <Check size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Confirmation Checkbox if required and not executed */}
      {action.requiresConfirmation && !isSuccess && (
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11.5,
            color: effectiveIsLight ? '#64748b' : '#94a3b8',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={isConfirmed}
            onChange={(e) => setIsConfirmed(e.target.checked)}
            style={{ cursor: 'pointer', accentColor: currentApp.color }}
          />
          <span>Confirm modification before applying</span>
        </label>
      )}

      {/* Action Button */}
      {!isSuccess && (
        <button
          onClick={handleExecute}
          disabled={isExecuting || (action.requiresConfirmation && !isConfirmed)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '9px 16px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            background:
              action.requiresConfirmation && !isConfirmed
                ? effectiveIsLight
                  ? '#e2e8f0'
                  : 'rgba(255, 255, 255, 0.1)'
                : currentApp.color,
            color:
              action.requiresConfirmation && !isConfirmed
                ? effectiveIsLight
                  ? '#94a3b8'
                  : '#64748b'
                : '#ffffff',
            border: 'none',
            cursor:
              action.requiresConfirmation && !isConfirmed ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            boxShadow:
              action.requiresConfirmation && !isConfirmed
                ? 'none'
                : `0 3px 12px ${currentApp.color}40`,
          }}
        >
          {isExecuting ? (
            <>
              <RotateCw size={14} className="animate-spin" />
              <span>Applying changes…</span>
            </>
          ) : (
            <>
              <span>{action.actionLabel || 'Apply to App'}</span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      )}
    </div>
  );
};
