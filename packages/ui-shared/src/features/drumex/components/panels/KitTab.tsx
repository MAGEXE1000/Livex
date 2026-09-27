import React, { useState } from 'react';
import { HOUSE_MICS, HOUSE_VEL_CONFIGS, HOUSE_INST_LABELS, HOUSE_CRASH_MODELS, type HouseInstName, type HouseCrashModel } from '@workspace/livex-core';
import { BouncyAccordion, type BouncyAccordionItem } from '../../../../components/motion/bouncy-accordion';

export function KitTab(props: any) {
  const { isLight, kitType, houseKitMic, houseInstVelOverride, houseCrashModel, drumPrefs, storeSetHouseKitMic, storeSetInstVelOverride, storeSetHouseCrashModel, updateDrumPrefs, accent, setHouseKitMic } = props;
  const [collapsedKitSections, setCollapsedKitSections] = useState<Record<string, boolean>>({});
  
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
                                  <div
                                    style={{
                                      padding: '16px',
                                      background: isLight
                                        ? 'rgba(0, 0, 0, 0.03)'
                                        : 'rgba(255, 255, 255, 0.03)',
                                      border: isLight
                                        ? '1px solid rgba(0, 0, 0, 0.08)'
                                        : '1px solid rgba(255, 255, 255, 0.08)',
                                      borderRadius: 12,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 6,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 9.5,
                                        fontWeight: 800,
                                        color: 'var(--c-text-muted)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                      }}
                                    >
                                      Active Drum Kit
                                    </span>
                                    <span
                                      style={{
                                        fontSize: 13,
                                        fontWeight: 800,
                                        color: 'var(--c-text-primary)',
                                      }}
                                    >
                                      Acoustic ΓÇö House Kit
                                    </span>
                                    <p
                                      style={{
                                        margin: 0,
                                        fontSize: 11,
                                        color: 'var(--c-text-muted)',
                                        lineHeight: 1.45,
                                      }}
                                    >
                                      Premium multi-velocity studio kit featuring 5 velocity layers
                                      and 7 round-robin variations per instrument for natural
                                      acoustic expression.
                                    </p>
                                  </div>

                                  {kitType === 'house' &&
                                    renderCollapsibleSection(
                                      'mic-position',
                                      'Mic Position',
                                      collapsedKitSections,
                                      (id) =>
                                        setCollapsedKitSections((prev) => ({
                                          ...prev,
                                          [id]: !prev[id],
                                        })),
                                      <div style={{ display: 'flex', gap: 6 }}>
                                        {HOUSE_MICS.map((m) => {
                                          const active = houseKitMic === m.id;
                                          return (
                                            <button
                                              key={m.id}
                                              className="btn-smooth"
                                              onClick={() => {
                                                storeSetHouseKitMic(m.id);
                                                setHouseKitMic(m.id);
                                              }}
                                              style={{
                                                flex: 1,
                                                height: 28,
                                                borderRadius: 8,
                                                border: active
                                                  ? `1.5px solid ${accent.from}66`
                                                  : '1.5px solid rgba(255,255,255,0.1)',
                                                background: active
                                                  ? `${accent.from}1a`
                                                  : 'rgba(255,255,255,0.03)',
                                                color: active
                                                  ? accent.from
                                                  : 'var(--c-text-secondary)',
                                                fontSize: 11,
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                              }}
                                            >
                                              {m.label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}

                                  {kitType === 'house' &&
                                    renderCollapsibleSection(
                                      'sound-character',
                                      'Sound Character',
                                      collapsedKitSections,
                                      (id) =>
                                        setCollapsedKitSections((prev) => ({
                                          ...prev,
                                          [id]: !prev[id],
                                        })),
                                      <div
                                        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                                      >
                                        {(
                                          [
                                            'kick',
                                            'snare',
                                            'tom10',
                                            'tom12',
                                            'tom14',
                                          ] as HouseInstName[]
                                        ).map((hInst) => {
                                          const locked = houseInstVelOverride[hInst];
                                          return (
                                            <div
                                              key={hInst}
                                              style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 4,
                                              }}
                                            >
                                              <div
                                                style={{ display: 'flex', alignItems: 'center' }}
                                              >
                                                <span
                                                  style={{
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    color: 'var(--c-text-primary)',
                                                    flex: 1,
                                                  }}
                                                >
                                                  {HOUSE_INST_LABELS[hInst]}
                                                </span>
                                                {locked && (
                                                  <button
                                                    onClick={() =>
                                                      storeSetInstVelOverride(hInst, undefined)
                                                    }
                                                    style={{
                                                      fontSize: 9.5,
                                                      fontWeight: 700,
                                                      color: 'var(--c-text-muted)',
                                                      background: 'none',
                                                      border: 'none',
                                                      cursor: 'pointer',
                                                    }}
                                                  >
                                                    AUTO
                                                  </button>
                                                )}
                                              </div>
                                              <div
                                                style={{
                                                  display: 'flex',
                                                  gap: 4,
                                                  flexWrap: 'wrap',
                                                }}
                                              >
                                                {HOUSE_VEL_CONFIGS[hInst].map((v) => {
                                                  const active = locked === v.id;
                                                  return (
                                                    <button
                                                      key={v.id}
                                                      className="btn-smooth"
                                                      onClick={() =>
                                                        storeSetInstVelOverride(
                                                          hInst,
                                                          active ? undefined : v.id
                                                        )
                                                      }
                                                      style={{
                                                        height: 24,
                                                        padding: '0 8px',
                                                        borderRadius: 6,
                                                        border: active
                                                          ? `1.5px solid ${accent.from}66`
                                                          : '1.5px solid rgba(255,255,255,0.1)',
                                                        background: active
                                                          ? `${accent.from}1a`
                                                          : 'rgba(255,255,255,0.03)',
                                                        color: active
                                                          ? accent.from
                                                          : 'var(--c-text-secondary)',
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                      }}
                                                    >
                                                      {v.label}
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}

                                  {kitType === 'house' &&
                                    renderCollapsibleSection(
                                      'advanced-kit-options',
                                      'Advanced Kit Options',
                                      collapsedKitSections,
                                      (id) =>
                                        setCollapsedKitSections((prev) => ({
                                          ...prev,
                                          [id]: !prev[id],
                                        })),
                                      <div
                                        style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: 12,
                                        }}
                                      >
                                        <div>
                                          <span
                                            style={{
                                              fontSize: 10.5,
                                              fontWeight: 600,
                                              color: 'var(--c-text-secondary)',
                                              display: 'block',
                                              marginBottom: 4,
                                            }}
                                          >
                                            Crash Cymbal Model
                                          </span>
                                          <div
                                            style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}
                                          >
                                            {HOUSE_CRASH_MODELS.map((m) => {
                                              const active = houseCrashModel === m.id;
                                              return (
                                                <button
                                                  key={m.id}
                                                  className="btn-smooth"
                                                  onClick={() =>
                                                    storeSetHouseCrashModel(m.id as HouseCrashModel)
                                                  }
                                                  title={m.desc}
                                                  style={{
                                                    height: 24,
                                                    padding: '0 8px',
                                                    borderRadius: 6,
                                                    border: active
                                                      ? `1.5px solid ${accent.from}66`
                                                      : '1.5px solid rgba(255,255,255,0.1)',
                                                    background: active
                                                      ? `${accent.from}1a`
                                                      : 'rgba(255,255,255,0.03)',
                                                    color: active
                                                      ? accent.from
                                                      : 'var(--c-text-secondary)',
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                  }}
                                                >
                                                  {m.label}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>

                                        <div>
                                          <span
                                            style={{
                                              fontSize: 10.5,
                                              fontWeight: 600,
                                              color: 'var(--c-text-secondary)',
                                              display: 'block',
                                              marginBottom: 4,
                                            }}
                                          >
                                            Cymbal Pack
                                          </span>
                                          <div
                                            style={{
                                              fontSize: 11,
                                              fontWeight: 700,
                                              color: 'var(--c-text-primary)',
                                              padding: '2px 0',
                                            }}
                                          >
                                            Sabian Pack (Hi-hat, crash, ride ΓÇö bright, versatile)
                                          </div>
                                        </div>

                                        <div
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            marginTop: 4,
                                          }}
                                        >
                                          <span
                                            style={{
                                              flex: 1,
                                              fontSize: 12,
                                              fontWeight: 600,
                                              color: 'var(--c-text-primary)',
                                            }}
                                          >
                                            Random Variations
                                          </span>
                                          <button
                                            onClick={() =>
                                              updateDrumPrefs({
                                                randomVariations: !drumPrefs.randomVariations,
                                              })
                                            }
                                            style={{
                                              width: 36,
                                              height: 20,
                                              borderRadius: 10,
                                              background: drumPrefs.randomVariations
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
                                                left: drumPrefs.randomVariations ? 18 : 2.5,
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
                                </div>
    </>
  );
}
