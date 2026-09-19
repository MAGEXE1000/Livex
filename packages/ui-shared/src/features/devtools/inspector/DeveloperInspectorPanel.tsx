import CopyButton from '../components/CopyButton';
import { Capacitor } from '@capacitor/core';
import React, { useState, useMemo, useCallback } from 'react';
import {
  useDeveloperInspectorStore,
  InspectorTab,
  GridOverlayMode,
  useNavigationStore,
  FilterCategory,
  APP_VERSION,
} from '@workspace/livex-core';
import { Toggle as StudioToggle } from '../../../shared/design-system/StudioToggle';
import {
  getFiberInfoFromDOMNode,
  getParentElement,
  getFirstChildElement,
  getPreviousSiblingElement,
  getNextSiblingElement,
  getNearestInteractiveElement,
  getNearestLayoutContainer,
  getBreadcrumbsForElement,
  getBoxModel,
  buildElementTree,
  getQuickInspectTargets,
  getElementDOMAttributes,
  DOMTreeNode,
  QuickTarget,
} from './InspectorEngine';

export const DeveloperInspectorPanel: React.FC = () => {
  const isEnabled = useDeveloperInspectorStore((s) => s.isEnabled);
  const isLiveSelecting = useDeveloperInspectorStore((s) => s.isLiveSelecting);
  const isFrozen = useDeveloperInspectorStore((s) => s.isFrozen);
  const selectedElement = useDeveloperInspectorStore((s) => s.selectedElement);
  const selectedFiberInfo = useDeveloperInspectorStore((s) => s.selectedFiberInfo);
  const activeTab = useDeveloperInspectorStore((s) => s.activeTab);
  const searchQuery = useDeveloperInspectorStore((s) => s.searchQuery);
  const activeFilter = useDeveloperInspectorStore((s) => s.activeFilter);
  const gridOverlay = useDeveloperInspectorStore((s) => s.gridOverlay);
  const showBoxModel = useDeveloperInspectorStore((s) => s.showBoxModel);
  const showParentOutline = useDeveloperInspectorStore((s) => s.showParentOutline);
  const showChildrenOutline = useDeveloperInspectorStore((s) => s.showChildrenOutline);
  const breadcrumbs = useDeveloperInspectorStore((s) => s.breadcrumbs);

  const setIsEnabled = useDeveloperInspectorStore((s) => s.setIsEnabled);
  const setIsLiveSelecting = useDeveloperInspectorStore((s) => s.setIsLiveSelecting);
  const toggleFreezeUI = useDeveloperInspectorStore((s) => s.toggleFreezeUI);
  const setSelectedElement = useDeveloperInspectorStore((s) => s.setSelectedElement);
  const setActiveTab = useDeveloperInspectorStore((s) => s.setActiveTab);
  const setSearchQuery = useDeveloperInspectorStore((s) => s.setSearchQuery);
  const setActiveFilter = useDeveloperInspectorStore((s) => s.setActiveFilter);
  const setGridOverlay = useDeveloperInspectorStore((s) => s.setGridOverlay);
  const setShowBoxModel = useDeveloperInspectorStore((s) => s.setShowBoxModel);
  const setShowParentOutline = useDeveloperInspectorStore((s) => s.setShowParentOutline);
  const setShowChildrenOutline = useDeveloperInspectorStore((s) => s.setShowChildrenOutline);
  const showRouteTracer = useDeveloperInspectorStore((s) => s.showRouteTracer);
  const setShowRouteTracer = useDeveloperInspectorStore((s) => s.setShowRouteTracer);
  const resetInspector = useDeveloperInspectorStore((s) => s.resetInspector);

  const history = useNavigationStore((s) => s.history);
  const currentRoute =
    history.length > 0
      ? `${history[history.length - 1].app}/${history[history.length - 1].tab || ''}`
      : 'hub';

  const [notification, setNotification] = useState<string | null>(null);
  const [treeRefreshCounter, setTreeRefreshCounter] = useState(0);

  const showFeedback = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2200);
  };

  const selectNode = useCallback(
    (target: HTMLElement | null) => {
      if (!target) return;
      const fiberInfo = getFiberInfoFromDOMNode(target);
      const crumbs = getBreadcrumbsForElement(target);
      setSelectedElement(target, fiberInfo, crumbs);
      setIsLiveSelecting(false);
    },
    [setSelectedElement, setIsLiveSelecting]
  );

  const handleReinspectCurrentNode = useCallback(() => {
    if (!selectedElement || !document.body.contains(selectedElement)) {
      showFeedback('No valid element currently selected');
      return;
    }
    const fiberInfo = getFiberInfoFromDOMNode(selectedElement);
    const crumbs = getBreadcrumbsForElement(selectedElement);
    setSelectedElement(selectedElement, fiberInfo, crumbs);
    setTreeRefreshCounter((c) => c + 1);
    showFeedback('Re-inspected node');
  }, [selectedElement, setSelectedElement]);

  const handleClearSelection = useCallback(() => {
    resetInspector();
    showFeedback('Cleared inspector selection');
  }, [resetInspector]);

  // Computed layout & styles from actual runtime DOM
  const computedStyles = useMemo(() => {
    if (!selectedElement || !document.body.contains(selectedElement)) return null;
    try {
      const style = window.getComputedStyle(selectedElement);
      return {
        display: style.display,
        position: style.position,
        width: style.width,
        height: style.height,
        minWidth: style.minWidth,
        maxWidth: style.maxWidth,
        boxSizing: style.boxSizing,
        zIndex: style.zIndex,
        opacity: style.opacity,
        color: style.color,
        backgroundColor: style.backgroundColor,
        border: style.border,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        backdropFilter: style.backdropFilter || (style as any).webkitBackdropFilter || 'none',
        pointerEvents: style.pointerEvents,
        transform: style.transform,
        overflow: style.overflow,
        flexDirection: style.flexDirection,
        justifyContent: style.justifyContent,
        alignItems: style.alignItems,
        gridTemplateColumns: style.gridTemplateColumns,
        gap: style.gap,
      };
    } catch (e) {
      return null;
    }
  }, [selectedElement, treeRefreshCounter]);

  // Computed box model
  const boxModel = useMemo(() => {
    if (!selectedElement || !document.body.contains(selectedElement)) return null;
    try {
      return getBoxModel(selectedElement);
    } catch (e) {
      return null;
    }
  }, [selectedElement, treeRefreshCounter]);

  // DOM attributes
  const domAttributes = useMemo(() => {
    if (!selectedElement || !document.body.contains(selectedElement)) return [];
    return getElementDOMAttributes(selectedElement);
  }, [selectedElement, treeRefreshCounter]);

  // Quick targets when empty
  const quickTargets = useMemo<QuickTarget[]>(() => {
    return getQuickInspectTargets();
  }, [treeRefreshCounter, currentRoute]);

  // Subtree structure for Tree tab
  const elementTree = useMemo<DOMTreeNode | null>(() => {
    const rootTarget = selectedElement
      ? selectedElement.parentElement || selectedElement
      : document.getElementById('root') || document.body;
    return buildElementTree(rootTarget, 4);
  }, [selectedElement, treeRefreshCounter]);

  const handleExportDiagnostics = () => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      studioVersion: APP_VERSION,
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
      device: {
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      },
      currentRoute,
      navigationHistory: history,
      selectedElement: selectedElement
        ? {
            tagName: selectedElement.tagName.toLowerCase(),
            id: selectedElement.id,
            className: selectedElement.className,
            rect: selectedElement.getBoundingClientRect(),
          }
        : null,
      fiberInfo: selectedFiberInfo,
      computedStyles,
      boxModel,
      domAttributes,
      userAgent: navigator.userAgent,
    };
    const blob = new Blob([JSON.stringify(diagnostics, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studio_inspector_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showFeedback('Downloaded diagnostics snapshot');
  };

  const tabs: { id: InspectorTab; label: string; icon: string }[] = [
    { id: 'info', label: 'Info', icon: 'info' },
    { id: 'props', label: 'Props/State', icon: 'data_object' },
    { id: 'styles', label: 'Styles', icon: 'palette' },
    { id: 'tree', label: 'Tree', icon: 'account_tree' },
    { id: 'measure', label: 'Measure', icon: 'straighten' },
    { id: 'export', label: 'Export', icon: 'download' },
  ];

  const filterPills: { id: FilterCategory; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'interactive', label: 'Interactive' },
    { id: 'react', label: 'React' },
    { id: 'dom', label: 'DOM' },
    { id: 'scrollable', label: 'Containers' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--app-bg)',
        color: 'var(--c-text-primary)',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSize: '12px',
        minWidth: 0,
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Header Toolbar */}
      <div
        style={{
          padding: '10px 14px',
          background: 'var(--app-surface)',
          borderBottom: '1px solid var(--c-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          flexShrink: 0,
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <StudioToggle
            value={isEnabled}
            onChange={(val) => {
              setIsEnabled(val);
              showFeedback(val ? 'Inspector Enabled' : 'Inspector Disabled');
            }}
            size="sm"
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontWeight: 800,
                fontSize: '12px',
                color: 'var(--c-text-primary)',
                fontFamily: 'var(--studio-font-body)',
              }}
            >
              Developer Inspector
            </span>
            <span style={{ fontSize: '10px', color: 'var(--c-text-secondary)' }}>
              {isEnabled ? (isLiveSelecting ? 'Tap element to inspect' : 'Ready') : 'Disabled'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {/* Select Button */}
          <button
            type="button"
            onClick={() => {
              if (!isEnabled) setIsEnabled(true);
              setIsLiveSelecting(!isLiveSelecting);
              showFeedback(!isLiveSelecting ? 'Tap/Drag to Select' : 'Select Stopped');
            }}
            style={{
              padding: '5px 12px',
              borderRadius: '999px',
              border: isLiveSelecting ? 'none' : '1px solid var(--c-border)',
              background: isLiveSelecting
                ? 'var(--studio-accent-from, #2563eb)'
                : 'var(--app-surface-high, var(--app-surface))',
              color: isLiveSelecting ? '#ffffff' : 'var(--c-text-primary)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              boxShadow: isLiveSelecting ? '0 0 10px rgba(37,99,235,0.4)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
              touch_app
            </span>
            {isLiveSelecting ? 'Tap Element...' : 'Select'}
          </button>

          {/* Freeze UI Button */}
          <button
            type="button"
            onClick={() => {
              if (!isEnabled) setIsEnabled(true);
              toggleFreezeUI();
              showFeedback(!isFrozen ? 'UI Frozen (input & motion locked)' : 'UI Unfrozen');
            }}
            style={{
              padding: '5px 12px',
              borderRadius: '999px',
              border: isFrozen ? 'none' : '1px solid var(--c-border)',
              background: isFrozen ? '#f59e0b' : 'var(--app-surface-high, var(--app-surface))',
              color: isFrozen ? '#ffffff' : 'var(--c-text-primary)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              boxShadow: isFrozen ? '0 0 10px rgba(245,158,11,0.4)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
              ac_unit
            </span>
            {isFrozen ? 'Frozen' : 'Freeze UI'}
          </button>

          {/* Re-inspect Button */}
          <button
            type="button"
            onClick={handleReinspectCurrentNode}
            title="Re-inspect current element"
            style={{
              background: 'var(--app-surface-high, var(--app-surface))',
              border: '1px solid var(--c-border)',
              borderRadius: '8px',
              color: 'var(--c-text-primary)',
              cursor: 'pointer',
              padding: '5px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
              refresh
            </span>
          </button>

          {/* Clear Button */}
          {selectedElement && (
            <button
              type="button"
              onClick={handleClearSelection}
              title="Clear selection"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                color: '#ee7d77',
                cursor: 'pointer',
                padding: '5px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                close
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Freeze UI Notice Banner */}
      {isFrozen && (
        <div
          style={{
            padding: '6px 14px',
            background: 'rgba(245, 158, 11, 0.12)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
            color: '#fbbf24',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            ac_unit
          </span>
          UI is Frozen • Animations paused and user input captured for stable inspection.
        </div>
      )}

      {/* 2. Traversal Toolbar */}
      {selectedElement && (
        <div
          style={{
            padding: '6px 12px',
            background: 'var(--app-surface-low, var(--app-surface))',
            borderBottom: '1px solid var(--c-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            overflowX: 'auto',
            flexShrink: 0,
            scrollbarWidth: 'none',
          }}
        >
          <span
            style={{
              fontSize: '9.5px',
              fontWeight: 800,
              color: 'var(--c-text-secondary)',
              letterSpacing: '0.06em',
              marginRight: 4,
              flexShrink: 0,
            }}
          >
            TRAVERSE:
          </span>
          <button
            type="button"
            onClick={() => selectNode(getParentElement(selectedElement))}
            style={navBtnStyle}
          >
            Parent
          </button>
          <button
            type="button"
            onClick={() => selectNode(getFirstChildElement(selectedElement))}
            style={navBtnStyle}
          >
            Child
          </button>
          <button
            type="button"
            onClick={() => selectNode(getPreviousSiblingElement(selectedElement))}
            style={navBtnStyle}
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => selectNode(getNextSiblingElement(selectedElement))}
            style={navBtnStyle}
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => selectNode(getNearestInteractiveElement(selectedElement))}
            style={navBtnStyle}
          >
            Interactive
          </button>
          <button
            type="button"
            onClick={() => selectNode(getNearestLayoutContainer(selectedElement))}
            style={navBtnStyle}
          >
            Container
          </button>
        </div>
      )}

      {/* 3. Breadcrumbs Trail */}
      {breadcrumbs.length > 0 && (
        <div
          style={{
            padding: '6px 12px',
            background: 'var(--app-surface)',
            borderBottom: '1px solid var(--c-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            fontSize: '11px',
            flexShrink: 0,
            scrollbarWidth: 'none',
          }}
        >
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span style={{ color: 'var(--c-text-secondary)', opacity: 0.5 }}>›</span>}
              <span
                onClick={() => selectNode(crumb.element)}
                style={{
                  color: crumb.isReact ? '#10b981' : 'var(--c-text-secondary)',
                  fontWeight: crumb.element === selectedElement ? 800 : 500,
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontFamily: crumb.isReact ? 'var(--studio-font-body)' : 'monospace',
                  background:
                    crumb.element === selectedElement ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  border:
                    crumb.element === selectedElement
                      ? '1px solid rgba(16, 185, 129, 0.3)'
                      : 'none',
                }}
              >
                {crumb.isReact ? `<${crumb.name}>` : crumb.name}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* 4. Tab Selector */}
      <div
        style={{
          display: 'flex',
          background: 'var(--app-surface-low, var(--app-surface))',
          borderBottom: '1px solid var(--c-border)',
          overflowX: 'auto',
          flexShrink: 0,
          scrollbarWidth: 'none',
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            style={{
              flex: 1,
              padding: '10px 8px',
              border: 'none',
              background:
                activeTab === t.id ? 'var(--app-surface-high, var(--app-surface))' : 'transparent',
              color:
                activeTab === t.id
                  ? 'var(--studio-accent-from, #2563eb)'
                  : 'var(--c-text-secondary)',
              fontWeight: activeTab === t.id ? 800 : 600,
              fontSize: '11px',
              borderBottom:
                activeTab === t.id
                  ? '2px solid var(--studio-accent-from, #2563eb)'
                  : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              whiteSpace: 'nowrap',
              fontFamily: 'var(--studio-font-body)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {t.icon}
            </span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* 5. Tab Content Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          minWidth: 0,
          boxSizing: 'border-box',
        }}
      >
        {notification && (
          <div
            style={{
              padding: '8px 12px',
              background: 'var(--studio-accent-from, #2563eb)',
              color: '#ffffff',
              borderRadius: '8px',
              marginBottom: 12,
              fontWeight: 700,
              fontSize: '11.5px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              check_circle
            </span>
            {notification}
          </div>
        )}

        {/* Tab 1: INFO */}
        {activeTab === 'info' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            {!selectedElement ? (
              <EmptyInspectorState
                quickTargets={quickTargets}
                onSelectTarget={selectNode}
                onStartSelect={() => {
                  if (!isEnabled) setIsEnabled(true);
                  setIsLiveSelecting(true);
                  showFeedback('Tap any UI element on screen to inspect');
                }}
              />
            ) : (
              <>
                {/* Active Element Banner */}
                <div
                  style={{
                    background: 'var(--app-surface-high, var(--app-surface))',
                    border: '1px solid var(--c-border)',
                    borderRadius: '14px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span
                        className="material-symbols-outlined"
                        style={{ color: '#10b981', fontSize: 20, flexShrink: 0 }}
                      >
                        widgets
                      </span>
                      <span
                        style={{
                          fontSize: '15px',
                          fontWeight: 800,
                          color: '#10b981',
                          fontFamily: 'var(--studio-font-body)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        &lt;
                        {selectedFiberInfo?.displayName || selectedElement.tagName.toLowerCase()}
                        &gt;
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: selectedFiberInfo?.memoized
                          ? 'rgba(168, 85, 247, 0.15)'
                          : 'rgba(59, 130, 246, 0.15)',
                        color: selectedFiberInfo?.memoized
                          ? '#c084fc'
                          : 'var(--studio-accent-from, #679cff)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {selectedFiberInfo?.memoized
                        ? 'React.memo'
                        : selectedFiberInfo
                          ? 'React Component'
                          : 'DOM Element'}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--c-text-secondary)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '4px 12px',
                    }}
                  >
                    <span>
                      Tag:{' '}
                      <strong style={{ color: 'var(--c-text-primary)', fontFamily: 'monospace' }}>
                        {selectedElement.tagName.toLowerCase()}
                      </strong>
                    </span>
                    {selectedFiberInfo?.ownerName && (
                      <span>
                        Owner:{' '}
                        <strong style={{ color: 'var(--c-text-primary)' }}>
                          &lt;{selectedFiberInfo.ownerName}&gt;
                        </strong>
                      </span>
                    )}
                    {selectedFiberInfo?.sourceFile && (
                      <span>
                        Source:{' '}
                        <strong style={{ color: 'var(--c-text-primary)', fontFamily: 'monospace' }}>
                          {selectedFiberInfo.sourceFile}:{selectedFiberInfo.lineNumber}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Geometry & Bounds */}
                <div style={cardStyle}>
                  <div style={cardTitleStyle}>Geometry & Layout Coordinates</div>
                  <div style={rowStyle}>
                    <span style={labelStyle}>Rendered Box:</span>
                    <span style={{ ...valStyle, fontFamily: 'monospace' }}>
                      {Math.round(selectedElement.getBoundingClientRect().width)} ×{' '}
                      {Math.round(selectedElement.getBoundingClientRect().height)} px
                    </span>
                  </div>
                  <div style={rowStyle}>
                    <span style={labelStyle}>Viewport Position:</span>
                    <span style={{ ...valStyle, fontFamily: 'monospace' }}>
                      X: {Math.round(selectedElement.getBoundingClientRect().left)}px, Y:{' '}
                      {Math.round(selectedElement.getBoundingClientRect().top)}px
                    </span>
                  </div>
                  <div style={rowStyle}>
                    <span style={labelStyle}>Children Count:</span>
                    <span style={valStyle}>
                      {selectedFiberInfo?.childrenCount ?? selectedElement.children.length} direct
                      children
                    </span>
                  </div>
                  <div style={rowStyle}>
                    <span style={labelStyle}>Render Depth:</span>
                    <span style={valStyle}>{selectedFiberInfo?.renderDepth ?? 0}</span>
                  </div>
                </div>

                {/* DOM Details */}
                <div style={cardStyle}>
                  <div style={cardTitleStyle}>DOM Node Identifiers</div>
                  <div style={rowStyle}>
                    <span style={labelStyle}>ID Attribute:</span>
                    <span style={valStyle}>{selectedElement.id || '(none)'}</span>
                  </div>
                  <div style={rowStyle}>
                    <span style={labelStyle}>Class List:</span>
                    <span
                      style={{
                        ...valStyle,
                        fontFamily: 'monospace',
                        fontSize: '10.5px',
                        wordBreak: 'break-all',
                        maxWidth: '70%',
                        textAlign: 'right',
                      }}
                    >
                      {selectedElement.className || '(none)'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 2: PROPS & STATE */}
        {activeTab === 'props' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            {!selectedElement ? (
              <EmptyInspectorState
                quickTargets={quickTargets}
                onSelectTarget={selectNode}
                onStartSelect={() => {
                  if (!isEnabled) setIsEnabled(true);
                  setIsLiveSelecting(true);
                }}
              />
            ) : (
              <>
                {/* React Props */}
                <div style={cardStyle}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={cardTitleStyle}>React Fiber Props</div>
                    {selectedFiberInfo?.props &&
                      Object.keys(selectedFiberInfo.props).length > 0 && (
                        <CopyButton
                          getTextToCopy={() => JSON.stringify(selectedFiberInfo.props, null, 2)}
                          label="Copy Props"
                          size="sm"
                        />
                      )}
                  </div>
                  {selectedFiberInfo?.props && Object.keys(selectedFiberInfo.props).length > 0 ? (
                    <pre style={codeBlockStyle}>
                      {JSON.stringify(selectedFiberInfo.props, null, 2)}
                    </pre>
                  ) : (
                    <div style={emptyFallbackStyle}>
                      No local props recorded on this component fiber.
                    </div>
                  )}
                </div>

                {/* React State */}
                <div style={cardStyle}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={cardTitleStyle}>React Component State</div>
                    {selectedFiberInfo?.state &&
                      Object.keys(selectedFiberInfo.state).length > 0 && (
                        <CopyButton
                          getTextToCopy={() => JSON.stringify(selectedFiberInfo.state, null, 2)}
                          label="Copy State"
                          size="sm"
                        />
                      )}
                  </div>
                  {selectedFiberInfo?.state && Object.keys(selectedFiberInfo.state).length > 0 ? (
                    <pre style={codeBlockStyle}>
                      {JSON.stringify(selectedFiberInfo.state, null, 2)}
                    </pre>
                  ) : (
                    <div style={emptyFallbackStyle}>
                      No local useState / useReducer state attached to this fiber.
                    </div>
                  )}
                </div>

                {/* DOM Attributes */}
                <div style={cardStyle}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={cardTitleStyle}>
                      DOM Attributes & Dataset ({domAttributes.length})
                    </div>
                    {domAttributes.length > 0 && (
                      <CopyButton
                        getTextToCopy={() =>
                          domAttributes.map((a) => `${a.name}="${a.value}"`).join('\n')
                        }
                        label="Copy Attributes"
                        size="sm"
                      />
                    )}
                  </div>
                  {domAttributes.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {domAttributes.map((attr, i) => (
                        <div key={i} style={rowStyle}>
                          <span
                            style={{ ...labelStyle, fontFamily: 'monospace', color: '#38bdf8' }}
                          >
                            {attr.name}
                          </span>
                          <span
                            style={{
                              ...valStyle,
                              fontFamily: 'monospace',
                              fontSize: '10.5px',
                              wordBreak: 'break-all',
                              maxWidth: '65%',
                              textAlign: 'right',
                            }}
                          >
                            &quot;{attr.value}&quot;
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={emptyFallbackStyle}>No HTML attributes on this node.</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 3: STYLES */}
        {activeTab === 'styles' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            {!selectedElement ? (
              <EmptyInspectorState
                quickTargets={quickTargets}
                onSelectTarget={selectNode}
                onStartSelect={() => {
                  if (!isEnabled) setIsEnabled(true);
                  setIsLiveSelecting(true);
                }}
              />
            ) : (
              <>
                {/* Visual Box Model Diagram */}
                {boxModel && (
                  <div style={cardStyle}>
                    <div style={cardTitleStyle}>Visual Box Model (px)</div>
                    <div
                      style={{
                        padding: '12px 6px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 0,
                      }}
                    >
                      {/* Margin Container (Amber) */}
                      <div
                        style={{
                          width: '100%',
                          maxWidth: '300px',
                          background: 'rgba(245, 158, 11, 0.12)',
                          border: '1.5px dashed #f59e0b',
                          borderRadius: '8px',
                          padding: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: '9.5px',
                          color: '#fbbf24',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          boxSizing: 'border-box',
                        }}
                      >
                        <span>margin: {boxModel.margin.top}</span>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                          }}
                        >
                          <span>{boxModel.margin.left}</span>

                          {/* Border Container (Yellow) */}
                          <div
                            style={{
                              flex: 1,
                              margin: '0 6px',
                              background: 'rgba(234, 179, 8, 0.12)',
                              border: '1.5px solid #eab308',
                              borderRadius: '6px',
                              padding: '6px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 4,
                              color: '#fde047',
                            }}
                          >
                            <span>border: {boxModel.border.top}</span>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%',
                              }}
                            >
                              <span>{boxModel.border.left}</span>

                              {/* Padding Container (Green) */}
                              <div
                                style={{
                                  flex: 1,
                                  margin: '0 6px',
                                  background: 'rgba(16, 185, 129, 0.12)',
                                  border: '1.5px solid #10b981',
                                  borderRadius: '4px',
                                  padding: '6px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: 4,
                                  color: '#34d399',
                                }}
                              >
                                <span>padding: {boxModel.padding.top}</span>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    width: '100%',
                                  }}
                                >
                                  <span>{boxModel.padding.left}</span>

                                  {/* Content Container (Blue) */}
                                  <div
                                    style={{
                                      flex: 1,
                                      margin: '0 6px',
                                      background: 'rgba(59, 130, 246, 0.25)',
                                      border: '1.5px solid #3b82f6',
                                      borderRadius: '4px',
                                      padding: '8px 4px',
                                      textAlign: 'center',
                                      color: '#93c5fd',
                                      fontWeight: 800,
                                    }}
                                  >
                                    {Math.round(boxModel.content.width)} ×{' '}
                                    {Math.round(boxModel.content.height)}
                                  </div>

                                  <span>{boxModel.padding.right}</span>
                                </div>
                                <span>{boxModel.padding.bottom}</span>
                              </div>

                              <span>{boxModel.border.right}</span>
                            </div>
                            <span>{boxModel.border.bottom}</span>
                          </div>

                          <span>{boxModel.margin.right}</span>
                        </div>
                        <span>{boxModel.margin.bottom}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Categorized CSS Properties */}
                {computedStyles && (
                  <>
                    <div style={cardStyle}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={cardTitleStyle}>Layout & Flow</div>
                        <CopyButton
                          getTextToCopy={() => JSON.stringify(computedStyles, null, 2)}
                          label="Copy All CSS"
                          size="sm"
                        />
                      </div>
                      <div style={rowStyle}>
                        <span style={labelStyle}>display:</span>
                        <span style={valStyle}>{computedStyles.display}</span>
                      </div>
                      <div style={rowStyle}>
                        <span style={labelStyle}>position:</span>
                        <span style={valStyle}>
                          {computedStyles.position} (z-index: {computedStyles.zIndex})
                        </span>
                      </div>
                      {computedStyles.display.includes('flex') && (
                        <>
                          <div style={rowStyle}>
                            <span style={labelStyle}>flex-direction:</span>
                            <span style={valStyle}>{computedStyles.flexDirection}</span>
                          </div>
                          <div style={rowStyle}>
                            <span style={labelStyle}>justify-content:</span>
                            <span style={valStyle}>{computedStyles.justifyContent}</span>
                          </div>
                          <div style={rowStyle}>
                            <span style={labelStyle}>align-items:</span>
                            <span style={valStyle}>{computedStyles.alignItems}</span>
                          </div>
                          <div style={rowStyle}>
                            <span style={labelStyle}>gap:</span>
                            <span style={valStyle}>{computedStyles.gap}</span>
                          </div>
                        </>
                      )}
                      <div style={rowStyle}>
                        <span style={labelStyle}>overflow:</span>
                        <span style={valStyle}>{computedStyles.overflow}</span>
                      </div>
                      <div style={rowStyle}>
                        <span style={labelStyle}>box-sizing:</span>
                        <span style={valStyle}>{computedStyles.boxSizing}</span>
                      </div>
                    </div>

                    <div style={cardStyle}>
                      <div style={cardTitleStyle}>Typography & Text</div>
                      <div style={rowStyle}>
                        <span style={labelStyle}>font-family:</span>
                        <span
                          style={{
                            ...valStyle,
                            maxWidth: '65%',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {computedStyles.fontFamily}
                        </span>
                      </div>
                      <div style={rowStyle}>
                        <span style={labelStyle}>font-size / weight:</span>
                        <span style={valStyle}>
                          {computedStyles.fontSize} ({computedStyles.fontWeight})
                        </span>
                      </div>
                      <div style={rowStyle}>
                        <span style={labelStyle}>color:</span>
                        <span
                          style={{ ...valStyle, display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 2,
                              background: computedStyles.color,
                              border: '1px solid var(--c-border)',
                              display: 'inline-block',
                            }}
                          />
                          {computedStyles.color}
                        </span>
                      </div>
                    </div>

                    <div style={cardStyle}>
                      <div style={cardTitleStyle}>Surface & Styling</div>
                      <div style={rowStyle}>
                        <span style={labelStyle}>background-color:</span>
                        <span
                          style={{ ...valStyle, display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 2,
                              background: computedStyles.backgroundColor,
                              border: '1px solid var(--c-border)',
                              display: 'inline-block',
                            }}
                          />
                          {computedStyles.backgroundColor}
                        </span>
                      </div>
                      <div style={rowStyle}>
                        <span style={labelStyle}>border-radius:</span>
                        <span style={valStyle}>{computedStyles.borderRadius}</span>
                      </div>
                      <div style={rowStyle}>
                        <span style={labelStyle}>opacity:</span>
                        <span style={valStyle}>{computedStyles.opacity}</span>
                      </div>
                      <div style={rowStyle}>
                        <span style={labelStyle}>pointer-events:</span>
                        <span style={valStyle}>{computedStyles.pointerEvents}</span>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab 4: TREE */}
        {activeTab === 'tree' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
            {/* Search & Filter Controls */}
            <input
              type="text"
              placeholder="Search component tree by name or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={inputStyle}
            />

            <div
              style={{
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                paddingBottom: 2,
                scrollbarWidth: 'none',
              }}
            >
              {filterPills.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveFilter(p.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    border: activeFilter === p.id ? 'none' : '1px solid var(--c-border)',
                    background:
                      activeFilter === p.id
                        ? 'var(--studio-accent-from, #2563eb)'
                        : 'var(--app-surface-high, var(--app-surface))',
                    color: activeFilter === p.id ? '#ffffff' : 'var(--c-text-secondary)',
                    fontSize: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontFamily: 'var(--studio-font-body)',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Subtree Hierarchy View */}
            <div style={cardStyle}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={cardTitleStyle}>Inspectable Subtree Hierarchy</div>
                <span style={{ fontSize: '10px', color: 'var(--c-text-secondary)' }}>
                  Tap row to inspect
                </span>
              </div>

              {elementTree ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    maxHeight: 360,
                    overflowY: 'auto',
                  }}
                >
                  <TreeNodeRow
                    node={elementTree}
                    selectedElement={selectedElement}
                    searchQuery={searchQuery}
                    activeFilter={activeFilter}
                    onSelectNode={selectNode}
                  />
                </div>
              ) : (
                <div style={emptyFallbackStyle}>No DOM subtree available.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: MEASURE & OVERLAYS */}
        {activeTab === 'measure' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            <div style={cardStyle}>
              <div style={cardTitleStyle}>Live Overlays & Highlights</div>
              <div style={rowStyle}>
                <span style={labelStyle}>Show Box Model Shading:</span>
                <StudioToggle value={showBoxModel} onChange={setShowBoxModel} size="sm" />
              </div>
              <div style={rowStyle}>
                <span style={labelStyle}>Show Parent Outline (Purple):</span>
                <StudioToggle value={showParentOutline} onChange={setShowParentOutline} size="sm" />
              </div>
              <div style={rowStyle}>
                <span style={labelStyle}>Show Children Outlines (Cyan):</span>
                <StudioToggle
                  value={showChildrenOutline}
                  onChange={setShowChildrenOutline}
                  size="sm"
                />
              </div>
              <div style={rowStyle}>
                <span style={labelStyle}>Route Tracer HUD:</span>
                <StudioToggle value={showRouteTracer} onChange={setShowRouteTracer} size="sm" />
              </div>
            </div>

            <div style={cardStyle}>
              <div style={cardTitleStyle}>Grid Overlay Mode</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 8,
                }}
              >
                {(
                  [
                    { id: 'none', label: 'None' },
                    { id: '4dp', label: '4dp Grid' },
                    { id: '8dp', label: '8dp Grid' },
                    { id: 'safeArea', label: 'Safe Area' },
                    { id: 'touchTargets', label: 'Touch Targets (<44dp)' },
                  ] as Array<{ id: GridOverlayMode; label: string }>
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setGridOverlay(item.id);
                      showFeedback(`Grid Overlay: ${item.label}`);
                    }}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '8px',
                      border: gridOverlay === item.id ? 'none' : '1px solid var(--c-border)',
                      background:
                        gridOverlay === item.id
                          ? 'var(--studio-accent-from, #2563eb)'
                          : 'var(--app-surface-high, var(--app-surface))',
                      color: gridOverlay === item.id ? '#ffffff' : 'var(--c-text-secondary)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontFamily: 'var(--studio-font-body)',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: EXPORT */}
        {activeTab === 'export' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            <div style={cardStyle}>
              <div style={cardTitleStyle}>Engineering Diagnostics Snapshot</div>
              <p
                style={{
                  color: 'var(--c-text-secondary)',
                  fontSize: '11px',
                  lineHeight: 1.45,
                  margin: '0 0 12px',
                }}
              >
                Download a verified JSON telemetry snapshot containing React Fiber metadata, DOM
                identifiers, computed styles, visual box model coordinates, and device dimensions.
              </p>
              <button
                type="button"
                onClick={handleExportDiagnostics}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#10b981',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '12px',
                  fontFamily: 'var(--studio-font-body)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  download
                </span>
                Download JSON Snapshot
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Empty state providing immediate quick inspection targets
 */
const EmptyInspectorState: React.FC<{
  quickTargets: QuickTarget[];
  onSelectTarget: (el: HTMLElement) => void;
  onStartSelect: () => void;
}> = ({ quickTargets, onSelectTarget, onStartSelect }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
      <div
        style={{
          textAlign: 'center',
          padding: '24px 16px',
          background: 'var(--app-surface-high, var(--app-surface))',
          borderRadius: '14px',
          border: '1px solid var(--c-border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(37,99,235,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--studio-accent-from, #2563eb)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 28 }}>
            touch_app
          </span>
        </div>
        <div>
          <h4
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 800,
              color: 'var(--c-text-primary)',
              fontFamily: 'var(--studio-font-body)',
            }}
          >
            Ready to Inspect
          </h4>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '11px',
              color: 'var(--c-text-secondary)',
              lineHeight: 1.4,
            }}
          >
            Tap <strong>Select</strong> in the toolbar to tap any UI element, long-press (500ms) on
            screen, or choose a quick container below.
          </p>
        </div>
        <button
          type="button"
          onClick={onStartSelect}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--studio-accent-from, #2563eb)',
            color: '#ffffff',
            fontSize: '11.5px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--studio-font-body)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            ads_click
          </span>
          Start Select Mode
        </button>
      </div>

      {quickTargets.length > 0 && (
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Quick Target Shortcuts</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {quickTargets.map((qt, idx) => (
              <div
                key={idx}
                onClick={() => onSelectTarget(qt.element)}
                style={{
                  padding: '8px 12px',
                  background: 'var(--app-surface-low, var(--app-surface))',
                  border: '1px solid var(--c-border)',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '11.5px',
                      color: '#10b981',
                      fontFamily: 'monospace',
                    }}
                  >
                    {qt.name}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--c-text-secondary)' }}>
                    {qt.type} • {qt.description}
                  </div>
                </div>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 16, color: 'var(--c-text-secondary)' }}
                >
                  arrow_forward
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Recursive tree node row for the Tree Tab
 */
const TreeNodeRow: React.FC<{
  node: DOMTreeNode;
  selectedElement: HTMLElement | null;
  searchQuery: string;
  activeFilter: FilterCategory;
  onSelectNode: (el: HTMLElement) => void;
}> = ({ node, selectedElement, searchQuery, activeFilter, onSelectNode }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter matching
  const matchesSearch =
    !searchQuery ||
    node.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.tagName.toLowerCase().includes(searchQuery.toLowerCase());

  let matchesCategory = true;
  if (activeFilter === 'interactive') matchesCategory = node.isInteractive;
  else if (activeFilter === 'react') matchesCategory = node.isReact;
  else if (activeFilter === 'dom') matchesCategory = !node.isReact;
  else if (activeFilter === 'scrollable') matchesCategory = node.isLayoutContainer;

  const isSelected = node.element === selectedElement;

  if (!matchesSearch || !matchesCategory) {
    if (node.children.length === 0) return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        onClick={() => onSelectNode(node.element)}
        style={{
          padding: '5px 8px',
          paddingLeft: `${Math.min(node.depth * 14 + 8, 80)}px`,
          borderRadius: '6px',
          background: isSelected ? 'rgba(37,99,235,0.18)' : 'transparent',
          border: isSelected ? '1px solid rgba(37,99,235,0.3)' : '1px solid transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          fontSize: '11px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
          {node.hasChildren && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="material-symbols-outlined"
              style={{ fontSize: 14, color: 'var(--c-text-secondary)', cursor: 'pointer' }}
            >
              {isExpanded ? 'expand_more' : 'chevron_right'}
            </span>
          )}
          <span
            style={{
              color: node.isReact ? '#10b981' : 'var(--c-text-primary)',
              fontWeight: isSelected ? 800 : node.isReact ? 700 : 500,
              fontFamily: node.isReact ? 'var(--studio-font-body)' : 'monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {node.isReact ? `<${node.displayName}>` : node.displayName}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {node.isInteractive && (
            <span
              style={{
                fontSize: '8.5px',
                background: 'rgba(59,130,246,0.15)',
                color: 'var(--studio-accent-from, #679cff)',
                padding: '1px 4px',
                borderRadius: 3,
                fontWeight: 700,
              }}
            >
              ACTION
            </span>
          )}
        </div>
      </div>

      {isExpanded && node.children.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              selectedElement={selectedElement}
              searchQuery={searchQuery}
              activeFilter={activeFilter}
              onSelectNode={onSelectNode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DeveloperInspectorPanel;

const cardStyle: React.CSSProperties = {
  background: 'var(--app-surface-high, var(--app-surface))',
  border: '1px solid var(--c-border)',
  borderRadius: '12px',
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  minWidth: 0,
  boxSizing: 'border-box',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--c-text-secondary)',
  fontFamily: 'var(--studio-font-body)',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '4px 0',
  borderBottom: '1px dashed var(--c-border)',
  minWidth: 0,
};

const labelStyle: React.CSSProperties = {
  color: 'var(--c-text-secondary)',
  fontSize: '11px',
  flexShrink: 0,
};

const valStyle: React.CSSProperties = {
  color: 'var(--c-text-primary)',
  fontSize: '11px',
  fontWeight: 600,
};

const navBtnStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: '6px',
  border: '1px solid var(--c-border)',
  background: 'var(--app-surface-high, var(--app-surface))',
  color: 'var(--c-text-primary)',
  fontSize: '10px',
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  fontFamily: 'var(--studio-font-body)',
  flexShrink: 0,
};

const codeBlockStyle: React.CSSProperties = {
  background: 'var(--app-surface-low, var(--app-surface))',
  border: '1px solid var(--c-border)',
  borderRadius: '8px',
  padding: '10px',
  color: 'var(--studio-accent-from, #38bdf8)',
  fontSize: '10.5px',
  fontFamily: 'monospace',
  overflowX: 'auto',
  maxHeight: '220px',
  margin: 0,
  lineHeight: 1.4,
};

const emptyFallbackStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--c-text-secondary)',
  padding: '8px 0',
  fontStyle: 'italic',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid var(--c-border)',
  background: 'var(--app-surface)',
  color: 'var(--c-text-primary)',
  fontSize: '11.5px',
  outline: 'none',
  boxSizing: 'border-box',
};
