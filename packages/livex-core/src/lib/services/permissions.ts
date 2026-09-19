import { adminUIDs } from './adminConfig';

export type UserRole = 'free' | 'core' | 'pro' | 'beta_tester' | 'admin';

export interface UserProfile {
  uid: string;
  email: string | null;
  role: UserRole;
  plan: string;
  subscriptionStatus: 'active' | 'inactive' | 'past_due' | 'cancelled';
  subscriptionId?: string;
  currentPeriodEnd?: string;
}

export type FeatureKey =
  | 'generate_progression'  // Core/Pro
  | 'ultra_drum_kits'       // Pro only
  | 'drum_effects_plugins'  // Pro only
  | 'multitrack_mixing'     // Pro only
  | 'vocal_pitch_monitor'   // Pro only
  | 'advanced_stage_plots'  // Core/Pro
  | 'beta_experimental'     // Beta_tester
  | 'future_unreleased';    // Admin only

let currentProfile: UserProfile | null = null;
let profileListeners: Array<(profile: UserProfile | null) => void> = [];

/**
 * Subscribes to changes in the active user's secure profile.
 * Immediatly emits the current profile value on registration.
 */
export function subscribeUserProfile(cb: (profile: UserProfile | null) => void): () => void {
  profileListeners.push(cb);
  cb(currentProfile);
  
  return () => {
    profileListeners = profileListeners.filter(l => l !== cb);
  };
}

function notifyProfileChange(p: UserProfile | null) {
  currentProfile = p;
  profileListeners.forEach(l => l(p));
}

/**
 * Synchronously handles Firebase Auth state changes.
 * Resolves the user profile and permissions (free tier by default, or admin if in adminUIDs).
 */
export function syncProfileListener(authUser: { uid: string; email: string | null } | null) {
  if (!authUser) {
    notifyProfileChange(null);
    return;
  }

  const isAdminBypass = adminUIDs.includes(authUser.uid);
  const defaultProfile: UserProfile = {
    uid: authUser.uid,
    email: authUser.email,
    role: isAdminBypass ? 'admin' : 'free',
    plan: isAdminBypass ? 'admin' : 'free',
    subscriptionStatus: isAdminBypass ? 'active' : 'inactive',
  };
  notifyProfileChange(defaultProfile);
}

/* ─── Permission Helpers ─── */

export function isAdminUser(): boolean {
  if (!currentProfile) return false;
  return adminUIDs.includes(currentProfile.uid) || currentProfile.role === 'admin';
}

export function isBetaTesterUser(): boolean {
  if (!currentProfile) return false;
  if (isAdminUser()) return true;
  return currentProfile.role === 'beta_tester';
}

export function hasCoreAccessUser(): boolean {
  if (!currentProfile) return false;
  if (isAdminUser()) return true;
  const active = currentProfile.subscriptionStatus === 'active' || currentProfile.subscriptionStatus === 'past_due';
  return active && (currentProfile.role === 'core' || currentProfile.role === 'pro');
}

export function hasProAccessUser(): boolean {
  if (!currentProfile) return false;
  if (isAdminUser()) return true;
  const active = currentProfile.subscriptionStatus === 'active' || currentProfile.subscriptionStatus === 'past_due';
  return active && currentProfile.role === 'pro';
}

/**
 * Comprehensive feature access validation.
 * Supports complete role cascading and payment checks.
 */
export function canUseFeature(featureKey: FeatureKey): boolean {
  if (!currentProfile) return false;
  
  const { uid, role, subscriptionStatus } = currentProfile;
  
  // 1. Admin/UID-list absolute bypass
  if (uid && adminUIDs.includes(uid)) return true;
  if (role === 'admin') return true;
  
  // 2. Validate dynamic status (active or past_due grace period are permitted)
  const isPremiumValid = subscriptionStatus === 'active' || subscriptionStatus === 'past_due';
  
  // 3. Evaluate cascading roles
  switch (featureKey) {
    case 'generate_progression':
    case 'advanced_stage_plots':
      // Core and Pro have access
      return isPremiumValid && (role === 'core' || role === 'pro');
      
    case 'ultra_drum_kits':
    case 'drum_effects_plugins':
    case 'multitrack_mixing':
    case 'vocal_pitch_monitor':
      // Pro only has access
      return isPremiumValid && role === 'pro';
      
    case 'beta_experimental':
      // Beta testers and Pro users (for beta feedback) have access
      return role === 'beta_tester' || (isPremiumValid && role === 'pro');
      
    case 'future_unreleased':
      // Absolute restriction to Admins
      return false;
      
    default:
      return false;
  }
}
