import { activeOverlaysRegistry } from '../design-system/dialogs';
import { useEffect, useState } from 'react';
import {
  useNavigationStore,
  useSettingsStore,
  useBottomNavigationStore,
  NavigationDispatcher,
  useShallow,
} from '@workspace/studio-core';

/* ── INSPECTOR ROUTE TRACER DEBUG TOOL ────────────────────────────────── */
export function InspectorRouteTracer() {
  const history = useNavigationStore((s) => s.history);
  const { displayDensity, theme, amoledMode } = useSettingsStore(
    useShallow((state) => ({
      displayDensity: state.settings.displayDensity,
      theme: state.settings.theme,
      amoledMode: state.settings.amoledMode,
    }))
  );
  const isSwitcherOpen = useBottomNavigationStore((s) => s.isSwitcherOpen);
  const isProfileMenuOpen = useBottomNavigationStore((s) => s.isProfileMenuOpen);
  const isSearchOpen = useBottomNavigationStore((s) => s.isSearchOpen);

  const [activeModalsCount, setActiveModalsCount] = useState(0);
  const [activeSheetsCount, setActiveSheetsCount] = useState(0);
  const [minimized, setMinimized] = useState(true);

  useEffect(() => {
    return activeOverlaysRegistry.subscribe(() => {
      setActiveModalsCount(activeOverlaysRegistry.modals.size);
      setActiveSheetsCount(activeOverlaysRegistry.sheets.size);
    });
  }, []);

  const isDev = typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : true;
  if (!isDev) return null;

  const currentRoute = history[history.length - 1] || { app: 'hub' };

  const appMap: Record<string, string> = {
    hub: 'Hub',
    chordex: 'Chordex',
    drumex: 'Drumex',
    stagex: 'Stagex',
    groovex: 'Groovex',
    vocalex: 'Vocalex',
  };

  const currentApp = appMap[currentRoute.app] || currentRoute.app;
  
  let currentModule = 'Livex Hub';
  if (currentRoute.app === 'hub') {
    if (currentRoute.tab === 'settings') currentModule = 'Livex Settings';
    else if (currentRoute.tab === 'profile') currentModule = 'User Profile';
    else if (currentRoute.tab === 'help') currentModule = 'FAQ & Support';
  } else {
    currentModule = currentApp;
  }

  let currentScreen = 'Home';
  if (currentRoute.page) {
    currentScreen = currentRoute.page.charAt(0).toUpperCase() + currentRoute.page.slice(1);
  } else if (currentRoute.tab) {
    currentScreen = currentRoute.tab.charAt(0).toUpperCase() + currentRoute.tab.slice(1);
  }

  let currentPath = `/${currentRoute.app}`;
  if (currentRoute.tab) currentPath += `/${currentRoute.tab}`;
  if (currentRoute.page && currentRoute.page !== 'main' && currentRoute.page !== currentRoute.tab) {
    currentPath += `/${currentRoute.page}`;
  }

  let currentNested = '';
  if (currentRoute.subView) currentNested += `/${currentRoute.subView}`;
  if (currentRoute.id) currentNested += `/${currentRoute.id}`;
  if (!currentNested) currentNested = 'None';

  const stackString = history.map((r) => {
    let s = r.app;
    if (r.page) s += '/' + r.page;
    return s;
  }).join(' -> ');

  let layoutComp = 'HubScaffold';
  if (currentRoute.page && currentRoute.page !== 'main') {
    layoutComp = 'SettingsLayout';
  } else if (currentRoute.app !== 'hub') {
    layoutComp = 'SubAppScaffold';
  }

  let headerComp = 'HubHeader';
  if (currentRoute.page && currentRoute.page !== 'main') {
    headerComp = 'SharedFloatingHeader';
  } else if (currentRoute.app !== 'hub') {
    headerComp = 'SubAppHeader';
  }

  const bottomNavComp = useBottomNavigationStore.getState().visible ? 'SharedBottomNavigation' : 'None';
  const currentModal = activeModalsCount > 0 ? 'Dialog' : 'None';
  const currentSheet = activeSheetsCount > 0 ? 'Sheet' : 'None';
  const currentOverlay = isSwitcherOpen ? 'AppSwitcher' : isProfileMenuOpen ? 'ProfileMenu' : isSearchOpen ? 'Search' : 'None';

  const densityMode = displayDensity 
    ? displayDensity.charAt(0).toUpperCase() + displayDensity.slice(1) 
    : 'Standard';
  
  const currentTheme = theme 
    ? theme.charAt(0).toUpperCase() + theme.slice(1) 
    : 'Dark';

  const appearanceMode = amoledMode ? 'AMOLED' : (theme === 'light' ? 'Light' : 'Dark');

  if (minimized) {
    return (
      <>
        {/* Developer Inspector Floating Control Button (Stacked DIRECTLY ABOVE Route Tracer) */}
        <button
          onClick={() => {
            NavigationDispatcher.push({ app: 'hub', tab: 'settings', page: 'developer' });
          }}
          title="Open Developer Inspector"
          style={{
            position: 'fixed',
            bottom: '126px',
            right: '16px',
            zIndex: 999999,
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.85)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>bug_report</span>
        </button>

        {/* Route Tracer Floating Control Button */}
        <button
          onClick={() => setMinimized(false)}
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '16px',
            zIndex: 999999,
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.85)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>route</span>
        </button>
      </>
    );
  }

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: 4,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 9,
    textTransform: 'uppercase',
    color: '#8e8e93',
    fontWeight: 700,
    letterSpacing: '0.05em',
  };

  const valStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 600,
    fontFamily: 'monospace',
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '16px',
        zIndex: 999999,
        width: '240px',
        maxHeight: '400px',
        overflowY: 'auto',
        background: 'rgba(0,0,0,0.92)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '12px',
        padding: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        color: '#ffffff',
        fontFamily: 'Inter, sans-serif',
      }}
      className="no-scrollbar"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#10b981' }}>route</span>
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#10b981' }}>Route Tracer</span>
        </div>
        <button
          onClick={() => setMinimized(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#8e8e93',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={itemStyle}>
          <span style={labelStyle}>Current App</span>
          <span style={valStyle}>{currentApp}</span>
        </div>
        <div style={itemStyle}>
          <span style={labelStyle}>Module</span>
          <span style={valStyle}>{currentModule}</span>
        </div>
        <div style={itemStyle}>
          <span style={labelStyle}>Screen</span>
          <span style={valStyle}>{currentScreen}</span>
        </div>
        <div style={itemStyle}>
          <span style={labelStyle}>Route</span>
          <span style={valStyle}>{currentPath}</span>
        </div>
        <div style={itemStyle}>
          <span style={labelStyle}>Nested Route</span>
          <span style={valStyle}>{currentNested}</span>
        </div>
        <div style={itemStyle}>
          <span style={labelStyle}>Stack</span>
          <span style={{ ...valStyle, fontSize: 10, wordBreak: 'break-all' }}>{stackString}</span>
        </div>
        <div style={itemStyle}>
          <span style={labelStyle}>Layout</span>
          <span style={valStyle}>{layoutComp}</span>
        </div>
        <div style={itemStyle}>
          <span style={labelStyle}>Shared Layout</span>
          <span style={valStyle}>ScreenScaffold</span>
        </div>
        <div style={itemStyle}>
          <span style={labelStyle}>Header</span>
          <span style={valStyle}>{headerComp}</span>
        </div>
        <div style={itemStyle}>
          <span style={labelStyle}>Bottom Navigation</span>
          <span style={valStyle}>{bottomNavComp}</span>
        </div>
        <div style={itemStyle}>
          <span style={labelStyle}>Modal</span>
          <span style={valStyle}>{currentModal}</span>
        </div>
        <div style={itemStyle}>
          <span style={labelStyle}>Sheet</span>
          <span style={valStyle}>{currentSheet}</span>
        </div>
        <div style={itemStyle}>
          <span style={labelStyle}>Overlay</span>
          <span style={valStyle}>{currentOverlay}</span>
        </div>
        <div style={itemStyle}>
          <span style={labelStyle}>Density</span>
          <span style={valStyle}>{densityMode}</span>
        </div>
        <div style={itemStyle}>
          <span style={labelStyle}>Theme</span>
          <span style={valStyle}>{currentTheme}</span>
        </div>
        <div style={itemStyle}>
          <span style={labelStyle}>Appearance Mode</span>
          <span style={valStyle}>{appearanceMode}</span>
        </div>
      </div>
    </div>
  );
}
