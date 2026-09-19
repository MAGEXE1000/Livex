import React, { useMemo } from 'react';
import { useT, useSettingsStore } from '@workspace/livex-core';
import { StageLibraryItem } from '../types';
import {
  STAGEX_LIBRARY,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  STAGEX_ICON_MAP,
  localizeElementName,
} from '../constants';
import {
  BouncyAccordion,
  type BouncyAccordionItem,
} from '../../../components/motion/bouncy-accordion';

interface StageLibraryPanelProps {
  isLight: boolean;
  accent: { from: string; to: string };
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  customElements: StageLibraryItem[];
  expandedCats: Record<string, boolean>;
  setExpandedCats: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  callIframe: (fn: string, arg?: any) => void;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  handleAddElement: (item: StageLibraryItem) => void;
}

export const StageLibraryPanel = React.memo(
  ({
    isLight,
    accent,
    searchQuery,
    setSearchQuery,
    customElements,
    expandedCats,
    setExpandedCats,
    callIframe,
    iframeRef,
    handleAddElement,
  }: StageLibraryPanelProps) => {
    const t = useT();
    const tr = t as any;
    const language = useSettingsStore((s) => s.settings.language) ?? 'en';
    const isSpanish = language === 'es';

    const getCategoryLabel = (catKey: string) => {
      if (catKey === 'presets') return tr.stagex?.library?.presets || 'Presets';
      if (catKey === 'custom') return tr.stagex?.library?.custom || 'Custom';
      if (catKey === 'mics') return tr.stagex?.library?.mics || 'Mics';
      if (catKey === 'drums') return tr.stagex?.library?.drums || 'Drums';
      if (catKey === 'inst') return tr.stagex?.library?.inst || 'Instruments';
      if (catKey === 'amps') return tr.stagex?.library?.amps || 'Amps';
      if (catKey === 'mon') return tr.stagex?.library?.mon || 'Monitors';
      if (catKey === 'util') return tr.stagex?.library?.util || 'DI & Gear';
      if (catKey === 'people') return tr.stagex?.library?.people || 'People';
      return CATEGORY_LABELS[catKey as keyof typeof CATEGORY_LABELS] || catKey;
    };
    // Pre-compute flattened, lowercased strings for O(1) filter performance
    const searchDictionary = useMemo(() => {
      const dict: { item: StageLibraryItem; searchStr: string }[] = [];
      Object.values(STAGEX_LIBRARY).forEach((cat) => {
        cat.forEach((item) => {
          dict.push({
            item,
            searchStr: `${item.name} ${item.type || ''}`.toLowerCase(),
          });
        });
      });
      return dict;
    }, []);

    const customDictionary = useMemo(() => {
      return customElements.map((item) => ({
        item,
        searchStr: `${item.name} ${item.type || ''}`.toLowerCase(),
      }));
    }, [customElements]);

    // Memoized search results
    const searchResults = useMemo(() => {
      if (!searchQuery) return [];
      const q = searchQuery.toLowerCase();
      const matches: StageLibraryItem[] = [];
      searchDictionary.forEach(({ item, searchStr }) => {
        if (searchStr.includes(q)) matches.push(item);
      });
      customDictionary.forEach(({ item, searchStr }) => {
        if (searchStr.includes(q)) matches.push(item);
      });
      return matches;
    }, [searchQuery, searchDictionary, customDictionary]);

    const renderItemIcon = (item: StageLibraryItem) => {
      if (item.isCustom) {
        if (item.imageData) {
          return (
            <img
              src={item.imageData}
              style={{ width: '20px', height: '20px', objectFit: 'contain' }}
              alt=""
            />
          );
        }
        return <span style={{ fontSize: '18px', lineHeight: 1 }}>{item.emoji || 'ðŸŽµ'}</span>;
      }
      const svgPath = STAGEX_ICON_MAP[item.icon as keyof typeof STAGEX_ICON_MAP] || item.icon;
      if (svgPath) {
        const isRaster =
          svgPath.endsWith('.png') || svgPath.endsWith('.webp') || svgPath.endsWith('.svg');
        const filterStyle = isRaster
          ? undefined
          : isLight
            ? 'opacity(0.7)'
            : 'invert(1) opacity(0.7)';
        return (
          <img
            src={svgPath}
            style={{ width: '20px', height: '20px', objectFit: 'contain', filter: filterStyle }}
            alt=""
          />
        );
      }
      return (
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '20px', color: isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)' }}
        >
          {item.icon}
        </span>
      );
    };

    const renderCard = (item: StageLibraryItem) => {
      const displayName = localizeElementName(item.name, item.type, isSpanish ? 'es' : 'en');
      return (
        <button
          key={item.id || item.name}
          onClick={() => handleAddElement(item)}
          className={`btn-smooth ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/5'} text-left`}
          title={isSpanish ? `Añadir ${displayName}` : `Add ${item.name}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 4px',
            background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
            border: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.05)',
            borderRadius: '8px',
            cursor: 'pointer',
            height: '68px',
            width: '100%',
            boxSizing: 'border-box',
            transition: 'all 150ms ease',
          }}
        >
          <div
            style={{
              height: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {renderItemIcon(item)}
          </div>
          <span
            style={{
              fontSize: '8px',
              fontWeight: 700,
              color: isLight ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.65)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              textAlign: 'center',
              marginTop: '6px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              width: '100%',
              padding: '0 4px',
              boxSizing: 'border-box',
            }}
          >
            {displayName}
          </span>
        </button>
      );
    };

    const renderStageCollapsibleSection = (
      id: string,
      title: string,
      icon: string,
      content: React.ReactNode,
      isAccent = false,
      isGold = false
    ) => {
      const isCollapsed = !expandedCats[id];
      const headerColor = isAccent
        ? accent.from
        : isGold
          ? '#f0b429'
          : isLight
            ? 'rgba(0,0,0,0.55)'
            : 'rgba(255, 255, 255, 0.4)';

      const item: BouncyAccordionItem = {
        id,
        title: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '16px', color: headerColor }}
            >
              {icon}
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: isCollapsed
                  ? isLight
                    ? 'rgba(0,0,0,0.55)'
                    : 'rgba(255,255,255,0.7)'
                  : isLight
                    ? '#000'
                    : '#fff',
              }}
            >
              {title}
            </span>
          </div>
        ),
        description: <div style={{ padding: '4px 2px 0 2px' }}>{content}</div>,
      };

      return (
        <BouncyAccordion
          key={id}
          items={[item]}
          value={!isCollapsed ? id : null}
          onValueChange={(val) => setExpandedCats((prev) => ({ ...prev, [id]: val === id }))}
        />
      );
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
        {/* Title & Search */}
        <div>
          <h4
            style={{
              fontSize: '9px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: isLight ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.3)',
              marginBottom: '8px',
            }}
          >
            {isSpanish ? 'Elementos de Escenario' : 'Stage Elements'}
          </h4>

          <div style={{ position: 'relative', width: '100%', marginBottom: '4px' }}>
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '16px',
                color: isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.35)',
              }}
            >
              search
            </span>
            <input
              type="text"
              placeholder={tr.stagex?.library?.searchPlaceholder || 'Search elements...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: '32px',
                background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)',
                border: isLight ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.07)',
                borderRadius: '6px',
                paddingLeft: '32px',
                paddingRight: searchQuery ? '28px' : '10px',
                fontSize: '11px',
                color: isLight ? '#000' : '#fff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  close
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Elements List */}
        {searchQuery ? (
          <div>
            <h5
              style={{
                fontSize: '8.5px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: isLight ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.35)',
                marginBottom: '8px',
              }}
            >
              {tr.stagex?.library?.searchResults || 'Search Results'}
            </h5>
            {searchResults.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '24px 12px',
                  color: isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.25)',
                  fontSize: '11px',
                }}
              >
                {tr.stagex?.library?.noElementsFound || 'No elements found'}
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                }}
              >
                {searchResults.map((item, idx) => (
                  <div key={idx} style={{ width: '100%' }}>
                    {renderCard(item)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {renderStageCollapsibleSection(
              'presets',
              getCategoryLabel('presets'),
              CATEGORY_ICONS.presets || 'save',
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => callIframe('openPresetsPanel')}
                  className={`btn-smooth ${isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-200' : 'bg-zinc-900 hover:bg-zinc-850 text-white border-zinc-800 hover:border-zinc-700'} border`}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '9px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    save
                  </span>
                  {tr.stagex?.library?.savePreset || 'Save Preset'}
                </button>
                <button
                  onClick={() => callIframe('scOpenElPresets')}
                  className={`btn-smooth ${isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-200' : 'bg-zinc-900 hover:bg-zinc-850 text-white border-zinc-800 hover:border-zinc-700'} border`}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '9px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    bookmark
                  </span>
                  {tr.stagex?.library?.managePresets || 'Manage Presets'}
                </button>
              </div>,
              true
            )}

            {renderStageCollapsibleSection(
              'custom',
              getCategoryLabel('custom'),
              CATEGORY_ICONS.custom || 'add_circle',
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => {
                    try {
                      const win = iframeRef.current?.contentWindow as any;
                      win?.openCustomElementModal?.();
                    } catch {}
                  }}
                  className={`btn-smooth ${isLight ? 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900' : 'hover:bg-zinc-800 text-zinc-350 hover:text-white'}`}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: isLight
                      ? '1px dashed rgba(0,0,0,0.15)'
                      : '1px dashed rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    fontSize: '9px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    add
                  </span>
                  {tr.stagex?.library?.createCustom || 'Create Custom'}
                </button>

                {customElements.length > 0 ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '8px',
                      marginTop: '4px',
                    }}
                  >
                    {customElements.map((item, idx) => (
                      <div key={idx} style={{ width: '100%' }}>
                        {renderCard({ ...item, isCustom: true })}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: '9px',
                      color: isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.3)',
                      textAlign: 'center',
                      padding: '12px 6px',
                    }}
                  >
                    {isSpanish ? 'No hay elementos personalizados aún.' : 'No custom elements yet.'}
                  </div>
                )}
              </div>,
              true
            )}

            {Object.keys(STAGEX_LIBRARY).map((catKey) =>
              renderStageCollapsibleSection(
                catKey,
                getCategoryLabel(catKey),
                CATEGORY_ICONS[catKey as keyof typeof CATEGORY_ICONS] || 'category',
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px',
                  }}
                >
                  {STAGEX_LIBRARY[catKey as keyof typeof STAGEX_LIBRARY].map((item, idx) => (
                    <div key={idx} style={{ width: '100%' }}>
                      {renderCard(item)}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>
    );
  }
);
