import React, { useState, useEffect } from 'react';
import {
  APP_VERSION,
  globalUpdateState,
  updateDebugLogs,
  updateDiagnostics,
  isNative,
  PerformanceProfiler,
} from '@workspace/studio-core';

interface TelemetryGridProps {
  nativeDeviceInfo: any;
  nativeInstallerDetails: any;
}

export default function TelemetryGrid({
  nativeDeviceInfo,
  nativeInstallerDetails,
}: TelemetryGridProps) {
  const [metrics, setMetrics] = useState(() => PerformanceProfiler.getInstance().getMetrics());

  useEffect(() => {
    const profiler = PerformanceProfiler.getInstance();
    const unsubscribe = profiler.subscribe((m) => {
      setMetrics(m);
    });
    return unsubscribe;
  }, []);

  const currentVersion = APP_VERSION;
  const remoteVersion = globalUpdateState.remoteVersion || 'Waiting for update check';
  const updateState = globalUpdateState.updateState || 'Not initialized';
  const updateAvailable = globalUpdateState.updateAvailable;
  const isWeb = !isNative();

  const getDisplayValue = (val: any, fallbackLabelAndroid: string) => {
    if (
      val === null ||
      val === undefined ||
      val === 'N/A' ||
      val === '' ||
      val === -999 ||
      val === '-999' ||
      String(val).toLowerCase() === 'none'
    ) {
      return isWeb ? 'Unavailable on this device' : fallbackLabelAndroid;
    }
    return String(val);
  };

  const installedVersionCode = getDisplayValue(
    updateDebugLogs.installedVersionCode,
    'Not initialized'
  );
  const installerSessionState =
    nativeInstallerDetails?.sessionState && nativeInstallerDetails.sessionState !== 'None'
      ? nativeInstallerDetails.sessionState
      : isWeb
        ? 'Unavailable on this device'
        : 'Not initialized';
  const storageAvailable = getDisplayValue(
    nativeDeviceInfo?.storageAvailable || updateDiagnostics?.storageAvailable,
    'Not initialized'
  );
  const networkState = getDisplayValue(
    nativeDeviceInfo?.networkState || updateDiagnostics?.networkState,
    'Not initialized'
  );
  const batteryLevel =
    nativeDeviceInfo?.battery !== undefined
      ? `${nativeDeviceInfo.battery}%`
      : isWeb
        ? 'Unavailable on this device'
        : 'Not initialized';

  const downloadProgress = globalUpdateState.progress;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-black">
      {/* Version Card */}
      <div className="bg-black p-4 rounded-xl flex flex-col gap-1 border border-outline-variant/10">
        <span className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">
          Version
        </span>
        <span className="text-lg font-bold text-tertiary">{currentVersion}</span>
      </div>

      {/* Latest Version Card */}
      <div className="bg-black p-4 rounded-xl flex flex-col gap-1 border border-outline-variant/10">
        <span className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">
          Latest Release
        </span>
        <span className="text-lg font-bold text-on-surface">{remoteVersion}</span>
      </div>

      {/* Code Card */}
      <div className="bg-black p-4 rounded-xl flex flex-col gap-1 border border-outline-variant/10">
        <span className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">
          Version Code
        </span>
        <span className="text-lg font-bold text-on-surface">{installedVersionCode}</span>
      </div>

      {/* State Card */}
      <div className="bg-black p-4 rounded-xl flex flex-col gap-1 border border-outline-variant/10">
        <span className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">
          State
        </span>
        <span className="text-lg font-bold text-on-surface">{updateState}</span>
      </div>

      {/* Update Status Card */}
      <div className="bg-black p-4 rounded-xl flex flex-col gap-1 border border-outline-variant/10">
        <span className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">
          Update Status
        </span>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${updateAvailable ? 'bg-red-500' : 'bg-green-500'} status-dot-pulse`}
          />
          <span className="text-lg font-bold text-on-surface">
            {updateAvailable ? 'Available' : 'Idle'}
          </span>
        </div>
      </div>

      {/* PackageInstaller Card */}
      <div className="bg-black p-4 rounded-xl flex flex-col gap-1 border border-outline-variant/10">
        <span className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">
          PackageInstaller
        </span>
        <span className="text-lg font-bold text-on-surface overflow-hidden text-ellipsis whitespace-nowrap">
          {installerSessionState}
        </span>
      </div>

      {/* Storage / Network */}
      <div className="bg-black p-4 rounded-xl flex flex-col gap-1 border border-outline-variant/10 col-span-1">
        <span className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">
          Storage / Network
        </span>
        <span className="text-sm font-bold text-on-surface overflow-hidden text-ellipsis whitespace-nowrap mt-1">
          {storageAvailable} / {networkState}
        </span>
      </div>

      {/* Battery / Last Check */}
      <div className="bg-black p-4 rounded-xl flex flex-col gap-1 border border-outline-variant/10 col-span-1">
        <span className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">
          Battery / Time
        </span>
        <span className="text-sm font-bold text-on-surface overflow-hidden text-ellipsis whitespace-nowrap mt-1">
          {batteryLevel} &bull; {new Date().toLocaleTimeString()}
        </span>
      </div>

      {/* CPU Average / Peak */}
      <div className="bg-black p-4 rounded-xl flex flex-col gap-1 border border-outline-variant/10">
        <span className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">
          CPU Avg / Peak
        </span>
        <span className="text-lg font-bold text-on-surface">
          {metrics.cpuAverage}% / {metrics.cpuPeak}%
        </span>
      </div>

      {/* Memory Average / Peak */}
      <div className="bg-black p-4 rounded-xl flex flex-col gap-1 border border-outline-variant/10">
        <span className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">
          Memory Avg / Peak
        </span>
        <span className="text-sm font-bold text-on-surface overflow-hidden text-ellipsis whitespace-nowrap mt-1">
          {metrics.memoryAverage} / {metrics.memoryPeak}
        </span>
      </div>

      {/* JS Thread Avg / Peak */}
      <div className="bg-black p-4 rounded-xl flex flex-col gap-1 border border-outline-variant/10">
        <span className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">
          JS Thread Avg/Peak
        </span>
        <span className="text-lg font-bold text-on-surface">
          {metrics.jsThreadAverage}ms / {metrics.jsThreadPeak}ms
        </span>
      </div>

      {/* UI Thread Avg / Peak */}
      <div className="bg-black p-4 rounded-xl flex flex-col gap-1 border border-outline-variant/10">
        <span className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">
          UI Thread Avg/Peak
        </span>
        <span className="text-lg font-bold text-on-surface">
          {metrics.uiThreadAverage}ms / {metrics.uiThreadPeak}ms
        </span>
      </div>

      {/* Frame Pacing */}
      <div className="bg-black p-4 rounded-xl flex flex-col gap-1 border border-outline-variant/10">
        <span className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">
          Frame Pacing / Dev
        </span>
        <span className="text-sm font-bold text-on-surface overflow-hidden text-ellipsis whitespace-nowrap mt-1">
          {metrics.framePacing}ms (Var: {metrics.frameVariance}ms)
        </span>
      </div>

      {/* GPU Composite Layer Count */}
      <div className="bg-black p-4 rounded-xl flex flex-col gap-1 border border-outline-variant/10">
        <span className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">
          GPU Layer Count
        </span>
        <span className="text-lg font-bold text-on-surface">{metrics.gpuLayerCount} layers</span>
      </div>

      {/* Callback Latencies */}
      <div className="bg-black p-4 rounded-xl flex flex-col gap-1 border border-outline-variant/10">
        <span className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">
          Callback Latency
        </span>
        <span className="text-sm font-bold text-on-surface overflow-hidden text-ellipsis whitespace-nowrap mt-1">
          JS: {metrics.averageCallbackLatency}ms | Native: {metrics.packageInstallerLatency}ms
        </span>
      </div>

      {/* Pipeline Duration */}
      <div className="bg-black p-4 rounded-xl flex flex-col gap-1 border border-outline-variant/10">
        <span className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">
          Pipeline Duration
        </span>
        <span className="text-sm font-bold text-on-surface mt-1">
          {metrics.updatePipelineDuration}
        </span>
      </div>

      {/* Renders / Paints / Layouts */}
      <div className="bg-black p-4 rounded-xl flex flex-col gap-1 border border-outline-variant/10 col-span-2 md:col-span-4">
        <span className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">
          React Renders / Paints / Layouts
        </span>
        <span className="text-sm font-bold text-on-surface mt-1">
          Render Count: <span className="text-tertiary">{updateDebugLogs.renderCount || 0}</span>{' '}
          &bull; Paint Count:{' '}
          <span className="text-tertiary">{updateDebugLogs.paintCount || 0}</span> &bull; Layout
          Count: <span className="text-tertiary">{updateDebugLogs.layoutCount || 0}</span>
        </span>
      </div>

      {/* Download Progress Bar */}
      <div className="col-span-2 md:col-span-4 bg-black p-5 rounded-xl border border-outline-variant/10">
        <div className="flex justify-between items-end mb-3">
          <span className="text-sm font-medium text-on-surface">Download Progress</span>
          <span className="text-xs font-mono text-on-surface-variant">
            {(downloadProgress * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-2 w-full bg-[var(--app-surface-low)] rounded-full overflow-hidden">
          <div
            className="h-full bg-tertiary transition-all duration-500 rounded-full"
            style={{ width: `${downloadProgress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
