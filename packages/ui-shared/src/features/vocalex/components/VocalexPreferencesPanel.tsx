import { useT, resolveAccent, useSettingsStore, vocalexRepository, useShallow } from '@workspace/studio-core';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  SettingSection,
  SettingRow,
  Toggle,
  SegmentedControl,
} from '../../../shared/settings/SettingControls';
import { StudioHeader } from '../../../shared/layout/StudioHeader';
import { clearTakeCache } from '../services/harmonyEngine';

export default function VocalexPreferencesPanel() {
  const settings = useSettingsStore(
    useShallow((s) => ({
      accentColor: s.settings.accentColor,
      language: s.settings.language,
      defaultVocalexTab: s.settings.defaultVocalexTab,
      vocalexReferencePitch: s.settings.vocalexReferencePitch,
      vocalexSensitivity: s.settings.vocalexSensitivity,
      vocalexNoteNaming: s.settings.vocalexNoteNaming,
      vocalexTolerance: s.settings.vocalexTolerance,
      vocalexNoiseSuppression: s.settings.vocalexNoiseSuppression,
      vocalexAutoGainControl: s.settings.vocalexAutoGainControl,
      vocalexCountIn: s.settings.vocalexCountIn,
    }))
  );
  const acc = resolveAccent(settings.accentColor);
  const t = useT();
  const vt = t.vocalex as any;
  const isSpanish = (settings.language ?? 'en') === 'es';

  const [takeCount, setTakeCount] = useState<number>(0);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFeedback = useCallback((msg: string) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedbackMsg(msg);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedbackMsg(null);
    }, 2800);
  }, []);

  useEffect(() => {
    let cancelled = false;
    vocalexRepository
      .getAllTakes()
      .then((takes) => {
        if (!cancelled) setTakeCount(takes.length);
      })
      .catch(() => {
        if (!cancelled) setTakeCount(0);
      });
    return () => {
      cancelled = true;
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  // Settings values with defaults
  const startTab = settings.defaultVocalexTab ?? 'coach';
  const refPitch = settings.vocalexReferencePitch ?? 440;
  const sensitivity = settings.vocalexSensitivity ?? 'normal';
  const noteNaming = settings.vocalexNoteNaming ?? 'standard';
  const tolerance = settings.vocalexTolerance ?? 5;
  const noiseSuppression = Boolean(settings.vocalexNoiseSuppression);
  const autoGainControl = Boolean(settings.vocalexAutoGainControl);
  const countIn = settings.vocalexCountIn ?? 3;

  const handleStepPitch = (delta: number) => {
    const next = Math.max(415, Math.min(466, refPitch + delta));
    useSettingsStore.getState().updateSettings({ vocalexReferencePitch: next });
  };

  const handleSetRefPitch = (target: number) => {
    useSettingsStore.getState().updateSettings({ vocalexReferencePitch: target });
  };

  const handleClearCache = () => {
    clearTakeCache();
    showFeedback(
      vt.prefCacheCleared || (isSpanish ? 'Caché de tono liberada' : 'Pitch cache cleared')
    );
  };

  const handleResetDefaults = () => {
    useSettingsStore.getState().updateSettings({
      defaultVocalexTab: 'coach',
      vocalexReferencePitch: 440,
      vocalexTolerance: 5,
      vocalexNoteNaming: 'standard',
      vocalexSensitivity: 'normal',
      vocalexNoiseSuppression: false,
      vocalexAutoGainControl: false,
      vocalexCountIn: 3,
    });
    showFeedback(
      vt.prefResetSuccess ||
        (isSpanish
          ? 'Preferencias de Vocalex restablecidas a valores predeterminados'
          : 'Vocalex preferences reset to defaults')
    );
  };

  return (
    <div
      className="w-full no-scrollbar"
      style={{
        boxSizing: 'border-box',
        padding: '0 var(--page-header-inset-h, var(--page-inset-h, 20px))',
        paddingBottom:
          'calc(var(--bottom-nav-height, 58px) + env(safe-area-inset-bottom, 14px) + 24px)',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <StudioHeader
          title={vt.settingsTitle || (isSpanish ? 'Ajustes de Vocalex' : 'Vocalex Settings')}
          subtitle={
            isSpanish
              ? 'Configuración de afinación, audio y grabación'
              : 'Configure pitch detection, audio DSP, and recording behaviors.'
          }
          disableTopInset={true}
          disableHorizontalPadding={true}
          titleStyle={{
            fontFamily: 'var(--type-title-font, var(--studio-font-display))',
            fontSize: 'var(--type-title-size, 22px)',
            lineHeight: 'var(--type-title-lh, 28px)',
            fontWeight: 'var(--type-title-weight, 700)',
            letterSpacing: 'var(--type-title-tracking, -0.7px)',
          }}
          subtitleStyle={{
            fontFamily: 'var(--type-meta-font, var(--studio-font-body))',
            fontSize: 'var(--type-metadata-size, 12.5px)',
            lineHeight: 'var(--type-metadata-lh, 16px)',
            letterSpacing: 'var(--type-metadata-tracking, 0.15px)',
            color: 'var(--c-text-secondary)',
            marginTop: '2px',
          }}
          containerStyle={{
            paddingTop: 'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 12px)',
            paddingBottom: '4px',
            marginBottom: '10px',
          }}
        />

        {/* Transient Feedback Banner */}
        {feedbackMsg && (
          <div
            style={{
              marginBottom: 12,
              padding: '8px 14px',
              borderRadius: 12,
              background: 'rgba(16, 185, 129, 0.14)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#10b981',
              fontFamily: 'var(--studio-font-body)',
              fontSize: 12.5,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transition: 'all 200ms ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              check_circle
            </span>
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* ── 1. Launch & Defaults ── */}
        <SettingSection
          title={
            vt.prefLaunchSection ||
            (isSpanish ? 'Inicio y valores predeterminados' : 'Launch & Defaults')
          }
        >
          <SettingRow
            label={vt.prefStartOn || (isSpanish ? 'Iniciar en' : 'Start On')}
            desc={
              vt.prefStartOnDesc ||
              (isSpanish
                ? 'Elige qué pantalla se activa al abrir Vocalex.'
                : 'Choose which screen activates when Vocalex launches.')
            }
          >
            <SegmentedControl<'coach' | 'takes' | 'preferences'>
              value={startTab}
              onChange={(val) =>
                useSettingsStore.getState().updateSettings({ defaultVocalexTab: val })
              }
              accentFrom={acc.from}
              accentTo={acc.to}
              layoutId="vocalex-start-tab"
              options={[
                { value: 'coach', label: vt.navCoach || 'Coach', testId: 'vocalex-start-coach' },
                { value: 'takes', label: vt.tabTakes || 'Takes', testId: 'vocalex-start-takes' },
                {
                  value: 'preferences',
                  label: vt.navPreferences || 'Prefs',
                  testId: 'vocalex-start-prefs',
                },
              ]}
            />
          </SettingRow>
        </SettingSection>

        {/* ── 2. Pitch & Tuner Engine ── */}
        <SettingSection
          title={
            vt.prefPitchEngineSection ||
            (isSpanish ? 'Motor de afinación y tono' : 'Pitch & Tuner Engine')
          }
        >
          {/* Reference Pitch */}
          <SettingRow
            label={
              vt.prefRefPitch || (isSpanish ? 'Tono de referencia (LA4)' : 'Reference Pitch (A4)')
            }
            desc={
              vt.prefRefPitchDesc ||
              (isSpanish
                ? 'Frecuencia de afinación estándar de concierto.'
                : 'Concert standard tuning frequency.')
            }
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Preset buttons */}
              {[432, 440, 442].map((hz) => {
                const isSelected = refPitch === hz;
                return (
                  <button
                    key={hz}
                    type="button"
                    onClick={() => handleSetRefPitch(hz)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 9999,
                      fontSize: 11.5,
                      fontFamily: 'var(--studio-font-mono)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: isSelected
                        ? `1px solid ${acc.from}`
                        : '1px solid var(--c-border, rgba(128,128,128,0.18))',
                      background: isSelected
                        ? `${acc.from}20`
                        : 'var(--control-track-bg, rgba(0, 0, 0, 0.15))',
                      color: isSelected ? acc.from : 'var(--c-text-secondary)',
                      boxShadow: isSelected ? 'var(--shadow-control-raised)' : 'none',
                      transition: 'all 150ms ease',
                    }}
                  >
                    {hz}
                  </button>
                );
              })}

              {/* Stepper Display */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--control-track-bg, rgba(0, 0, 0, 0.18))',
                  border: '1px solid var(--track, var(--c-border, rgba(128,128,128,0.15)))',
                  borderRadius: 9999,
                  padding: '3px 6px',
                  gap: 4,
                  marginLeft: 4,
                  boxShadow: 'var(--shadow-inset-soft)',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleStepPitch(-1)}
                  disabled={refPitch <= 415}
                  style={{
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    background: 'transparent',
                    color: refPitch <= 415 ? 'var(--c-border)' : 'var(--c-text-primary)',
                    cursor: refPitch <= 415 ? 'default' : 'pointer',
                    borderRadius: 9999,
                    fontSize: 14,
                    fontWeight: 700,
                    transition: 'background 120ms ease',
                  }}
                  aria-label="Decrease reference pitch"
                >
                  −
                </button>
                <span
                  style={{
                    fontFamily: 'var(--studio-font-mono)',
                    fontSize: 13,
                    fontWeight: 700,
                    minWidth: 48,
                    textAlign: 'center',
                    color: 'var(--c-text-primary)',
                  }}
                >
                  {refPitch} <span style={{ fontSize: 10, opacity: 0.7 }}>Hz</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleStepPitch(1)}
                  disabled={refPitch >= 466}
                  style={{
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    background: 'transparent',
                    color: refPitch >= 466 ? 'var(--c-border)' : 'var(--c-text-primary)',
                    cursor: refPitch >= 466 ? 'default' : 'pointer',
                    borderRadius: 9999,
                    fontSize: 14,
                    fontWeight: 700,
                    transition: 'background 120ms ease',
                  }}
                  aria-label="Increase reference pitch"
                >
                  +
                </button>
              </div>
            </div>
          </SettingRow>

          {/* Detector Sensitivity */}
          <SettingRow
            label={
              vt.prefDetectorSensitivity ||
              (isSpanish ? 'Sensibilidad del detector' : 'Detector Sensitivity')
            }
            desc={
              vt.prefDetectorSensitivityDesc ||
              (isSpanish
                ? 'Capacidad de respuesta y velocidad de seguimiento del tono.'
                : 'Responsiveness and pitch tracking speed.')
            }
          >
            <SegmentedControl<'smooth' | 'normal' | 'fast'>
              value={sensitivity}
              onChange={(val) =>
                useSettingsStore.getState().updateSettings({ vocalexSensitivity: val })
              }
              accentFrom={acc.from}
              accentTo={acc.to}
              layoutId="vocalex-sensitivity"
              options={[
                {
                  value: 'smooth',
                  label: vt.prefSensSmooth || (isSpanish ? 'Suave' : 'Smooth'),
                  testId: 'vocalex-sens-smooth',
                },
                {
                  value: 'normal',
                  label: vt.prefSensNormal || (isSpanish ? 'Normal' : 'Normal'),
                  testId: 'vocalex-sens-normal',
                },
                {
                  value: 'fast',
                  label: vt.prefSensFast || (isSpanish ? 'Rápido' : 'Fast'),
                  testId: 'vocalex-sens-fast',
                },
              ]}
            />
          </SettingRow>

          {/* Note Naming */}
          <SettingRow
            label={vt.prefNoteNaming || (isSpanish ? 'Nomenclatura de notas' : 'Note Naming')}
            desc={
              vt.prefNoteNamingDesc ||
              (isSpanish
                ? 'Muestra las notas con letras estándar o Solfeo.'
                : 'Display pitch notation as standard letters or Solfège.')
            }
          >
            <SegmentedControl<'standard' | 'solfege'>
              value={noteNaming}
              onChange={(val) =>
                useSettingsStore.getState().updateSettings({ vocalexNoteNaming: val })
              }
              accentFrom={acc.from}
              accentTo={acc.to}
              layoutId="vocalex-naming"
              options={[
                {
                  value: 'standard',
                  label: vt.prefNamingStandard || 'C D E',
                  testId: 'vocalex-naming-standard',
                },
                {
                  value: 'solfege',
                  label: vt.prefNamingSolfege || 'Do Re Mi',
                  testId: 'vocalex-naming-solfege',
                },
              ]}
            />
          </SettingRow>

          {/* In-Tune Tolerance */}
          <SettingRow
            label={
              vt.prefInTuneTolerance ||
              (isSpanish ? 'Tolerancia de afinación' : 'In-Tune Tolerance')
            }
            desc={
              vt.prefInTuneToleranceDesc ||
              (isSpanish
                ? 'Margen objetivo para la zona verde de afinación correcta.'
                : 'Target window for the green in-tune zone.')
            }
          >
            <SegmentedControl<number>
              value={tolerance}
              onChange={(val) =>
                useSettingsStore.getState().updateSettings({ vocalexTolerance: val })
              }
              accentFrom={acc.from}
              accentTo={acc.to}
              layoutId="vocalex-tolerance"
              options={[
                {
                  value: 3,
                  label: vt.prefStrict || (isSpanish ? 'Estricto (±3¢)' : 'Strict (±3¢)'),
                  testId: 'vocalex-tol-strict',
                },
                {
                  value: 5,
                  label: vt.prefBalanced || (isSpanish ? 'Equilibrado (±5¢)' : 'Balanced (±5¢)'),
                  testId: 'vocalex-tol-balanced',
                },
                {
                  value: 10,
                  label: vt.prefForgiving || (isSpanish ? 'Tolerante (±10¢)' : 'Forgiving (±10¢)'),
                  testId: 'vocalex-tol-forgiving',
                },
              ]}
            />
          </SettingRow>
        </SettingSection>

        {/* ── 3. Audio Hardware & DSP ── */}
        <SettingSection
          title={
            vt.prefAudioSection || (isSpanish ? 'Hardware de audio y DSP' : 'Audio Hardware & DSP')
          }
        >
          <SettingRow
            label={
              vt.prefNoiseSuppression || (isSpanish ? 'Supresión de ruido' : 'Noise Suppression')
            }
            desc={
              vt.prefNoiseSuppressionDesc ||
              (isSpanish
                ? 'Reduce el zumbido ambiental y el ruido grave del micrófono.'
                : 'Reduces room hum and low-frequency microphone noise.')
            }
          >
            <Toggle
              checked={noiseSuppression}
              onChange={(checked) =>
                useSettingsStore.getState().updateSettings({ vocalexNoiseSuppression: checked })
              }
              accentFrom={acc.from}
              accentTo={acc.to}
              testId="vocalex-toggle-noise"
            />
          </SettingRow>

          <SettingRow
            label={
              vt.prefAutoGain ||
              (isSpanish ? 'Control automático de ganancia (AGC)' : 'Auto-Gain Control (AGC)')
            }
            desc={
              vt.prefAutoGainDesc ||
              (isSpanish
                ? 'Nivela el volumen de entrada para evitar saturación en notas fuertes.'
                : 'Levels input volume to prevent clipping on loud notes.')
            }
          >
            <Toggle
              checked={autoGainControl}
              onChange={(checked) =>
                useSettingsStore.getState().updateSettings({ vocalexAutoGainControl: checked })
              }
              accentFrom={acc.from}
              accentTo={acc.to}
              testId="vocalex-toggle-agc"
            />
          </SettingRow>

          <SettingRow
            label={
              vt.prefCountIn || (isSpanish ? 'Cuenta regresiva de grabación' : 'Recording Count-In')
            }
            desc={
              vt.prefCountInDesc ||
              (isSpanish
                ? 'Tiempo de preparación antes de que el micrófono empiece a grabar.'
                : 'Preparation countdown before microphone starts capturing.')
            }
          >
            <SegmentedControl<number>
              value={countIn}
              onChange={(val) =>
                useSettingsStore.getState().updateSettings({ vocalexCountIn: val })
              }
              accentFrom={acc.from}
              accentTo={acc.to}
              layoutId="vocalex-countin"
              options={[
                {
                  value: 0,
                  label: vt.prefCountInNone || (isSpanish ? 'Desactivado' : 'Off'),
                  testId: 'vocalex-countin-none',
                },
                { value: 3, label: vt.prefCountIn3s || '3s', testId: 'vocalex-countin-3s' },
                { value: 5, label: vt.prefCountIn5s || '5s', testId: 'vocalex-countin-5s' },
              ]}
            />
          </SettingRow>
        </SettingSection>

        {/* ── 4. Storage & Takes ── */}
        <SettingSection
          title={
            vt.prefStorageSection || (isSpanish ? 'Almacenamiento y tomas' : 'Storage & Takes')
          }
        >
          <SettingRow
            label={vt.prefStoredTakes || (isSpanish ? 'Tomas guardadas' : 'Stored Takes')}
            desc={
              isSpanish
                ? `${takeCount} ${takeCount === 1 ? 'toma guardada' : 'tomas guardadas'} en la base de datos local`
                : `${takeCount} ${takeCount === 1 ? 'take' : 'takes'} stored in local database`
            }
          >
            <div
              style={{
                fontFamily: 'var(--studio-font-mono)',
                fontSize: 12,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 9999,
                background: 'var(--control-track-bg, rgba(0, 0, 0, 0.28))',
                border: '1px solid var(--track, var(--c-border))',
                color: 'var(--c-text-primary)',
              }}
            >
              {takeCount}
            </div>
          </SettingRow>

          <SettingRow
            label={vt.prefClearCache || (isSpanish ? 'Limpiar caché de tono' : 'Clear Pitch Cache')}
            desc={
              vt.prefClearCacheDesc ||
              (isSpanish
                ? 'Libera la memoria caché temporal de armonías y formas de onda.'
                : 'Free temporary harmony and waveform calculation caches.')
            }
          >
            <button
              type="button"
              onClick={handleClearCache}
              className="touch-target-44 btn-smooth"
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontFamily: 'var(--studio-font-body)',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid var(--track, var(--c-border))',
                background: 'var(--app-surface-low, rgba(128,128,128,0.08))',
                color: 'var(--c-text-primary)',
                transition: 'all 150ms ease',
              }}
            >
              {vt.prefClearCacheAction || (isSpanish ? 'Limpiar' : 'Clear')}
            </button>
          </SettingRow>
        </SettingSection>

        {/* ── 5. Reset Defaults ── */}
        <SettingSection title={vt.prefResetSection || (isSpanish ? 'Restablecer' : 'Reset')}>
          <SettingRow
            label={
              vt.prefResetDefaults ||
              (isSpanish
                ? 'Restablecer todos los ajustes de Vocalex'
                : 'Reset All Vocalex Settings')
            }
            desc={
              isSpanish
                ? 'Restaura todos los parámetros de afinación, audio y preferencias de Vocalex a sus valores originales.'
                : 'Restores all tuning, audio DSP, and Vocalex preferences to original defaults.'
            }
          >
            <button
              type="button"
              onClick={handleResetDefaults}
              className="touch-target-44 btn-smooth"
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontFamily: 'var(--studio-font-body)',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#ef4444',
                transition: 'all 150ms ease',
              }}
            >
              {isSpanish ? 'Restablecer' : 'Reset'}
            </button>
          </SettingRow>
        </SettingSection>
      </div>
    </div>
  );
}
