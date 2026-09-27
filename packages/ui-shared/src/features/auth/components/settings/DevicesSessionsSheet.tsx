import React from 'react';
import {
  type AuthUser,
  type SyncStatus,
  deviceId,
  APP_VERSION,
  APP_COMMIT_SHA,
  APP_BUILD_TIMESTAMP,
} from '@workspace/livex-core';
import { Capacitor } from '@capacitor/core';
import {
  ProfileMorphModal,
  CLOUD_SYNC_FEATURE_ENABLED,
  AccountDeviceRow,
  codeBreakStyle,
} from './authUiPrims';

export interface DevicesSessionsSheetProps {
  sheet: string | null;
  lang: string;
  closeSheet: () => void;
  originRect: DOMRect | null;
  isWebDesktop: boolean;
  isAmoled: boolean;
  isLight: boolean;
  user: AuthUser | null;
  accent: { from: string; to: string; mid?: string; border?: string; bg?: string };
  devices: any[];
  sync: SyncStatus & Record<string, any>; // some properties might be custom on the sync object
  showToast: (msg: string) => void;
  showOlderSessions: boolean;
  setShowOlderSessions: (v: boolean) => void;
  showDbDiag: boolean;
  setShowDbDiag: (v: boolean) => void;
}

export function DevicesSessionsSheet({
  sheet,
  lang,
  closeSheet,
  originRect,
  isWebDesktop,
  isAmoled,
  isLight,
  user,
  accent,
  devices,
  sync,
  showToast,
  showOlderSessions,
  setShowOlderSessions,
  showDbDiag,
  setShowDbDiag,
}: DevicesSessionsSheetProps) {
  return (
    <ProfileMorphModal
      id="profile-sheet-devices-sessions"
      isOpen={sheet === 'devices-sessions'}
      title={lang === 'es' ? 'Dispositivos y sesiones' : 'Devices & Sessions'}
      onClose={closeSheet}
      originRect={originRect}
      isWebDesktop={isWebDesktop}
      isAmoled={isAmoled}
      isLight={isLight}
    >
      <div
        style={{
          padding: '8px 22px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          width: '100%',
          boxSizing: 'border-box',
        }}
        className="no-scrollbar"
      >
        {!user ? (
          <p
            style={{
              fontFamily: 'Inter',
              fontSize: 13,
              color: 'var(--c-text-secondary)',
              margin: 0,
              textAlign: 'center',
              padding: '20px 0',
            }}
          >
            {lang === 'es'
              ? 'Inicia sesión para gestionar tus dispositivos.'
              : 'Sign in to manage your devices.'}
          </p>
        ) : !CLOUD_SYNC_FEATURE_ENABLED ? (
          <div
            style={{
              padding: '24px 20px',
              background: 'rgba(128,128,128,0.05)',
              borderRadius: 16,
              border: '1px solid rgba(128,128,128,0.12)',
              fontFamily: 'Inter',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 12,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 48, color: accent.from, opacity: 0.85 }}
            >
              devices
            </span>
            <h4
              style={{
                fontFamily: 'var(--studio-font-display)',
                fontWeight: 800,
                fontSize: 16,
                color: 'var(--c-text-primary)',
                margin: 0,
              }}
            >
              {lang === 'es'
                ? 'Dispositivos y sesiones próximamente'
                : 'Devices & Sessions is coming soon'}
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.5,
                color: 'var(--c-text-secondary)',
              }}
            >
              {lang === 'es'
                ? 'Esta función te permitirá gestionar dispositivos conectados y sesiones activas en Studio una vez que la Sincronización en la Nube esté lista.'
                : 'This feature will let you manage signed-in devices and active sessions once Studio Cloud Sync is ready.'}
            </p>
          </div>
        ) : (
          <>
            {devices.length === 0 ? (
              <div
                style={{
                  padding: '16px 20px',
                  background:
                    sync.deviceRegistrationStatus === 'failed'
                      ? 'rgba(239, 68, 68, 0.05)'
                      : 'rgba(128,128,128,0.05)',
                  borderRadius: 14,
                  border:
                    sync.deviceRegistrationStatus === 'failed'
                      ? '1px solid rgba(239, 68, 68, 0.15)'
                      : '1px solid rgba(128,128,128,0.12)',
                  fontFamily: 'Inter',
                  fontSize: '12.5px',
                  color: 'var(--c-text-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      color:
                        sync.deviceRegistrationStatus === 'failed' ? '#ff6b6b' : '#f59e0b',
                      fontSize: 20,
                    }}
                  >
                    {sync.deviceRegistrationStatus === 'failed'
                      ? 'error'
                      : sync.deviceRegistrationStatus === 'registered'
                        ? 'sync'
                        : 'hourglass_empty'}
                  </span>
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: 14,
                      color:
                        sync.deviceRegistrationStatus === 'failed'
                          ? '#ff6b6b'
                          : 'var(--c-text-primary)',
                      fontFamily: 'var(--studio-font-body)',
                    }}
                  >
                    {sync.deviceRegistrationStatus === 'failed'
                      ? lang === 'es'
                        ? 'No se pudo registrar el dispositivo'
                        : 'Studio could not register this device.'
                      : sync.deviceRegistrationStatus === 'registered'
                        ? lang === 'es'
                          ? 'Buscando dispositivos...'
                          : 'Checking devices...'
                        : lang === 'es'
                          ? 'El registro del dispositivo no ha terminado'
                          : 'Device registration has not completed yet.'}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    lineHeight: 1.4,
                    color: 'var(--c-text-secondary)',
                  }}
                >
                  {sync.deviceRegistrationStatus === 'failed'
                    ? lang === 'es'
                      ? 'Error al registrar el dispositivo. Revise los diagnósticos a continuación.'
                      : 'Failed to register this device. Review the diagnostics below.'
                    : sync.deviceRegistrationStatus === 'registered'
                      ? lang === 'es'
                        ? 'Se ha registrado el dispositivo, pero no se recibieron documentos de la nube.'
                        : 'Device registered successfully, but no device documents were received.'
                      : lang === 'es'
                        ? 'Studio está registrando este dispositivo en la nube...'
                        : 'Studio is registering this device to the cloud...'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(() => {
                  const thisDevice = devices.filter(
                    (d) => d.classification === 'current' || d.id === deviceId()
                  );
                  const activeRemoteDevices = devices.filter(
                    (d) => d.id !== deviceId() && d.classification === 'activeRemote'
                  );
                  const recentlyActiveDevices = devices.filter(
                    (d) => d.id !== deviceId() && d.classification === 'recentRemote'
                  );
                  const olderSessions = devices.filter(
                    (d) =>
                      d.id !== deviceId() &&
                      (d.classification === 'signedOut' ||
                        d.classification === 'revoked' ||
                        d.classification === 'legacy' ||
                        d.classification === 'unknown' ||
                        !d.classification)
                  );

                  return (
                    <>
                      {/* 1. This Device */}
                      {thisDevice.map((d) => (
                        <AccountDeviceRow key={d.id} device={d} isMe={true} lang={lang} userId={user?.uid} />
                      ))}

                      {/* 2. Other Active Devices */}
                      {activeRemoteDevices.length > 0 && (
                        <>
                          <p
                            style={{
                              margin: '12px 0 6px',
                              fontSize: 10.5,
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              color: 'var(--c-text-secondary)',
                              letterSpacing: '0.05em',
                              fontFamily: 'var(--studio-font-body)',
                            }}
                          >
                            {lang === 'es'
                              ? 'Otros dispositivos activos'
                              : 'Other active devices'}
                          </p>
                          {activeRemoteDevices.map((d) => (
                            <AccountDeviceRow key={d.id} device={d} isMe={false} lang={lang} userId={user?.uid} />
                          ))}
                        </>
                      )}

                      {/* 3. Recently Active Devices */}
                      {recentlyActiveDevices.length > 0 && (
                        <>
                          <p
                            style={{
                              margin: '12px 0 6px',
                              fontSize: 10.5,
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              color: 'var(--c-text-secondary)',
                              letterSpacing: '0.05em',
                              fontFamily: 'var(--studio-font-body)',
                            }}
                          >
                            {lang === 'es'
                              ? 'Dispositivos activos recientemente'
                              : 'Recently active devices'}
                          </p>
                          {recentlyActiveDevices.map((d) => (
                            <AccountDeviceRow key={d.id} device={d} isMe={false} lang={lang} userId={user?.uid} />
                          ))}
                        </>
                      )}

                      {/* 4. Previous / signed-out / legacy / unknown sessions */}
                      {olderSessions.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <button
                            onClick={() => setShowOlderSessions(!showOlderSessions)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--c-text-secondary)',
                              fontSize: 12,
                              fontWeight: 700,
                              fontFamily: 'var(--studio-font-body)',
                              cursor: 'pointer',
                              padding: '4px 0',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: 16 }}
                            >
                              {showOlderSessions ? 'expand_less' : 'expand_more'}
                            </span>
                            {lang === 'es'
                              ? `Sesiones anteriores (${olderSessions.length})`
                              : `Previous sessions (${olderSessions.length})`}
                          </button>
                          {showOlderSessions && (
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10,
                                marginTop: 8,
                              }}
                            >
                              {olderSessions.map((d) => (
                                <AccountDeviceRow key={d.id} device={d} isMe={false} lang={lang} userId={user?.uid} />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Sync Diagnostics & Debug section */}
            <div style={{ marginTop: 6 }}>
              <button
                onClick={() => setShowDbDiag(!showDbDiag)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: accent.from,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: 'var(--studio-font-body)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  {showDbDiag ? 'expand_less' : 'expand_more'}
                </span>
                {lang === 'es'
                  ? 'Ver diagnósticos de sincronización'
                  : 'View Sync Diagnostics'}
              </button>
              {showDbDiag && (
                <div
                  style={{
                    marginTop: 10,
                    padding: '12px 14px',
                    background: 'rgba(128,128,128,0.05)',
                    borderRadius: 12,
                    border: '1px solid rgba(128,128,128,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    fontFamily: 'Inter',
                    fontSize: 11,
                    maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 220px)',
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                  }}
                >
                  {(!sync.dbAvailable || !sync.supabaseClientReady) && (
                    <div
                      style={{
                        padding: '10px 12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 8,
                        color: '#ff6b6b',
                        fontSize: 11,
                        fontWeight: 600,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: 700,
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 16 }}
                        >
                          error_outline
                        </span>
                        <span>Cloud Sync is not initialized</span>
                      </div>
                      <div style={{ fontSize: 10, opacity: 0.9, marginLeft: 22 }}>
                        <div>
                          <strong>Auth Signed In:</strong> {user?.uid ? 'Yes' : 'No'}
                        </div>
                        <div>
                          <strong>Supabase Client Ready:</strong>{' '}
                          {sync.supabaseClientReady ? 'Yes' : 'No'}
                        </div>
                        <div>
                          <strong>Supabase URL Configured:</strong>{' '}
                          {sync.supabaseUrlConfigured ? 'Yes' : 'No'}
                        </div>
                        <div>
                          <strong>Supabase Anon Key Configured:</strong>{' '}
                          {sync.supabaseAnonKeyConfigured ? 'Yes' : 'No'}
                        </div>
                        <div>
                          <strong>Firebase Auth Bridge Ready:</strong>{' '}
                          {sync.firebaseAuthBridgeReady ? 'Yes' : 'No'}
                        </div>
                        <div>
                          <strong>Supabase Db Available:</strong>{' '}
                          {sync.dbAvailable ? 'Yes' : 'No'}
                        </div>
                        <div>
                          <strong>Init Error:</strong>{' '}
                          {sync.syncEngineInitError || 'None'}
                        </div>
                        <div style={{ marginTop: 6, color: '#ff8787', fontWeight: 700 }}>
                          Next Action: Check build keys or network connection
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      marginBottom: 8,
                      padding: '6px 8px',
                      background: 'rgba(168, 85, 247, 0.1)',
                      border: '1px solid rgba(168, 85, 247, 0.25)',
                      borderRadius: 8,
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--accent-to, #a855f7)',
                      fontFamily: 'var(--studio-font-body)',
                      ...codeBreakStyle,
                    }}
                  >
                    <strong>Build Fingerprint:</strong>{' '}
                    {`${APP_VERSION} · code ${sync.versionCode || 34} · commit ${APP_COMMIT_SHA} · built ${APP_BUILD_TIMESTAMP} · production · Firebase Hosting · ${sync.syncEngineVersion || 'sync-engine-v1'}`}
                  </div>

                  <button
                    onClick={() => {
                      const diagnosticsReport = {
                        appVersion: APP_VERSION,
                        versionCode: sync.versionCode || 34,
                        commitSha: APP_COMMIT_SHA,
                        buildTimestamp: APP_BUILD_TIMESTAMP,
                        buildType: Capacitor.isNativePlatform() ? 'Native Release' : 'Web',

                        // Firebase diagnostics
                        firebaseAppsCount: sync.firebaseAppsCount ?? 0,
                        firebaseAppName: sync.firebaseAppName || 'None',
                        firebaseProjectId: sync.firebaseProjectId || 'Not Configured',
                        firebaseAppId: sync.firebaseAppId || 'Not Configured',
                        firebaseAuthDomain: sync.firebaseAuthDomain || 'Not Configured',
                        firebaseStorageBucket:
                          sync.firebaseStorageBucket || 'Not Configured',
                        firebaseDbAvailable: sync.firebaseDbAvailable ? 'Yes' : 'No',
                        firebaseAuthAvailable: sync.firebaseAuthAvailable ? 'Yes' : 'No',
                        firebaseStorageAvailable: sync.firebaseStorageAvailable
                          ? 'Yes'
                          : 'No',
                        firebaseIdTokenAvailable: sync.firebaseIdTokenAvailable || 'No',
                        firebaseInitError: sync.firebaseInitError || 'None',

                        // Supabase diagnostics
                        supabaseUrlConfigured: sync.supabaseUrlConfigured ? 'Yes' : 'No',
                        supabaseUrlHost: sync.supabaseUrlHost || 'N/A',
                        supabaseAnonKeyConfigured: sync.supabaseAnonKeyConfigured
                          ? 'Yes'
                          : 'No',
                        supabaseAnonKeyPrefix: sync.supabaseAnonKeyPrefix || 'N/A',
                        supabaseAnonKeyLength: sync.supabaseAnonKeyLength ?? 0,
                        supabaseClientReady: sync.supabaseClientReady ? 'Yes' : 'No',
                        supabaseAuthBridgeReady: sync.supabaseAuthBridgeReady
                          ? 'Yes'
                          : 'No',
                        supabaseUserId: sync.supabaseUserId || 'N/A',
                        mappedUserId: sync.mappedUserId || 'N/A',
                        rlsUserId: sync.rlsUserId || 'N/A',
                        activeSyncProvider: sync.activeSyncProvider || 'N/A',
                        databaseProvider: sync.databaseProvider || 'N/A',
                        supabaseDbAvailable: sync.supabaseDbAvailable ? 'Yes' : 'No',
                        supabaseStorageAvailable: sync.supabaseStorageAvailable
                          ? 'Yes'
                          : 'No',
                        supabaseAuthStrategy: sync.supabaseAuthStrategy || 'N/A',
                        lastSupabaseAuthError: sync.lastSupabaseAuthError || 'None',

                        // General auth & sync state
                        authUid: user?.uid || 'Not signed in',
                        email: user?.email || 'N/A',
                        currentDeviceId: deviceId(),
                        currentPlatform: sync.currentDevicePlatform || 'web',
                        syncEngineVersion: sync.syncEngineVersion || 'sync-engine-v1',
                        devicesLogicVersion: sync.devicesLogicVersion || 'N/A',

                        // Paths & Tables
                        probeTable: sync.probeTable || 'N/A',
                        probeRowId: sync.probeRowId || 'N/A',
                        devicesTable: sync.devicesTable || 'N/A',
                        deviceRowId: sync.deviceRowId || 'N/A',
                        directWriteTable: sync.directWriteTable || 'N/A',
                        directWriteRowId: sync.directWriteRowId || 'N/A',
                        profileTable: sync.profileTable || 'N/A',
                        appearanceTable: sync.appearanceTable || 'N/A',
                        preferencesTable: sync.preferencesTable || 'N/A',

                        probeWritePath: sync.probeWritePath || 'N/A',
                        probeListenerPath: sync.probeListenerPath || 'N/A',
                        lastProbeWriteAttempt: sync.lastProbeWriteAttempt || 'Never',
                        lastProbeWriteSuccess: sync.lastProbeWriteSuccess || 'Never',
                        lastProbeWriteError: sync.lastProbeWriteError || 'None',
                        probeDocumentsReceived: sync.probeDocumentsReceived ?? 0,
                        probeRowsReceived: sync.probeRowsReceived ?? 0,
                        probeDeviceIdsReceived: sync.probeDeviceIdsReceived || [],
                        probeNoncesReceived: sync.probeNoncesReceived || [],
                        androidProbeDetected: sync.androidProbeDetected ? 'Yes' : 'No',
                        webProbeDetected: sync.webProbeDetected ? 'Yes' : 'No',
                        sameUidConfirmed: sync.sameUidConfirmed ? 'Yes' : 'No',
                        sameProjectConfirmed: sync.sameProjectConfirmed ? 'Yes' : 'No',

                        devicesListenerPath:
                          sync.listenerPath || `users/${user?.uid}/devices`,
                        devicesReceived: sync.devicesSnapshotCount ?? 0,
                        deviceIdsReceived: sync.deviceIdsReceived || [],
                        renderedDevices: sync.devicesRenderedCount ?? 0,
                        lastDeviceWriteSuccess: sync.lastDeviceWriteSuccess || 'Never',
                        lastDeviceWriteError: sync.lastDeviceWriteError || 'None',
                        lastHeartbeatSuccess: sync.lastHeartbeatSuccess || 'Never',
                        lastHeartbeatError: sync.lastHeartbeatError || 'None',

                        syncEngineInitError: sync.syncEngineInitError || 'None',

                        directWritePath: sync.directWritePath || 'N/A',
                        directWriteAttempt: sync.directWriteAttempt || 'Never',
                        directWriteSuccess: sync.directWriteSuccess || 'Never',
                        directWriteError: sync.directWriteError || 'None',
                        directWriteDurationMs: sync.directWriteDurationMs ?? null,
                        directReadBackSuccess: sync.directReadBackSuccess || 'Never',
                        directReadBackError: sync.directReadBackError || 'None',
                        directReadBackData: sync.directReadBackData || 'N/A',
                        directListenerDocumentsReceived:
                          sync.directListenerDocumentsReceived ?? 0,
                        directListenerDeviceIdsReceived:
                          sync.directListenerDeviceIdsReceived || [],
                        lastAction: sync.lastAction || 'None',
                        lastActionAt: sync.lastActionAt || 'Never',
                        buttonActionStatus: sync.buttonActionStatus || 'idle',
                        firestoreTransportMode: sync.firestoreTransportMode || 'default',
                        firestorePersistenceMode: sync.firestorePersistenceMode || 'none',
                        firestoreInitSource: sync.firestoreInitSource || 'not-started',
                        probeListenerStatus: sync.probeListenerStatus || 'idle',
                        probeListenerAttachedAt: sync.probeListenerAttachedAt || 'Never',
                        probeSnapshotFromCache: sync.probeSnapshotFromCache ? 'Yes' : 'No',
                        probeSnapshotHasPendingWrites: sync.probeSnapshotHasPendingWrites
                          ? 'Yes'
                          : 'No',
                        probeListenerError: sync.probeListenerError || 'None',
                        writeStage: sync.writeStage || 'idle',
                        writeStartedAt: sync.writeStartedAt || 'Never',
                        writeTimedOutAt: sync.writeTimedOutAt || 'Never',
                        writeDurationMs: sync.writeDurationMs ?? null,
                        firebaseErrorCode: sync.firebaseErrorCode || 'None',
                        firebaseErrorMessage: sync.firebaseErrorMessage || 'None',
                        onlineState: sync.onlineState || 'Unknown',
                        snapshotFromCache: sync.snapshotFromCache ? 'Yes' : 'No',
                        hasPendingWrites: sync.hasPendingWrites ? 'Yes' : 'No',
                      };

                      navigator.clipboard
                        .writeText(JSON.stringify(diagnosticsReport, null, 2))
                        .then(() =>
                          showToast(
                            lang === 'es'
                              ? '¡Diagnósticos copiados!'
                              : 'Diagnostics copied!'
                          )
                        )
                        .catch((err) =>
                          showToast(`Copy error: ${err.message || String(err)}`)
                        );
                    }}
                    style={{
                      marginBottom: 8,
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: 'rgba(128, 128, 128, 0.08)',
                      color: 'var(--c-text-primary)',
                      border: '1px solid rgba(128, 128, 128, 0.15)',
                      fontWeight: 700,
                      fontFamily: 'var(--studio-font-body)',
                      fontSize: 11,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                      content_copy
                    </span>
                    {lang === 'es'
                      ? 'Copiar diagnósticos de sync'
                      : 'Copy Sync Diagnostics'}
                  </button>

                  <div
                    style={{
                      height: 1,
                      background: 'rgba(128,128,128,0.08)',
                      margin: '8px 0',
                    }}
                  />
                  <div
                    style={{
                      fontFamily: 'var(--studio-font-body)',
                      fontWeight: 800,
                      fontSize: 11,
                      padding: '4px 0',
                      opacity: 0.75,
                      color: 'var(--c-text-primary)',
                    }}
                  >
                    Firebase & Account Diagnostics
                  </div>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Auth UID:</strong>{' '}
                    <code style={codeBreakStyle}>{user.uid}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Firebase Project ID:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.firebaseProjectId || 'Not Configured'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Firebase App ID:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.firebaseAppId || 'Not Configured'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Auth Domain:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.firebaseAuthDomain || 'Not Configured'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Storage Bucket:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.firebaseStorageBucket || 'Not Configured'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Firebase Apps Count:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.firebaseAppsCount ?? 0}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Firebase App Name:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.firebaseAppName || 'None'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Firebase Db Available:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.firebaseDbAvailable ? 'Yes' : 'No'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Firebase Storage Available:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.firebaseStorageAvailable ? 'Yes' : 'No'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Firebase Init Error:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.firebaseInitError || 'None'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Firebase Error Code:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.firebaseErrorCode || 'None'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Firebase Error Msg:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.firebaseErrorMessage || 'None'}
                    </code>
                  </p>

                  <div
                    style={{
                      height: 1,
                      background: 'rgba(128,128,128,0.08)',
                      margin: '8px 0',
                    }}
                  />
                  <div
                    style={{
                      fontFamily: 'var(--studio-font-body)',
                      fontWeight: 800,
                      fontSize: 11,
                      padding: '4px 0',
                      opacity: 0.75,
                      color: 'var(--c-text-primary)',
                    }}
                  >
                    Supabase Analytics Diagnostics
                  </div>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Active Sync Provider:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.activeSyncProvider || 'N/A'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Database Provider:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.databaseProvider || 'N/A'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Supabase URL Host:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.supabaseUrlHost || 'N/A'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Anon Key Prefix:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.supabaseAnonKeyPrefix || 'N/A'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Auth Strategy:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.supabaseAuthStrategy || 'N/A'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Mapped User ID:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.mappedUserId || 'N/A'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>RLS Identity:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.rlsUserId || 'N/A'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Last Auth Error:</strong>{' '}
                    <code
                      style={{
                        ...codeBreakStyle,
                        color: sync.lastSupabaseAuthError ? '#ff6b6b' : 'inherit',
                      }}
                    >
                      {sync.lastSupabaseAuthError || 'None'}
                    </code>
                  </p>

                  <div
                    style={{
                      height: 1,
                      background: 'rgba(128,128,128,0.08)',
                      margin: '8px 0',
                    }}
                  />
                  <div
                    style={{
                      fontFamily: 'var(--studio-font-body)',
                      fontWeight: 800,
                      fontSize: 11,
                      padding: '4px 0',
                      opacity: 0.75,
                      color: 'var(--c-text-primary)',
                    }}
                  >
                    Local Storage
                  </div>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Device ID:</strong>{' '}
                    <code style={codeBreakStyle}>{deviceId()}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Platform:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.currentDevicePlatform || 'web'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Profile Short Name:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.shortName || 'N/A'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Profile Display Name:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.displayName || 'N/A'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Profile Technical:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.technicalName || 'N/A'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Devices Table:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.devicesTable || 'livex_devices'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Device Row ID:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.deviceRowId || 'N/A'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Probe Table:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.probeTable || 'N/A'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Probe Row ID:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.probeRowId || 'N/A'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Direct Table:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.directWriteTable || 'N/A'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Direct Row ID:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.directWriteRowId || 'N/A'}</code>
                  </p>

                  <div
                    style={{
                      height: 1,
                      background: 'rgba(128,128,128,0.08)',
                      margin: '8px 0',
                    }}
                  />
                  <div
                    style={{
                      fontFamily: 'var(--studio-font-body)',
                      fontWeight: 800,
                      fontSize: 11,
                      padding: '4px 0',
                      opacity: 0.75,
                      color: 'var(--c-text-primary)',
                    }}
                  >
                    Sync State
                  </div>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Online State:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.onlineState || 'Unknown'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Snapshot From Cache:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.snapshotFromCache ? 'Yes' : 'No'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Has Pending Writes:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.hasPendingWrites ? 'Yes' : 'No'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Transport Mode:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.firestoreTransportMode || 'default'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Persistence Mode:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.firestorePersistenceMode || 'none'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Sync Init Source:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.firestoreInitSource || 'not-started'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Sync Engine Version:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.syncEngineVersion || 'sync-engine-v1'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Sync Path:</strong>{' '}
                    <code
                      style={{
                        ...codeBreakStyle,
                        color: !sync.listenerPath ? '#ff6b6b' : 'inherit',
                      }}
                    >
                      {sync.listenerPath || `users/${user.uid}/devices`}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Local Devices Array:</strong>{' '}
                    <code style={codeBreakStyle}>{devices.length}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Documents Received:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.devicesSnapshotCount ?? 0}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Device IDs Received:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.deviceIdsReceived?.length || 0}:{' '}
                      {sync.deviceIdsReceived?.join(', ') || 'None'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Devices Rendered:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.devicesRenderedCount ?? 0}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Other Devices Found:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.otherDevicesCount ?? 0}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Hidden Devices:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.hiddenDevicesCount ?? 0}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Hidden Reasons:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.hiddenDeviceReasons || 'None'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Syncing:</strong>{' '}
                    {/* Wait, busy is missing. Let's just use sync.buttonActionStatus */}
                    <code style={codeBreakStyle}>{sync.buttonActionStatus || 'idle'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Last HB Success:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.lastHeartbeatSuccess || 'Never'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Last HB Error:</strong>{' '}
                    <code
                      style={{
                        ...codeBreakStyle,
                        color: sync.lastHeartbeatError ? '#ff6b6b' : 'inherit',
                      }}
                    >
                      {sync.lastHeartbeatError || 'None'}
                    </code>
                  </p>

                  <div
                    style={{
                      height: 1,
                      background: 'rgba(128,128,128,0.08)',
                      margin: '8px 0',
                    }}
                  />
                  <div
                    style={{
                      fontFamily: 'var(--studio-font-body)',
                      fontWeight: 800,
                      fontSize: 11,
                      padding: '4px 0',
                      opacity: 0.75,
                      color: 'var(--c-text-primary)',
                    }}
                  >
                    Classification Status
                  </div>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Active Remotes:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.activeDevicesCount ?? 0}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Stale Remotes:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.staleDevicesCount ?? 0}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Legacy Devices:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.legacyDevicesCount ?? 0}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Grouped Devices:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.groupedDeviceIds || 'None'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Duplicates:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.duplicateCandidates || 'None'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Replacement Map:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.replacementMap || 'None'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Registration Status:</strong>{' '}
                    <code
                      style={{
                        ...codeBreakStyle,
                        color:
                          sync.deviceRegistrationStatus === 'failed'
                            ? '#ff6b6b'
                            : sync.deviceRegistrationStatus === 'registered'
                              ? '#10b981'
                              : 'inherit',
                      }}
                    >
                      {sync.deviceRegistrationStatus || 'checking'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Device ID Storage Key:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.deviceIdStorageKey || 'N/A'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Stored Device ID:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.storedDeviceId || 'N/A'}</code>
                  </p>

                  <div
                    style={{
                      height: 1,
                      background: 'rgba(128,128,128,0.08)',
                      margin: '8px 0',
                    }}
                  />
                  <div
                    style={{
                      fontFamily: 'var(--studio-font-body)',
                      fontWeight: 800,
                      fontSize: 11,
                      padding: '4px 0',
                      opacity: 0.75,
                      color: 'var(--c-text-primary)',
                    }}
                  >
                    Action History
                  </div>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Devices Logic Version:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.devicesLogicVersion || 'N/A'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Last Action:</strong>{' '}
                    <code
                      style={{
                        ...codeBreakStyle,
                        color:
                          sync.lastAction === 'error'
                            ? '#ff6b6b'
                            : sync.lastAction === 'success'
                              ? '#10b981'
                              : 'inherit',
                      }}
                    >
                      {sync.lastAction || 'None'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Last Action At:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.lastActionAt || 'Never'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Write Stage:</strong>{' '}
                    <code
                      style={{
                        ...codeBreakStyle,
                        color:
                          sync.writeStage === 'error'
                            ? '#ff6b6b'
                            : sync.writeStage === 'success'
                              ? '#10b981'
                              : 'inherit',
                      }}
                    >
                      {sync.writeStage || 'idle'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Write Started At:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.writeStartedAt || 'Never'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Write Timed Out At:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.writeTimedOutAt || 'Never'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Write Duration:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.writeDurationMs !== undefined && sync.writeDurationMs !== null
                        ? `${sync.writeDurationMs}ms`
                        : 'N/A'}
                    </code>
                  </p>

                  <div
                    style={{
                      height: 1,
                      background: 'rgba(128,128,128,0.08)',
                      margin: '8px 0',
                    }}
                  />
                  <div
                    style={{
                      fontFamily: 'var(--studio-font-body)',
                      fontWeight: 800,
                      fontSize: 11,
                      padding: '4px 0',
                      opacity: 0.75,
                      color: 'var(--c-text-primary)',
                    }}
                  >
                    Direct Write Tests
                  </div>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Direct Path:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.directWritePath || 'N/A'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Direct Attempt:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.directWriteAttempt || 'Never'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Direct Success:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.directWriteSuccess || 'Never'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Direct Error:</strong>{' '}
                    <code
                      style={{
                        ...codeBreakStyle,
                        color: sync.directWriteError ? '#ff6b6b' : 'inherit',
                      }}
                    >
                      {sync.directWriteError || 'None'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Direct Duration:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.directWriteDurationMs !== undefined &&
                      sync.directWriteDurationMs !== null
                        ? `${sync.directWriteDurationMs}ms`
                        : 'N/A'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Direct Read-back Success:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.directReadBackSuccess || 'Never'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Direct Read-back Error:</strong>{' '}
                    <code
                      style={{
                        ...codeBreakStyle,
                        color: sync.directReadBackError ? '#ff6b6b' : 'inherit',
                      }}
                    >
                      {sync.directReadBackError || 'None'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Direct Read-back Data:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.directReadBackData || 'N/A'}</code>
                  </p>

                  <div
                    style={{
                      height: 1,
                      background: 'rgba(128,128,128,0.08)',
                      margin: '8px 0',
                    }}
                  />
                  <div
                    style={{
                      fontFamily: 'var(--studio-font-body)',
                      fontWeight: 800,
                      fontSize: 11,
                      padding: '4px 0',
                      opacity: 0.75,
                      color: 'var(--c-text-primary)',
                    }}
                  >
                    Probe Diagnostics (V2)
                  </div>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Probe Path:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.probeWritePath || 'N/A'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Listener Path:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.probeListenerPath || 'N/A'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Listener Status:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.probeListenerStatus || 'idle'}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Attached At:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.probeListenerAttachedAt || 'Never'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Listener Error:</strong>{' '}
                    <code
                      style={{
                        ...codeBreakStyle,
                        color: sync.probeListenerError ? '#ff6b6b' : 'inherit',
                      }}
                    >
                      {sync.probeListenerError || 'None'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Probe Attempt:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.lastProbeWriteAttempt || 'Never'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Probe Success:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.lastProbeWriteSuccess || 'Never'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Probe Error:</strong>{' '}
                    <code
                      style={{
                        ...codeBreakStyle,
                        color: sync.lastProbeWriteError ? '#ff6b6b' : 'inherit',
                      }}
                    >
                      {sync.lastProbeWriteError || 'None'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Documents Received:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.probeDocumentsReceived ?? 0}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Rows Received:</strong>{' '}
                    <code style={codeBreakStyle}>{sync.probeRowsReceived ?? 0}</code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Device IDs Received:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.probeDeviceIdsReceived?.length || 0}:{' '}
                      {sync.probeDeviceIdsReceived?.join(', ') || 'None'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Nonces Received:</strong>{' '}
                    <code style={codeBreakStyle}>
                      {sync.probeNoncesReceived?.length || 0}:{' '}
                      {sync.probeNoncesReceived?.join(', ') || 'None'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Android Probe:</strong>{' '}
                    <code
                      style={{
                        ...codeBreakStyle,
                        color: sync.androidProbeDetected ? '#10b981' : 'inherit',
                      }}
                    >
                      {sync.androidProbeDetected ? 'Detected' : 'Waiting'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Web Probe:</strong>{' '}
                    <code
                      style={{
                        ...codeBreakStyle,
                        color: sync.webProbeDetected ? '#10b981' : 'inherit',
                      }}
                    >
                      {sync.webProbeDetected ? 'Detected' : 'Waiting'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Same UID Confirmed:</strong>{' '}
                    <code
                      style={{
                        ...codeBreakStyle,
                        color: sync.sameUidConfirmed ? '#10b981' : 'inherit',
                      }}
                    >
                      {sync.sameUidConfirmed ? 'Yes' : 'No'}
                    </code>
                  </p>
                  <p style={{ margin: 0, color: 'var(--c-text-secondary)' }}>
                    <strong>Same Project Confirmed:</strong>{' '}
                    <code
                      style={{
                        ...codeBreakStyle,
                        color: sync.sameProjectConfirmed ? '#10b981' : 'inherit',
                      }}
                    >
                      {sync.sameProjectConfirmed ? 'Yes' : 'No'}
                    </code>
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ProfileMorphModal>
  );
}
