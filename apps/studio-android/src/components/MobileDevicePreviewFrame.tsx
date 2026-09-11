import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '@workspace/studio-core';
import { ThemeToggle } from '@workspace/ui-shared';

export interface DevicePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  radius: number;
  safeTop: number;
  safeBottom: number;
}

export const DEVICE_PRESETS: DevicePreset[] = [
  {
    id: 'standard',
    name: 'iPhone 15',
    width: 393,
    height: 852,
    radius: 48,
    safeTop: 54,
    safeBottom: 34,
  },
  {
    id: 'pixel',
    name: 'Pixel 8',
    width: 412,
    height: 915,
    radius: 44,
    safeTop: 48,
    safeBottom: 28,
  },
  {
    id: 'compact',
    name: 'Compact',
    width: 360,
    height: 780,
    radius: 36,
    safeTop: 40,
    safeBottom: 24,
  },
  {
    id: 'full',
    name: 'Responsive',
    width: 0,
    height: 0,
    radius: 0,
    safeTop: 0,
    safeBottom: 0,
  },
];

export function MobileDevicePreviewFrame({ children }: { children: React.ReactNode }) {
  const isFrameDisabledByUrl =
    typeof window !== 'undefined' &&
    (window.location.search.includes('frame=0') || window.location.search.includes('frame=off'));

  const [presetId, setPresetId] = useState<string>(() => {
    if (isFrameDisabledByUrl) return 'full';
    if (typeof window !== 'undefined' && window.innerWidth < 600) return 'full';
    return 'standard';
  });

  const [zoomScale, setZoomScale] = useState<number>(0.92);
  const [currentTime, setCurrentTime] = useState('9:41');
  const theme = useSettingsStore((s) => s.settings.theme);
  const isLightMode =
    theme === 'light' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: light)').matches);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const activePreset = DEVICE_PRESETS.find((p) => p.id === presetId) || DEVICE_PRESETS[0];

  // If in full responsive mode, render without frame
  if (activePreset.id === 'full' || isFrameDisabledByUrl) {
    return (
      <div
        className="w-full h-full relative overflow-hidden bg-black text-white"
        style={
          {
            '--safe-area-inset-top': '0px',
            '--safe-area-inset-bottom': '0px',
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className="w-screen h-screen flex flex-col items-center justify-start select-none overflow-hidden py-3 px-4"
      style={{
        background: 'radial-gradient(ellipse at center, #181a22 0%, #0a0b0e 100%)',
        color: '#e2e8f0',
        fontFamily:
          'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Top Preview Controls Toolbar */}
      <header
        className="w-full max-w-4xl px-4 py-2 mb-3 flex flex-wrap items-center justify-between gap-3 z-50 rounded-2xl shrink-0"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.10)',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span className="text-xs font-bold tracking-wide text-zinc-100">
            STUDIO MOBILE PREVIEW
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono font-bold border border-emerald-500/30">
            HMR ACTIVE
          </span>
        </div>

        {/* Center: Device Presets */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
          {DEVICE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setPresetId(preset.id)}
              className="text-[11px] px-3 py-1 rounded-lg transition-all"
              style={{
                background: presetId === preset.id ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                color: presetId === preset.id ? '#ffffff' : '#94a3b8',
                fontWeight: presetId === preset.id ? 700 : 500,
                boxShadow: presetId === preset.id ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>

        {/* Right: Theme Quick Toggle & Zoom */}
        <div className="flex items-center gap-2">
          {/* Canonical Theme Toggle */}
          <ThemeToggle
            variant="circle-blur"
            start="bottom-up"
            className="w-8 h-8 rounded-full bg-black/40 border border-white/10 text-white hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-sm"
            iconClassName="w-4 h-4"
          />

          {/* Zoom Selector */}
          <select
            value={zoomScale}
            onChange={(e) => setZoomScale(Number(e.target.value))}
            className="text-[11px] bg-black/40 text-zinc-300 border border-white/10 rounded-xl px-2.5 py-1 outline-none font-medium cursor-pointer"
          >
            <option value={1}>100%</option>
            <option value={0.92}>92%</option>
            <option value={0.85}>85%</option>
            <option value={0.75}>75%</option>
          </select>
        </div>
      </header>

      {/* Frame Container with Containing Block Property */}
      <div className="flex-1 w-full flex items-center justify-center min-h-0 overflow-hidden relative">
        <div
          className="relative transition-all duration-300 ease-out"
          style={
            {
              width: `${activePreset.width}px`,
              height: `${activePreset.height}px`,
              maxHeight: 'calc(100vh - 90px)',
              borderRadius: `${activePreset.radius}px`,
              transform: `scale(${zoomScale}) translateZ(0)`,
              transformOrigin: 'center center',
              boxShadow:
                '0 30px 80px -15px rgba(0, 0, 0, 0.95), 0 0 0 12px #181920, 0 0 0 14px #2a2c36, 0 0 50px rgba(0, 0, 0, 0.7)',
              background: isLightMode ? '#f4f4f5' : '#000000',
              overflow: 'hidden',
              '--safe-area-inset-top': `${activePreset.safeTop}px`,
              '--safe-area-inset-bottom': `${activePreset.safeBottom}px`,
              contain: 'paint layout',
            } as React.CSSProperties
          }
        >
          {/* Hardware Camera / Island */}
          {presetId === 'standard' && (
            <div
              className="absolute top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex items-center justify-center"
              style={{
                width: '116px',
                height: '28px',
                borderRadius: '20px',
                background: '#000000',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}
            >
              <div className="w-3 h-3 rounded-full bg-[#0d0e14] border border-zinc-700/60 mr-2 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-blue-900/80" />
              </div>
              <div className="w-2 h-2 rounded-full bg-[#111116]" />
            </div>
          )}

          {presetId === 'pixel' && (
            <div
              className="absolute top-3.5 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex items-center justify-center"
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: '#000000',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-blue-900/80" />
            </div>
          )}

          {presetId === 'compact' && (
            <div
              className="absolute top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex items-center justify-center"
              style={{
                width: '68px',
                height: '16px',
                borderRadius: '10px',
                background: '#000000',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            />
          )}

          {/* Simulated Native Status Bar */}
          <div
            className="absolute top-0 left-0 right-0 z-40 px-7 flex items-center justify-between pointer-events-none text-xs font-semibold"
            style={{
              height: `${activePreset.safeTop}px`,
              color: isLightMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            }}
          >
            <span className="text-[13px] font-bold tracking-tight pl-1">{currentTime}</span>
            <div className="flex items-center gap-1.5 pr-1">
              {/* Cellular signal */}
              <svg className="w-3.5 h-3.5 fill-current opacity-85" viewBox="0 0 24 24">
                <path
                  d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L12 22l7.03-4.39C20.26 16.07 21 14.12 21 12c0-4.97-4.03-9-9-9z"
                  opacity="0.3"
                />
                <path d="M2 22h20L12 2 2 22z" />
              </svg>
              {/* Wi-Fi */}
              <svg className="w-3.5 h-3.5 fill-current opacity-85" viewBox="0 0 24 24">
                <path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98C20.93 5.9 16.69 4 12 4zm0 3.5c3.73 0 7.12 1.48 9.64 3.88L12 19.3 2.36 11.38C4.88 8.98 8.27 7.5 12 7.5z" />
              </svg>
              {/* Battery */}
              <div
                className="w-5 h-2.5 rounded-sm border p-0.5 flex items-center"
                style={{
                  borderColor: isLightMode ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.6)',
                }}
              >
                <div
                  className="w-3 h-full rounded-2xs"
                  style={{
                    backgroundColor: isLightMode ? '#0f172a' : '#ffffff',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Application Content Inside Viewport — strictly bounded containing block */}
          <main
            data-mobile-preview="true"
            className="w-full h-full relative overflow-hidden flex-1 flex flex-col studio-mobile-shell"
            style={
              {
                position: 'absolute',
                inset: 0,
                transform: 'translateZ(0)',
                '--safe-area-inset-top': `${activePreset.safeTop}px`,
                '--safe-area-inset-bottom': `${activePreset.safeBottom}px`,
              } as React.CSSProperties
            }
          >
            {children}
          </main>

          {/* Simulated Home Indicator Bar */}
          <div
            className="absolute bottom-1 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex items-center justify-center"
            style={{ height: `${activePreset.safeBottom}px`, width: '100%' }}
          >
            <div
              style={{
                width: '134px',
                height: '4.5px',
                borderRadius: '3px',
                background: isLightMode ? 'rgba(15, 23, 42, 0.35)' : 'rgba(255, 255, 255, 0.45)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
