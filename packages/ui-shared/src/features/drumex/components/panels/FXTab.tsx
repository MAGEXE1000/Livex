import React, { useState } from 'react';
import ElasticSlider from '../../../../shared/progress/ElasticSlider';
import { INSTRUMENT_NAME, type DrumInstrument, type InstFX, type InstPlugin, DEFAULT_INST_FX, INSTRUMENT_COLOR } from '@workspace/livex-core';
import { Toggle as ToggleComponent } from '../../../../shared/settings/SettingControls';
import { BouncyAccordion, type BouncyAccordionItem } from '../../../../components/motion/bouncy-accordion';

export function FXTab(props: any) {
  const { updatePattern, labelSt, inputSt, pattern, isLight, activeInstruments, instFX, setInstFX, instPlugins, setInstPlugins, accent, INST_LABEL, INST_PRESETS, drumPrefs, updateDrumPrefs } = props;
  const [collapsedFxSections, setCollapsedFxSections] = useState<Record<string, boolean>>({});
  const [fxInst, setFxInst] = useState<DrumInstrument>('kick');
  
  const renderCollapsibleSection = (
    id: string,
    title: string,
    collapsedState: Record<string, boolean>,
    onToggle: (id: string) => void,
    content: React.ReactNode
  ) => {
    const isCollapsed = collapsedState[id];
    const item: BouncyAccordionItem = {
      id,
      title: (
        <span
          style={{
            fontSize: '10px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {title}
        </span>
      ),
      description: (
        <div style={{ padding: '6px 4px 2px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {content}
        </div>
      ),
    };

    return (
      <BouncyAccordion
        key={id}
        items={[item]}
        value={!isCollapsed ? id : null}
        onValueChange={(val) => onToggle(id)}
      />
    );
  };

  return (
    <>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                  {renderCollapsibleSection(
                                    'global-fx',
                                    'Global FX',
                                    collapsedFxSections,
                                    (id) =>
                                      setCollapsedFxSections((prev) => ({
                                        ...prev,
                                        [id]: !prev[id],
                                      })),
                                    <div
                                      style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                                    >
                                      <div>
                                        <div
                                          style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: 4,
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontSize: 11,
                                              fontWeight: 700,
                                              color: 'var(--c-text-primary)',
                                            }}
                                          >
                                            Swing
                                          </span>
                                          <span
                                            style={{
                                              fontSize: 11,
                                              fontWeight: 700,
                                              color: accent.from,
                                            }}
                                          >
                                            {pattern.swing ?? 0}%
                                          </span>
                                        </div>
                                        <ElasticSlider
                                          min={0}
                                          max={100}
                                          step={1}
                                          value={pattern.swing ?? 0}
                                          onChange={(v) => updatePattern(pattern.id, { swing: v })}
                                          accentColor={accent.from}
                                          style={{ width: '100%' }}
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {renderCollapsibleSection(
                                    'per-instrument-fx',
                                    'Per-Instrument FX',
                                    collapsedFxSections,
                                    (id) =>
                                      setCollapsedFxSections((prev) => ({
                                        ...prev,
                                        [id]: !prev[id],
                                      })),
                                    <div
                                      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                                    >
                                      <div>
                                        <label style={labelSt}>Instrument</label>
                                        <select
                                          value={fxInst}
                                          onChange={(e) =>
                                            setFxInst(e.target.value as DrumInstrument)
                                          }
                                          style={{
                                            ...inputSt,
                                            padding: '6px 10px',
                                            fontSize: 13,
                                            background: 'var(--app-surface-high)',
                                          }}
                                        >
                                          {activeInstruments.map((inst) => (
                                            <option key={inst} value={inst}>
                                              {INST_LABEL[inst]}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      {INST_PRESETS[fxInst] && INST_PRESETS[fxInst]!.length > 0 && (
                                        <div>
                                          <span style={labelSt}>Character</span>
                                          <div
                                            style={{
                                              display: 'flex',
                                              gap: 6,
                                              flexWrap: 'wrap',
                                              marginTop: 4,
                                            }}
                                          >
                                            {INST_PRESETS[fxInst]!.map((preset) => {
                                              const curFX = {
                                                ...DEFAULT_INST_FX,
                                                ...(instFX[fxInst] ?? {}),
                                              };
                                              const active = Object.keys(preset.values).every(
                                                (k) =>
                                                  Math.abs(
                                                    (curFX[k as keyof InstFX] ?? 0) -
                                                      (preset.values[k as keyof InstFX] ?? 0)
                                                  ) < 0.05
                                              );
                                              const color = INSTRUMENT_COLOR[fxInst] ?? accent.from;
                                              return (
                                                <button
                                                  key={preset.label}
                                                  onClick={() =>
                                                    setInstFX(fxInst, {
                                                      ...DEFAULT_INST_FX,
                                                      ...preset.values,
                                                    })
                                                  }
                                                  title={`Apply "${preset.label}" FX character to ${INST_LABEL[fxInst] || fxInst}`}
                                                  className="btn-smooth"
                                                  style={{
                                                    padding: '4px 10px',
                                                    borderRadius: 12,
                                                    fontSize: 10.5,
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    background: active
                                                      ? color
                                                      : 'rgba(255,255,255,0.03)',
                                                    border: active
                                                      ? `1.5px solid ${color}`
                                                      : '1.5px solid rgba(255,255,255,0.08)',
                                                    color: active
                                                      ? '#fff'
                                                      : 'var(--c-text-secondary)',
                                                  }}
                                                >
                                                  {preset.label}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}

                                      <div
                                        style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: 10,
                                        }}
                                      >
                                        {(() => {
                                          const curFX = {
                                            ...DEFAULT_INST_FX,
                                            ...(instFX[fxInst] ?? {}),
                                          };
                                          const color = INSTRUMENT_COLOR[fxInst] ?? accent.from;
                                          type SliderDef = {
                                            key: keyof InstFX;
                                            label: string;
                                            min: number;
                                            max: number;
                                            step: number;
                                          };
                                          const sliders: SliderDef[] = [
                                            {
                                              key: 'compress',
                                              label: 'Compress',
                                              min: 0,
                                              max: 1,
                                              step: 0.01,
                                            },
                                            {
                                              key: 'attack',
                                              label: 'Attack',
                                              min: 0,
                                              max: 1,
                                              step: 0.01,
                                            },
                                            {
                                              key: 'gate',
                                              label: 'Gate',
                                              min: 0,
                                              max: 1,
                                              step: 0.01,
                                            },
                                            {
                                              key: 'eqLow',
                                              label: 'Low 80Hz',
                                              min: -12,
                                              max: 12,
                                              step: 0.5,
                                            },
                                            {
                                              key: 'eqLowMid',
                                              label: 'Lo-Mid 350',
                                              min: -12,
                                              max: 12,
                                              step: 0.5,
                                            },
                                            {
                                              key: 'eqMid',
                                              label: 'Mid 2kHz',
                                              min: -12,
                                              max: 12,
                                              step: 0.5,
                                            },
                                            {
                                              key: 'eqHigh',
                                              label: 'High 10k',
                                              min: -12,
                                              max: 12,
                                              step: 0.5,
                                            },
                                          ];
                                          return sliders.map((s) => {
                                            const val = curFX[s.key] ?? 0;
                                            const isEQ = s.key.startsWith('eq');
                                            const dispVal = isEQ
                                              ? (val >= 0 ? `+${val.toFixed(1)}` : val.toFixed(1)) +
                                                'dB'
                                              : `${Math.round(val * 100)}%`;
                                            const active = val !== 0;
                                            return (
                                              <div
                                                key={s.key}
                                                style={{
                                                  display: 'flex',
                                                  flexDirection: 'column',
                                                  gap: 4,
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      fontSize: 11,
                                                      fontWeight: 700,
                                                      color: active
                                                        ? 'white'
                                                        : 'var(--c-text-secondary)',
                                                    }}
                                                  >
                                                    {s.label}
                                                  </span>
                                                  <span
                                                    style={{
                                                      fontSize: 11,
                                                      fontWeight: 700,
                                                      color: active ? color : 'var(--c-text-muted)',
                                                    }}
                                                  >
                                                    {dispVal}
                                                  </span>
                                                </div>
                                                <ElasticSlider
                                                  min={s.min}
                                                  max={s.max}
                                                  step={s.step}
                                                  value={val}
                                                  onChange={(v) =>
                                                    setInstFX(fxInst, { ...curFX, [s.key]: v })
                                                  }
                                                  accentColor={color}
                                                  style={{ width: '100%' }}
                                                />
                                              </div>
                                            );
                                          });
                                        })()}
                                      </div>
                                    </div>
                                  )}

                                  {renderCollapsibleSection(
                                    'reverb-room',
                                    'Reverb / Room',
                                    collapsedFxSections,
                                    (id) =>
                                      setCollapsedFxSections((prev) => ({
                                        ...prev,
                                        [id]: !prev[id],
                                      })),
                                    <div>
                                      {(() => {
                                        const curFX = {
                                          ...DEFAULT_INST_FX,
                                          ...(instFX[fxInst] ?? {}),
                                        };
                                        const color = INSTRUMENT_COLOR[fxInst] ?? accent.from;
                                        const reverbVal = curFX.reverb ?? 0;
                                        const saturateVal = curFX.saturate ?? 0;
                                        return (
                                          <div
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'column',
                                              gap: 10,
                                            }}
                                          >
                                            <div
                                              style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 4,
                                              }}
                                            >
                                              <div
                                                style={{
                                                  display: 'flex',
                                                  justifyContent: 'space-between',
                                                  alignItems: 'center',
                                                }}
                                              >
                                                <span
                                                  style={{
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    color:
                                                      reverbVal > 0
                                                        ? 'white'
                                                        : 'var(--c-text-secondary)',
                                                  }}
                                                >
                                                  Reverb Send
                                                </span>
                                                <span
                                                  style={{
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    color:
                                                      reverbVal > 0 ? color : 'var(--c-text-muted)',
                                                  }}
                                                >
                                                  {Math.round(reverbVal * 100)}%
                                                </span>
                                              </div>
                                              <ElasticSlider
                                                min={0}
                                                max={1}
                                                step={0.01}
                                                value={reverbVal}
                                                onChange={(v) =>
                                                  setInstFX(fxInst, { ...curFX, reverb: v })
                                                }
                                                accentColor={color}
                                                style={{ width: '100%' }}
                                              />
                                            </div>
                                            <div
                                              style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 4,
                                              }}
                                            >
                                              <div
                                                style={{
                                                  display: 'flex',
                                                  justifyContent: 'space-between',
                                                  alignItems: 'center',
                                                }}
                                              >
                                                <span
                                                  style={{
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    color:
                                                      saturateVal > 0
                                                        ? 'white'
                                                        : 'var(--c-text-secondary)',
                                                  }}
                                                >
                                                  Saturation
                                                </span>
                                                <span
                                                  style={{
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    color:
                                                      saturateVal > 0
                                                        ? color
                                                        : 'var(--c-text-muted)',
                                                  }}
                                                >
                                                  {Math.round(saturateVal * 100)}%
                                                </span>
                                              </div>
                                              <ElasticSlider
                                                min={0}
                                                max={1}
                                                step={0.01}
                                                value={saturateVal}
                                                onChange={(v) =>
                                                  setInstFX(fxInst, { ...curFX, saturate: v })
                                                }
                                                accentColor={color}
                                                style={{ width: '100%' }}
                                              />
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}

                                  {renderCollapsibleSection(
                                    'humanize-groove-feel',
                                    'Humanize / Groove Feel',
                                    collapsedFxSections,
                                    (id) =>
                                      setCollapsedFxSections((prev) => ({
                                        ...prev,
                                        [id]: !prev[id],
                                      })),
                                    <div
                                      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span
                                          style={{
                                            flex: 1,
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: 'var(--c-text-primary)',
                                          }}
                                        >
                                          Humanize Velocity
                                        </span>
                                        <button
                                          onClick={() =>
                                            updateDrumPrefs({
                                              humanizeVelocity: !drumPrefs.humanizeVelocity,
                                            })
                                          }
                                          style={{
                                            width: 36,
                                            height: 20,
                                            borderRadius: 10,
                                            background: drumPrefs.humanizeVelocity
                                              ? `linear-gradient(135deg,${accent.from},${accent.to})`
                                              : 'rgba(255,255,255,0.15)',
                                            border: 'none',
                                            cursor: 'pointer',
                                            position: 'relative',
                                            transition: 'background 220ms',
                                            flexShrink: 0,
                                          }}
                                        >
                                          <span
                                            style={{
                                              position: 'absolute',
                                              top: 2.5,
                                              left: drumPrefs.humanizeVelocity ? 18 : 2.5,
                                              width: 15,
                                              height: 15,
                                              borderRadius: '50%',
                                              background: '#fff',
                                              transition:
                                                'left 200ms cubic-bezier(0.34,1.56,0.64,1)',
                                              display: 'block',
                                            }}
                                          />
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  <button
                                    onClick={() => setInstFX(fxInst, { ...DEFAULT_INST_FX })}
                                    className="btn-smooth bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 w-full mt-2"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '6px',
                                      fontSize: '10px',
                                      fontWeight: 800,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.08em',
                                      padding: '8px 12px',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <span
                                      className="material-symbols-outlined"
                                      style={{ fontSize: '15px' }}
                                    >
                                      restart_alt
                                    </span>
                                    Reset {INST_LABEL[fxInst]} FX
                                  </button>
                                </div>
    </>
  );
}
