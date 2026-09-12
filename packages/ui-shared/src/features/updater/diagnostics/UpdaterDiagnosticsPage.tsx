import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  useAppUpdate,
  updateDebugLogs,
  updateDiagnostics,
  releaseMetadataInspector,
  globalUpdateState,
  APP_VERSION,
  NATIVE_VERSION,
  NATIVE_VERSION_CODE,
  updaterSimulation,
  jsLogs,
  nativeLogs,
  getTransitionHistory,
  getRejectedTransitions,
} from '@workspace/studio-core';
import { copyToClipboard } from './centralizedClipboard';
import { CopyIcon } from '../../../components/ui/copy';
import {
  BouncyAccordion,
  type BouncyAccordionItem,
} from '../../../components/motion/bouncy-accordion';

// Simple reactive state hook to poll mutable arrays/objects
function useForceUpdate() {
  const [, setTick] = useState(0);
  const update = () => setTick((t) => t + 1);
  return update;
}

export const UpdaterDiagnosticsPage: React.FC<{ onBack?: () => void; hideHeader?: boolean }> = ({
  onBack,
  hideHeader,
}) => {
  const forceUpdate = useForceUpdate();
  const [toast, setToast] = useState<string | null>(null);
  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState<'ALL' | 'INFO' | 'DEBUG' | 'ERROR'>('ALL');

  const {
    updateState,
    loading,
    progress,
    error,
    statusText,
    remoteVersion,
    updateAvailable,
    mandatory,
    changelog,
    releaseNotes,
    apkUrl,
    apkSha256,
    consecutiveFailures,
    recoveryMode,
    updateType,
    sessionId,
    checkNow,
    downloadUpdate,
    applyUpdate,
  } = useAppUpdate();

  // Poll for logs and state updates every 1.5s
  useEffect(() => {
    const timer = setInterval(() => {
      forceUpdate();
    }, 1500);
    return () => clearInterval(timer);
  }, [forceUpdate]);

  const handleCopy = () => {
    const report = generateReport();
    copyToClipboard(report, 'Updater Diagnostics')
      .then((msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 2500);
      })
      .catch(() => {
        setToast('Copy failed');
        setTimeout(() => setToast(null), 2500);
      });
  };

  const generateReport = () => {
    return `=== UPDATER ENGINEERING DIAGNOSTICS REPORT ===
Generated: ${new Date().toISOString()}

--- VERSION INFORMATION ---
Installed Version: ${APP_VERSION}
Installed VersionCode: ${NATIVE_VERSION_CODE}
Native Version: ${NATIVE_VERSION}
Remote Version: ${remoteVersion || 'Unknown'}
Remote VersionCode: ${updateDebugLogs.remoteVersionCode || 'None'}
Version Comparison Result: ${updateDebugLogs.versionComparisonResult || 'None'}

--- UPDATE STATE ---
Update State: ${updateState}
Update Available: ${updateAvailable}
Mandatory: ${mandatory}
Update Type: ${updateType || 'None'}
Final Decision: ${updateDebugLogs.finalDecision || 'None'}
Update Decision Reason: ${updateDebugLogs.updateDecisionReason || 'None'}
Eligibility Reason: ${updateDebugLogs.eligibilityReason || 'None'}
Final Path Executed: ${updateDebugLogs.finalPathExecuted || 'None'}

--- PIPELINE ---
Pipeline ID: ${updateDiagnostics.pipelineId || 'None'}
Trigger Source: ${updateDiagnostics.triggerSource || 'None'}
Pipeline Owner: ${updateDiagnostics.pipelineOwner || 'None'}
Active Async Stage: ${updateDiagnostics.activeAsyncStage || 'None'}
Queue Depth: ${updateDiagnostics.queueDepth || 0}
Pipeline Duration: ${updateDiagnostics.pipelineDuration || 0} ms

--- DOWNLOAD & VERIFICATION ---
APK URL: ${apkUrl || 'None'}
APK SHA256: ${apkSha256 || 'None'}
Download Status: ${updateDebugLogs.downloadStatus || 'None'}
SHA Verification: ${updateDebugLogs.shaVerification || 'None'}
File Details: ${updateDebugLogs.fileDetails || 'None'}
Download URL: ${updateDiagnostics.downloadUrl || 'None'}
File Size: ${updateDiagnostics.fileSize || 0} bytes

--- PACKAGE VALIDATION ---
Downloaded Package Name: ${updateDebugLogs.downloadedPackageName || 'None'}
Downloaded Version Name: ${updateDebugLogs.downloadedVersionName || 'None'}
Downloaded Version Code: ${updateDebugLogs.downloadedVersionCode || 'None'}
Downloaded Signing SHA256: ${updateDebugLogs.downloadedSigningSha256 || 'None'}
Downloaded Is Valid APK: ${updateDebugLogs.downloadedIsValidApk || false}
Eligibility Package Name Match: ${updateDebugLogs.eligibilityPackageNameMatch || false}
Eligibility Signing Match: ${updateDebugLogs.eligibilitySigningMatch || false}
Eligibility Version Code Higher: ${updateDebugLogs.eligibilityVersionCodeHigher || false}

--- METADATA SOURCES ---
Source Used: ${releaseMetadataInspector.sourceUsed || 'None'}
Cache Source: ${releaseMetadataInspector.cacheSource || 'None'}
Raw Version JSON: ${String(releaseMetadataInspector.rawVersionJson || '')}
Timestamp: ${releaseMetadataInspector.timestamp || 'None'}

--- ERRORS & RECOVERY ---
Error: ${error || 'None'}
Exception Message: ${updateDiagnostics.exceptionMessage || 'None'}
Failure Reason: ${updateDiagnostics.failureReason || 'None'}
Install Error: ${updateDebugLogs.installError || 'None'}
Last Exception Stack Trace: ${updateDebugLogs.lastExceptionStackTrace || 'None'}
Consecutive Failures: ${consecutiveFailures}
Recovery Mode: ${recoveryMode}
Root Cause: ${updateDebugLogs.rootCause || 'None'}
Suggested Fix: ${updateDebugLogs.suggestedFix || 'None'}

--- ENVIRONMENT ---
Android Version: ${updateDiagnostics.androidVersion || 'None'}
Device Model: ${updateDiagnostics.deviceModel || 'None'}
Architecture: ${updateDiagnostics.architecture || 'None'}
Network State: ${updateDiagnostics.networkState || 'None'}
Permission State: ${updateDiagnostics.permissionState || 'None'}
Platform Detected: ${updateDebugLogs.platformDetected || 'None'}
`;
  };

  const handleCopySection = (title: string, text: string) => {
    copyToClipboard(text, title)
      .then((msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 2500);
      })
      .catch(() => {
        setToast('Copy failed');
        setTimeout(() => setToast(null), 2500);
      });
  };

  const handleResetSimulation = () => {
    updaterSimulation.forceUpdateAvailable = false;
    updaterSimulation.forceNoUpdate = false;
    updaterSimulation.forceDowngrade = false;
    updaterSimulation.forceMandatoryUpdate = false;
    updaterSimulation.forceOptionalUpdate = false;
    updaterSimulation.forceSignatureMismatch = false;
    updaterSimulation.forceShaFailure = false;
    updaterSimulation.forceMetadataFailure = false;
    updaterSimulation.forceInvalidApk = false;
    updaterSimulation.forceDownloadFailure = false;
    updaterSimulation.forceDownloadTimeout = false;
    updaterSimulation.forceRecoveryMode = false;
    updaterSimulation.forceResumeDownload = false;
    updaterSimulation.forceCachedApk = false;
    updaterSimulation.forceInstallSuccess = false;
    updaterSimulation.forceInstallFailure = false;
    updaterSimulation.forceUserCancel = false;
    updaterSimulation.forcePendingUserAction = false;
    updaterSimulation.simulateDownload = false;
    updaterSimulation.injectDownloadFailure = false;
    updaterSimulation.injectChecksumFailure = false;
    updaterSimulation.injectNetworkTimeout = false;
    updaterSimulation.simulateDownloadThrottling = false;
    updaterSimulation.runWorkflowActive = false;

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('studio:is_simulation_active');
      } catch (_) {}
    }

    // Append simulated reset log
    jsLogs.push({
      timestamp: Date.now(),
      message: '[SIMULATOR] All simulation parameters cleared and reset.',
    });
    forceUpdate();
  };

  // Compile active logs from memory
  const filteredLogs = useMemo(() => {
    const combined = [
      ...jsLogs.map((l) => ({
        ...l,
        tag: '[JS]',
        color: '#679cff',
        level: l.message.toLowerCase().includes('error')
          ? 'ERROR'
          : l.message.toLowerCase().includes('debug')
            ? 'DEBUG'
            : 'INFO',
      })),
      ...nativeLogs.map((l) => ({
        ...l,
        tag: '[Native]',
        color: '#34d399',
        level: l.message.toLowerCase().includes('error')
          ? 'ERROR'
          : l.message.toLowerCase().includes('debug')
            ? 'DEBUG'
            : 'INFO',
      })),
    ].sort((a, b) => a.timestamp - b.timestamp);

    return combined.filter((log) => {
      const matchesSearch =
        log.message.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.tag.toLowerCase().includes(logSearch.toLowerCase());
      const matchesFilter = logFilter === 'ALL' || log.level === logFilter;
      return matchesSearch && matchesFilter;
    });
  }, [jsLogs.length, nativeLogs.length, logSearch, logFilter]);

  const rejectedHist = useMemo(() => getRejectedTransitions(), [globalUpdateState]);

  const isCheckedCompleted = updateState !== 'IDLE' && updateState !== 'INITIALIZING';
  const isAvailableCompleted = !!updateAvailable;
  const isDownloadingActive = updateState === 'DOWNLOAD_APK';
  const isDownloadingCompleted =
    isDownloadingActive ||
    [
      'VERIFY_SHA256',
      'PREPARING_INSTALL',
      'WAITING_USER_CONFIRMATION',
      'PACKAGEINSTALLER_VISIBLE',
      'INSTALLING',
      'INSTALL_SUCCESS',
    ].includes(updateState);
  const isReadyCompleted = [
    'WAITING_USER_CONFIRMATION',
    'PACKAGEINSTALLER_VISIBLE',
    'INSTALLING',
    'INSTALL_SUCCESS',
  ].includes(updateState);

  // Format time helper
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toTimeString().split(' ')[0];
  };

  return (
    <div
      style={{
        background: 'var(--app-surface-low, #0e0e0e)',
        fontFamily: 'var(--studio-font-body)',
        color: '#e7e5e4',
        minHeight: '100%',
        paddingBottom: '32px',
        boxSizing: 'border-box',
      }}
    >
      {/* Top App Bar */}
      {!hideHeader && (
        <header
          style={{
            width: '100%',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            backgroundColor: 'var(--app-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            boxSizing: 'border-box',
            borderBottom: '1px solid var(--c-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div>
              <h1
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  margin: 0,
                  letterSpacing: '-0.02em',
                  color: 'var(--c-text-primary)',
                }}
              >
                Updater Diagnostics
              </h1>
              <p
                style={{
                  fontSize: '11px',
                  color: 'var(--c-text-secondary)',
                  margin: '2px 0 0 0',
                  fontWeight: 500,
                }}
              >
                OTA Diagnostics & Debug Tools
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Copy Report Button */}
            <button
              onClick={handleCopy}
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '10px',
                background: 'var(--app-surface-high, var(--app-surface))',
                border: '1px solid var(--c-border)',
                color: 'var(--c-text-primary)',
                cursor: 'pointer',
                transition: 'background-color 200ms ease',
              }}
              title="Copy Full Report"
            >
              <CopyIcon size={18} />
            </button>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                background: 'rgba(79, 70, 229, 0.15)',
                color: '#818cf8',
                padding: '4px 10px',
                borderRadius: '9999px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Dev Mode
            </span>
          </div>
        </header>
      )}

      {/* Main Grid View */}
      <main
        style={{
          padding: '16px',
          maxWidth: '850px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxSizing: 'border-box',
        }}
      >
        {/* Status Toast Notification */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 99999,
              background: '#10b981',
              color: '#000',
              fontWeight: 700,
              fontSize: '13px',
              padding: '10px 16px',
              borderRadius: '10px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            {toast}
          </div>
        )}

        {/* Current Status Grid */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px',
          }}
        >
          <div
            style={{
              background: 'var(--app-surface-high, var(--app-surface))',
              padding: '16px',
              borderRadius: '14px',
              border: '1px solid var(--c-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span
              style={{
                color: 'var(--c-text-secondary)',
                fontSize: '10px',
                textTransform: 'uppercase',
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}
            >
              VERSION
            </span>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: 'var(--studio-accent-from, #679cff)',
              }}
            >
              {APP_VERSION}
            </span>
          </div>

          <div
            style={{
              background: 'var(--app-surface-high, var(--app-surface))',
              padding: '16px',
              borderRadius: '14px',
              border: '1px solid var(--c-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span
              style={{
                color: 'var(--c-text-secondary)',
                fontSize: '10px',
                textTransform: 'uppercase',
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}
            >
              CODE
            </span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--c-text-primary)' }}>
              {NATIVE_VERSION_CODE}
            </span>
          </div>

          <div
            style={{
              background: 'var(--app-surface-high, var(--app-surface))',
              padding: '16px',
              borderRadius: '14px',
              border: '1px solid var(--c-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span
              style={{
                color: 'var(--c-text-secondary)',
                fontSize: '10px',
                textTransform: 'uppercase',
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}
            >
              UPDATE STATUS
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: updateAvailable ? '#fbbf24' : '#10b981',
                }}
              />
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--c-text-primary)' }}>
                {updateAvailable ? 'Update Avail' : 'Up to date'}
              </span>
            </div>
          </div>

          <div
            style={{
              background: 'var(--app-surface-high, var(--app-surface))',
              padding: '16px',
              borderRadius: '14px',
              border: '1px solid var(--c-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span
              style={{
                color: 'var(--c-text-secondary)',
                fontSize: '10px',
                textTransform: 'uppercase',
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}
            >
              STATE
            </span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#fbbf24' }}>
              {updateState}
            </span>
          </div>

          {/* System Health Status Block */}
          <div
            style={{
              gridColumn: '1 / -1',
              background: 'var(--app-surface-high, var(--app-surface))',
              padding: '20px',
              borderRadius: '14px',
              border: '1px solid var(--c-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: 'var(--c-text-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                System Health
              </span>
              <span
                style={{
                  fontSize: '10px',
                  color: error ? '#ef4444' : '#10b981',
                  fontWeight: 700,
                  padding: '3px 8px',
                  background: error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  borderRadius: '12px',
                }}
              >
                {error ? 'Failures Detected' : 'All Systems Nominal'}
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--c-text-secondary)',
                    textTransform: 'uppercase',
                  }}
                >
                  Registry Connection
                </span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--c-text-primary)' }}>
                  {releaseMetadataInspector.sourceUsed ? 'Connected' : 'Offline'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--c-text-secondary)',
                    textTransform: 'uppercase',
                  }}
                >
                  Storage Availability
                </span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--c-text-primary)' }}>
                  Optimal
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Collapsible details list */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <BouncyAccordion
            defaultValue="live-logs"
            items={[
              {
                id: 'production-actions',
                title: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      settings_suggest
                    </span>
                    <span>Production Actions</span>
                  </div>
                ),
                description: (
                  <div style={{ padding: '16px', paddingTop: 0 }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: '10px',
                      }}
                    >
                      <button
                        onClick={() => checkNow()}
                        style={{
                          background: 'var(--app-surface-high, var(--app-surface))',
                          border: '1px solid var(--c-border)',
                          padding: '16px',
                          borderRadius: '12px',
                          color: 'var(--c-text-primary)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: '12px',
                          textAlign: 'left',
                        }}
                      >
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: 'rgba(103,156,255,0.1)',
                            color: '#679cff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '20px', margin: 'auto' }}
                          >
                            refresh
                          </span>
                        </div>
                        <div>
                          <span style={{ display: 'block', fontWeight: 700, fontSize: '13px' }}>
                            Check for Updates
                          </span>
                          <span
                            style={{
                              display: 'block',
                              fontSize: '10px',
                              color: 'var(--c-text-secondary)',
                              marginTop: '2px',
                            }}
                          >
                            Poll remote registry
                          </span>
                        </div>
                      </button>

                      <button
                        onClick={() => downloadUpdate('diagnostics_manual')}
                        style={{
                          background: 'var(--app-surface-high, var(--app-surface))',
                          border: '1px solid var(--c-border)',
                          padding: '16px',
                          borderRadius: '12px',
                          color: 'var(--c-text-primary)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: '12px',
                          textAlign: 'left',
                        }}
                      >
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: 'rgba(103,156,255,0.1)',
                            color: '#679cff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '20px', margin: 'auto' }}
                          >
                            download
                          </span>
                        </div>
                        <div>
                          <span style={{ display: 'block', fontWeight: 700, fontSize: '13px' }}>
                            Download APK
                          </span>
                          <span
                            style={{
                              display: 'block',
                              fontSize: '10px',
                              color: 'var(--c-text-secondary)',
                              marginTop: '2px',
                            }}
                          >
                            Fetch latest binary
                          </span>
                        </div>
                      </button>

                      <button
                        onClick={() => applyUpdate('diagnostics_manual')}
                        style={{
                          background: 'rgba(103, 156, 255, 0.15)',
                          border: '1px solid rgba(103, 156, 255, 0.3)',
                          padding: '16px',
                          borderRadius: '12px',
                          color: '#679cff',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: '12px',
                          textAlign: 'left',
                        }}
                      >
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: 'rgba(103,156,255,0.2)',
                            color: '#679cff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '20px', margin: 'auto' }}
                          >
                            play_arrow
                          </span>
                        </div>
                        <div>
                          <span
                            style={{
                              display: 'block',
                              fontWeight: 700,
                              fontSize: '13px',
                              color: '#679cff',
                            }}
                          >
                            Apply Update
                          </span>
                          <span
                            style={{
                              display: 'block',
                              fontSize: '10px',
                              color: 'var(--c-text-secondary)',
                              marginTop: '2px',
                            }}
                          >
                            Complete flow cycle
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>
                ),
              },
              {
                id: 'live-logs',
                title: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      terminal
                    </span>
                    <span>Live Logs</span>
                  </div>
                ),
                description: (
                  <div style={{ padding: '16px', paddingTop: 0 }}>
                    <div
                      style={{
                        background: 'var(--app-surface-low, #050505)',
                        border: '1px solid var(--c-border)',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '320px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          padding: '10px 14px',
                          background: 'var(--app-surface-high)',
                          borderBottom: '1px solid var(--c-border)',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'var(--app-surface)',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--c-border)',
                          }}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '14px', color: 'var(--c-text-secondary)' }}
                          >
                            search
                          </span>
                          <input
                            value={logSearch}
                            onChange={(e) => setLogSearch(e.target.value)}
                            placeholder="Search logs..."
                            style={{
                              background: 'transparent',
                              border: 'none',
                              outline: 'none',
                              color: 'var(--c-text-primary)',
                              fontSize: '11px',
                              width: '100%',
                              fontFamily: 'monospace',
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {(['ALL', 'INFO', 'DEBUG', 'ERROR'] as const).map((lvl) => (
                            <span
                              key={lvl}
                              onClick={() => setLogFilter(lvl)}
                              style={{
                                fontSize: '9px',
                                fontWeight: 700,
                                padding: '4px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                background: logFilter === lvl ? '#679cff' : 'var(--app-surface)',
                                color: logFilter === lvl ? '#ffffff' : 'var(--c-text-secondary)',
                                border: logFilter === lvl ? 'none' : '1px solid var(--c-border)',
                                transition: 'all 200ms ease',
                              }}
                            >
                              {lvl}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div
                        style={{
                          flex: 1,
                          padding: '12px',
                          overflowY: 'auto',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          lineHeight: '1.6',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        {filteredLogs.length === 0 ? (
                          <div
                            style={{
                              color: 'var(--c-text-secondary)',
                              textAlign: 'center',
                              marginTop: '100px',
                            }}
                          >
                            No logs record matches filters
                          </div>
                        ) : (
                          filteredLogs.map((log, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                              <span
                                style={{
                                  color: 'var(--c-text-secondary)',
                                  flexShrink: 0,
                                  opacity: 0.7,
                                }}
                              >
                                {formatTime(log.timestamp)}
                              </span>
                              <span style={{ color: log.color, flexShrink: 0, fontWeight: 700 }}>
                                {log.tag}
                              </span>
                              <span
                                style={{
                                  color:
                                    log.level === 'ERROR'
                                      ? '#f43f5e'
                                      : log.level === 'DEBUG'
                                        ? '#a78bfa'
                                        : 'var(--c-text-primary)',
                                  wordBreak: 'break-word',
                                  whiteSpace: 'pre-wrap',
                                }}
                              >
                                {log.message}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                id: 'diagnostics-traces',
                title: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      analytics
                    </span>
                    <span>Diagnostics Traces</span>
                  </div>
                ),
                description: (
                  <div style={{ padding: '16px', paddingTop: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div
                        onClick={() =>
                          handleCopySection(
                            'Native Logs Trace',
                            nativeLogs
                              .map((l) => `[${formatTime(l.timestamp)}] ${l.message}`)
                              .join('\n')
                          )
                        }
                        style={{
                          background: 'var(--app-surface-high, var(--app-surface))',
                          border: '1px solid var(--c-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'background-color 200ms ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span
                            className="material-symbols-outlined"
                            style={{ color: 'var(--c-text-secondary)' }}
                          >
                            history
                          </span>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 500,
                              color: 'var(--c-text-primary)',
                            }}
                          >
                            Native Logs Trace
                          </span>
                        </div>
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: '18px', color: 'var(--c-text-secondary)' }}
                        >
                          content_copy
                        </span>
                      </div>

                      <div
                        onClick={() =>
                          handleCopySection(
                            'JS Execution Context',
                            jsLogs
                              .map((l) => `[${formatTime(l.timestamp)}] ${l.message}`)
                              .join('\n')
                          )
                        }
                        style={{
                          background: 'var(--app-surface-high, var(--app-surface))',
                          border: '1px solid var(--c-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'background-color 200ms ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span
                            className="material-symbols-outlined"
                            style={{ color: 'var(--c-text-secondary)' }}
                          >
                            javascript
                          </span>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 500,
                              color: 'var(--c-text-primary)',
                            }}
                          >
                            JS Execution Context
                          </span>
                        </div>
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: '18px', color: 'var(--c-text-secondary)' }}
                        >
                          content_copy
                        </span>
                      </div>

                      <div
                        onClick={() =>
                          handleCopySection(
                            'Rejected Transitions',
                            rejectedHist
                              .map(
                                (h) =>
                                  `[${formatTime(h.timestamp)}] Attempted transition from ${h.from} to ${h.attempted}: ${h.reason}`
                              )
                              .join('\n')
                          )
                        }
                        style={{
                          background: 'var(--app-surface-high, var(--app-surface))',
                          border: '1px solid var(--c-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'background-color 200ms ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span
                            className="material-symbols-outlined"
                            style={{ color: 'var(--c-text-secondary)' }}
                          >
                            box
                          </span>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 500,
                              color: 'var(--c-text-primary)',
                            }}
                          >
                            Transition Rejection History
                          </span>
                        </div>
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: '18px', color: 'var(--c-text-secondary)' }}
                        >
                          content_copy
                        </span>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                id: 'simulation-lab',
                title: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      science
                    </span>
                    <span>Simulation Lab</span>
                  </div>
                ),
                description: (
                  <div style={{ padding: '16px', paddingTop: 0 }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                        gap: '10px',
                      }}
                    >
                      <button
                        onClick={() => {
                          updaterSimulation.forceUpdateAvailable =
                            !updaterSimulation.forceUpdateAvailable;
                          updaterSimulation.forceNoUpdate = false;
                          jsLogs.push({
                            timestamp: Date.now(),
                            message: `[SIMULATOR] forceUpdateAvailable toggled to ${updaterSimulation.forceUpdateAvailable}`,
                          });
                          forceUpdate();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          background: 'var(--app-surface-high, var(--app-surface))',
                          border: '1px solid var(--c-border)',
                          color: 'var(--c-text-primary)',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>
                          Simulate Update Available
                        </span>
                        <span
                          className="material-symbols-outlined"
                          style={{
                            color: updaterSimulation.forceUpdateAvailable
                              ? '#10b981'
                              : 'var(--c-text-secondary)',
                          }}
                        >
                          {updaterSimulation.forceUpdateAvailable
                            ? 'check_circle'
                            : 'chevron_right'}
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          updaterSimulation.forceDownloadFailure =
                            !updaterSimulation.forceDownloadFailure;
                          jsLogs.push({
                            timestamp: Date.now(),
                            message: `[SIMULATOR] forceDownloadFailure toggled to ${updaterSimulation.forceDownloadFailure}`,
                          });
                          forceUpdate();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          background: 'var(--app-surface-high, var(--app-surface))',
                          border: '1px solid var(--c-border)',
                          color: updaterSimulation.forceDownloadFailure
                            ? '#f43f5e'
                            : 'var(--c-text-primary)',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>Simulate Failure</span>
                        <span
                          className="material-symbols-outlined"
                          style={{
                            color: updaterSimulation.forceDownloadFailure
                              ? '#f43f5e'
                              : 'var(--c-text-secondary)',
                          }}
                        >
                          {updaterSimulation.forceDownloadFailure ? 'warning' : 'chevron_right'}
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          updaterSimulation.simulateDownloadThrottling =
                            !updaterSimulation.simulateDownloadThrottling;
                          jsLogs.push({
                            timestamp: Date.now(),
                            message: `[SIMULATOR] simulateDownloadThrottling toggled to ${updaterSimulation.simulateDownloadThrottling}`,
                          });
                          forceUpdate();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          background: 'var(--app-surface-high, var(--app-surface))',
                          border: '1px solid var(--c-border)',
                          color: 'var(--c-text-primary)',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>
                          Toggle Network Throttling
                        </span>
                        <div
                          style={{
                            width: '32px',
                            height: '16px',
                            background: updaterSimulation.simulateDownloadThrottling
                              ? '#679cff'
                              : 'var(--app-surface-low)',
                            borderRadius: '9999px',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '2px',
                            justifyContent: updaterSimulation.simulateDownloadThrottling
                              ? 'flex-end'
                              : 'flex-start',
                            transition: 'all 200ms ease',
                          }}
                        >
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              background: '#000',
                              borderRadius: '50%',
                            }}
                          />
                        </div>
                      </button>

                      <button
                        onClick={handleResetSimulation}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          background: 'var(--app-surface-high, var(--app-surface))',
                          border: '1px solid var(--c-border)',
                          color: 'var(--c-text-primary)',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>
                          Reset Simulator Settings
                        </span>
                        <span
                          className="material-symbols-outlined"
                          style={{ color: 'var(--c-text-secondary)' }}
                        >
                          restart_alt
                        </span>
                      </button>
                    </div>
                  </div>
                ),
              },
              {
                id: 'state-machine',
                title: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      account_tree
                    </span>
                    <span>Update State Machine</span>
                  </div>
                ),
                description: (
                  <div style={{ padding: '16px', paddingTop: 0 }}>
                    <div
                      style={{
                        background: 'var(--app-surface-low, var(--app-surface))',
                        border: '1px solid var(--c-border)',
                        padding: '24px',
                        borderRadius: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: '35px',
                          top: '32px',
                          bottom: '32px',
                          width: '2px',
                          background: 'var(--c-border)',
                        }}
                      />

                      <div
                        style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 2 }}
                      >
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: isCheckedCompleted
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'var(--app-surface-high)',
                            color: isCheckedCompleted ? '#10b981' : 'var(--c-text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: isCheckedCompleted
                                ? '#10b981'
                                : 'var(--c-text-secondary)',
                            }}
                          />
                        </div>
                        <div>
                          <h4
                            style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              margin: 0,
                              color: isCheckedCompleted ? '#10b981' : 'var(--c-text-primary)',
                            }}
                          >
                            Update Checked
                          </h4>
                          <p
                            style={{
                              fontSize: '11px',
                              color: 'var(--c-text-secondary)',
                              margin: '4px 0 0 0',
                            }}
                          >
                            Registry connection checks finalized
                          </p>
                        </div>
                      </div>

                      <div
                        style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 2 }}
                      >
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: isAvailableCompleted
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'var(--app-surface-high)',
                            color: isAvailableCompleted ? '#10b981' : 'var(--c-text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: isAvailableCompleted
                                ? '#10b981'
                                : 'var(--c-text-secondary)',
                            }}
                          />
                        </div>
                        <div>
                          <h4
                            style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              margin: 0,
                              color: isAvailableCompleted ? '#10b981' : 'var(--c-text-primary)',
                            }}
                          >
                            Update Available
                          </h4>
                          <p
                            style={{
                              fontSize: '11px',
                              color: 'var(--c-text-secondary)',
                              margin: '4px 0 0 0',
                            }}
                          >
                            Found version: {remoteVersion || 'None'}
                          </p>
                        </div>
                      </div>

                      <div
                        style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 2 }}
                      >
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: isDownloadingActive
                              ? 'rgba(103,156,255,0.15)'
                              : isDownloadingCompleted
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'var(--app-surface-high)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: isDownloadingActive
                                ? '#679cff'
                                : isDownloadingCompleted
                                  ? '#10b981'
                                  : 'var(--c-text-secondary)',
                            }}
                          />
                        </div>
                        <div>
                          <h4
                            style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              margin: 0,
                              color: isDownloadingActive
                                ? '#679cff'
                                : isDownloadingCompleted
                                  ? '#10b981'
                                  : 'var(--c-text-primary)',
                            }}
                          >
                            Downloading
                          </h4>
                          <p
                            style={{
                              fontSize: '11px',
                              color: 'var(--c-text-secondary)',
                              margin: '4px 0 0 0',
                            }}
                          >
                            Progress: {progress}%
                          </p>
                        </div>
                      </div>

                      <div
                        style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 2 }}
                      >
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: isReadyCompleted
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'var(--app-surface-high)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: isReadyCompleted ? '#10b981' : 'var(--c-text-secondary)',
                            }}
                          />
                        </div>
                        <div>
                          <h4
                            style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              margin: 0,
                              color: isReadyCompleted ? '#10b981' : 'var(--c-text-primary)',
                            }}
                          >
                            Ready for Install
                          </h4>
                          <p
                            style={{
                              fontSize: '11px',
                              color: 'var(--c-text-secondary)',
                              margin: '4px 0 0 0',
                            }}
                          >
                            Package downloaded and verified successfully
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                id: 'engineering-report',
                title: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      description
                    </span>
                    <span>Engineering Report Preview</span>
                  </div>
                ),
                description: (
                  <div style={{ padding: '16px', paddingTop: 0 }}>
                    <div
                      style={{
                        background: 'var(--app-surface-high, var(--app-surface))',
                        padding: '20px',
                        borderRadius: '12px',
                        border: '1px solid var(--c-border)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          color: 'var(--c-text-secondary)',
                          lineHeight: '1.6',
                          whiteSpace: 'pre-wrap',
                          maxHeight: '220px',
                          overflowY: 'auto',
                        }}
                      >
                        <p
                          style={{
                            color: 'var(--studio-accent-from, #679cff)',
                            margin: '0 0 8px 0',
                          }}
                        >
                          # UPDATER_DIAGNOSTICS_REPORT_V1
                        </p>
                        <p style={{ margin: '0 0 4px 0' }}>
                          VERSION:{' '}
                          <span style={{ color: 'var(--c-text-primary)' }}>{APP_VERSION}</span>
                        </p>
                        <p style={{ margin: '0 0 4px 0' }}>
                          CODE:{' '}
                          <span style={{ color: 'var(--c-text-primary)' }}>
                            {NATIVE_VERSION_CODE}
                          </span>
                        </p>
                        <p style={{ margin: '0 0 4px 0' }}>
                          UPDATE_STATE:{' '}
                          <span style={{ color: 'var(--c-text-primary)' }}>{updateState}</span>
                        </p>
                        <div
                          style={{ height: '1px', background: 'var(--c-border)', margin: '12px 0' }}
                        />
                        <p
                          style={{
                            color: 'var(--studio-accent-from, #679cff)',
                            margin: '0 0 8px 0',
                          }}
                        >
                          ## STATE_SNAPSHOT
                        </p>
                        <p style={{ margin: '0 0 4px 0 16px' }}>
                          • current_state:{' '}
                          <span style={{ color: 'var(--studio-accent-from, #679cff)' }}>
                            {updateState}
                          </span>
                        </p>
                        <p style={{ margin: '0 0 4px 0 16px' }}>
                          • update_available:{' '}
                          <span style={{ color: 'var(--c-text-primary)' }}>
                            {String(updateAvailable)}
                          </span>
                        </p>
                        <p style={{ margin: '0 0 4px 0 16px' }}>
                          • consecutive_failures:{' '}
                          <span style={{ color: 'var(--c-text-primary)' }}>
                            {consecutiveFailures}
                          </span>
                        </p>
                        <p style={{ margin: '0 0 4px 0 16px' }}>
                          • cache_source:{' '}
                          <span style={{ color: 'var(--c-text-primary)' }}>
                            {releaseMetadataInspector.cacheSource || 'None'}
                          </span>
                        </p>
                        <div
                          style={{ height: '1px', background: 'var(--c-border)', margin: '12px 0' }}
                        />
                        <p style={{ fontStyle: 'italic', fontSize: '10px', margin: 0 }}>
                          Report automatically generated. Confidential technical data.
                        </p>
                      </div>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </section>
      </main>
    </div>
  );
};

export default UpdaterDiagnosticsPage;
