import React, { Suspense, lazy } from 'react';
import { type AuthUser } from '@workspace/livex-core';
import { ProfileMorphModal } from './authUiPrims';

const StudioPricingSection = lazy(() => import('../StudioPricingSection'));

export interface SubscriptionBillingSheetProps {
  sheet: string | null;
  lang: string;
  closeSheet: () => void;
  originRect: DOMRect | null;
  isWebDesktop: boolean;
  isAmoled: boolean;
  isLight: boolean;
  accent: { from: string; to: string; mid: string; border?: string; bg?: string };
  profile: any;
  user: AuthUser;
  showToast: (msg: string) => void;
}

export function SubscriptionBillingSheet({
  sheet,
  lang,
  closeSheet,
  originRect,
  isWebDesktop,
  isAmoled,
  isLight,
  accent,
  profile,
  user,
  showToast,
}: SubscriptionBillingSheetProps) {
  return (
    <ProfileMorphModal
      id="profile-sheet-subscription"
      isOpen={sheet === 'subscription'}
      title={lang === 'es' ? 'Suscripción y facturación' : 'Subscription & Billing'}
      onClose={closeSheet}
      originRect={originRect}
      isWebDesktop={isWebDesktop}
      isAmoled={isAmoled}
      isLight={isLight}
      maxWidth={isWebDesktop ? '850px' : '640px'}
    >
      <div
        style={{
          padding: '16px 22px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          width: '100%',
          boxSizing: 'border-box',
        }}
        className="no-scrollbar animate-fade-in"
      >
        <Suspense fallback={null}>
          <StudioPricingSection
            accent={accent}
            lang={lang}
            profile={profile}
            user={user}
            onShowToast={showToast}
            isAmoled={isAmoled}
            isLight={isLight}
          />
        </Suspense>
      </div>
    </ProfileMorphModal>
  );
}
