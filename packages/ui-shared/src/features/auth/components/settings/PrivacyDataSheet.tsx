import React from 'react';
import { type AuthUser } from '@workspace/livex-core';
import {
  ProfileMorphModal,
  ShieldIconSVG,
  GoogleIconSVG,
  DownloadIconSVG,
  TrashIconSVG,
  SettingRowUI,
} from '../AccountCard';
import { StatefulButton } from '../../../../shared/design-system/StudioDesignSystem';
import { Toggle } from '../../../../shared/settings/SettingControls';
import { useChordStore } from '@workspace/livex-core';

export interface PrivacyDataSheetProps {
  sheet: string | null;
  lang: string;
  closeSheet: () => void;
  originRect: DOMRect | null;
  isWebDesktop: boolean;
  isAmoled: boolean;
  isLight: boolean;
  accent: { from: string; to: string; mid?: string; border?: string; bg?: string };
  user: AuthUser | null;
  isGoogleUser: boolean;
  localUsage: string;
  settings: Record<string, any>;
  doExportData: () => void;
  clearingCache: boolean;
  doClearCache: () => void;
  settingsController: {
    updateSettings: (partial: Record<string, any>) => void;
  };
  showToast: (msg: string) => void;
}

export function PrivacyDataSheet({
  sheet,
  lang,
  closeSheet,
  originRect,
  isWebDesktop,
  isAmoled,
  isLight,
  accent,
  user,
  isGoogleUser,
  localUsage,
  settings,
  doExportData,
  clearingCache,
  doClearCache,
  settingsController,
  showToast,
}: PrivacyDataSheetProps) {
  return (
    <ProfileMorphModal
        id="profile-sheet-privacy-data"
        isOpen={sheet === 'privacy-data'}
        title={lang === 'es' ? 'Privacidad y datos' : 'Privacy & Data'}
        onClose={closeSheet}
        originRect={originRect}
        isWebDesktop={isWebDesktop}
        isAmoled={isAmoled}
        isLight={isLight}
      >
        <div
          style={{
            padding: '12px 22px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20, // Clear, separated breathing room
            width: '100%',
            boxSizing: 'border-box',
          }}
          className="no-scrollbar animate-fade-in"
        >
                {/* ── Card 1: Compromiso de Privacidad (Privacy Guarantee) ── */}
                <div
                  style={{
                    background: 'var(--app-surface-high, rgba(128,128,128,0.05))',
                    borderRadius: 16,
                    padding: '20px 22px',
                    border: '1px solid rgba(128,128,128,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    boxSizing: 'border-box',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'var(--studio-font-display)',
                      fontWeight: 800,
                      fontSize: 15,
                      color: 'var(--c-text-primary)',
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <ShieldIconSVG color={accent.from} />
                    {lang === 'es' ? 'Compromiso de Privacidad' : 'Privacy Guarantee'}
                  </p>
                  <p
                    style={{
                      fontFamily: 'Inter',
                      fontSize: 12,
                      color: 'var(--c-text-secondary)',
                      margin: '2px 0 0',
                      lineHeight: 1.5,
                      opacity: 0.85,
                    }}
                  >
                    {lang === 'es'
                      ? 'Livex es 100% privado y de funcionamiento local. No recopilamos telemetría, rastreadores publicitarios ni análisis de comportamiento. Tus proyectos, acordes y configuraciones permanecen exclusivamente en tu dispositivo.'
                      : 'Livex is 100% private and local-first. We do not collect telemetry, advertising trackers, or behavioral analytics. Your projects, chords, and settings remain exclusively on your device.'}
                  </p>

                  <div
                    style={{
                      background: 'rgba(128,128,128,0.06)',
                      borderRadius: 12,
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                      {isGoogleUser ? (
                        <GoogleIconSVG />
                      ) : (
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 20, color: 'var(--c-text-secondary)' }}
                        >
                          {user ? 'person' : 'no_accounts'}
                        </span>
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 650,
                            color: 'var(--c-text-primary)',
                            fontFamily: 'var(--studio-font-body)',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {user
                            ? user.displayName || user.email || (isGoogleUser ? 'Google' : 'Livex User')
                            : lang === 'es'
                              ? 'Sesión local (Invitado)'
                              : 'Local Session (Guest)'}
                        </p>
                        {user?.email && (
                          <p
                            style={{
                              fontSize: 11,
                              color: 'var(--c-text-secondary)',
                              margin: '2px 0 0',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {user.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: 'var(--studio-font-body)',
                        color: user ? '#10b981' : 'var(--c-text-secondary)',
                        background: user ? 'rgba(16,185,129,0.12)' : 'rgba(128,128,128,0.10)',
                        border: `1px solid ${user ? 'rgba(16,185,129,0.25)' : 'rgba(128,128,128,0.15)'}`,
                        borderRadius: 6,
                        padding: '3px 8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                        flexShrink: 0,
                      }}
                    >
                      {user
                        ? isGoogleUser
                          ? 'Google'
                          : lang === 'es'
                            ? 'Conectado'
                            : 'Connected'
                        : lang === 'es'
                          ? 'Local'
                          : 'Local'}
                    </span>
                  </div>
                </div>

                {/* ── Card 2: Gestión de Datos y Almacenamiento (Data & Storage) ── */}
                <div
                  style={{
                    background: 'var(--app-surface-high, rgba(128,128,128,0.05))',
                    borderRadius: 16,
                    padding: '20px 22px',
                    border: '1px solid rgba(128,128,128,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    boxSizing: 'border-box',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'var(--studio-font-display)',
                      fontWeight: 800,
                      fontSize: 15,
                      color: 'var(--c-text-primary)',
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ color: accent.from, fontSize: 20 }}
                    >
                      database
                    </span>
                    {lang === 'es' ? 'Almacenamiento Local' : 'Local Storage'}
                  </p>
                  <p
                    style={{
                      fontFamily: 'Inter',
                      fontSize: 12,
                      color: 'var(--c-text-secondary)',
                      margin: '2px 0 0',
                      lineHeight: 1.5,
                      opacity: 0.85,
                    }}
                  >
                    {lang === 'es'
                      ? 'Todos tus datos se guardan en el almacenamiento interno de este dispositivo. Exporta copias de seguridad regularmente para evitar pérdida de datos si limpias el navegador.'
                      : 'All your data is saved in this device’s internal storage. Export backups regularly to prevent data loss if you clear browser data.'}
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 10,
                      marginTop: 6,
                    }}
                  >
                    <div
                      style={{
                        background: 'rgba(128,128,128,0.06)',
                        borderRadius: 10,
                        padding: '10px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                      }}
                    >
                      <p
                        style={{
                          fontFamily: 'Inter',
                          fontSize: 10,
                          color: 'var(--c-text-secondary)',
                          margin: 0,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          fontWeight: 600,
                        }}
                      >
                        {lang === 'es' ? 'Espacio utilizado' : 'Storage Used'}
                      </p>
                      <p
                        style={{
                          fontFamily: 'var(--studio-font-body)',
                          fontWeight: 700,
                          fontSize: 14,
                          margin: 0,
                          color: 'var(--c-text-primary)',
                        }}
                      >
                        {localUsage}
                      </p>
                    </div>
                    <div
                      style={{
                        background: 'rgba(128,128,128,0.06)',
                        borderRadius: 10,
                        padding: '10px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                      }}
                    >
                      <p
                        style={{
                          fontFamily: 'Inter',
                          fontSize: 10,
                          color: 'var(--c-text-secondary)',
                          margin: 0,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          fontWeight: 600,
                        }}
                      >
                        {lang === 'es' ? 'Última exportación' : 'Last Export'}
                      </p>
                      <p
                        style={{
                          fontFamily: 'var(--studio-font-body)',
                          fontWeight: 700,
                          fontSize: 13,
                          margin: 0,
                          color: 'var(--c-text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {settings.lastExportDate === 'Never exported'
                          ? lang === 'es'
                            ? 'Nunca'
                            : 'Never'
                          : settings.lastExportDate}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                    <button
                      type="button"
                      onClick={doExportData}
                      style={{
                        flex: 1,
                        padding: '11px 12px',
                        borderRadius: 12,
                        background: `${accent.from}15`,
                        border: `1px solid ${accent.from}35`,
                        color: accent.from,
                        fontFamily: 'var(--studio-font-body)',
                        fontWeight: 700,
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 7,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <DownloadIconSVG />
                      {lang === 'es' ? 'Exportar datos' : 'Export Data'}
                    </button>
                    <StatefulButton
                      state={clearingCache ? 'loading' : 'idle'}
                      onClick={doClearCache}
                      disabled={clearingCache}
                      variant="danger"
                      style={{
                        flex: 1,
                        padding: '11px 12px',
                        borderRadius: 12,
                        background: 'rgba(255,107,107,0.08)',
                        borderColor: 'rgba(255,107,107,0.22)',
                        color: '#ff6b6b',
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {!clearingCache && <TrashIconSVG />}
                      {lang === 'es' ? 'Borrar caché' : 'Clear Cache'}
                    </StatefulButton>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 12 }}>
                    <SettingRowUI
                      label={lang === 'es' ? 'Restaurar última sesión' : 'Restore Last Session'}
                      desc={
                        lang === 'es'
                          ? 'Abrir automáticamente la última app y pestaña activa al iniciar.'
                          : 'Automatically restore last active app, tab, and view on start.'
                      }
                    >
                      <Toggle
                        value={settings.restoreLastSession}
                        onChange={(v) =>
                          settingsController.updateSettings({ restoreLastSession: v })
                        }
                        accentFrom={accent.from}
                        accentTo={accent.to}
                      />
                    </SettingRowUI>
                  </div>
                </div>

                {/* ── Card 3: Historial de Actividad (Activity History) ── */}
                <div
                  style={{
                    background: 'var(--app-surface-high, rgba(128,128,128,0.05))',
                    borderRadius: 16,
                    padding: '20px 22px',
                    border: '1px solid rgba(128,128,128,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    boxSizing: 'border-box',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'var(--studio-font-display)',
                      fontWeight: 800,
                      fontSize: 15,
                      color: 'var(--c-text-primary)',
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ color: '#ec4899', fontSize: 20 }}
                    >
                      history
                    </span>
                    {lang === 'es' ? 'Historial de Actividad' : 'Activity History'}
                  </p>
                  <p
                    style={{
                      fontFamily: 'Inter',
                      fontSize: 12,
                      color: 'var(--c-text-secondary)',
                      margin: '2px 0 0',
                      lineHeight: 1.5,
                      opacity: 0.85,
                    }}
                  >
                    {lang === 'es'
                      ? 'Controla el registro local de tu actividad en el ecosistema Studio (apertura de proyectos, exportaciones e inicios de sesión).'
                      : 'Manage the local log of your activity across the Studio ecosystem (project opens, exports, and sign-ins).'}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 10 }}>
                    <SettingRowUI
                      label={lang === 'es' ? 'Habilitar historial' : 'Enable Activity History'}
                      desc={
                        lang === 'es'
                          ? 'Registrar inicios de app, proyectos, exportaciones, etc. de forma local.'
                          : 'Log app launches, projects, exports, etc. locally.'
                      }
                    >
                      <Toggle
                        value={settings.activityHistoryEnabled !== false}
                        onChange={(v) =>
                          settingsController.updateSettings({ activityHistoryEnabled: v })
                        }
                        accentFrom={accent.from}
                        accentTo={accent.to}
                      />
                    </SettingRowUI>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={() => {
                        const confirmClear = window.confirm(
                          lang === 'es'
                            ? '¿Estás seguro de que deseas borrar todo el historial de actividad local?'
                            : 'Are you sure you want to clear your entire local activity history?'
                        );
                        if (confirmClear) {
                          useChordStore.setState({ activityLog: [] });
                          showToast(
                            lang === 'es' ? 'Historial borrado' : 'Activity history cleared'
                          );
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        borderRadius: 12,
                        background: 'rgba(255,107,107,0.08)',
                        border: '1px solid rgba(255,107,107,0.20)',
                        color: '#ff6b6b',
                        fontFamily: 'var(--studio-font-body)',
                        fontWeight: 700,
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        cursor: 'pointer',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                        delete_sweep
                      </span>
                      {lang === 'es' ? 'Borrar historial local' : 'Clear Local History'}
                    </button>
                  </div>
                </div>
        </div>
      </ProfileMorphModal>
  );
}
