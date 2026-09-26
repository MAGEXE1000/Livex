import { Dialog, activeOverlaysRegistry } from '../../../shared/design-system/dialogs';
import {
  subscribeSyncStatus,
  getSyncStatus,
  syncNow,
  settingsController,
  type SyncStatus,
  subscribeDevices,
  deviceId,
  revokeDeviceSession,
  resolveMigration,
  registerDevice,
  registerCurrentDevice,
  useT,
  useChordStore,
  useBackHandler,
  BackDispatcher,
  useIsWebDesktop,
  logActivity,
  getActivityEmoji,
  APP_VERSION,
  APP_COMMIT_SHA,
  APP_BUILD_TIMESTAMP,
  useSettingsStore,
  userRepository,
  SpringPresets,
  useShallow,
} from '@workspace/livex-core';
import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button, StatefulButton } from '../../../shared/design-system/StudioDesignSystem';
import { createPortal } from 'react-dom';
import AppSpinner from '../../../shared/loading/AppSpinner';
import { Circle, Layers3, BadgeCheck, FlaskConical, ShieldCheck } from 'lucide-react';
import { Loader } from '../../../components/motion/loader';
import { useHoverCapable } from '../../../lib/hooks/use-hover-capable';
import { useAppReducedMotion } from '../../../hooks/useAppReducedMotion';
import AnimatedActionButton from '../../../shared/animata/container/animated-border-trail';
import { AccountSignInFlow } from './settings/AccountSignInFlow';
import { AccountDangerZone } from './settings/AccountDangerZone';
import { SettingsRow } from './settings/SettingsRow';
import { PersonalInformationSheet } from './settings/PersonalInformationSheet';
import { SecurityLoginSheet } from './settings/SecurityLoginSheet';
import { SubscriptionBillingSheet } from './settings/SubscriptionBillingSheet';
import { DevicesSessionsSheet } from './settings/DevicesSessionsSheet';
import { PrivacyDataSheet } from './settings/PrivacyDataSheet';
import { isFirebaseConfigured, type AuthUser, authRepository } from '@workspace/livex-core';
import {
  AVATAR_ICONS,
  getUserAvatar,
  setUserAvatar,
  subscribeUserAvatar,
  getUserCover,
  setUserCover,
  subscribeUserCover,
  type AvatarIcon,
} from '@workspace/livex-core';
const StudioPricingSection = lazy(() => import('./StudioPricingSection'));
import { AccountProfileHeader } from './sections/AccountProfileHeader';
import { AccountSyncSection } from './sections/AccountSyncSection';

function compressAndResizeImage(file: File, maxWidth = 256, maxHeight = 256): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas conversion failed'));
          },
          'image/jpeg',
          0.85
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function selectAvatarIcon(user: AuthUser | null, icon: AvatarIcon | null) {
  if (!user?.uid) return;
  setUserAvatar(user.uid, icon);
  try {
    const { syncWriteProfileMain } = await import('@workspace/livex-core');
    await syncWriteProfileMain(user.displayName, user.photoURL, icon);
  } catch (e) {
    console.error('Failed to sync avatar icon selection:', e);
  }
}
import { Capacitor } from '@capacitor/core';
import { Toggle } from '../../../shared/settings/SettingControls';
import {
  subscribeUserProfile,
  isAdminUser,
  isBetaTesterUser,
  hasCoreAccessUser,
  hasProAccessUser,
  type UserProfile,
  type UserRole,
} from '@workspace/livex-core';

export const CLOUD_SYNC_FEATURE_ENABLED = false;

export const codeBreakStyle = {
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
  whiteSpace: 'pre-wrap',
} as const;


type Props = {
  accent: { from: string; to: string; mid: string };
  cardStyle: React.CSSProperties;
  rowStyle: React.CSSProperties;
  onAccountSettings?: () => void;
};

type Mode = 'idle' | 'email-signin' | 'email-register';

export function formatRelative(ms: number | null, lang: string): string {
  if (!ms) return '';
  const diff = Math.max(0, Date.now() - ms);
  const sec = Math.floor(diff / 1000);
  if (lang === 'es') {
    if (sec < 5) return 'ahora mismo';
    if (sec < 60) return `hace ${sec}s`;
    if (sec < 3600) return `hace ${Math.floor(sec / 60)}m`;
    if (sec < 86400) return `hace ${Math.floor(sec / 3600)}h`;
    return `hace ${Math.floor(sec / 86400)}d`;
  }
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function renderRoleBadge(role: UserRole | undefined, lang: string, accent: any) {
  const isEs = lang === 'es';
  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    fontFamily: 'var(--studio-font-body)',
    letterSpacing: '-0.015em',
    boxShadow: 'none',
    border: '1px solid transparent',
  };
  const iconSize = 13;

  switch (role) {
    case 'admin':
      return (
        <div
          style={{
            ...badgeStyle,
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
          }}
        >
          <ShieldCheck size={iconSize} style={{ strokeWidth: 2.2 }} />
          <span>Admin</span>
        </div>
      );
    case 'beta_tester':
      return (
        <div
          style={{
            ...badgeStyle,
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            color: '#f59e0b',
          }}
        >
          <FlaskConical size={iconSize} style={{ strokeWidth: 2.2 }} />
          <span>{isEs ? 'Probador Beta' : 'Beta Tester'}</span>
        </div>
      );
    case 'pro':
      return (
        <div
          style={{
            ...badgeStyle,
            background: 'rgba(168, 85, 247, 0.08)',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            color: '#a855f7',
          }}
        >
          <BadgeCheck size={iconSize} style={{ strokeWidth: 2.2 }} />
          <span>Pro</span>
        </div>
      );
    case 'core':
      return (
        <div
          style={{
            ...badgeStyle,
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            color: '#3b82f6',
          }}
        >
          <Layers3 size={iconSize} style={{ strokeWidth: 2.2 }} />
          <span>Core</span>
        </div>
      );
    case 'free':
    default:
      return (
        <div
          style={{
            ...badgeStyle,
            background: 'rgba(128, 128, 128, 0.08)',
            border: '1px solid rgba(128, 128, 128, 0.2)',
            color: 'var(--c-text-secondary, #94a3b8)',
          }}
        >
          <Circle size={iconSize} style={{ strokeWidth: 2.2 }} />
          <span>{isEs ? 'Gratis' : 'Free'}</span>
        </div>
      );
  }
}

function getSyncPausedLabel(lang: string): string {
  switch (lang) {
    case 'es':
      return 'Sincronización pausada';
    case 'de':
      return 'Synchronisierung pausiert';
    case 'fr':
      return 'Synchronisation en pause';
    case 'it':
      return 'Sincronizzazione in pausa';
    case 'pt':
      return 'Sincronização pausada';
    case 'ja':
      return '同期は一時停止中';
    case 'ko':
      return '동기화 일시 중지됨';
    case 'zh':
      return '同步已暂停';
    default:
      return 'Sync is paused';
  }
}

/* ─── Privacy & Data Inline SVG Icons ─── */

export function ShieldIconSVG({ color = '#10b981' }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"
        fill={color}
        opacity="0.15"
      />
      <path
        d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2 2 4-4"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DashboardIconSVG({ color = '#a78bfa' }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="8" height="8" rx="2" fill={color} />
      <rect x="13" y="3" width="8" height="8" rx="2" fill={color} opacity="0.5" />
      <rect x="3" y="13" width="8" height="8" rx="2" fill={color} opacity="0.5" />
      <rect x="13" y="13" width="8" height="8" rx="2" fill={color} opacity="0.3" />
    </svg>
  );
}

function BackupSyncIconSVG({ color = '#10b981' }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"
        fill={color}
        opacity="0.85"
      />
      <path d="M12 10l-3 3h2v4h2v-4h2l-3-3z" fill="white" opacity="0.95" />
    </svg>
  );
}

function AnalyticsIconSVG({ color = '#f59e0b' }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="13" width="4" height="7" rx="1" fill={color} opacity="0.5" />
      <rect x="10" y="9" width="4" height="11" rx="1" fill={color} opacity="0.75" />
      <rect x="16" y="4" width="4" height="16" rx="1" fill={color} />
    </svg>
  );
}

function RetentionIconSVG({ color = '#0891b2' }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" fill="none" opacity="0.3" />
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeDasharray="57"
        strokeDashoffset="14"
        strokeLinecap="round"
      />
      <path
        d="M12 7v5l3 3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LinkIconSVG({ color = '#db2777' }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StorageIconSVG({ color = '#14b8a6' }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="6" rx="8" ry="3" fill={color} opacity="0.85" />
      <path
        d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}

export function GoogleIconSVG() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
        fill="#FFC107"
      />
      <path
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
        fill="#FF3D00"
      />
      <path
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
        fill="#4CAF50"
      />
      <path
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
        fill="#1976D2"
      />
    </svg>
  );
}

function DropboxIconSVG() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 6l-10 6.5 10 6.5 10-6.5z" fill="#1E88E5" />
      <path d="M34 6l-10 6.5 10 6.5 10-6.5z" fill="#1E88E5" />
      <path d="M4 25.5l10 6.5 10-6.5-10-6.5z" fill="#1E88E5" />
      <path d="M34 25.5l10-6.5-10-6.5-10 6.5z" fill="#1E88E5" />
      <path d="M14 34l10-6.5-10-6.5-10 6.5z" fill="#1E88E5" opacity="0.7" />
      <path d="M34 34l-10-6.5 10-6.5 10 6.5z" fill="#1E88E5" opacity="0.7" />
    </svg>
  );
}

function OneDriveIconSVG() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M28.4 16.6c-1.5-3-4.6-5.1-8.2-5.1-4.1 0-7.5 2.7-8.7 6.4C7.3 18.7 4 22.5 4 27c0 5 4 9 9 9h22c4.4 0 8-3.6 8-8 0-4.2-3.2-7.6-7.3-8l-.1-.1c-.9-2-3.1-3.3-5.5-3.3h-1.7z"
        fill="#0364B8"
      />
      <path
        d="M20.2 11.5c3.6 0 6.7 2.1 8.2 5.1h1.7c2.4 0 4.6 1.3 5.5 3.3l.1.1c4.1.4 7.3 3.8 7.3 8 0 4.4-3.6 8-8 8H17l3.2-24.4z"
        fill="#0078D4"
        opacity="0.9"
      />
    </svg>
  );
}

function GitHubIconSVG() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

export function DownloadIconSVG() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function TrashIconSVG() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function ChevronDownIconSVG() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckCircleIconSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#10b981" opacity="0.15" />
      <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="1.5" fill="none" />
      <path
        d="M8 12l3 3 5-5"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SyncProblemIconSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#ef4444" opacity="0.15" />
      <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="1.5" fill="none" />
      <path d="M12 8v4" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1" fill="#ef4444" />
    </svg>
  );
}

function CloudOffIconSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="var(--c-text-secondary)" opacity="0.15" />
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="var(--c-text-secondary)"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M2.5 2.5l19 19"
        stroke="var(--c-text-secondary)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7.3 7.3A5.5 5.5 0 009 17h6.5a3.5 3.5 0 002.1-6.3 5.5 5.5 0 00-8.1-4"
        stroke="var(--c-text-secondary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── End Privacy & Data SVG Icons ─── */

export default function AccountCard({ accent, cardStyle, rowStyle, onAccountSettings }: Props) {
  const tRoot = useT();
  const t = tRoot.hub.accountSection;
  const lang = useSettingsStore((s) => s.settings.language) ?? 'en';
  const syncAcrossDevices = useSettingsStore((s) => s.settings.syncAcrossDevices);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncStatus>(() => ({
    signedIn: false,
    phase: 'idle',
    syncing: false,
    lastSyncedMs: null,
    error: null,
    showMigrationPrompt: false,
    migrationChoice: null,
  }));
  const [tick, setTick] = useState(0);
  const [avatarIcon, setAvatarIcon] = useState<AvatarIcon | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerClosing, setPickerClosing] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  useEffect(() => subscribeUserProfile(setProfile), []);
  useEffect(() => authRepository.subscribeAuth(setUser), []);
  useEffect(() => subscribeSyncStatus(setSync), []);
  // Reset photo-failed flag when the user (or photo URL) changes so a
  // fresh sign-in gets a new shot at loading the picture.
  useEffect(() => {
    setPhotoFailed(false);
  }, [user?.uid, user?.photoURL]);

  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.uid) {
      setCustomPhoto(null);
      return;
    }
    const refresh = () => setCustomPhoto(getUserCover(user?.uid ?? null));
    refresh();
    return subscribeUserCover(({ uid, cover }) => {
      if (uid === user?.uid) {
        setCustomPhoto(cover);
      }
    });
  }, [user?.uid]);
  // Hydrate the per-uid avatar choice and listen for picker changes
  // from anywhere in the app.
  useEffect(() => {
    const refresh = () => setAvatarIcon(getUserAvatar(user?.uid ?? null));
    refresh();
    return subscribeUserAvatar(refresh);
  }, [user?.uid]);
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(id);
  }, []);
  // Touch tick so eslint sees we use it (drives relative-time refresh)
  void tick;

  if (!isFirebaseConfigured) {
    return (
      <div style={cardStyle}>
        <div style={rowStyle}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-text-primary)', margin: 0 }}>
              {t.title}
            </p>
            <p
              style={{
                fontSize: 12,
                color: 'var(--c-text-secondary)',
                margin: '4px 0 0',
                lineHeight: 1.4,
              }}
            >
              {t.notConfigured}
            </p>
          </div>
        </div>
      </div>
    );
  }



  async function doSyncNow() {
    setBusy(true);
    try {
      await syncNow();
    } finally {
      setBusy(false);
    }
  }

  async function doRetry() {
    setBusy(true);
    try {
      await syncNow();
    } finally {
      setBusy(false);
    }
  }

  // ── Signed in ──
  if (user) {
    const effectivePhoto = customPhoto || (user.photoURL && !photoFailed ? user.photoURL : null);
    const initial = (user.displayName || user.email || '?').trim().charAt(0).toUpperCase();
    // Phase-driven UI: the engine is the single source of truth for which
    // visual state we should be in. We never derive "just synced" from a
    // ref-tracked transition any more — the engine fires `phase=success`
    // for SUCCESS_LINGER_MS then auto-fades to `idle`.
    const phase = sync.phase;
    const justSynced = phase === 'success';
    const isSyncing = phase === 'syncing';
    const isError = phase === 'error';
    // v3.0.57: When sync is healthy (just synced OR previously synced and
    // sitting idle), show a green check_circle to make "everything is
    // backed up" visually obvious — much friendlier than the neutral
    // cloud icon, which read as ambient/inactive.
    // However, if syncAcrossDevices is false, background sync is paused,
    // so we should show a neutral grey cloud_off and "Sync is paused" text.
    const isHealthySynced =
      syncAcrossDevices && !isSyncing && !isError && (justSynced || sync.lastSyncedMs != null);
    const iconName = isSyncing
      ? 'sync'
      : isError
        ? 'sync_problem'
        : isHealthySynced
          ? 'check_circle'
          : 'cloud_off';
    const iconColor = isSyncing
      ? accent.from
      : isError
        ? '#ff6b6b'
        : isHealthySynced
          ? '#10b981'
          : 'var(--c-text-secondary)';
    const statusText = isSyncing
      ? t.syncing
      : isError
        ? t.syncFailed
        : justSynced
          ? t.syncedJustNow
          : !syncAcrossDevices
            ? getSyncPausedLabel(lang)
            : sync.lastSyncedMs
              ? `${t.synced} · ${formatRelative(sync.lastSyncedMs, lang)}`
              : t.notSyncedYet;
    return (
      <div style={cardStyle}>
        <SyncAnimations />
        <div style={{ ...rowStyle, alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => {
              setPickerClosing(false);
              setPickerOpen(true);
            }}
            aria-label={t.avatarPickerTitle}
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              flexShrink: 0,
              padding: 0,
              border: 'none',
              cursor: 'pointer',
              background:
                avatarIcon || !effectivePhoto
                  ? `linear-gradient(135deg, ${accent.from}, ${accent.to})`
                  : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: 18,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {avatarIcon ? (
              <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#fff' }}>
                {avatarIcon}
              </span>
            ) : effectivePhoto ? (
              <img
                src={effectivePhoto}
                alt=""
                referrerPolicy="no-referrer"
                onError={() => {
                  if (effectivePhoto === user.photoURL) setPhotoFailed(true);
                }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span>{initial}</span>
            )}
          </button>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--c-text-primary)',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user.displayName || user.email}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {renderRoleBadge(profile?.role, lang, accent)}
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--c-text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user.displayName ? user.email : t.signedIn}
              </span>
            </div>
          </div>
          {onAccountSettings && (
            <button
              type="button"
              onClick={onAccountSettings}
              aria-label="Account settings"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                flexShrink: 0,
                padding: 0,
                border: '1px solid rgba(128,128,128,0.15)',
                background: 'rgba(128,128,128,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--c-text-secondary)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                settings
              </span>
            </button>
          )}
        </div>

        <div style={{ ...rowStyle, alignItems: 'center', gap: 10 }}>
          {isSyncing ? (
            <Loader variant="comet" size={18} />
          ) : (
            <span
              className={`material-symbols-outlined sync-icon ${justSynced ? 'sync-pop' : ''}`}
              style={{ fontSize: 18, color: iconColor, transition: 'color 250ms ease' }}
            >
              {iconName}
            </span>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-primary)', margin: 0 }}>
              {statusText}
            </p>
            {isError && sync.error && (
              <p style={{ fontSize: 10, color: '#ff6b6b', margin: '2px 0 0' }}>{sync.error}</p>
            )}
          </div>
          {isError ? (
            <StatefulButton state="error" onClick={doRetry} disabled={busy} size="sm">
              {t.retry}
            </StatefulButton>
          ) : (
            <StatefulButton
              state={isSyncing ? 'loading' : 'idle'}
              onClick={doSyncNow}
              disabled={busy}
              size="sm"
            >
              {t.syncNow}
            </StatefulButton>
          )}
        </div>

        <div style={{ ...rowStyle }}>
          <p
            style={{
              fontSize: 12,
              color: 'var(--c-text-secondary)',
              margin: 0,
              flex: 1,
              lineHeight: 1.4,
            }}
          >
            {t.syncedAppsNote}
          </p>
        </div>

        {sync.showMigrationPrompt &&
          createPortal(
            <MigrationPromptSheet
              accent={accent}
              lang={lang}
              onClose={(choice) => resolveMigration(choice)}
            />,
            document.body
          )}

        {pickerOpen &&
          createPortal(
            <AvatarPickerSheet
              accent={accent}
              currentIcon={avatarIcon}
              hasGooglePhoto={!!user.photoURL && !photoFailed}
              t={t}
              closing={pickerClosing}
              onPick={(icon) => {
                selectAvatarIcon(user, icon);
              }}
              onClose={() => {
                setPickerClosing(true);
                setTimeout(() => {
                  setPickerOpen(false);
                  setPickerClosing(false);
                }, 280);
              }}
            />,
            document.body
          )}
      </div>
    );
  }

  // ── Signed out ──
  return (
    <AccountSignInFlow
      accent={accent}
      lang={lang}
      t={t}
      busy={busy}
      setBusy={setBusy}
      err={err}
      setErr={setErr}
    />
  );
}

// ── Standalone Danger Zone (rendered in StudioHub below Language) ────────────


export function prettyErr(e: unknown, lang: string): string {
  const code = (e as { code?: string })?.code ?? '';
  const msg = (e as { message?: string })?.message ?? 'Unknown error';
  const es = lang === 'es';
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return es ? 'Email o contraseña incorrectos' : 'Wrong email or password';
  }
  if (code === 'auth/email-already-in-use')
    return es ? 'Ese email ya está registrado' : 'Email already registered';
  if (code === 'auth/weak-password')
    return es ? 'La contraseña es muy débil (mín. 6)' : 'Password too weak (min 6 chars)';
  if (code === 'auth/invalid-email') return es ? 'Email no válido' : 'Invalid email';
  if (code === 'auth/network-request-failed') return es ? 'Sin conexión' : 'Network error';
  if (code === 'auth/unauthorized-domain')
    return es
      ? 'Este dominio no está autorizado en Firebase'
      : 'This domain is not authorized in Firebase';
  // ── Native Google Sign-In codes (Capacitor plugin → GoogleSignInStatusCodes) ──
  if (code === 'auth/native-developer-error') {
    return es
      ? 'Esta build de la app no está autorizada por Google. La huella SHA-1 de esta APK no está registrada en Firebase. Mientras tanto, regístrate o inicia sesión con email aquí abajo — el sync funciona igual.'
      : "This build is not authorised by Google. The APK's SHA-1 fingerprint is not registered in Firebase. In the meantime, sign in with email below — sync works the same way.";
  }
  if (code === 'auth/native-sign-in-failed') {
    return es
      ? 'Google rechazó el inicio de sesión. Revisa que tengas Google Play Services al día e intenta de nuevo, o usa email.'
      : 'Google rejected the sign-in. Make sure Google Play Services is up to date and retry, or use email.';
  }
  if (code === 'auth/native-internal-error') {
    return es
      ? 'Error interno de Google Sign-In. Intenta de nuevo en un momento.'
      : 'Google Sign-In internal error. Try again in a moment.';
  }
  if (code === 'auth/native-sign-in-currently-in-progress') {
    return es ? 'Ya hay un inicio de sesión en curso.' : 'A sign-in is already in progress.';
  }
  // Last-ditch: any bare "<status>:" leaking from a path that bypassed
  // auth.ts's normaliser (older code paths, third-party plugins).
  // Common Google Sign-In status codes: 7, 8, 10, 12500, 12501, 12502.
  if (/^\s*10[:\s]/.test(msg) || /DEVELOPER_ERROR/i.test(msg)) {
    return es
      ? 'Esta build no está autorizada por Google (SHA-1 no registrado en Firebase). Usa email para entrar — el sync funciona igual.'
      : 'This build is not authorised by Google (SHA-1 not registered in Firebase). Sign in with email — sync works the same way.';
  }
  if (/^\s*12501[:\s]/.test(msg)) {
    // User cancelled — silent, but if it leaks, show something neutral.
    return es ? 'Cancelado' : 'Cancelled';
  }
  if (/^\s*12500[:\s]/.test(msg) || /SIGN_IN_FAILED/i.test(msg)) {
    return es
      ? 'Google rechazó el inicio de sesión. Revisa Google Play Services o usa email.'
      : 'Google rejected the sign-in. Check Google Play Services or use email.';
  }
  if (/^\s*7[:\s]/.test(msg)) {
    return es ? 'Sin conexión a Google' : 'Network error reaching Google';
  }
  if (/^\s*8[:\s]/.test(msg) || /INTERNAL_ERROR/i.test(msg)) {
    return es
      ? 'Error interno de Google Sign-In. Intenta de nuevo.'
      : 'Google Sign-In internal error. Try again.';
  }
  if (/^\s*12502[:\s]/.test(msg)) {
    return es ? 'Ya hay un inicio de sesión en curso.' : 'A sign-in is already in progress.';
  }
  return msg;
}

function pillBtn(accent: { from: string; to: string }, danger?: boolean): React.CSSProperties {
  return {
    padding: '7px 14px',
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: 700,
    background: danger ? 'rgba(255,107,107,0.12)' : `${accent.from}1f`,
    border: `1px solid ${danger ? 'rgba(255,107,107,0.3)' : accent.from + '55'}`,
    color: danger ? '#ff6b6b' : accent.from,
    fontFamily: 'var(--studio-font-body)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };
}

function primaryBtn(accent: { from: string; to: string }): React.CSSProperties {
  return {
    padding: '12px 16px',
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 700,
    background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
    border: 'none',
    color: '#fff',
    fontFamily: 'var(--studio-font-body)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  };
}

function secondaryBtn(): React.CSSProperties {
  return {
    padding: '12px 16px',
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 700,
    background: 'rgba(128,128,128,0.10)',
    border: '1px solid rgba(128,128,128,0.18)',
    color: 'var(--c-text-primary)',
    fontFamily: 'var(--studio-font-body)',
    cursor: 'pointer',
  };
}

function textBtn(): React.CSSProperties {
  return {
    padding: '6px 8px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    background: 'transparent',
    border: 'none',
    color: 'var(--c-text-secondary)',
    fontFamily: 'var(--studio-font-body)',
    cursor: 'pointer',
    textAlign: 'center' as const,
  };
}

function dangerOutlineBtn(): React.CSSProperties {
  return {
    padding: '10px 14px',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 700,
    background: 'rgba(255,107,107,0.06)',
    border: '1px solid rgba(255,107,107,0.35)',
    color: '#ff6b6b',
    fontFamily: 'var(--studio-font-body)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  };
}

function dangerSolidBtn(): React.CSSProperties {
  return {
    padding: '10px 14px',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #ff6b6b, #ee5253)',
    border: '1px solid rgba(255,107,107,0.6)',
    color: '#fff',
    fontFamily: 'var(--studio-font-body)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    boxShadow: '0 2px 8px rgba(238,82,83,0.25)',
  };
}

export function SyncAnimations() {
  return (
    <style>{`
      @keyframes sync-pop-kf {
        0%   { transform: scale(0.6); opacity: 0.4; }
        50%  { transform: scale(1.25); opacity: 1; }
        100% { transform: scale(1);   opacity: 1; }
      }
      @keyframes sync-fade-in {
        from { opacity: 0; transform: translateY(-4px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .sync-icon { display: inline-block; transform-origin: center; }
      .sync-pop  { animation: sync-pop-kf 600ms cubic-bezier(0.34, 1.56, 0.64, 1); }
    `}</style>
  );
}

function inputStyle(accent: { from: string }): React.CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    background: 'rgba(128,128,128,0.08)',
    border: `1px solid rgba(128,128,128,0.15)`,
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--c-text-primary)',
    fontFamily: 'var(--studio-font-body)',
    outline: 'none',
    transition: 'border-color 200ms ease',
    accentColor: accent.from,
  };
}

// ── Avatar picker bottom sheet ───────────────────────────────────────────────

type AvatarPickerSheetProps = {
  accent: { from: string; to: string; mid: string };
  currentIcon: AvatarIcon | null;
  hasGooglePhoto: boolean;
  closing: boolean;
  t: ReturnType<typeof useT>['hub']['accountSection'];
  onPick: (icon: AvatarIcon | null) => void;
  onClose: () => void;
};

function AvatarPickerSheet({
  accent,
  currentIcon,
  hasGooglePhoto,
  closing,
  t,
  onPick,
  onClose,
}: AvatarPickerSheetProps) {
  return (
    <Dialog
      open={true}
      onClose={onClose}
      title={t.avatarPickerTitle}
      footer={
        <Button
          onClick={() => {
            onPick(null);
            onClose();
          }}
          style={{
            width: '100%',
            background: !currentIcon ? 'var(--c-accent-from)22' : 'rgba(128,128,128,0.1)',
            color: !currentIcon ? 'var(--c-accent-from)' : 'var(--c-text-primary)',
            border: !currentIcon ? '1.5px solid var(--c-accent-from)' : '1px solid var(--c-border)',
          }}
        >
          {hasGooglePhoto ? t.avatarUseGooglePhoto : t.avatarUseInitial}
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p
          style={{
            fontFamily: 'Inter',
            fontSize: 13,
            color: 'var(--c-text-secondary)',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {t.avatarPickerSubtitle}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
          }}
        >
          {AVATAR_ICONS.map((icon) => {
            const selected = currentIcon === icon;
            return (
              <button
                key={icon}
                onClick={() => {
                  onPick(icon);
                  onClose();
                }}
                style={{
                  aspectRatio: '1 / 1',
                  borderRadius: 14,
                  border: selected
                    ? '2px solid var(--c-accent-from)'
                    : '1px solid rgba(128,128,128,0.18)',
                  background: selected ? 'var(--c-accent-from)' : 'rgba(128,128,128,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'transform 150ms ease, background 200ms ease',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 30,
                    color: selected ? '#fff' : 'var(--c-text-primary)',
                  }}
                >
                  {icon}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}

// ── Reusable sheet header ────────────────────────────────────────────────────
function SheetHeader({
  title,
  onClose,
  titleColor,
}: {
  title: string;
  onClose: () => void;
  accent?: { from: string; to: string };
  titleColor?: string;
}) {
  return (
    <div
      style={{
        padding: '14px 22px 10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--studio-font-body)',
          fontWeight: 800,
          fontSize: 18,
          color: titleColor ?? 'var(--c-text-primary)',
          margin: 0,
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </p>
      <button
        onClick={onClose}
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--c-text-secondary)',
          transition: 'all 150ms ease',
        }}
        aria-label="close"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
          close
        </span>
      </button>
    </div>
  );
}

// ── Spatial Morph Modal Component for Profile Detail Navigation ──────────────
interface ProfileMorphModalProps {
  id?: string;
  isOpen: boolean;
  title?: string;
  titleColor?: string;
  onClose: () => void;
  originRect?: DOMRect | null;
  children: React.ReactNode;
  isWebDesktop?: boolean;
  isAmoled?: boolean;
  isLight?: boolean;
  maxWidth?: number | string;
}

export function ProfileMorphModal({
  id = 'profile-sheet',
  isOpen,
  title,
  titleColor,
  onClose,
  originRect,
  children,
  isWebDesktop = false,
  isAmoled = false,
  isLight = false,
  maxWidth,
}: ProfileMorphModalProps) {
  const prefersReduced = useAppReducedMotion();

  useEffect(() => {
    if (!isOpen) return;
    const overlayId = id || Math.random().toString();
    activeOverlaysRegistry.register('sheet', overlayId);
    const unregisterBack = BackDispatcher.register('modal', () => {
      onClose();
      return true;
    });

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      activeOverlaysRegistry.unregister('sheet', overlayId);
      unregisterBack();
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, id, onClose]);

  if (typeof document === 'undefined') return null;

  const winW = typeof window !== 'undefined' ? window.innerWidth : 390;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 844;

  let initialX = 0;
  let initialY = isWebDesktop ? 20 : 60;
  let initialScale = isWebDesktop ? 0.95 : 0.92;

  if (originRect && !prefersReduced) {
    const originCenterX = originRect.left + originRect.width / 2;
    const originCenterY = originRect.top + originRect.height / 2;
    const targetCenterX = winW / 2;
    const targetCenterY = isWebDesktop ? winH / 2 : winH * 0.55;

    initialX = Math.round((originCenterX - targetCenterX) * 0.45);
    initialY = Math.round((originCenterY - targetCenterY) * 0.45);
    initialScale = Math.max(0.45, Math.min(0.88, originRect.width / (isWebDesktop ? 540 : winW)));
  }

  const scrimBg = isAmoled
    ? 'rgba(0, 0, 0, 0.88)'
    : isLight
      ? 'rgba(0, 0, 0, 0.42)'
      : 'rgba(0, 0, 0, 0.68)';

  const cardBg = isAmoled
    ? '#000000'
    : isLight
      ? '#ffffff'
      : 'var(--c-background, #141419)';

  const cardBorder = isAmoled
    ? '1px solid rgba(255, 255, 255, 0.14)'
    : isLight
      ? '1px solid rgba(0, 0, 0, 0.08)'
      : '1px solid rgba(255, 255, 255, 0.10)';

  const cardShadow = isAmoled
    ? '0 24px 60px rgba(0, 0, 0, 0.98), 0 4px 16px rgba(0, 0, 0, 0.85)'
    : isLight
      ? '0 24px 60px rgba(0, 0, 0, 0.14), 0 4px 16px rgba(0, 0, 0, 0.06)'
      : '0 24px 60px rgba(0, 0, 0, 0.65), 0 8px 24px rgba(0, 0, 0, 0.35)';

  const resolvedMaxWidth = maxWidth ?? (isWebDesktop ? '540px' : '640px');

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100005,
            display: 'flex',
            alignItems: isWebDesktop ? 'center' : 'flex-end',
            justifyContent: 'center',
          }}
        >
          {/* Backdrop Scrim */}
          <motion.div
            key="profile-modal-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={onClose}
            style={{
              position: 'absolute',
              inset: 0,
              background: scrimBg,
              backdropFilter: isAmoled ? 'none' : 'blur(16px)',
              WebkitBackdropFilter: isAmoled ? 'none' : 'blur(16px)',
            }}
          />

          {/* Morphing Modal Panel */}
          <motion.div
            key="profile-modal-panel"
            initial={
              prefersReduced
                ? { opacity: 0 }
                : {
                    opacity: 0.4,
                    scale: initialScale,
                    x: initialX,
                    y: initialY,
                    borderRadius: 24,
                  }
            }
            animate={{
              opacity: 1,
              scale: 1,
              x: 0,
              y: 0,
              borderRadius: isWebDesktop ? 24 : '24px 24px 0 0',
            }}
            exit={
              prefersReduced
                ? { opacity: 0 }
                : {
                    opacity: 0,
                    scale: initialScale * 0.95,
                    x: initialX * 0.7,
                    y: initialY * 0.7,
                    transition: { duration: 0.2, ease: [0.32, 0, 0.67, 0] },
                  }
            }
            transition={
              prefersReduced
                ? { duration: 0.15 }
                : { type: 'spring', damping: 30, stiffness: 350, mass: 0.8 }
            }
            className="profile-morph-panel"
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: resolvedMaxWidth,
              maxHeight: isWebDesktop ? '88vh' : '92vh',
              background: cardBg,
              border: cardBorder,
              boxShadow: cardShadow,
              backdropFilter: isAmoled ? 'none' : 'blur(20px)',
              WebkitBackdropFilter: isAmoled ? 'none' : 'blur(20px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              zIndex: 1,
              boxSizing: 'border-box',
            }}
          >
            {/* Top Specular Rim */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 16,
                right: 16,
                height: '1px',
                background:
                  'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.22), transparent)',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            />

            {/* Mobile Drag Pill */}
            {!isWebDesktop && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '10px 0 4px',
                  flexShrink: 0,
                  cursor: 'grab',
                }}
                onClick={onClose}
              >
                <div
                  style={{
                    width: 40,
                    height: 4.5,
                    borderRadius: 9999,
                    background: 'rgba(255, 255, 255, 0.22)',
                  }}
                />
              </div>
            )}

            {/* Header */}
            {title && (
              <SheetHeader
                title={title}
                titleColor={titleColor}
                onClose={onClose}
              />
            )}

            {/* Scrollable Content Container */}
            <div
              className="no-scrollbar"
              style={{
                flex: 1,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                paddingBottom: isWebDesktop ? 20 : 'max(28px, env(safe-area-inset-bottom, 24px))',
              }}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function formatLastActive(ms: number, lang: string): string {
  const diff = Date.now() - ms;
  if (diff < 10000) return lang === 'es' ? 'Activo ahora' : 'Active just now';
  const mins = Math.floor(diff / 60000);
  if (mins === 0)
    return lang === 'es' ? 'Activo hace menos de un minuto' : 'Active less than a minute ago';
  if (mins === 1) return lang === 'es' ? 'Activo hace 1 minuto' : 'Active 1 minute ago';
  if (mins < 60)
    return lang === 'es' ? `Activo hace ${mins} minutos` : `Active ${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return lang === 'es' ? 'Activo hace 1 hora' : 'Active 1 hour ago';
  if (hours < 24) return lang === 'es' ? `Activo hace ${hours} horas` : `Active ${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return lang === 'es' ? 'Activo ayer' : 'Active yesterday';
  return lang === 'es' ? `Activo hace ${days} días` : `Active ${days} days ago`;
}

// ── Account Settings Page ────────────────────────────────────────────────────
type AccountActiveSheet =
  | 'none'
  | 'signout'
  | 'disable'
  | 'delete'
  | 'editname'
  | 'password'
  | 'verifyemail'
  | 'personal-info'
  | 'security-login'
  | 'subscription'
  | 'devices-sessions'
  | 'privacy-data';

const EMPTY_ACTIVITY_LOG: any[] = [];

export function AccountDeviceRow({
  device,
  isMe,
  lang,
  userId,
}: {
  device: any;
  isMe: boolean;
  lang: string;
  userId?: string;
}) {
  const [showDetails, setShowDetails] = useState(false);

  let title = device.displayName || device.shortName || device.name;
  if (
    device.classification === 'legacy' ||
    device.isLegacy ||
    device.isStale
  ) {
    if (
      title === 'Unknown Device' ||
      title === 'Chordex App' ||
      title.includes('Chordex')
    ) {
      title =
        device.platform === 'web'
          ? lang === 'es'
            ? 'Sesión web anterior'
            : 'Previous Web session'
          : lang === 'es'
            ? 'Sesión Android anterior'
            : 'Previous Android session';
    } else {
      title = `${lang === 'es' ? 'Sesión anterior' : 'Previous session'} (${title})`;
    }
  }

  let statusText = '';
  if (!device.signedIn) {
    statusText = lang === 'es' ? 'Sesión cerrada' : 'Signed out';
  } else if (isMe) {
    statusText = `● ${lang === 'es' ? 'Sesión activa' : 'Active session'}`;
  } else if (
    device.classification === 'legacy' ||
    device.isLegacy ||
    device.replacedByDeviceId != null
  ) {
    statusText = lang === 'es' ? 'Sesión anterior' : 'Previous session';
  } else if (device.classification === 'activeRemote') {
    statusText = lang === 'es' ? 'Activo ahora' : 'Active now';
  } else if (device.classification === 'recentRemote') {
    statusText = formatLastActive(device.lastActive, lang);
  } else {
    statusText = lang === 'es' ? 'Inactivo' : 'Idle';
  }

  const showVersion =
    device.appVersion && device.appVersion !== 'Unknown';
  const isPlatformWeb =
    device.platform === 'web' || device.buildType === 'Web';
  const showApk =
    !isPlatformWeb &&
    device.apkVersion &&
    device.apkVersion !== 'Unknown';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          background: 'rgba(128,128,128,0.06)',
          borderRadius: 14,
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: isMe
            ? `1px solid color-mix(in srgb, var(--accent-to, #a855f7) 20%, transparent)`
            : '1px solid transparent',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 20,
              color: isMe
                ? 'var(--accent-to, #a855f7)'
                : 'var(--c-text-primary)',
              opacity: isMe ? 1 : 0.7,
            }}
          >
            {device.platform === 'native' || device.platform === 'android'
              ? 'smartphone'
              : 'laptop_mac'}
          </span>
          <div>
            <p
              style={{
                fontFamily: 'var(--studio-font-body)',
                fontWeight: 700,
                fontSize: 13.5,
                color: 'var(--c-text-primary)',
                margin: 0,
              }}
            >
              {title}{' '}
              {isMe &&
                `(${lang === 'es' ? 'Este dispositivo' : 'This device'})`}
            </p>
            <p
              style={{
                fontFamily: 'Inter',
                fontSize: 11,
                color: isMe ? '#10b981' : 'var(--c-text-muted)',
                margin: '2px 0 0',
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <span>{statusText}</span>
              {showVersion && (
                <>
                  <span style={{ opacity: 0.5 }}>•</span>
                  <span>
                    {lang === 'es' ? 'Versión' : 'Version'}:{' '}
                    {device.appVersion}
                  </span>
                </>
              )}
              {isPlatformWeb ? (
                <>
                  <span style={{ opacity: 0.5 }}>•</span>
                  <span>
                    {lang === 'es' ? 'Compilación: Web' : 'Build: Web'}
                  </span>
                </>
              ) : (
                <>
                  {showApk && (
                    <>
                      <span style={{ opacity: 0.5 }}>•</span>
                      <span>APK: {device.apkVersion}</span>
                    </>
                  )}
                  <span style={{ opacity: 0.5 }}>•</span>
                  <span>
                    {lang === 'es'
                      ? 'Compilación: Versión Nativa'
                      : 'Build: Native Release'}
                  </span>
                </>
              )}
              <span style={{ opacity: 0.5 }}>•</span>
              <span
                style={{
                  color:
                    device.syncStatus === 'success' ||
                    device.syncStatus === 'idle'
                      ? '#10b981'
                      : device.syncStatus === 'syncing'
                        ? 'var(--accent-to, #a855f7)'
                        : '#ff6b6b',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}
              >
                {device.syncStatus}
              </span>
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {(device.classification === 'legacy' ||
            device.isLegacy ||
            device.isStale ||
            device.classification === 'signedOut' ||
            device.classification === 'revoked' ||
            device.classification === 'unknown') && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              style={{
                background: 'rgba(128,128,128,0.08)',
                border: 'none',
                color: 'var(--c-text-primary)',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 6,
                fontFamily: 'var(--studio-font-body)',
              }}
            >
              {showDetails
                ? lang === 'es'
                  ? 'Ocultar'
                  : 'Hide'
                : lang === 'es'
                  ? 'Detalles'
                  : 'Details'}
            </button>
          )}
          {!isMe && (
            <button
              onClick={async () => {
                if (
                  confirm(
                    lang === 'es'
                      ? '¿Revocar esta sesión? El dispositivo tendrá que iniciar sesión de nuevo.'
                      : 'Revoke this session? The device will be signed out.'
                  )
                ) {
                  if (userId) {
                    await revokeDeviceSession(userId, device.id);
                  }
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 6,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#ff6b6b',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18 }}
              >
                delete
              </span>
            </button>
          )}
        </div>
      </div>
      {showDetails && (
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(128,128,128,0.03)',
            borderLeft: '2px solid var(--accent-to, #a855f7)',
            fontSize: 11,
            fontFamily: 'Inter',
            color: 'var(--c-text-secondary)',
            marginLeft: 14,
            borderRadius: '0 8px 8px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div>
            <strong>Firestore Doc ID:</strong>{' '}
            <code style={{ wordBreak: 'break-all' }}>{device.id}</code>
          </div>
          <div>
            <strong>Classification:</strong>{' '}
            <code style={{ textTransform: 'capitalize' }}>
              {device.classification || 'unknown'}
            </code>
          </div>
          <div>
            <strong>Reason:</strong>{' '}
            <span>
              {device.classificationReason || 'Stale device session'}
            </span>
          </div>
          <div>
            <strong>Last Active:</strong>{' '}
            <span>
              {device.lastActive
                ? new Date(device.lastActive).toLocaleString()
                : 'Never'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function AccountSettingsPage({
  accent,
  cardStyle,
  onBack,
}: {
  accent: { from: string; to: string; mid: string };
  cardStyle: React.CSSProperties;
  onBack: () => void;
}) {
  const tRoot = useT();
  const canHover = useHoverCapable();
  const prefersReduced = useAppReducedMotion();
  const t = tRoot.hub.accountSection;
  const lang = useSettingsStore((s) => s.settings.language) ?? 'en';
  const favCount = useChordStore((s) => s.favorites?.length ?? 0);
  const progCount = useChordStore((s) => s.progressions?.length ?? 0);
  const presetCount = useChordStore((s) => s.presets?.length ?? 0);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  useEffect(() => subscribeUserProfile(setProfile), []);
  const [avatarIcon, setAvatarIcon] = useState<AvatarIcon | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerClosing, setPickerClosing] = useState(false);
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<AccountActiveSheet>('none');
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [showDbDiag, setShowDbDiag] = useState(false);
  const [showOlderSessions, setShowOlderSessions] = useState(false);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const settingsTheme = useSettingsStore((s) => s.settings.theme);
  const settingsAmoled = useSettingsStore((s) => s.settings.amoledMode);
  const hubAmoled = useSettingsStore((s) => s.settings.perApp?.hub?.amoledMode);
  const isLight =
    settingsTheme === 'light' ||
    (settingsTheme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: light)').matches);
  const isAmoled =
    !isLight &&
    (Boolean(settingsAmoled) ||
      Boolean(hubAmoled) ||
      (typeof document !== 'undefined' &&
        document.documentElement.classList.contains('amoled')));

  useEffect(() => {
    if (!CLOUD_SYNC_FEATURE_ENABLED) {
      setDevices([]);
      return;
    }
    if (!user || sheet !== 'devices-sessions') {
      setDevices([]);
      return;
    }
    void registerCurrentDevice(user.uid, 'open-devices-sheet');
    const unsub = subscribeDevices(user.uid, setDevices);
    return unsub;
  }, [user, sheet]);

  const settings = useSettingsStore(
    useShallow((s) => ({
      syncAcrossDevices: s.settings.syncAcrossDevices,
      privacyAnalytics: s.settings.privacyAnalytics,
      autoBackup: s.settings.autoBackup,
      lastExportDate: s.settings.lastExportDate,
      syncBackendProvider: s.settings.syncBackendProvider,
      backupFrequency: s.settings.backupFrequency,
      privacyCrashReports: s.settings.privacyCrashReports,
      privacyPerfReports: s.settings.privacyPerfReports,
      backupRetention: s.settings.backupRetention,
      autoCleanTemp: s.settings.autoCleanTemp,
      restoreLastSession: s.settings.restoreLastSession,
      activityHistoryEnabled: s.settings.activityHistoryEnabled,
    }))
  );
  const isWebDesktop = useIsWebDesktop();
  const rawActivityLog = useChordStore((s) => s.activityLog);
  const activityLog = rawActivityLog || EMPTY_ACTIVITY_LOG;

  const [localUsage, setLocalUsage] = useState<string>('0 KB');
  const [clearingCache, setClearingCache] = useState(false);

  const [sync, setSync] = useState<SyncStatus>(() => ({
    signedIn: false,
    phase: 'idle',
    syncing: false,
    lastSyncedMs: null,
    error: null,
    showMigrationPrompt: false,
    migrationChoice: null,
  }));
  useEffect(() => subscribeSyncStatus(setSync), []);

  const phase = sync.phase;
  const justSynced = phase === 'success';
  const isSyncing = phase === 'syncing';
  const isError = phase === 'error';

  async function doSyncNow() {
    setBusy(true);
    try {
      await syncNow();
    } finally {
      setBusy(false);
    }
  }

  async function doRetry() {
    setBusy(true);
    try {
      await syncNow();
    } finally {
      setBusy(false);
    }
  }

  const refreshStorageSize = async () => {
    let lsBytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key) ?? '';
          lsBytes += (key.length + val.length) * 2;
        }
      }
    } catch (e) {
      console.warn(e);
    }

    let dbBytes = 0;
    try {
      const { groovexStemRepository } = await import('@workspace/livex-core');
      const sizeInfo = await groovexStemRepository.getCacheSize();
      dbBytes = sizeInfo.totalBytes;
    } catch (e) {
      console.warn(e);
    }

    const totalBytes = lsBytes + dbBytes;
    setLocalUsage(formatBytes(totalBytes));
  };

  useEffect(() => {
    if (sheet === 'privacy-data') {
      refreshStorageSize();
    }
  }, [sheet]);

  function formatBytes(b: number): string {
    if (b === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  async function doExportData() {
    try {
      const backup: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          backup[key] = localStorage.getItem(key) ?? '';
        }
      }

      const content = JSON.stringify(backup, null, 2);
      const now = new Date();
      const dateString = now.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const fileName = `studio_backup_${now.toISOString().split('T')[0]}.json`;

      if (Capacitor.isNativePlatform()) {
        try {
          const { AppInstaller } = await import('@workspace/livex-core');
          await AppInstaller.requestPermissions({ aliases: ['storage'] });
        } catch (e) {
          console.warn('[Export] Permissions request failed:', e);
        }
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const bytes = new TextEncoder().encode(content);
        const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
        const base64 = btoa(binary);

        try {
          await Filesystem.writeFile({
            path: `Download/${fileName}`,
            data: base64,
            directory: Directory.ExternalStorage,
            recursive: true,
          });
          showToast(lang === 'es' ? 'Copia de seguridad guardada' : 'Backup saved successfully');
        } catch {
          try {
            await Filesystem.writeFile({
              path: fileName,
              data: base64,
              directory: Directory.External,
              recursive: true,
            });
            showToast(lang === 'es' ? 'Copia de seguridad guardada' : 'Backup saved successfully');
          } catch {
            showToast(lang === 'es' ? 'Error al guardar archivo' : 'Failed to save export file');
          }
        }
      } else {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast(lang === 'es' ? 'Datos exportados correctamente' : 'Data exported successfully');
      }

      logActivity(
        'backup',
        lang === 'es' ? 'Copia de seguridad manual exportada' : 'Manual backup exported',
        'Studio'
      );
      useSettingsStore.getState().updateSettings({ lastExportDate: dateString });
    } catch (e) {
      console.error(e);
      showToast(lang === 'es' ? 'Error al exportar datos' : 'Export failed');
    }
  }

  async function doClearCache() {
    setClearingCache(true);
    try {
      const { groovexStemRepository } = await import('@workspace/livex-core');
      await groovexStemRepository.clearAllCache();
      showToast(lang === 'es' ? 'Caché de audio eliminada' : 'Audio cache cleared successfully');
      await refreshStorageSize();
    } catch (e) {
      console.error(e);
      showToast(lang === 'es' ? 'Error al borrar caché' : 'Failed to clear cache');
    } finally {
      setClearingCache(false);
    }
  }

  useEffect(() => authRepository.subscribeAuth(setUser), []);
  useEffect(() => {
    const refresh = () => setAvatarIcon(getUserAvatar(user?.uid ?? null));
    refresh();
    return subscribeUserAvatar(refresh);
  }, [user?.uid]);
  useEffect(() => {
    setPhotoFailed(false);
  }, [user?.uid, user?.photoURL]);
  useEffect(() => {
    if (!user?.uid) {
      setCustomPhoto(null);
      return;
    }
    const refresh = () => setCustomPhoto(getUserCover(user?.uid ?? null));
    refresh();
    return subscribeUserCover(({ uid, cover }) => {
      if (uid === user?.uid) {
        setCustomPhoto(cover);
      }
    });
  }, [user?.uid]);

  // Register a back handler to close any active sheets when open
  useBackHandler(
    'sheet',
    () => {
      if (pickerOpen) {
        setPickerClosing(true);
        setTimeout(() => {
          setPickerOpen(false);
          setPickerClosing(false);
        }, 280);
        return true;
      }
      if (sheet !== 'none') {
        closeSheet();
        return true;
      }
      return false;
    },
    [sheet, pickerOpen]
  );

  // When no active sheets/pickers are open, swiping back exits the profile page back to settings tab
  useBackHandler(
    'nested',
    () => {
      if (sheet === 'none' && !pickerOpen) {
        onBack();
        return true;
      }
      return false;
    },
    [sheet, pickerOpen, onBack]
  );

  if (!user || !isFirebaseConfigured) return null;

  const initial = (user.displayName || user.email || '?').trim().charAt(0).toUpperCase();
  const effectivePhoto = customPhoto || (user.photoURL && !photoFailed ? user.photoURL : null);
  const providers = authRepository.getSignInProviders();
  const isEmailUser = providers.includes('password');
  const isGoogleUser = providers.some((p) => p === 'google.com');
  const emailVerified = authRepository.isEmailVerified();
  const emailToConfirm = (user.email ?? '').trim().toLowerCase();

  const L =
    lang === 'es'
      ? {
          profile: 'Perfil',
          displayName: 'Nombre de usuario',
          email: 'Email',
          signInMethod: 'Inicio de sesión',
          google: 'Google',
          emailPass: 'Email',
          emailVerified: 'Email verificado',
          emailNotVerified: 'Email sin verificar',
          security: 'Seguridad',
          changePassword: 'Cambiar contraseña',
          changePasswordDesc: 'Te enviaremos un enlace de restablecimiento',
          verifyEmail: 'Verificar email',
          verifyEmailDesc: 'Te enviaremos un email de verificación',
          session: 'Sesión',
          signOut: t.signOut,
          signOutDesc: 'Cerrar sesión en este dispositivo',
          dangerZone: t.dangerZone,
          disableAccount: 'Deshabilitar cuenta',
          disableAccountDesc: 'Desactiva tu cuenta temporalmente',
          deleteAccount: t.deleteAccount,
          deleteAccountDesc: 'Eliminar permanentemente',
          signOutTitle: t.signOutConfirmTitle,
          signOutBody: t.signOutConfirmBody,
          editNameTitle: 'Editar nombre',
          namePlaceholder: 'Tu nombre',
          saveBtn: 'Guardar',
          passwordTitle: 'Cambiar contraseña',
          passwordBody: (email: string) => `Te enviaremos un enlace a ${email}`,
          sendBtn: 'Enviar enlace',
          verifyTitle: 'Verificar email',
          verifyBody: (email: string) => `Te enviaremos verificación a ${email}`,
          sendVerifyBtn: 'Enviar verificación',
          disableTitle: '¿Deshabilitar cuenta?',
          disableBody:
            'Tu cuenta quedará deshabilitada. Podrás reactivarla al volver a iniciar sesión.',
          disableTypeEmail: 'Escribe tu email para confirmar',
          disableBtn: 'Deshabilitar',
          deleteTitle: t.deleteAccountConfirmTitle,
          deleteBody: t.deleteAccountConfirmBody,
          deleteTypeEmail: t.deleteAccountTypeEmail,
          deleteBtn: t.deleteAccountFinal,
          cancel: t.cancel,
          nameSaved: 'Nombre actualizado',
          passwordResetSent: 'Email de restablecimiento enviado',
          verificationSent: 'Email de verificación enviado',
        }
      : {
          profile: 'Profile',
          displayName: 'Display name',
          email: 'Email',
          signInMethod: 'Sign-in method',
          google: 'Google',
          emailPass: 'Email & password',
          emailVerified: 'Email verified',
          emailNotVerified: 'Email not verified',
          security: 'Security',
          changePassword: 'Change password',
          changePasswordDesc: "We'll send a reset link to your inbox",
          verifyEmail: 'Verify email',
          verifyEmailDesc: "We'll send a verification link",
          session: 'Session',
          signOut: t.signOut,
          signOutDesc: 'Sign out of this device',
          dangerZone: t.dangerZone,
          disableAccount: 'Disable account',
          disableAccountDesc: 'Temporarily deactivate your account',
          deleteAccount: t.deleteAccount,
          deleteAccountDesc: 'Permanently remove your account',
          signOutTitle: t.signOutConfirmTitle,
          signOutBody: t.signOutConfirmBody,
          editNameTitle: 'Edit display name',
          namePlaceholder: 'Your name',
          saveBtn: 'Save',
          passwordTitle: 'Change password',
          passwordBody: (email: string) => `We'll send a reset link to ${email}`,
          sendBtn: 'Send reset link',
          verifyTitle: 'Verify your email',
          verifyBody: (email: string) => `We'll send a verification link to ${email}`,
          sendVerifyBtn: 'Send verification',
          disableTitle: 'Disable account?',
          disableBody: 'Your account will be disabled. You can re-enable it by signing back in.',
          disableTypeEmail: 'Type your email to confirm',
          disableBtn: 'Disable account',
          deleteTitle: t.deleteAccountConfirmTitle,
          deleteBody: t.deleteAccountConfirmBody,
          deleteTypeEmail: t.deleteAccountTypeEmail,
          deleteBtn: t.deleteAccountFinal,
          cancel: t.cancel,
          nameSaved: 'Display name updated',
          passwordResetSent: 'Password reset email sent',
          verificationSent: 'Verification email sent',
        };

  function openSheet(
    s: AccountActiveSheet,
    target?: React.MouseEvent | React.TouchEvent | HTMLElement | DOMRect | null
  ) {
    if (target && 'currentTarget' in target && (target.currentTarget as HTMLElement)?.getBoundingClientRect) {
      setOriginRect((target.currentTarget as HTMLElement).getBoundingClientRect());
    } else if (target && 'getBoundingClientRect' in (target as HTMLElement)) {
      setOriginRect((target as HTMLElement).getBoundingClientRect());
    } else if (target && 'left' in (target as any) && 'top' in (target as any)) {
      setOriginRect(target as DOMRect);
    } else {
      setOriginRect(null);
    }
    setErr(null);
    setEmailInput('');
    setNameInput(user?.displayName ?? '');
    setSheet(s);
  }

  function closeSheet() {
    setSheet('none');
    setEmailInput('');
    setErr(null);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function doSignOut() {
    try {
      await authRepository.signOut();
    } catch {
      /* noop */
    }
  }

  async function doDisable() {
    if (!user || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await userRepository.disableAccount(user.uid);
      closeSheet();
      try {
        await authRepository.signOut();
      } catch {
        /* noop */
      }
    } catch (e) {
      setErr(prettyErr(e, lang));
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (!user || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await userRepository.scheduleAccountDeletion(user.uid);
      closeSheet();
      try {
        await authRepository.signOut();
      } catch {
        /* noop */
      }
    } catch (e) {
      setErr(prettyErr(e, lang));
    } finally {
      setBusy(false);
    }
  }

  async function doSaveName() {
    if (!user || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await authRepository.updateDisplayName(nameInput.trim());
      const { syncWriteProfileMain } = await import('@workspace/livex-core');
      await syncWriteProfileMain(nameInput.trim(), user.photoURL, avatarIcon);
      setUser({ ...user, displayName: nameInput.trim() });
      showToast(L.nameSaved);
      closeSheet();
    } catch (e) {
      setErr(prettyErr(e, lang));
    } finally {
      setBusy(false);
    }
  }

  async function doSendPasswordReset() {
    if (!user?.email || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await authRepository.sendPasswordReset(user.email);
      showToast(L.passwordResetSent);
      closeSheet();
    } catch (e) {
      setErr(prettyErr(e, lang));
    } finally {
      setBusy(false);
    }
  }

  async function doSendVerification() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      await authRepository.sendVerificationEmail();
      showToast(L.verificationSent);
      closeSheet();
    } catch (e) {
      setErr(prettyErr(e, lang));
    } finally {
      setBusy(false);
    }
  }

  async function handlePhotoFile(file: File) {
    if (!user) return;
    if (!file.type.startsWith('image/')) {
      showToast(lang === 'es' ? 'Solo se permiten imágenes' : 'Images only');
      return;
    }
    const MAX_MB = 5;
    if (file.size > MAX_MB * 1024 * 1024) {
      showToast(
        lang === 'es'
          ? `La imagen supera los ${MAX_MB} MB`
          : `Image exceeds ${MAX_MB} MB limit`
      );
      return;
    }

    setBusy(true);
    try {
      const blob = await compressAndResizeImage(file);

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      setUserAvatar(user.uid, null);
      setUserCover(user.uid, dataUrl);
      setCustomPhoto(dataUrl);

      showToast(
        lang === 'es'
          ? 'Foto de perfil actualizada en este dispositivo'
          : 'Profile photo updated on this device'
      );
    } catch (e: any) {
      console.error('[photo update] failed:', e);
      showToast(lang === 'es' ? 'Error al actualizar la foto' : 'Failed to update photo');
    } finally {
      setBusy(false);
    }
  }

  async function clearCustomPhoto() {
    if (!user?.uid) return;
    setBusy(true);
    setErr(null);
    try {
      setUserCover(user.uid, null);
      setCustomPhoto(null);
      showToast(lang === 'es' ? 'Foto de perfil eliminada' : 'Profile photo removed');
    } catch (e: any) {
      console.error('[photo clear] failed:', e);
    } finally {
      setBusy(false);
    }
  }

  const canConfirmEmail =
    !busy && !!emailToConfirm && emailInput.trim().toLowerCase() === emailToConfirm;



  return (
    <>
      <SyncAnimations />
      <SheetAnimations />

      {/* Hidden file input for custom photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handlePhotoFile(file);
          e.target.value = '';
        }}
      />

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 'max(52px, calc(env(safe-area-inset-top) + 12px))',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#10b981',
            color: '#fff',
            padding: '8px 18px',
            borderRadius: 999,
            fontFamily: 'var(--studio-font-body)',
            fontWeight: 700,
            fontSize: 13,
            boxShadow: '0 4px 16px rgba(16,185,129,0.4)',
            zIndex: 10001,
            whiteSpace: 'nowrap',
            animation: 'sync-fade-in 250ms ease both',
            pointerEvents: 'none',
          }}
        >
          {toast}
        </div>
      )}

      {/* ── Profile header ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '12px 0 24px',
          width: '100%',
          animation: 'hub-row-fade 350ms ease both',
          position: 'relative',
          boxSizing: 'border-box',
        }}
      >
        {/* Avatar — tap to open Personal Information */}
        <motion.button
          type="button"
          whileTap={prefersReduced ? undefined : { scale: 0.94 }}
          whileHover={canHover && !prefersReduced ? { scale: 1.03 } : undefined}
          transition={prefersReduced ? { duration: 0 } : SpringPresets.soft}
          onClick={(e) => openSheet('personal-info', e)}
          aria-label="Edit profile"
          style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            padding: 0,
            border: `3px solid rgba(255, 255, 255, 0.22)`,
            cursor: 'pointer',
            background:
              effectivePhoto && !avatarIcon
                ? 'transparent'
                : `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 850,
            fontSize: 38,
            overflow: 'visible',
            boxShadow: `0 10px 36px ${accent.to}55, inset 0 1px 1.5px rgba(255, 255, 255, 0.40)`,
            position: 'relative',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {avatarIcon ? (
              <span className="material-symbols-outlined" style={{ fontSize: 52, color: '#fff' }}>
                {avatarIcon}
              </span>
            ) : effectivePhoto ? (
              <img
                src={effectivePhoto}
                alt=""
                referrerPolicy="no-referrer"
                onError={() => {
                  if (effectivePhoto === user.photoURL) setPhotoFailed(true);
                }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontFamily: 'var(--studio-font-body)' }}>{initial}</span>
            )}
          </div>

          {/* Edit Badge Pod */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--c-surface-container, #1e1e1e)',
              border: '2px solid rgba(255, 255, 255, 0.30)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
              color: '#ffffff',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              edit
            </span>
          </div>
        </motion.button>

        {/* Identity */}
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <p
            style={{
              fontFamily: 'var(--studio-font-body)',
              fontWeight: 850,
              fontSize: 24,
              color: 'var(--c-text-primary)',
              margin: 0,
              letterSpacing: '-0.03em',
            }}
          >
            {user.displayName || user.email}
          </p>
          {user.displayName && (
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 14,
                color: 'var(--c-text-secondary)',
                margin: '4px 0 0',
                fontWeight: 500,
                opacity: 0.85,
              }}
            >
              {user.email}
            </p>
          )}
          {/* Dynamic Role Badge */}
          <div style={{ marginTop: 10 }}>{renderRoleBadge(profile?.role, lang, accent)}</div>
        </div>

        {/* Bento Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 14,
            marginTop: 22,
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* Bento Card 1: Favorites */}
          <motion.div
            whileHover={canHover && !prefersReduced ? { scale: 1.015 } : undefined}
            transition={prefersReduced ? { duration: 0 } : SpringPresets.soft}
            style={{
              background: 'var(--surface-topbar-bg, rgba(255, 255, 255, 0.04))',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 20,
              padding: '18px 18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 104,
              backdropFilter: 'var(--surface-float-blur)',
              WebkitBackdropFilter: 'var(--surface-float-blur)',
              boxShadow:
                '0 8px 24px rgba(0, 0, 0, 0.16), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.30)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(244, 63, 94, 0.25)',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 20, color: '#f43f5e', fontVariationSettings: "'FILL' 1" }}
                >
                  favorite
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--c-text-tertiary, #808080)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {lang === 'es' ? 'Favoritos' : 'Favorites'}
              </span>
            </div>
            <p
              style={{
                fontFamily: 'var(--studio-font-body)',
                fontWeight: 850,
                fontSize: 32,
                color: 'var(--c-text-primary)',
                margin: '14px 0 0',
                lineHeight: 1,
                letterSpacing: '-0.03em',
              }}
            >
              {favCount}
            </p>
          </motion.div>

          {/* Bento Card 2: Progressions */}
          <motion.div
            whileHover={canHover && !prefersReduced ? { scale: 1.015 } : undefined}
            transition={prefersReduced ? { duration: 0 } : SpringPresets.soft}
            style={{
              background: 'var(--surface-topbar-bg, rgba(255, 255, 255, 0.04))',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 20,
              padding: '18px 18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 104,
              backdropFilter: 'var(--surface-float-blur)',
              WebkitBackdropFilter: 'var(--surface-float-blur)',
              boxShadow:
                '0 8px 24px rgba(0, 0, 0, 0.16), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.30)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 20, color: '#10b981', fontVariationSettings: "'FILL' 1" }}
                >
                  queue_music
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--c-text-tertiary, #808080)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {lang === 'es' ? 'Progres.' : 'Progressions'}
              </span>
            </div>
            <p
              style={{
                fontFamily: 'var(--studio-font-body)',
                fontWeight: 850,
                fontSize: 32,
                color: 'var(--c-text-primary)',
                margin: '14px 0 0',
                lineHeight: 1,
                letterSpacing: '-0.03em',
              }}
            >
              {progCount}
            </p>
          </motion.div>

          {/* Bento Card 3: Presets */}
          <motion.div
            whileHover={canHover && !prefersReduced ? { scale: 1.015 } : undefined}
            transition={prefersReduced ? { duration: 0 } : SpringPresets.soft}
            style={{
              background: 'var(--surface-topbar-bg, rgba(255, 255, 255, 0.04))',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 20,
              padding: '18px 18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 104,
              backdropFilter: 'var(--surface-float-blur)',
              WebkitBackdropFilter: 'var(--surface-float-blur)',
              boxShadow:
                '0 8px 24px rgba(0, 0, 0, 0.16), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.30)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 20, color: '#f59e0b', fontVariationSettings: "'FILL' 1" }}
                >
                  grid_view
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--c-text-tertiary, #808080)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {lang === 'es' ? 'Presets' : 'Presets'}
              </span>
            </div>
            <p
              style={{
                fontFamily: 'var(--studio-font-body)',
                fontWeight: 850,
                fontSize: 32,
                color: 'var(--c-text-primary)',
                margin: '14px 0 0',
                lineHeight: 1,
                letterSpacing: '-0.03em',
              }}
            >
              {presetCount}
            </p>
          </motion.div>

          {/* Bento Card 4: Cloud Sync & Backup */}
          <motion.button
            type="button"
            onClick={doSyncNow}
            disabled={busy || !settings.syncAcrossDevices}
            whileTap={busy || !settings.syncAcrossDevices || prefersReduced ? undefined : { scale: 0.96 }}
            whileHover={
              busy || !settings.syncAcrossDevices || !canHover || prefersReduced
                ? undefined
                : { scale: 1.015 }
            }
            transition={prefersReduced ? { duration: 0 } : SpringPresets.soft}
            style={{
              background: 'var(--surface-topbar-bg, rgba(255, 255, 255, 0.04))',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 20,
              padding: '18px 18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 104,
              backdropFilter: 'var(--surface-float-blur)',
              WebkitBackdropFilter: 'var(--surface-float-blur)',
              boxShadow:
                '0 8px 24px rgba(0, 0, 0, 0.16), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
              cursor: settings.syncAcrossDevices ? 'pointer' : 'default',
              position: 'relative',
              overflow: 'hidden',
              textAlign: 'left',
              width: '100%',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: `${
                    sync.phase === 'error'
                      ? '#ff6b6b'
                      : settings.syncAcrossDevices && (justSynced || sync.lastSyncedMs != null)
                        ? '#10b981'
                        : 'var(--c-text-secondary)'
                  }18`,
                  border: `1px solid ${
                    sync.phase === 'error'
                      ? '#ff6b6b'
                      : settings.syncAcrossDevices && (justSynced || sync.lastSyncedMs != null)
                        ? '#10b981'
                        : 'rgba(255, 255, 255, 0.12)'
                  }40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isSyncing ? (
                  <Loader variant="comet" size={20} />
                ) : (
                  <span
                    className={`material-symbols-outlined sync-icon ${justSynced ? 'sync-pop' : ''}`}
                    style={{
                      fontSize: 20,
                      color:
                        sync.phase === 'error'
                          ? '#ff6b6b'
                          : settings.syncAcrossDevices && (justSynced || sync.lastSyncedMs != null)
                            ? '#10b981'
                            : 'var(--c-text-secondary)',
                      transition: 'color 250ms ease',
                    }}
                  >
                    {sync.phase === 'error'
                      ? 'sync_problem'
                      : settings.syncAcrossDevices && (justSynced || sync.lastSyncedMs != null)
                        ? 'check_circle'
                        : 'cloud_off'}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--c-text-tertiary, #808080)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {lang === 'es' ? 'Sincro' : 'Sync'}
              </span>
            </div>
            <div style={{ marginTop: 8 }}>
              <p
                style={{
                  fontFamily: 'var(--studio-font-body)',
                  fontWeight: 800,
                  fontSize: 14,
                  color: 'var(--c-text-primary)',
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {isSyncing
                  ? lang === 'es'
                    ? 'Sincronizando...'
                    : 'Syncing...'
                  : sync.phase === 'error'
                    ? lang === 'es'
                      ? 'Fallo de sincro'
                      : 'Sync failed'
                    : !settings.syncAcrossDevices
                      ? lang === 'es'
                        ? 'Pausada'
                        : 'Paused'
                      : lang === 'es'
                        ? 'Al día'
                        : 'Up to date'}
              </p>
              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 12,
                  color: 'var(--c-text-secondary)',
                  margin: '3px 0 0',
                  lineHeight: 1.2,
                  opacity: 0.8,
                }}
              >
                {sync.lastSyncedMs
                  ? formatRelative(sync.lastSyncedMs, lang)
                  : lang === 'es'
                    ? 'Sin guardar'
                    : 'Not saved'}
              </p>
            </div>
          </motion.button>

          {/* Bento Card 5: Activity Timeline (Spans both columns) */}
          <motion.div
            style={{
              gridColumn: 'span 2',
              background: 'var(--surface-topbar-bg, rgba(255, 255, 255, 0.04))',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 20,
              padding: '20px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              backdropFilter: 'var(--surface-float-blur)',
              WebkitBackdropFilter: 'var(--surface-float-blur)',
              boxShadow:
                '0 8px 24px rgba(0, 0, 0, 0.16), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
              position: 'relative',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 14,
                right: 14,
                height: '1px',
                background: 'var(--surface-glass-rim)',
                pointerEvents: 'none',
                opacity: 0.6,
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--c-text-secondary)',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 20, color: 'var(--c-text-primary)', opacity: 0.8 }}
                >
                  history
                </span>
              </div>
              <p
                style={{
                  fontFamily: 'var(--studio-font-body)',
                  fontWeight: 800,
                  fontSize: 16,
                  color: 'var(--c-text-primary)',
                  margin: 0,
                  letterSpacing: '-0.015em',
                }}
              >
                {lang === 'es' ? 'Actividad Reciente' : 'Recent Activity'}
              </p>
            </div>

            {activityLog && activityLog.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                {activityLog.slice(0, 3).map((event: any) => {
                  const emoji = getActivityEmoji(event.type, event.subtitle);
                  return (
                    <div key={event.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontFamily: 'var(--studio-font-body)',
                            fontWeight: 750,
                            fontSize: 14,
                            color: 'var(--c-text-primary)',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {event.title}
                        </p>
                        {event.subtitle && (
                          <p
                            style={{
                              fontFamily: 'Inter, sans-serif',
                              fontSize: 12.5,
                              color: 'var(--c-text-secondary)',
                              margin: '2px 0 0',
                              opacity: 0.8,
                            }}
                          >
                            {event.subtitle}
                          </p>
                        )}
                      </div>
                      <span
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--c-text-secondary)',
                          whiteSpace: 'nowrap',
                          opacity: 0.6,
                        }}
                      >
                        {formatElapsedTime(event.timestamp, lang)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '12px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <p
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 13,
                    color: 'var(--c-text-secondary)',
                    margin: 0,
                    opacity: 0.7,
                  }}
                >
                  {lang === 'es' ? 'No hay actividad registrada aún' : 'No recorded activity yet'}
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── Main settings list ── */}
      <div style={{ padding: 0, width: '100%', boxSizing: 'border-box' }}>
        {/* Section label */}
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 800,
            fontSize: '12px',
            color: 'var(--c-text-tertiary, #808080)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            margin: '24px 0 10px 4px',
          }}
        >
          {lang === 'es' ? 'Preferencias y cuenta' : 'Preferences & Account'}
        </p>

        {/* Grouped settings card — Liquid Glass Container */}
        <div
          style={{
            background: 'var(--surface-topbar-bg, rgba(255, 255, 255, 0.03))',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 22,
            overflow: 'hidden',
            position: 'relative',
            backdropFilter: 'var(--surface-float-blur)',
            WebkitBackdropFilter: 'var(--surface-float-blur)',
            boxShadow: '0 8px 28px rgba(0, 0, 0, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
          }}
        >
          {/* Top Specular Rim */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 12,
              right: 12,
              height: '1px',
              background: 'var(--surface-glass-rim)',
              pointerEvents: 'none',
              opacity: 0.6,
            }}
          />
          <SettingsRow
            icon="person"
            label={lang === 'es' ? 'Información personal' : 'Personal Information'}
            onPress={(e) => openSheet('personal-info', e)}
          />
          <SettingsRow
            icon="lock"
            label={lang === 'es' ? 'Seguridad y acceso' : 'Security & Login'}
            onPress={(e) => openSheet('security-login', e)}
          />
          <SettingsRow
            icon="workspace_premium"
            label={lang === 'es' ? 'Suscripción y facturación' : 'Subscription & Billing'}
            badge={lang === 'es' ? 'Próximamente' : 'Coming soon'}
            onPress={(e) => openSheet('subscription', e)}
          />
          <SettingsRow
            icon="devices"
            label={lang === 'es' ? 'Dispositivos y sesiones' : 'Devices & Sessions'}
            badge={
              !CLOUD_SYNC_FEATURE_ENABLED
                ? lang === 'es'
                  ? 'Próximamente'
                  : 'Coming soon'
                : undefined
            }
            onPress={(e) => openSheet('devices-sessions', e)}
          />
          <SettingsRow
            icon="shield"
            label={lang === 'es' ? 'Privacidad y datos' : 'Privacy & Data'}
            onPress={(e) => openSheet('privacy-data', e)}
            last
          />
        </div>

        {/* Developer / Account Details Card */}
        {user && (
          <div style={{ marginTop: 26 }}>
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 800,
                fontSize: '12px',
                color: 'var(--c-text-tertiary, #808080)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                margin: '0 0 10px 4px',
              }}
            >
              {lang === 'es' ? 'Detalles de Desarrollador / Cuenta' : 'Developer / Account Details'}
            </p>
            <div
              style={{
                background: 'var(--surface-topbar-bg, rgba(255, 255, 255, 0.03))',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 22,
                padding: '20px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                position: 'relative',
                overflow: 'hidden',
                backdropFilter: 'var(--surface-float-blur)',
                WebkitBackdropFilter: 'var(--surface-float-blur)',
                boxShadow:
                  '0 8px 28px rgba(0, 0, 0, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 12,
                  right: 12,
                  height: '1px',
                  background: 'var(--surface-glass-rim)',
                  pointerEvents: 'none',
                  opacity: 0.6,
                }}
              />
              {/* UID Row */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 11.5,
                    fontWeight: 750,
                    color: 'var(--c-text-tertiary, #808080)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {lang === 'es' ? 'Identificador de Usuario (UID)' : 'User Identifier (UID)'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <code
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 13,
                      color: 'var(--c-text-primary)',
                      background: 'rgba(0, 0, 0, 0.30)',
                      padding: '8px 12px',
                      borderRadius: 10,
                      wordBreak: 'break-all',
                      flex: 1,
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.25)',
                    }}
                  >
                    {user.uid}
                  </code>
                  <motion.button
                    type="button"
                    whileTap={prefersReduced ? undefined : { scale: 0.92 }}
                    whileHover={canHover && !prefersReduced ? { scale: 1.08 } : undefined}
                    transition={prefersReduced ? { duration: 0 } : SpringPresets.soft}
                    onClick={() => {
                      navigator.clipboard.writeText(user.uid);
                      showToast(
                        lang === 'es' ? '¡UID copiado al portapapeles!' : 'UID copied to clipboard!'
                      );
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      cursor: 'pointer',
                      color: accent.from,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                      flexShrink: 0,
                    }}
                    title={lang === 'es' ? 'Copiar UID' : 'Copy UID'}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 19 }}>
                      content_copy
                    </span>
                  </motion.button>
                </div>
              </div>

              {/* Entitlement Role Row */}
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 11.5,
                      fontWeight: 750,
                      color: 'var(--c-text-tertiary, #808080)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {lang === 'es' ? 'Rol y Privilegios' : 'Entitlement Role'}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--studio-font-body)',
                      fontSize: 15,
                      color: 'var(--c-text-primary)',
                      fontWeight: 750,
                    }}
                  >
                    {profile?.role ? profile.role.toUpperCase() : 'FREE'}
                  </span>
                </div>
                {renderRoleBadge(profile?.role, lang, accent)}
              </div>

              {/* Authentication Provider Row */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 11.5,
                    fontWeight: 750,
                    color: 'var(--c-text-tertiary, #808080)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {lang === 'es' ? 'Proveedor de Autenticación' : 'Authentication Provider'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {authRepository.getSignInProviders().some((p) => p === 'google.com') ? (
                    <GoogleIconSVG />
                  ) : (
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 18, color: 'var(--c-text-secondary)', opacity: 0.8 }}
                    >
                      lock
                    </span>
                  )}
                  <span
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 14,
                      color: 'var(--c-text-primary)',
                      fontWeight: 500,
                      textTransform: 'capitalize',
                    }}
                  >
                    {authRepository.getSignInProviders().length > 0
                      ? authRepository
                          .getSignInProviders()
                          .map((p) => p.replace('.com', ''))
                          .join(', ')
                      : 'Email & Password'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sign Out — prominent red glass button */}
        <motion.button
          type="button"
          onClick={(e) => openSheet('signout', e)}
          whileTap={prefersReduced ? undefined : { scale: 0.975 }}
          whileHover={canHover && !prefersReduced ? { scale: 1.01 } : undefined}
          transition={prefersReduced ? { duration: 0 } : SpringPresets.soft}
          style={{
            width: '100%',
            marginTop: 26,
            padding: '16px 0',
            borderRadius: 18,
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: '#ef4444',
            fontFamily: 'var(--studio-font-body)',
            fontWeight: 800,
            fontSize: 15.5,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            boxShadow: '0 4px 16px rgba(239, 68, 68, 0.12)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            logout
          </span>
          {L.signOut}
        </motion.button>
      </div>
      {/* end settings list */}

      {/* Avatar picker */}
      {pickerOpen &&
        createPortal(
          <AvatarPickerSheet
            accent={accent}
            currentIcon={avatarIcon}
            hasGooglePhoto={!!user.photoURL && !photoFailed}
            t={t}
            closing={pickerClosing}
            onPick={(icon) => {
              selectAvatarIcon(user, icon);
            }}
            onClose={() => {
              setPickerClosing(true);
              setTimeout(() => {
                setPickerOpen(false);
                setPickerClosing(false);
              }, 280);
            }}
          />,
          document.body
        )}

      {/* ── Sign out sheet ── */}
      <ProfileMorphModal
        id="profile-sheet-signout"
        isOpen={sheet === 'signout'}
        title={L.signOutTitle}
        onClose={closeSheet}
        originRect={originRect}
        isWebDesktop={isWebDesktop}
        isAmoled={isAmoled}
        isLight={isLight}
        maxWidth="460px"
      >
        <p
          style={{
            fontFamily: 'Inter',
            fontSize: 14,
            color: 'var(--c-text-secondary)',
            lineHeight: 1.5,
            margin: '12px 22px 20px',
          }}
        >
          {L.signOutBody}
        </p>
        <div style={{ display: 'flex', gap: 10, padding: '0 16px' }}>
          <button
            onClick={closeSheet}
            style={{ ...secondaryBtn(), flex: 1, padding: '13px 0' }}
          >
            {L.cancel}
          </button>
          <button
            onClick={doSignOut}
            style={{ ...dangerOutlineBtn(), flex: 1, padding: '13px 0' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              logout
            </span>
            {L.signOut}
          </button>
        </div>
      </ProfileMorphModal>

      {/* ── Edit display name sheet ── */}
      <ProfileMorphModal
        id="profile-sheet-editname"
        isOpen={sheet === 'editname'}
        title={L.editNameTitle}
        onClose={closeSheet}
        originRect={originRect}
        isWebDesktop={isWebDesktop}
        isAmoled={isAmoled}
        isLight={isLight}
        maxWidth="460px"
      >
        <div
          style={{
            padding: '12px 22px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') doSaveName();
            }}
            placeholder={L.namePlaceholder}
            autoFocus
            style={inputStyle(accent)}
          />
          {err && <p style={{ fontSize: 11, color: '#ff6b6b', margin: 0 }}>{err}</p>}
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '0 16px' }}>
          <button
            onClick={closeSheet}
            disabled={busy}
            style={{ ...secondaryBtn(), flex: 1, padding: '13px 0' }}
          >
            {L.cancel}
          </button>
          <button
            onClick={doSaveName}
            disabled={busy}
            style={{ ...primaryBtn(accent), flex: 1, padding: '13px 0' }}
          >
            {busy ? (
              <AppSpinner size={16} />
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                check
              </span>
            )}
            {L.saveBtn}
          </button>
        </div>
      </ProfileMorphModal>

      {/* ── Change password sheet ── */}
      <ProfileMorphModal
        id="profile-sheet-password"
        isOpen={sheet === 'password'}
        title={L.passwordTitle}
        onClose={closeSheet}
        originRect={originRect}
        isWebDesktop={isWebDesktop}
        isAmoled={isAmoled}
        isLight={isLight}
        maxWidth="460px"
      >
        <div style={{ padding: '12px 22px 20px' }}>
          <p
            style={{
              fontFamily: 'Inter',
              fontSize: 14,
              color: 'var(--c-text-secondary)',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {L.passwordBody(user.email ?? '')}
          </p>
          {err && <p style={{ fontSize: 11, color: '#ff6b6b', margin: '10px 0 0' }}>{err}</p>}
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '0 16px' }}>
          <button
            onClick={closeSheet}
            disabled={busy}
            style={{ ...secondaryBtn(), flex: 1, padding: '13px 0' }}
          >
            {L.cancel}
          </button>
          <button
            onClick={doSendPasswordReset}
            disabled={busy}
            style={{ ...primaryBtn(accent), flex: 1, padding: '13px 0' }}
          >
            {busy ? (
              <AppSpinner size={16} />
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                send
              </span>
            )}
            {L.sendBtn}
          </button>
        </div>
      </ProfileMorphModal>

      {/* ── Verify email sheet ── */}
      <ProfileMorphModal
        id="profile-sheet-verifyemail"
        isOpen={sheet === 'verifyemail'}
        title={L.verifyTitle}
        onClose={closeSheet}
        originRect={originRect}
        isWebDesktop={isWebDesktop}
        isAmoled={isAmoled}
        isLight={isLight}
        maxWidth="460px"
      >
        <div style={{ padding: '12px 22px 20px' }}>
          <p
            style={{
              fontFamily: 'Inter',
              fontSize: 14,
              color: 'var(--c-text-secondary)',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {L.verifyBody(user.email ?? '')}
          </p>
          {err && <p style={{ fontSize: 11, color: '#ff6b6b', margin: '10px 0 0' }}>{err}</p>}
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '0 16px' }}>
          <button
            onClick={closeSheet}
            disabled={busy}
            style={{ ...secondaryBtn(), flex: 1, padding: '13px 0' }}
          >
            {L.cancel}
          </button>
          <button
            onClick={doSendVerification}
            disabled={busy}
            style={{ ...primaryBtn(accent), flex: 1, padding: '13px 0' }}
          >
            {busy ? (
              <AppSpinner size={16} />
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                mark_email_read
              </span>
            )}
            {L.sendVerifyBtn}
          </button>
        </div>
      </ProfileMorphModal>

      {/* ── Disable account sheet ── */}
      <ProfileMorphModal
        id="profile-sheet-disable"
        isOpen={sheet === 'disable'}
        title={L.disableTitle}
        titleColor="#f59e0b"
        onClose={closeSheet}
        originRect={originRect}
        isWebDesktop={isWebDesktop}
        isAmoled={isAmoled}
        isLight={isLight}
        maxWidth="460px"
      >
        <div
          style={{
            padding: '12px 22px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <p
            style={{
              fontFamily: 'Inter',
              fontSize: 14,
              color: 'var(--c-text-secondary)',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {L.disableBody}
          </p>
          <p
            style={{
              fontFamily: 'Inter',
              fontSize: 12.5,
              color: 'var(--c-text-secondary)',
              margin: 0,
            }}
          >
            {L.disableTypeEmail}:{' '}
            <strong style={{ color: 'var(--c-text-primary)' }}>{user.email}</strong>
          </p>
          <input
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder={user.email ?? ''}
            autoComplete="off"
            spellCheck={false}
            style={{
              ...inputStyle(accent),
              borderColor: canConfirmEmail ? '#f59e0b66' : 'rgba(245,158,11,0.2)',
            }}
          />
          {err && <p style={{ fontSize: 11, color: '#ff6b6b', margin: 0 }}>{err}</p>}
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '0 16px' }}>
          <button
            onClick={closeSheet}
            disabled={busy}
            style={{ ...secondaryBtn(), flex: 1, padding: '13px 0' }}
          >
            {L.cancel}
          </button>
          <button
            onClick={doDisable}
            disabled={!canConfirmEmail}
            style={{
              flex: 1,
              padding: '13px 0',
              borderRadius: 12,
              fontSize: 13.5,
              fontWeight: 700,
              background: canConfirmEmail
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.35)',
              color: canConfirmEmail ? '#fff' : '#f59e0b',
              fontFamily: 'var(--studio-font-body)',
              cursor: canConfirmEmail ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              opacity: canConfirmEmail ? 1 : 0.5,
            }}
          >
            {busy ? (
              <AppSpinner size={16} />
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                block
              </span>
            )}
            {L.disableBtn}
          </button>
        </div>
      </ProfileMorphModal>

      {/* ── Delete account sheet ── */}
      <ProfileMorphModal
        id="profile-sheet-delete"
        isOpen={sheet === 'delete'}
        title={L.deleteTitle}
        titleColor="#ff6b6b"
        onClose={closeSheet}
        originRect={originRect}
        isWebDesktop={isWebDesktop}
        isAmoled={isAmoled}
        isLight={isLight}
        maxWidth="460px"
      >
        <div
          style={{
            padding: '12px 22px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <p
            style={{
              fontFamily: 'Inter',
              fontSize: 14,
              color: 'var(--c-text-secondary)',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {L.deleteBody}
          </p>
          <p
            style={{
              fontFamily: 'Inter',
              fontSize: 12.5,
              color: 'var(--c-text-secondary)',
              margin: 0,
            }}
          >
            {L.deleteTypeEmail}:{' '}
            <strong style={{ color: 'var(--c-text-primary)' }}>{user.email}</strong>
          </p>
          <input
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder={user.email ?? ''}
            autoComplete="off"
            spellCheck={false}
            style={{
              ...inputStyle(accent),
              borderColor: canConfirmEmail ? '#ff6b6b66' : 'rgba(255,107,107,0.2)',
            }}
          />
          {err && <p style={{ fontSize: 11, color: '#ff6b6b', margin: 0 }}>{err}</p>}
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '0 16px' }}>
          <button
            onClick={closeSheet}
            disabled={busy}
            style={{ ...secondaryBtn(), flex: 1, padding: '13px 0' }}
          >
            {L.cancel}
          </button>
          <button
            onClick={doDelete}
            disabled={!canConfirmEmail}
            style={{
              ...dangerSolidBtn(),
              flex: 1,
              padding: '13px 0',
              opacity: canConfirmEmail ? 1 : 0.45,
              cursor: canConfirmEmail ? 'pointer' : 'not-allowed',
            }}
          >
            {busy ? (
              <AppSpinner size={16} />
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                delete_forever
              </span>
            )}
            {L.deleteBtn}
          </button>
        </div>
      </ProfileMorphModal>

            {/* ── Personal Information sheet ── */}
      <PersonalInformationSheet
        sheet={sheet}
        lang={lang}
        closeSheet={closeSheet}
        originRect={originRect}
        isWebDesktop={isWebDesktop}
        isAmoled={isAmoled}
        isLight={isLight}
        effectivePhoto={effectivePhoto}
        avatarIcon={avatarIcon}
        accent={accent}
        initial={initial}
        fileInputRef={fileInputRef}
        setPickerClosing={setPickerClosing}
        setPickerOpen={setPickerOpen}
        customPhoto={customPhoto}
        clearCustomPhoto={clearCustomPhoto}
        selectAvatarIcon={selectAvatarIcon}
        user={user}
        openSheet={openSheet}
        emailVerified={emailVerified}
      />

      {/* ── Security & Login sheet ── */}
      <SecurityLoginSheet
        sheet={sheet}
        lang={lang}
        closeSheet={closeSheet}
        originRect={originRect}
        isWebDesktop={isWebDesktop}
        isAmoled={isAmoled}
        isLight={isLight}
        isGoogleUser={isGoogleUser}
        user={user}
        emailVerified={emailVerified}
        isEmailUser={isEmailUser}
        openSheet={openSheet}
        accent={accent}
        L={L}
      />

      {/* ── Subscription & Billing sheet ── */}
      <SubscriptionBillingSheet
        sheet={sheet}
        lang={lang}
        closeSheet={closeSheet}
        originRect={originRect}
        isWebDesktop={isWebDesktop}
        isAmoled={isAmoled}
        isLight={isLight}
        accent={accent}
        profile={profile}
        user={user}
        showToast={showToast}
      />

      {/* ── Devices & Sessions sheet ── */}
      <DevicesSessionsSheet
        sheet={sheet}
        lang={lang}
        closeSheet={closeSheet}
        originRect={originRect}
        isWebDesktop={isWebDesktop}
        isAmoled={isAmoled}
        isLight={isLight}
        user={user}
        accent={accent}
        devices={devices}
        sync={sync as any}
        showToast={showToast}
        showOlderSessions={showOlderSessions}
        setShowOlderSessions={setShowOlderSessions}
        showDbDiag={showDbDiag}
        setShowDbDiag={setShowDbDiag}
      />

      {/* ── Privacy & Data sheet ── */}
      <PrivacyDataSheet
        sheet={sheet}
        lang={lang}
        closeSheet={closeSheet}
        originRect={originRect}
        isWebDesktop={isWebDesktop}
        isAmoled={isAmoled}
        isLight={isLight}
        accent={accent}
        user={user}
        isGoogleUser={isGoogleUser}
        localUsage={localUsage}
        settings={settings}
        doExportData={doExportData}
        clearingCache={clearingCache}
        doClearCache={doClearCache}
        settingsController={settingsController}
        showToast={showToast}
      />



      {sync.showMigrationPrompt &&
        createPortal(
          <MigrationPromptSheet
            accent={accent}
            lang={lang}
            onClose={(choice) => resolveMigration(choice)}
          />,
          document.body
        )}
    </>
  );
}

interface MigrationPromptSheetProps {
  accent: { from: string; to: string; mid: string };
  lang: string;
  onClose: (choice: 'merge' | 'upload' | 'download' | 'notNow') => void;
}

export function MigrationPromptSheet({ accent, lang, onClose }: MigrationPromptSheetProps) {
  const isEs = lang === 'es';

  return (
    <Dialog
      open={true}
      onClose={() => onClose('notNow')}
      title={isEs ? '¿Sincronizar tus datos de Studio?' : 'Sync your existing Studio data?'}
      footer={
        <Button onClick={() => onClose('notNow')} style={{ width: '100%' }}>
          {isEs ? 'Ahora no' : 'Not now'}
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: `var(--c-accent-from)22`,
              border: `1px solid var(--c-accent-from)44`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--c-accent-from)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
              cloud_sync
            </span>
          </div>
          <p
            style={{
              fontFamily: 'Inter',
              fontSize: 13,
              color: 'var(--c-text-secondary)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {isEs
              ? 'Studio ha encontrado datos guardados localmente en este dispositivo. Puedes subirlos a tu cuenta y sincronizarlos entre todos tus dispositivos.'
              : 'Studio found data stored locally on this device. You can back it up to your account and sync it across devices.'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Merge option (Recommended) */}
          <button
            onClick={() => onClose('merge')}
            style={{
              padding: '12px 16px',
              borderRadius: 14,
              background: `var(--c-accent-from)`,
              border: 'none',
              color: '#fff',
              fontFamily: 'var(--studio-font-body)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>
                {isEs ? 'Combinar datos locales y de la nube' : 'Merge local and cloud data'}
              </span>
              <span
                style={{
                  fontSize: 9,
                  background: 'rgba(255,255,255,0.2)',
                  padding: '2px 6px',
                  borderRadius: 99,
                  fontWeight: 800,
                }}
              >
                {isEs ? 'RECOMENDADO' : 'RECOMMENDED'}
              </span>
            </span>
            <span style={{ fontSize: 11, opacity: 0.8, fontWeight: 400 }}>
              {isEs
                ? 'Combina ambos de forma segura sin perder nada.'
                : 'Safely combines both without losing anything.'}
            </span>
          </button>

          {/* Download option */}
          <button
            onClick={() => onClose('download')}
            style={{
              padding: '12px 16px',
              borderRadius: 14,
              background: 'rgba(128,128,128,0.06)',
              border: '1px solid rgba(128,128,128,0.1)',
              color: 'var(--c-text-primary)',
              fontFamily: 'var(--studio-font-body)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <span>{isEs ? 'Descargar datos de la nube' : 'Download cloud data'}</span>
            <span style={{ fontSize: 11, color: 'var(--c-text-secondary)', fontWeight: 400 }}>
              {isEs
                ? 'Descarga el estado de la nube (sobrescribirá los datos locales).'
                : 'Downloads cloud state (overwrites local data).'}
            </span>
          </button>

          {/* Backup & Upload option */}
          <button
            onClick={() => onClose('upload')}
            style={{
              padding: '12px 16px',
              borderRadius: 14,
              background: 'rgba(128,128,128,0.06)',
              border: '1px solid rgba(128,128,128,0.1)',
              color: 'var(--c-text-primary)',
              fontFamily: 'var(--studio-font-body)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <span>
              {isEs ? 'Subir y sincronizar este dispositivo' : 'Back up and sync this device'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--c-text-secondary)', fontWeight: 400 }}>
              {isEs
                ? 'Sube datos locales a la nube (sobrescribirá los datos de la nube).'
                : 'Uploads local data to your cloud account (overwrites cloud).'}
            </span>
          </button>
        </div>
      </div>
    </Dialog>
  );
}

export function SettingRowUI({
  label,
  desc,
  children,
}: {
  label: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: '1px solid rgba(128,128,128,0.07)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
        <p
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: 'var(--c-text-primary)',
            fontFamily: 'var(--studio-font-body)',
            margin: 0,
          }}
        >
          {label}
        </p>
        {desc && (
          <p
            style={{
              fontSize: 11,
              marginTop: 2,
              lineHeight: 1.3,
              color: 'var(--c-text-secondary)',
              fontFamily: 'Inter',
              margin: '2px 0 0',
            }}
          >
            {desc}
          </p>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function SelectControl<T extends string>({
  value,
  options,
  onChange,
  accent,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  accent: { from: string; to: string };
}) {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          background: 'rgba(128,128,128,0.12)',
          border: '1px solid rgba(128,128,128,0.18)',
          borderRadius: '8px',
          padding: '6px 32px 6px 12px',
          fontSize: '13px',
          fontFamily: 'var(--studio-font-body)',
          fontWeight: 700,
          color: 'var(--c-text-primary)',
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            style={{ background: 'var(--c-background)', color: 'var(--c-text-primary)' }}
          >
            {opt.label}
          </option>
        ))}
      </select>
      <div
        style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--c-text-secondary)',
          pointerEvents: 'none',
          opacity: 0.7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ChevronDownIconSVG />
      </div>
    </div>
  );
}

function formatElapsedTime(timestamp: number, lang: string): string {
  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return lang === 'es' ? 'ahora mismo' : 'just now';

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return lang === 'es' ? 'hace un momento' : 'just now';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return lang === 'es' ? `hace ${diffMin} min` : `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return lang === 'es' ? `hace ${diffHr} h` : `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return lang === 'es' ? 'ayer' : 'yesterday';
  return lang === 'es' ? `hace ${diffDay} d` : `${diffDay}d ago`;
}

function SheetAnimations() {
  return (
    <style>{`
      @keyframes sheet-up {
        from { transform: translateY(100%); }
        to   { transform: translateY(0); }
      }
      @keyframes sheet-down {
        from { transform: translateY(0); }
        to   { transform: translateY(100%); }
      }
      @keyframes fade-out {
        from { opacity: 1; }
        to   { opacity: 0; }
      }
      @keyframes modal-scale-in {
        from { transform: scale(0.95); opacity: 0; }
        to   { transform: scale(1); opacity: 1; }
      }
      @keyframes modal-scale-out {
        from { transform: scale(1); opacity: 1; }
        to   { transform: scale(0.95); opacity: 0; }
      }
    `}</style>
  );
}
