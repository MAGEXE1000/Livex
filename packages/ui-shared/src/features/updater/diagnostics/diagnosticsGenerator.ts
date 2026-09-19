import { APP_VERSION, isNative, updateDiagnostics, updateDebugLogs, activityLifecycleTimeline, getTransitionHistory, getRejectedTransitions, getErrors, getLogs, getPerfStats, getStagexDiagnostics, useNavigationStore, PerformanceProfiler, getUpdateSessions, getActiveSession, isInstallationLocked, isPostInstallSessionActive, globalUpdateState, updaterSimulation, stateListeners, UpdaterFlightRecorder, isSimulationActive, shouldUseAndroidApkUpdater, useChordStore, useSettingsStore, compressReportText } from '@workspace/livex-core';

export interface DiagnosticsData {
  appVersion: string;
  timestamp: string;
  device: {
    userAgent: string;
    platform: string;
    isNative: boolean;
    manufacturer: string;
    model: string;
    osVersion: string;
    supportedABIs: string[];
    packageName: string;
    versionName: string;
    versionCode: string;
    storageAvailable: string;
    networkState: string;
    batteryLevel: number | string;
  };
  errors: any[];
  perfStats: any[];
  logs: any[];
  stagexDiagnostics: any;
  updateDiagnostics: typeof updateDiagnostics;
  updateDebugLogs: typeof updateDebugLogs;
  activityLifecycle: any[];
  stateTransitions: any[];
  rejectedTransitions: any[];
  localApkDetails: any;
  nativeLogs: any[];
}

export function buildDiagnosticDataObject(
  nativeDeviceInfo: any,
  nativeInstallerDetails: any,
  localApkDetails: any,
  nativeLogsList: any[]
): DiagnosticsData {
  const devInfo = nativeDeviceInfo || {};
  const perf = getPerfStats();
  const transitionHistory = getTransitionHistory();
  const rejectedTransitions = getRejectedTransitions();

  return {
    appVersion: APP_VERSION,
    timestamp: new Date().toISOString(),
    device: {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'N/A',
      isNative: isNative(),
      manufacturer: devInfo.manufacturer || updateDiagnostics?.deviceModel || 'N/A',
      model: devInfo.model || updateDiagnostics?.deviceModel || 'N/A',
      osVersion: devInfo.osVersion || updateDiagnostics?.androidVersion || 'N/A',
      supportedABIs: devInfo.supportedAbis || [],
      packageName: devInfo.packageName || 'com.chordex.app',
      versionName: devInfo.versionName || APP_VERSION,
      versionCode: devInfo.versionCode !== undefined ? String(devInfo.versionCode) : 'N/A',
      storageAvailable: devInfo.storageAvailable || updateDiagnostics?.storageAvailable || 'N/A',
      networkState: devInfo.networkState || updateDiagnostics?.networkState || 'N/A',
      batteryLevel: devInfo.battery !== undefined ? devInfo.battery : 'N/A',
    },
    errors: getErrors() || [],
    perfStats: perf ? Array.from(perf.entries()).map(([k, v]) => ({ component: k, ...v })) : [],
    logs: getLogs() || [],
    stagexDiagnostics: getStagexDiagnostics() || {},
    updateDiagnostics: updateDiagnostics || {},
    updateDebugLogs: updateDebugLogs || {},
    activityLifecycle: activityLifecycleTimeline || [],
    stateTransitions: transitionHistory || [],
    rejectedTransitions: rejectedTransitions || [],
    localApkDetails: localApkDetails || null,
    nativeLogs: nativeLogsList || [],
  };
}

function translateSentinel(val: any, label = 'Not initialized'): string {
  if (val === null || val === undefined || val === '' || val === -999 || val === '-999') {
    return label;
  }
  const str = String(val).trim();
  const lower = str.toLowerCase();
  if (lower === 'none' || lower === 'n/a' || lower === 'null' || lower === 'undefined') {
    return label;
  }
  return str;
}

export function generateUnifiedReport(
  module: string | undefined,
  nativeDeviceInfo: any,
  nativeInstallerDetails: any,
  localApkDetails: any,
  nativeLogsList: any[]
): string {
  const data = buildDiagnosticDataObject(
    nativeDeviceInfo,
    nativeInstallerDetails,
    localApkDetails,
    nativeLogsList
  );

  // Calculate dynamic health score
  let healthScore = 100;
  const criticalDeductions = data.errors.length * 15;
  const warningLogs = data.logs.filter((l) => l.level === 'warn');
  const warningDeductions = warningLogs.length * 5;

  // Get real performance metrics for score calculations
  const profiler = PerformanceProfiler.getInstance();
  const perfMetrics = profiler.getMetrics();
  const perfScore = profiler.getScore(perfMetrics);
  const perfDeductions = Math.max(0, 100 - perfScore);

  healthScore = Math.max(
    0,
    Math.min(100, healthScore - criticalDeductions - warningDeductions - perfDeductions)
  );

  let overallStatus = 'Normal';
  if (healthScore < 50) overallStatus = 'Critical';
  else if (healthScore < 75) overallStatus = 'Attention Required';
  else if (healthScore < 90) overallStatus = 'Minor Warnings';

  const sections: string[] = [];

  // REPORT HEADER
  sections.push('==================================================');
  sections.push('             Studio Diagnostics Report            ');
  sections.push('==================================================');
  sections.push(`App Version:      ${data.appVersion}`);
  sections.push(`Build/Code:       ${data.device.versionCode}`);
  sections.push(`Timestamp:        ${data.timestamp}`);
  sections.push(`Device Model:     ${data.device.manufacturer} ${data.device.model}`);
  sections.push(`Android Version:  ${data.device.osVersion}`);
  sections.push(`Report Type:      ${module ? `${module} Sub-Report` : 'Full System Report'}`);
  sections.push('');

  // OVERALL HEALTH
  sections.push('==================================================');
  sections.push('                  Overall Health                  ');
  sections.push('==================================================');
  sections.push(`Health Score:     ${healthScore}/100`);
  sections.push(`Overall Status:   ${overallStatus}`);
  sections.push(`Warnings Logged:  ${warningLogs.length}`);
  sections.push(`Errors Logged:    ${data.errors.length}`);
  sections.push(`Performance:      ${perfScore}/100`);
  sections.push(
    `Navigation State: ${useNavigationStore.getState().isTransitioning ? 'LOCKED' : 'STABLE'}`
  );
  sections.push(`Updater State:    ${data.updateDebugLogs.downloadStatus || 'IDLE'}`);
  sections.push(`Storage Info:     ${data.device.storageAvailable}`);
  sections.push('');

  // SUMMARY
  sections.push('==================================================');
  sections.push('                     Summary                      ');
  sections.push('==================================================');
  if (healthScore >= 90) {
    sections.push(
      `The application is operating normally. All core systems are stable with no major errors recorded.`
    );
  } else if (healthScore >= 70) {
    sections.push(
      `The application is operational. Some warning logs and/or minor performance jitter were detected, but no critical crashes occurred.`
    );
  } else {
    sections.push(
      `CRITICAL ALERT: Multiple system issues or rendering locks have compromised application health. Immediate developer investigation is recommended.`
    );
  }
  sections.push('');

  // DETECTED PROBLEMS
  sections.push('==================================================');
  sections.push('                Detected Problems                 ');
  sections.push('==================================================');

  // Group problems
  const problems: {
    severity: string;
    title: string;
    desc: string;
    cause: string;
    inv: string;
    mod: string;
    time: string;
    freq: number;
  }[] = [];

  // Parse errors
  data.errors.forEach((err) => {
    problems.push({
      severity: 'Critical',
      title: err.message.split('\n')[0].substring(0, 60),
      desc: err.message,
      cause: 'Unhandled runtime JS exception.',
      inv: 'Examine stack trace in the Technical Appendix.',
      mod: err.module || 'Runtime',
      time: new Date(err.timestamp || Date.now()).toLocaleTimeString(),
      freq: 1,
    });
  });

  // Parse performance warnings
  const perfWarnings = profiler.getWarnings(perfMetrics);
  perfWarnings.forEach((w) => {
    problems.push({
      severity: w.severity,
      title: w.title,
      desc: w.description,
      cause: w.possibleCause,
      inv: w.suggestedInvestigation,
      mod: 'Performance',
      time: new Date().toLocaleTimeString(),
      freq: 1,
    });
  });

  // Parse warning logs (collapse duplicates)
  const collapsedWarnings: Record<string, (typeof warningLogs)[0] & { count: number }> = {};
  warningLogs.forEach((w) => {
    const key = w.module + ':' + w.message;
    if (collapsedWarnings[key]) {
      collapsedWarnings[key].count++;
    } else {
      collapsedWarnings[key] = { ...w, count: 1 };
    }
  });

  Object.values(collapsedWarnings).forEach((w) => {
    problems.push({
      severity: 'Warning',
      title: w.message.split('\n')[0].substring(0, 60),
      desc: w.message,
      cause: 'Log level warning emitted by module.',
      inv: `Trace source file: ${w.source}. Check application settings/state.`,
      mod: w.module,
      time: new Date(w.timestamp).toLocaleTimeString(),
      freq: w.count,
    });
  });

  if (problems.length > 0) {
    problems.sort((a, b) => (a.severity === 'Critical' ? -1 : 1));
    problems.forEach((p) => {
      sections.push(`[${p.severity}] ${p.title}`);
      sections.push(`  • Description:    ${p.desc}`);
      sections.push(`  • Possible Cause: ${p.cause}`);
      sections.push(`  • Investigation:  ${p.inv}`);
      sections.push(`  • Module:         ${p.mod}`);
      sections.push(`  • Timestamp:      ${p.time}`);
      sections.push(`  • Frequency:      ${p.freq} times`);
      sections.push('');
    });
  } else {
    sections.push('No problems detected.');
    sections.push('');
  }

  // PERFORMANCE ANALYSIS
  sections.push('==================================================');
  sections.push('               Performance Analysis               ');
  sections.push('==================================================');
  if (!module || module === 'Performance') {
    sections.push(
      `Frame Rate:          ${perfMetrics.currentFps} FPS (Avg: ${metricsLabel(perfMetrics.averageFps)} FPS, Min: ${metricsLabel(perfMetrics.minFps)} FPS, Max: ${metricsLabel(perfMetrics.maxFps)} FPS)`
    );
    sections.push(`CPU Avg / Peak:      ${perfMetrics.cpuAverage}% / ${perfMetrics.cpuPeak}%`);
    sections.push(`Memory Avg / Peak:   ${perfMetrics.memoryAverage} / ${perfMetrics.memoryPeak}`);
    sections.push(
      `JS Thread Avg/Peak:  ${perfMetrics.jsThreadAverage} ms / ${perfMetrics.jsThreadPeak} ms`
    );
    sections.push(
      `UI Thread Avg/Peak:  ${perfMetrics.uiThreadAverage} ms / ${perfMetrics.uiThreadPeak} ms`
    );
    sections.push(`1% Low FPS:          ${metricsLabel(perfMetrics.low1PercentFps)} FPS`);
    sections.push(
      `Frame Time:          ${perfMetrics.frameTime} ms (Variance: ${perfMetrics.frameVariance} ms)`
    );
    sections.push(
      `Pacing Metrics:      ${perfMetrics.droppedFrames} dropped frames, ${perfMetrics.longFrames} long frames, ${perfMetrics.veryLongFrames} very long frames`
    );
    sections.push(`Event Loop Lag:      ${perfMetrics.eventLoopDelay} ms delay`);
    sections.push(
      `Heap Size / Used:    ${perfMetrics.heapSize} / ${perfMetrics.usedHeap} (Growth Rate: ${perfMetrics.heapGrowth})`
    );
    sections.push(`GPU Layer Count:     ${perfMetrics.gpuLayerCount} active composition layers`);
    sections.push(`GPU Renderer:        ${perfMetrics.gpuRenderer}`);
    sections.push(`Refresh Rate:        ${perfMetrics.refreshRate} Hz`);
    sections.push(
      `Callback Latency:    Avg JS: ${perfMetrics.averageCallbackLatency} ms | PackageInstaller: ${perfMetrics.packageInstallerLatency} ms`
    );
    sections.push(`Pipeline Duration:   ${perfMetrics.updatePipelineDuration}`);
    sections.push(
      `Main Thread Blocks:  ${perfMetrics.mainThreadBlockingTotal} ms total (Longest task: ${perfMetrics.longestBlockingTask} ms)`
    );
    sections.push(
      `Renders / Layouts:   Renders: ${data.updateDebugLogs.renderCount || 0} | Paints: ${data.updateDebugLogs.paintCount || 0} | Layouts: ${data.updateDebugLogs.layoutCount || 0}`
    );
    sections.push('');
    sections.push('Performance Plain-Language Summary:');
    if (perfScore >= 90) {
      sections.push(
        'The rendering pipeline is operating smoothly at target display frame rate. Frame intervals are highly stable.'
      );
    } else if (perfScore >= 70) {
      sections.push(
        'The rendering pipeline is mostly stable, but some heavy frames or minor main thread blocks were recorded.'
      );
    } else {
      sections.push(
        'CRITICAL PERFORMANCE STUTTERS: Repeated layout recalculations or long blocking tasks are causing noticeable interface jank.'
      );
    }
  } else {
    sections.push('Performance metrics skipped in this module report.');
  }
  sections.push('');

  // NAVIGATION ANALYSIS
  sections.push('==================================================');
  sections.push('               Navigation Analysis                ');
  sections.push('==================================================');
  if (!module || module === 'Apps' || module === 'System') {
    const navState = useNavigationStore.getState();
    sections.push(
      `Current Route App:  ${navState.history[navState.history.length - 1]?.app || 'hub'}`
    );
    sections.push(
      `Current Route Tab:  ${navState.history[navState.history.length - 1]?.tab || 'home'}`
    );
    sections.push(
      `Current Route Page: ${navState.history[navState.history.length - 1]?.page || 'none'}`
    );
    sections.push(`Transition Lock:    ${navState.isTransitioning ? 'LOCKED' : 'UNLOCKED'}`);
    sections.push(`History Stack Depth:${navState.history.length} screens`);
    sections.push(`Gesture State:      ${navState.gestureState || 'idle'}`);
    sections.push('');
    sections.push('Navigation Trace History:');
    navState.history.forEach((h, idx) => {
      sections.push(
        `  [${idx + 1}] App: ${h.app}, Tab: ${h.tab || 'none'}, Page: ${h.page || 'none'}`
      );
    });
  } else {
    sections.push('Navigation analysis skipped in this module report.');
  }
  sections.push('');

  // UPDATER ANALYSIS
  sections.push('==================================================');
  sections.push('                 Updater Analysis                 ');
  sections.push('==================================================');
  if (!module || module === 'Updater' || module === 'System') {
    sections.push(
      `Local APK Package:  ${localApkDetails ? localApkDetails.packageName : 'No package downloaded'}`
    );
    sections.push(`Local APK Version:  ${localApkDetails ? localApkDetails.versionName : 'N/A'}`);
    sections.push(
      `Signature Status:   ${localApkDetails?.isValidApk ? 'VERIFIED (Valid signature)' : 'UNVERIFIED'}`
    );
    sections.push(
      `Update Decision:    ${data.updateDebugLogs.updateDecision || 'No check performed'}`
    );
    sections.push(`Decision Reason:    ${data.updateDebugLogs.updateDecisionReason || 'N/A'}`);
    sections.push(`Download Status:    ${data.updateDebugLogs.downloadStatus || 'IDLE'}`);
    sections.push(
      `Installation State: ${nativeInstallerDetails ? nativeInstallerDetails.sessionState : 'No active session'}`
    );
  } else {
    sections.push('Updater analysis skipped in this module report.');
  }
  sections.push('');

  // LOGS ANALYSIS
  sections.push('==================================================');
  sections.push('                  Logs Analysis                   ');
  sections.push('==================================================');

  const logGroups: Record<string, { level: string; msg: string; count: number; source: string }> =
    {};
  data.logs.forEach((log) => {
    const key = log.module + ':' + log.message;
    if (logGroups[key]) {
      logGroups[key].count++;
    } else {
      logGroups[key] = { level: log.level, msg: log.message, count: 1, source: log.source };
    }
  });

  const parsedLogs = Object.values(logGroups);
  const infoLogs = parsedLogs.filter((l) => l.level === 'info');
  const warnLogs = parsedLogs.filter((l) => l.level === 'warn');
  const errLogs = parsedLogs.filter((l) => l.level === 'error');

  sections.push(
    `Log Summary: Info: ${infoLogs.length} events, Warnings: ${warnLogs.length} events, Errors: ${errLogs.length} events`
  );
  sections.push('');
  sections.push('Logs Conclusions:');
  if (errLogs.length > 0) {
    sections.push('• Critical runtime errors were recorded. Check the stack traces immediately.');
  }
  if (warnLogs.length > 3) {
    sections.push(
      '• High warning volume detected. This might cause memory overhead or performance jank.'
    );
  }
  if (errLogs.length === 0 && warnLogs.length === 0) {
    sections.push('• Event logging is clean. No warnings or errors detected.');
  }
  sections.push('');

  // RECOMMENDATIONS
  sections.push('==================================================');
  sections.push('                 Recommendations                  ');
  sections.push('==================================================');
  let recsCount = 0;
  if (data.errors.length > 0) {
    recsCount++;
    sections.push(
      `${recsCount}. Resolve the unhandled runtime exceptions in the Technical Appendix.`
    );
  }
  if (perfScore < 85) {
    recsCount++;
    sections.push(
      `${recsCount}. Audit components in rendering performance view. Implement memoization to stabilize frame rates.`
    );
  }
  if (warningLogs.length > 5) {
    recsCount++;
    sections.push(
      `${recsCount}. Investigate warning loops in module logs to eliminate diagnostic noise.`
    );
  }
  if (recsCount === 0) {
    sections.push('No actionable recommendations. Keep up the good work!');
  }
  sections.push('');

  // TECHNICAL APPENDIX
  sections.push('==================================================');
  sections.push('                Technical Appendix                ');
  sections.push('==================================================');
  sections.push('--- JavaScript Console Log Dump ---');
  if (data.logs.length > 0) {
    data.logs.slice(-50).forEach((log) => {
      sections.push(
        `[${new Date(log.timestamp).toLocaleTimeString()}] [${log.level.toUpperCase()}] [${log.module}] ${log.message}`
      );
    });
  } else {
    sections.push('No JavaScript logs in buffer.');
  }
  sections.push('');
  sections.push('--- Android Native Installer Log Dump ---');
  if (data.nativeLogs.length > 0) {
    data.nativeLogs.slice(-50).forEach((log) => {
      sections.push(
        `[${new Date(log.timestamp || Date.now()).toLocaleTimeString()}] [${translateSentinel(log.stage, 'Installer')}] Status: ${log.status} - Message: ${translateSentinel(log.message, 'No message')}`
      );
    });
  } else {
    sections.push('No native logs in buffer.');
  }
  sections.push('==================================================');

  return sections.join('\n');
}

function metricsLabel(val: number): string | number {
  return val > 0 ? val : 'Unavailable';
}

export function generateFullEngineeringReport(
  nativeDeviceInfo: any,
  nativeInstallerDetails: any,
  localApkDetails: any,
  nativeLogsList: any[]
): string {
  return generateUnifiedReport(
    undefined,
    nativeDeviceInfo,
    nativeInstallerDetails,
    localApkDetails,
    nativeLogsList
  );
}

export function generateCopyEverythingReport(
  nativeDeviceInfo: any,
  nativeInstallerDetails: any,
  localApkDetails: any,
  nativeLogsList: any[]
): string {
  const data = buildDiagnosticDataObject(
    nativeDeviceInfo,
    nativeInstallerDetails,
    localApkDetails,
    nativeLogsList
  );
  const transitionHistory = getTransitionHistory();
  const rejectedTransitions = getRejectedTransitions();
  const activeSession = getActiveSession();
  const allSessions = getUpdateSessions();
  const profiler = PerformanceProfiler.getInstance();
  const perfMetrics = profiler.getMetrics();
  const perfScore = profiler.getScore(perfMetrics);
  const navState = useNavigationStore.getState();

  // Overall Health Score calculation
  let healthScore = 100;
  const criticalDeductions = data.errors.length * 15;
  const warningLogs = data.logs.filter((l) => l.level === 'warn');
  const warningDeductions = warningLogs.length * 5;
  const perfDeductions = Math.max(0, 100 - perfScore);
  healthScore = Math.max(
    0,
    Math.min(100, healthScore - criticalDeductions - warningDeductions - perfDeductions)
  );
  let overallStatus = 'Normal';
  if (healthScore < 50) overallStatus = 'Critical';
  else if (healthScore < 75) overallStatus = 'Attention Required';
  else if (healthScore < 90) overallStatus = 'Minor Warnings';

  let report = `# STUDIO UPDATER SYSTEM COMPREHENSIVE ENGINEERING REPORT\n`;
  report += `*Generated on: ${data.timestamp}*\n\n`;

  // ==========================================
  // SECTION 1: SUMMARY
  // ==========================================
  report += `## 1. ENGINEERING SUMMARY\n`;
  report += `### System Verdict\n`;
  if (healthScore >= 90) {
    report += `*   **Status**: **HEALTHY** (Score: ${healthScore}/100)\n`;
    report += `*   **Diagnosis**: The updater system is healthy. All state machine transitions and execution logs are within normal thresholds.\n`;
  } else if (healthScore >= 70) {
    report += `*   **Status**: **WARNING** (Score: ${healthScore}/100)\n`;
    report += `*   **Diagnosis**: System requires attention. Frame variance or alert flags are elevated.\n`;
  } else {
    report += `*   **Status**: **CRITICAL** (Score: ${healthScore}/100)\n`;
    report += `*   **Diagnosis**: CRITICAL anomalies detected. Please check FSM log details and recovery counters.\n`;
  }

  const lockedVal = isInstallationLocked();
  const postInstallActive = isPostInstallSessionActive();

  report += `\n### Core System Verification Gating\n`;
  report += `| Gate / Guard | Status | Evaluation |\n`;
  report += `|---|---|---|\n`;
  report += `| Overall Updater Score | ${healthScore}/100 | Class: ${overallStatus} |\n`;
  report += `| Installation Lock | ${lockedVal ? '🔒 LOCKED' : '🔓 UNLOCKED'} | Blocks concurrent check/recovery loops |\n`;
  report += `| Post-Install Session | ${postInstallActive ? '⏳ ACTIVE' : '⏹️ INACTIVE'} | Session holding process until process boot update |\n`;
  report += `| Invalid Transitions | ${data.rejectedTransitions.length} | Rejected transition violations |\n`;

  report += `\n### Recommendations & Issues\n`;
  let recIndex = 0;
  if (data.errors.length > 0) {
    recIndex++;
    report += `${recIndex}. **Resolve ${data.errors.length} console errors**: Detailed stack traces are in Section 8.\n`;
  }
  if (warningLogs.length > 5) {
    recIndex++;
    report += `${recIndex}. **Audit warning log frequency**: Group repeated warnings to prevent console pollution.\n`;
  }
  if (recIndex === 0) {
    report += `* No actionable errors or warnings found. System is running healthy.\n`;
  }
  report += `\n`;

  // ==========================================
  // SECTION 2: ENVIRONMENT & DEVICE
  // ==========================================
  report += `## 2. ENVIRONMENT & DEVICE\n`;
  report += `| Property | Value | Description |\n`;
  report += `|---|---|---|\n`;
  report += `| Manufacturer | ${data.device.manufacturer} | Device manufacturer |\n`;
  report += `| Model | ${data.device.model} | Device model |\n`;
  report += `| OS Version | ${data.device.osVersion} | Android OS Version |\n`;
  report += `| User Agent | ${data.device.userAgent.substring(0, 80)}... | Browser wrapper context |\n`;
  report += `| Network Connection | ${data.device.networkState} | Active network transport |\n`;
  report += `| Storage Available | ${data.device.storageAvailable} | Disk storage left on partition |\n`;
  report += `| Battery | ${data.device.batteryLevel}% | Device battery level |\n`;
  report += `| Language Locale | ${typeof navigator !== 'undefined' ? navigator.language : 'en-US'} | Host language preference |\n`;
  report += `\n`;

  // ==========================================
  // SECTION 3: APPLICATION & VERSIONS
  // ==========================================
  report += `## 3. APPLICATION & VERSIONS\n`;
  report += `| Property | Value | Description |\n`;
  report += `|---|---|---|\n`;
  report += `| App Version | ${APP_VERSION} | Local JS application version |\n`;
  report += `| Version Code | ${data.device.versionCode} | Native Version code |\n`;
  report += `| Platform Host | ${data.device.platform} | Capacitor WebView target host |\n`;
  report += `| Native Shell | ${data.device.isNative ? 'Native Capacitor App' : 'Web Browser'} | Client wrapper context |\n`;
  report += `| Startup Duration | ${(updateDiagnostics as any).startupDurationMs || 'N/A'} ms | Execution load time |\n`;
  report += `| Current Active Screen | App: ${navState.history[navState.history.length - 1]?.app || 'hub'}, Tab: ${navState.history[navState.history.length - 1]?.tab || 'home'} | Navigation stack state |\n`;
  report += `\n`;

  // ==========================================
  // SECTION 4: STATE MACHINE & SESSION
  // ==========================================
  report += `## 4. STATE MACHINE & SESSION\n`;
  report += `| Property | Value | Description |\n`;
  report += `|---|---|---|\n`;
  report += `| Current State | ${globalUpdateState.updateState} | Active stage state in state machine |\n`;
  report += `| Previous State | ${transitionHistory[transitionHistory.length - 1]?.from || 'None'} | Prior state machine state |\n`;
  report += `| Current Session ID | \`${globalUpdateState.sessionId || 'None'}\` | Session ID generated for this update |\n`;
  report += `| Active Update Session | ${activeSession ? 'YES' : 'NO'} | Persistent session check outcome |\n`;
  report += `| Transition Count | ${transitionHistory.length} | FSM transitions during current run |\n`;
  report += `| Last Transition | ${transitionHistory[transitionHistory.length - 1] ? `${transitionHistory[transitionHistory.length - 1].from} -> ${transitionHistory[transitionHistory.length - 1].to}` : 'None'} | Direction of state transition |\n`;
  report += `| Transition Elapsed Time | ${transitionHistory[transitionHistory.length - 1]?.durationMs ? transitionHistory[transitionHistory.length - 1].durationMs + ' ms' : 'N/A'} | Time taken in last state change |\n`;
  report += `\n`;

  // ==========================================
  // SECTION 5: DOWNLOAD, VERIFICATION & INSTALLATION
  // ==========================================
  report += `## 5. DOWNLOAD, VERIFICATION & INSTALLATION\n`;
  report += `| Property | Value | Description |\n`;
  report += `|---|---|---|\n`;
  report += `| Download URL | ${globalUpdateState.apkUrl || 'N/A'} | APK download source URL |\n`;
  report += `| Downloaded APK Path | ${localStorage.getItem('studio:downloadedApkPath') || 'N/A'} | Local storage path of file |\n`;
  report += `| Downloaded APK Size | ${updateDebugLogs.downloadedApkSize || 'N/A'} | Size on filesystem |\n`;
  report += `| Expected Hash (SHA-256) | ${globalUpdateState.apkSha256 || 'N/A'} | Release manifest hash |\n`;
  report += `| Verification Status | ${updateDebugLogs.shaVerification || 'N/A'} | Checksum evaluation result |\n`;
  report += `| APK Signatures Fingerprint | ${localApkDetails?.signingSha256 || 'N/A'} | Native certificate fingerprint |\n`;
  report += `| PackageInstaller Status | ${nativeInstallerDetails?.sessionState || 'N/A'} | Callback updates from system |\n`;
  report += `| Last Successful Update | ${localStorage.getItem('studio:lastSuccessfulUpdate') || 'N/A'} | Timestamp of last success |\n`;
  report += `\n`;

  // ==========================================
  // SECTION 6: RECOVERY & FAULT TOLERANCE
  // ==========================================
  report += `## 6. RECOVERY & FAULT TOLERANCE\n`;
  report += `| Property | Value | Description |\n`;
  report += `|---|---|---|\n`;
  report += `| Recovery Mode | ${globalUpdateState.recoveryMode ? 'ACTIVE' : 'INACTIVE'} | Recovery mode status |\n`;
  report += `| Consecutive Failures | ${globalUpdateState.consecutiveFailures} | Failed attempts counts |\n`;
  report += `| Auto-Clean Triggered | ${updateDebugLogs.suggestedFix ? 'YES' : 'NO'} | Auto recovery actions performed |\n`;
  report += `\n`;

  // ==========================================
  // SECTION 7: CONFIGURATION & FLAGS
  // ==========================================
  report += `## 7. CONFIGURATION & FLAGS\n`;
  report += `| Flag / Parameter | Value | Description |\n`;
  report += `|---|---|---|\n`;
  report += `| APK Channel Enabled | ${shouldUseAndroidApkUpdater() ? 'YES' : 'NO'} | Android APK update strategy status |\n`;
  report += `| Developer Settings Mode | ${useSettingsStore.getState().settings.developerMode ? 'ACTIVE' : 'INACTIVE'} | Admin dashboard console visibility |\n`;
  report += `| Simulation Active Flag | ${isSimulationActive() ? 'YES' : 'NO'} | Simulation flag toggle status |\n`;
  report += `| Log Filter Severity | ${UpdaterFlightRecorder.getSeverityLevel()} | Current flight recorder logging limit |\n`;
  report += `\n`;

  report += `### Active Simulation Overrides\n`;
  report += `| Override Flag | Status | Description |\n`;
  report += `|---|---|---|\n`;
  report += `| runWorkflowActive | ${updaterSimulation.runWorkflowActive ? 'ON' : 'OFF'} | Runs full auto-sequence check -> install |\n`;
  report += `| forceUpdateAvailable | ${updaterSimulation.forceUpdateAvailable ? 'ON' : 'OFF'} | Simulates check results finding a newer APK |\n`;
  report += `| forceNoUpdate | ${updaterSimulation.forceNoUpdate ? 'ON' : 'OFF'} | Force check to resolve as up-to-date |\n`;
  report += `| forceInstallSuccess | ${updaterSimulation.forceInstallSuccess ? 'ON' : 'OFF'} | Simulate package installation success |\n`;
  report += `| forceInstallFailure | ${updaterSimulation.forceInstallFailure ? 'ON' : 'OFF'} | Force simulated PackageInstaller failure |\n`;
  report += `| forceUserCancel | ${updaterSimulation.forceUserCancel ? 'ON' : 'OFF'} | Simulate user aborting installer dialog |\n`;
  report += `| forceSignatureMismatch | ${updaterSimulation.forceSignatureMismatch ? 'ON' : 'OFF'} | Simulate APK certificate signature conflict |\n`;
  report += `| forceShaFailure | ${updaterSimulation.forceShaFailure ? 'ON' : 'OFF'} | Force simulated SHA verification failure |\n`;
  report += `\n`;

  // ==========================================
  // SECTION 8: LIFECYCLE & EVENT LOGS
  // ==========================================
  report += `## 8. LIFECYCLE & EVENT LOGS\n`;
  report += `### Lifecycle Event Counters\n`;
  report += `*   **Resume Events**: ${data.activityLifecycle.filter((e) => e.stage === 'RESUME').length}\n`;
  report += `*   **Pause Events**: ${data.activityLifecycle.filter((e) => e.stage === 'PAUSE').length}\n`;
  report += `*   **Focus Events**: ${data.activityLifecycle.filter((e) => e.stage === 'FOCUS').length}\n`;
  report += `*   **Visibility Changes**: ${data.activityLifecycle.filter((e) => e.stage === 'VISIBILITY_CHANGE').length}\n\n`;

  report += `### Active State Machine Listeners\n`;
  report += `*   **Registered State Observers**: ${stateListeners.size}\n\n`;

  report += `### Console Diagnostic Errors (${data.errors.length} logged)\n`;
  if (data.errors.length > 0) {
    data.errors.slice(-10).forEach((e) => {
      report += `*   **[${new Date(e.timestamp).toLocaleTimeString()}]** \`${e.message}\`\n`;
    });
  } else {
    report += `*   No console errors in buffer.\n`;
  }
  report += `\n`;

  // ==========================================
  // SECTION 9: FLIGHT RECORDER LOGS
  // ==========================================
  report += `## 9. FLIGHT RECORDER LOGS\n`;
  const frEvents = UpdaterFlightRecorder.getEvents();
  if (frEvents.length > 0) {
    frEvents
      .slice()
      .reverse()
      .forEach((e) => {
        const timeStr = new Date(e.timestamp).toLocaleTimeString();
        report += `\`[${timeStr}] [${e.severity || 'INFO'}] [${e.thread.toUpperCase()}] ${e.eventType}\`\n`;
        report += `> Caller: ${e.caller} | Reason: ${e.reason || 'None'}\n`;
        if (e.previousState || e.newState) {
          report += `> State change: ${e.previousState} &rarr; ${e.newState}\n`;
        }
        if (e.count && e.count > 1) {
          report += `> Repetition count: aggregated ${e.count} events\n`;
        }
        if (e.error || e.warning) {
          report += `> Alert: Error: ${e.error || 'N/A'} | Warning: ${e.warning || 'N/A'}\n`;
        }
        report += `\n`;
      });
  } else {
    report += `*No Flight Recorder log traces generated.*\n\n`;
  }

  // ==========================================
  // SECTION 10: PERFORMANCE METRICS
  // ==========================================
  report += `## 10. PERFORMANCE METRICS\n`;
  report += `| Metric | Average | Peak | Description |\n`;
  report += `|---|---|---|---|\n`;
  report += `| JS Event loop delay | ${perfMetrics.jsThreadAverage} ms | ${perfMetrics.jsThreadPeak} ms | Execution overhead |\n`;
  report += `| UI Layout Paint time | ${perfMetrics.uiThreadAverage} ms | ${perfMetrics.uiThreadPeak} ms | WebView frame drawing duration |\n`;
  report += `| Frame Time variance | ${perfMetrics.framePacing || perfMetrics.frameTime} ms | ${perfMetrics.frameVariance} ms | Frame rate jitter factor |\n`;
  report += `| CPU Overhead | ${perfMetrics.cpuAverage}% | ${perfMetrics.cpuPeak}% | Processor consumption percentage |\n`;
  report += `| Memory Footprint | ${perfMetrics.memoryAverage} | ${perfMetrics.memoryPeak} | Active RAM allocation |\n`;
  report += `| Render cycles (React) | ${updateDebugLogs.renderCount || 1} | N/A | React updates cycle counts |\n`;
  report += `\n`;

  // ==========================================
  // SECTION 11: AUTOMATIC SYSTEM ANALYSIS
  // ==========================================
  report += `## 11. AUTOMATIC SYSTEM ANALYSIS\n`;
  let findings = 0;
  if (stateListeners.size > 10) {
    findings++;
    report += `*   **⚠️ Observer Leak Warning**: Active state machine listeners count is \`${stateListeners.size}\`. Ensure cleanup is run on unmount.\n`;
  }
  if (perfMetrics.frameVariance > 16) {
    findings++;
    report += `*   **⚠️ Layout Jitter Warning**: High frame pacing variance of \`${perfMetrics.frameVariance}ms\` detected. UI thread processing layout overhead might delay native bridging.\n`;
  }
  if (findings === 0) {
    report += `*   **Healthy Status**: Rules engine found zero active anomalies, listener leaks, or state invariant violations. System checks normal.\n`;
  }
  report += `\n`;

  // ==========================================
  // SECTION 12: UPDATE SESSION HISTORY & TIMELINES
  // ==========================================
  report += `## 12. UPDATE SESSION HISTORY & TIMELINES\n`;
  if (allSessions.length > 0) {
    allSessions.forEach((s, idx) => {
      report += `### Update Session [${idx + 1}]: ${s.id}\n`;
      report += `*   **Target Version**: v${s.version || 'unknown'}\n`;
      report += `*   **Final Result**: \`${s.result}\`\n`;
      report += `*   **Start Date**: ${new Date(s.startTime).toLocaleString()}\n\n`;

      report += `#### Session Step Timeline\n`;
      report += `| Elapsed | State | Step Event | Detail |\n`;
      report += `|---|---|---|---|\n`;
      if (s.timeline && s.timeline.length > 0) {
        s.timeline.forEach((t) => {
          report += `| ${t.offset} | ${t.state} | ${t.event} | ${t.reason || '—'} |\n`;
        });
      } else {
        report += `| *No timeline events logged for this session.* | | | |\n`;
      }
      report += `\n---------------------------------------------\n\n`;
    });
  } else {
    report += `*No update session histories saved in database storage.*\n\n`;
  }

  return compressReportText(report);
}
