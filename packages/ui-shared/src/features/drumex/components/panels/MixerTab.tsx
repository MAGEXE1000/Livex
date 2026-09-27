import React, { useState } from 'react';
import ElasticSlider from '../../../../shared/progress/ElasticSlider';
import { INSTRUMENT_COLOR, DEFAULT_INST_FX } from '@workspace/livex-core';
import { BouncyAccordion, type BouncyAccordionItem } from '../../../../components/motion/bouncy-accordion';

export function MixerTab(props: any) {
  const { pattern, isLight, activeInstruments, masterVolume, setMasterVolume, volumeMap, patternMuted, setVolumeForInstrument, togglePatternMute, accent, INST_LABEL, instFX, setInstFX } = props;
  const [collapsedMixerSections, setCollapsedMixerSections] = useState<Record<string, boolean>>({});
  
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
                                    'master',
                                    'Master',
                                    collapsedMixerSections,
                                    (id) =>
                                      setCollapsedMixerSections((prev) => ({
                                        ...prev,
                                        [id]: !prev[id],
                                      })),
                                    <div
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 6,
                                        background: 'rgba(255,255,255,0.02)',
                                        padding: 12,
                                        borderRadius: 10,
                                        border: '1px solid rgba(255,255,255,0.05)',
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
                                          style={{ fontSize: 11, fontWeight: 700, color: 'white' }}
                                        >
                                          Master Volume
                                        </span>
                                        <span
                                          style={{
                                            fontSize: 11,
                                            color: 'var(--c-text-muted)',
                                            fontWeight: 700,
                                          }}
                                        >
                                          {(masterVolume * 100).toFixed(1)}%
                                        </span>
                                      </div>
                                      <ElasticSlider
                                        min={0}
                                        max={1}
                                        step={0.005}
                                        value={masterVolume}
                                        onChange={setMasterVolume}
                                        accentColor={accent.from}
                                        style={{ width: '100%' }}
                                      />
                                    </div>
                                  )}

                                  {renderCollapsibleSection(
                                    'levels',
                                    'Levels',
                                    collapsedMixerSections,
                                    (id) =>
                                      setCollapsedMixerSections((prev) => ({
                                        ...prev,
                                        [id]: !prev[id],
                                      })),
                                    <div
                                      style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                                    >
                                      {activeInstruments.map((inst) => {
                                        const vol = volumeMap[inst] ?? 1;
                                        const muted = patternMuted.has(inst);
                                        const color = INSTRUMENT_COLOR[inst] ?? accent.from;
                                        return (
                                          <div
                                            key={inst}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 8,
                                              padding: '4px 0',
                                              opacity: muted ? 0.5 : 1,
                                            }}
                                          >
                                            <div
                                              style={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: '50%',
                                                background: color,
                                              }}
                                            />
                                            <span
                                              style={{
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: 'var(--c-text-primary)',
                                                flex: 1,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                              }}
                                            >
                                              {INST_LABEL[inst]}
                                            </span>
                                            <ElasticSlider
                                              min={0}
                                              max={1}
                                              step={0.01}
                                              value={vol}
                                              onChange={(v) => setVolumeForInstrument(inst, v)}
                                              accentColor={color}
                                              style={{ width: 80 }}
                                            />
                                            <button
                                              onClick={() => togglePatternMute(pattern.id, inst)}
                                              style={{
                                                width: 26,
                                                height: 26,
                                                borderRadius: 6,
                                                border: 'none',
                                                cursor: 'pointer',
                                                background: muted
                                                  ? 'rgba(255,255,255,0.05)'
                                                  : `${color}18`,
                                                color: muted ? 'var(--c-text-muted)' : color,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                              }}
                                            >
                                              <span
                                                className="material-symbols-outlined"
                                                style={{ fontSize: 14 }}
                                              >
                                                {muted ? 'volume_off' : 'volume_up'}
                                              </span>
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {renderCollapsibleSection(
                                    'pan',
                                    'Pan',
                                    collapsedMixerSections,
                                    (id) =>
                                      setCollapsedMixerSections((prev) => ({
                                        ...prev,
                                        [id]: !prev[id],
                                      })),
                                    <div
                                      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                                    >
                                      <span
                                        style={{
                                          fontSize: 9.5,
                                          color: 'var(--c-text-muted)',
                                          fontStyle: 'italic',
                                          marginBottom: 4,
                                          display: 'block',
                                        }}
                                      >
                                        Note: Stereo panning is simulated (Future Update)
                                      </span>
                                      {activeInstruments.map((inst) => {
                                        const color = INSTRUMENT_COLOR[inst] ?? accent.from;
                                        return (
                                          <div
                                            key={`pan-${inst}`}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 8,
                                              opacity: 0.5,
                                            }}
                                          >
                                            <div
                                              style={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: '50%',
                                                background: color,
                                              }}
                                            />
                                            <span
                                              style={{
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: 'var(--c-text-primary)',
                                                flex: 1,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                              }}
                                            >
                                              {INST_LABEL[inst]}
                                            </span>
                                            <div
                                              style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6,
                                              }}
                                            >
                                              <span
                                                style={{
                                                  fontSize: 9,
                                                  fontWeight: 700,
                                                  color: 'var(--c-text-muted)',
                                                }}
                                              >
                                                L
                                              </span>
                                              <input
                                                type="range"
                                                min="-50"
                                                max="50"
                                                defaultValue="0"
                                                disabled
                                                style={{
                                                  width: 75,
                                                  accentColor: color,
                                                  cursor: 'not-allowed',
                                                }}
                                              />
                                              <span
                                                style={{
                                                  fontSize: 9,
                                                  fontWeight: 700,
                                                  color: 'var(--c-text-muted)',
                                                }}
                                              >
                                                R
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {renderCollapsibleSection(
                                    'room-send',
                                    'Room / Send',
                                    collapsedMixerSections,
                                    (id) =>
                                      setCollapsedMixerSections((prev) => ({
                                        ...prev,
                                        [id]: !prev[id],
                                      })),
                                    <div
                                      style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                                    >
                                      {activeInstruments.map((inst) => {
                                        const curFX = {
                                          ...DEFAULT_INST_FX,
                                          ...(instFX[inst] ?? {}),
                                        };
                                        const rev = curFX.reverb ?? 0;
                                        const color = INSTRUMENT_COLOR[inst] ?? accent.from;
                                        return (
                                          <div
                                            key={`rev-${inst}`}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 8,
                                            }}
                                          >
                                            <div
                                              style={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: '50%',
                                                background: color,
                                              }}
                                            />
                                            <span
                                              style={{
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: 'var(--c-text-primary)',
                                                flex: 1,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                              }}
                                            >
                                              {INST_LABEL[inst]}
                                            </span>
                                            <ElasticSlider
                                              min={0}
                                              max={1}
                                              step={0.01}
                                              value={rev}
                                              onChange={(v) =>
                                                setInstFX(inst, { ...curFX, reverb: v })
                                              }
                                              accentColor={color}
                                              style={{ width: 80 }}
                                            />
                                            <span
                                              style={{
                                                fontSize: 10,
                                                fontWeight: 700,
                                                color: 'var(--c-text-muted)',
                                                width: 26,
                                                textAlign: 'right',
                                              }}
                                            >
                                              {Math.round(rev * 100)}%
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  <button
                                    onClick={() => {
                                      setMasterVolume(1.0);
                                      activeInstruments.forEach((inst) => {
                                        setVolumeForInstrument(inst, 1.0);
                                        if (patternMuted.has(inst)) {
                                          togglePatternMute(pattern.id, inst);
                                        }
                                      });
                                    }}
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
                                    Reset Mix
                                  </button>
                                </div>
    </>
  );
}
