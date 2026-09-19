import { UserProfile, AuthUser, useSettingsStore } from '@workspace/livex-core';
import React from 'react';
import { Button } from '../../../shared/design-system/buttons';
import {
  Circle,
  Layers3,
  BadgeCheck,
  ShieldCheck,
  CheckCircle,
  Info,
  Calendar,
  CreditCard,
  Clock,
  Sparkles,
} from 'lucide-react';

function formatPeriodEnd(dateStr?: string, isEs?: boolean): string {
  if (!dateStr) return isEs ? 'Renovación automática' : 'Renews automatically';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(isEs ? 'es-ES' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getEntitlementChips(role: string, isEs: boolean): string[] {
  if (role === 'admin') {
    return isEs
      ? ['Acceso Total', 'Diagnósticos Activos', 'Omisión Ilimitada', 'Motor de Audio Full']
      : ['Full Bypass', 'Active Diagnostics', 'Unlimited Engine', 'All Audio Modules'];
  }
  if (role === 'pro') {
    return isEs
      ? ['Audio Multipista', 'Ultra Drum Kits', 'Monitor Vocal', 'Herramientas Beta', 'Cloud Sync']
      : ['Multitrack Audio', 'Ultra Drum Kits', 'Vocal Pitch Monitor', 'Beta Tools', 'Cloud Sync'];
  }
  if (role === 'core') {
    return isEs
      ? ['Generador de Progresiones', 'Almacenamiento Cloud', 'Stage Plots Pro', 'Actualizaciones Prioritarias']
      : ['Progression Generator', 'Cloud Storage', 'Advanced Stage Plots', 'Priority Updates'];
  }
  return isEs
    ? ['5 Sub-Apps', 'Proyectos Locales', 'Exportación MIDI y PDF', 'Comunidad Livex']
    : ['5 Sub-Apps', 'Local Projects', 'Standard MIDI & PDF', 'Community Updates'];
}

interface PricingPlan {
  id: string;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs: string;
  price: string;
  priceEs: string;
  features: string[];
  featuresEs: string[];
  isRecommended: boolean;
}

const PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    nameEs: 'Gratis',
    description: 'Perfect for getting started with standard musical creation.',
    descriptionEs: 'Perfecto para comenzar con la creación musical estándar.',
    price: '$0',
    priceEs: '$0',
    features: [
      'Basic access to all sub-apps',
      'Local projects and history',
      'Standard MIDI and PDF exports',
      'Community features and updates',
    ],
    featuresEs: [
      'Acceso básico a todas las sub-apps',
      'Proyectos locales e historial',
      'Exportaciones estándar de MIDI y PDF',
      'Funciones y actualizaciones de la comunidad',
    ],
    isRecommended: false,
  },
  {
    id: 'core',
    name: 'Core',
    nameEs: 'Core',
    description: 'Unlock advanced features and priority processing for your setlist.',
    descriptionEs: 'Desbloquea funciones avanzadas y procesamiento prioritario para tu setlist.',
    price: '$9',
    priceEs: '$9',
    features: [
      'Expanded project cloud storage',
      'Advanced chord and progression tools',
      'Priority Updater update channel access',
      'Unlimited high-fidelity exports',
    ],
    featuresEs: [
      'Almacenamiento en la nube ampliado',
      'Herramientas avanzadas de acordes',
      'Acceso prioritario a actualizaciones',
      'Exportaciones ilimitadas en alta fidelidad',
    ],
    isRecommended: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    nameEs: 'Pro',
    description: 'The ultimate production suite for professional artists.',
    descriptionEs: 'La suite de producción definitiva para artistas profesionales.',
    price: '$19',
    priceEs: '$19',
    features: [
      'Full Studio production toolkit',
      'Advanced multi-track audio exports',
      'Premium sounds, samples and themes',
      'Early access to experimental tools',
    ],
    featuresEs: [
      'Suite de producción Studio completa',
      'Exportación de audio multipista',
      'Sonidos, samples y temas premium',
      'Acceso anticipado a herramientas nuevas',
    ],
    isRecommended: false,
  },
];

interface Props {
  accent: {
    from: string;
    to: string;
    mid: string;
  };
  lang?: 'en' | 'es' | string;
  profile?: UserProfile | null;
  user?: AuthUser | null;
  onShowToast?: (msg: string) => void;
  isAmoled?: boolean;
  isLight?: boolean;
}

function LivexPricingSectionBase({
  accent,
  lang = 'en',
  profile,
  user,
  onShowToast,
  isAmoled,
  isLight,
}: Props) {
  const isEs = lang === 'es';

  const settingsTheme = useSettingsStore((s) => s.settings?.theme);
  const settingsAmoled = useSettingsStore((s) => s.settings?.amoledMode);
  const hubAmoled = useSettingsStore((s) => s.settings?.perApp?.hub?.amoledMode);
  const resolvedLight =
    isLight ??
    (settingsTheme === 'light' ||
      (settingsTheme === 'system' &&
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: light)').matches));
  const resolvedAmoled =
    isAmoled ??
    (!resolvedLight &&
      (Boolean(settingsAmoled) ||
        Boolean(hubAmoled) ||
        (typeof document !== 'undefined' &&
          document.documentElement?.classList?.contains('amoled'))));

  const role = profile?.role ?? 'free';
  const rawStatus = profile?.subscriptionStatus ?? 'inactive';
  const isPremiumValid = rawStatus === 'active' || rawStatus === 'past_due';
  const isAdmin = role === 'admin';

  // ── Plan Status Resolver ──
  const getPlanStatus = (
    planId: string
  ): 'active' | 'admin_bypass' | 'included' | 'downgraded' | 'available' => {
    if (isAdmin) return 'admin_bypass';

    if (planId === 'free') {
      return role === 'free' || !isPremiumValid ? 'active' : 'downgraded';
    }

    if (planId === 'core') {
      return isPremiumValid && role === 'core'
        ? 'active'
        : isPremiumValid && role === 'pro'
          ? 'included'
          : 'available';
    }

    if (planId === 'pro') {
      return isPremiumValid && role === 'pro' ? 'active' : 'available';
    }

    return 'available';
  };

  const handleCheckout = (_planId: string) => {
    const msg = isEs
      ? '¡Próximamente! La pasarela de pago y facturación se está finalizando. Los administradores pueden omitir las restricciones agregando su UID en adminConfig.ts.'
      : 'Coming Soon! Checkout and billing flows are currently being finalized. Admins can bypass restrictions immediately by adding their UID to code configuration.';
    onShowToast?.(msg);
  };

  // ── Theme Surface Colors ──
  const overviewCardBg = resolvedAmoled
    ? 'rgba(255, 255, 255, 0.025)'
    : resolvedLight
      ? '#ffffff'
      : 'var(--surface-topbar-bg, rgba(255, 255, 255, 0.04))';

  const overviewBorder = resolvedAmoled
    ? '1px solid rgba(255, 255, 255, 0.12)'
    : resolvedLight
      ? '1px solid rgba(0, 0, 0, 0.08)'
      : '1px solid rgba(255, 255, 255, 0.09)';

  const overviewShadow = resolvedLight
    ? '0 8px 24px rgba(0, 0, 0, 0.06)'
    : resolvedAmoled
      ? 'none'
      : '0 8px 32px rgba(0, 0, 0, 0.25)';

  const dividerBorder = resolvedLight
    ? '1px solid rgba(0, 0, 0, 0.06)'
    : '1px solid rgba(255, 255, 255, 0.08)';

  const textPrimary = resolvedLight ? '#111827' : 'var(--c-text-primary, #ffffff)';
  const textSecondary = resolvedLight ? '#4b5563' : 'var(--c-text-secondary, rgba(255, 255, 255, 0.65))';
  const textMuted = resolvedLight ? '#9ca3af' : 'var(--c-text-tertiary, rgba(255, 255, 255, 0.40))';

  // ── Billing Status Badge Configuration ──
  let statusBadgeText = isEs ? 'GRATIS' : 'FREE';
  let statusBadgeBg = resolvedLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)';
  let statusBadgeBorder = resolvedLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.16)';
  let statusBadgeColor = textSecondary;
  let HeroIconComp = Circle;
  let heroIconColor = '#94a3b8';
  let heroIconBg = 'rgba(148, 163, 184, 0.12)';
  let heroTitle = isEs ? 'Plan Estándar' : 'Free Standard';
  let heroSubtitle = isEs
    ? 'Herramientas básicas de creación musical con proyectos locales y exportación'
    : 'Standard musical creation tools with local storage and exports';

  if (isAdmin) {
    statusBadgeText = isEs ? 'ADMINISTRADOR' : 'ADMIN BYPASS';
    statusBadgeBg = 'rgba(239, 68, 68, 0.12)';
    statusBadgeBorder = 'rgba(239, 68, 68, 0.35)';
    statusBadgeColor = '#ef4444';
    HeroIconComp = ShieldCheck;
    heroIconColor = '#ef4444';
    heroIconBg = 'rgba(239, 68, 68, 0.14)';
    heroTitle = isEs ? 'Omisión de Administrador' : 'Administrator Bypass';
    heroSubtitle = isEs
      ? 'Acceso ilimitado y completo a todas las funciones y motores de audio'
      : 'Full unlimited access bypass across all Livex tools and audio engines';
  } else if (role === 'pro' && isPremiumValid) {
    statusBadgeText = rawStatus === 'past_due' ? (isEs ? 'PAGO PENDIENTE' : 'PAST DUE') : (isEs ? 'ACTIVO' : 'ACTIVE');
    statusBadgeBg = rawStatus === 'past_due' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)';
    statusBadgeBorder = rawStatus === 'past_due' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)';
    statusBadgeColor = rawStatus === 'past_due' ? '#f59e0b' : '#10b981';
    HeroIconComp = BadgeCheck;
    heroIconColor = '#a855f7';
    heroIconBg = 'rgba(168, 85, 247, 0.14)';
    heroTitle = isEs ? 'Suite de Producción Pro' : 'Pro Production Suite';
    heroSubtitle = isEs
      ? 'Suite profesional activa con audio multipista y herramientas experimentales'
      : 'Active professional production suite with multitrack audio & early access tools';
  } else if (role === 'core' && isPremiumValid) {
    statusBadgeText = rawStatus === 'past_due' ? (isEs ? 'PAGO PENDIENTE' : 'PAST DUE') : (isEs ? 'ACTIVO' : 'ACTIVE');
    statusBadgeBg = rawStatus === 'past_due' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)';
    statusBadgeBorder = rawStatus === 'past_due' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)';
    statusBadgeColor = rawStatus === 'past_due' ? '#f59e0b' : '#10b981';
    HeroIconComp = Layers3;
    heroIconColor = accent.from;
    heroIconBg = `${accent.from}18`;
    heroTitle = isEs ? 'Studio Core' : 'Studio Core';
    heroSubtitle = isEs
      ? 'Herramientas avanzadas de acordes, almacenamiento en la nube y updates prioritarios'
      : 'Advanced chord progression tools, cloud storage & priority updater access';
  } else if (rawStatus === 'cancelled') {
    statusBadgeText = isEs ? 'CANCELADO' : 'CANCELLED';
    statusBadgeBg = 'rgba(239, 68, 68, 0.10)';
    statusBadgeBorder = 'rgba(239, 68, 68, 0.25)';
    statusBadgeColor = '#ef4444';
  }

  const entitlementChips = getEntitlementChips(role, isEs);

  return (
    <div style={{ width: '100%', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        .pricing-card {
          transition: transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 180ms cubic-bezier(0.2, 0.8, 0.2, 1), border-color 200ms ease;
          will-change: transform;
        }
        .pricing-card:hover {
          transform: translateY(-3px);
        }
        @media (prefers-reduced-motion: reduce) {
          .pricing-card {
            transition: none !important;
          }
          .pricing-card:hover {
            transform: none !important;
          }
        }
      `}</style>

      {/* ── 1. Comprehensive Billing Account Overview Card ── */}
      <div
        style={{
          background: overviewCardBg,
          border: overviewBorder,
          borderRadius: 22,
          padding: '22px 20px',
          boxShadow: overviewShadow,
          marginBottom: 28,
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Top Specular Rim */}
        {!resolvedAmoled && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 16,
              right: 16,
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.18), transparent)',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Hero Row: Icon + Title + Status Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: heroIconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <HeroIconComp size={24} color={heroIconColor} style={{ strokeWidth: 2.2 }} />
            </div>
            <div>
              <h3
                style={{
                  fontFamily: 'var(--studio-font-display)',
                  fontWeight: 800,
                  fontSize: '1.2rem',
                  color: textPrimary,
                  margin: 0,
                  letterSpacing: '-0.015em',
                }}
              >
                {heroTitle}
              </h3>
              <p
                style={{
                  fontSize: '12.5px',
                  color: textSecondary,
                  margin: '3px 0 0',
                  lineHeight: 1.4,
                  maxWidth: '480px',
                }}
              >
                {heroSubtitle}
              </p>
            </div>
          </div>

          {/* Status Pill Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              borderRadius: 9999,
              background: statusBadgeBg,
              border: `1px solid ${statusBadgeBorder}`,
              color: statusBadgeColor,
              fontSize: '11px',
              fontWeight: 800,
              fontFamily: 'var(--studio-font-display)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: statusBadgeColor,
              }}
            />
            {statusBadgeText}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, borderTop: dividerBorder, margin: '16px 0' }} />

        {/* Billing Metadata Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 14,
            marginBottom: 16,
          }}
        >
          {/* Billing Cycle */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
            <Calendar size={16} color={textMuted} style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <p
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: textMuted,
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {isEs ? 'Ciclo de facturación' : 'Billing Cycle'}
              </p>
              <p
                style={{
                  fontSize: '13px',
                  fontWeight: 650,
                  color: textPrimary,
                  margin: '3px 0 0',
                }}
              >
                {isAdmin
                  ? isEs
                    ? 'Acceso ilimitado'
                    : 'Perpetual bypass'
                  : isPremiumValid
                    ? isEs
                      ? 'Ciclo mensual'
                      : 'Monthly cycle'
                    : isEs
                      ? 'Sin cobros recurrentes'
                      : 'No recurring billing'}
              </p>
            </div>
          </div>

          {/* Renewal / Expiry Date */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
            <Clock size={16} color={textMuted} style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <p
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: textMuted,
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {rawStatus === 'cancelled'
                  ? isEs
                    ? 'Acceso hasta'
                    : 'Access until'
                  : isEs
                    ? 'Próxima fecha'
                    : 'Next renewal'}
              </p>
              <p
                style={{
                  fontSize: '13px',
                  fontWeight: 650,
                  color: textPrimary,
                  margin: '3px 0 0',
                }}
              >
                {isAdmin
                  ? isEs
                    ? 'Siempre activo'
                    : 'Always active'
                  : isPremiumValid
                    ? formatPeriodEnd(profile?.currentPeriodEnd, isEs)
                    : isEs
                      ? 'Sin expiración'
                      : 'No expiration'}
              </p>
            </div>
          </div>

          {/* Account Reference ID */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
            <CreditCard size={16} color={textMuted} style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <p
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: textMuted,
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {isEs ? 'Referencia' : 'Account ID'}
              </p>
              <p
                style={{
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: textSecondary,
                  margin: '3px 0 0',
                  letterSpacing: '0.02em',
                }}
              >
                {profile?.subscriptionId
                  ? profile.subscriptionId
                  : user?.uid
                    ? `${user.uid.slice(0, 10)}...`
                    : isEs
                      ? 'Estándar'
                      : 'Standard'}
              </p>
            </div>
          </div>
        </div>

        {/* Active Entitlements Capsule */}
        <div style={{ marginTop: 12 }}>
          <p
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: textMuted,
              margin: '0 0 8px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {isEs ? 'Capacidades activas' : 'Active capabilities'}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {entitlementChips.map((chip, idx) => (
              <span
                key={idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: resolvedLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)',
                  border: resolvedLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
                  color: textPrimary,
                  fontSize: '11.5px',
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: accent.from,
                  }}
                />
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2. Plans Comparison Header ── */}
      <div style={{ marginBottom: 20 }}>
        <h4
          style={{
            fontFamily: 'var(--studio-font-display)',
            fontWeight: 800,
            fontSize: '1.25rem',
            color: textPrimary,
            letterSpacing: '-0.02em',
            margin: '0 0 4px',
          }}
        >
          {isEs ? 'Planes disponibles' : 'Available Plans'}
        </h4>
        <p
          style={{
            fontSize: '13px',
            color: textSecondary,
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {isEs
            ? 'Compara las opciones de suscripción y potencia tu flujo de creación musical.'
            : 'Compare available options and power up your musical creation workflow.'}
        </p>
      </div>

      {/* ── 3. Plan Cards Grid ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {PLANS.map((plan) => {
          const planName = isEs ? plan.nameEs : plan.name;
          const planDesc = isEs ? plan.descriptionEs : plan.description;
          const planPrice = isEs ? plan.priceEs : plan.price;
          const planFeatures = isEs ? plan.featuresEs : plan.features;
          const status = getPlanStatus(plan.id);

          // Card Surface Resolution
          let cardBg = resolvedAmoled
            ? 'rgba(255, 255, 255, 0.02)'
            : resolvedLight
              ? '#ffffff'
              : 'rgba(255, 255, 255, 0.035)';

          let cardBorder = resolvedAmoled
            ? '1px solid rgba(255, 255, 255, 0.10)'
            : resolvedLight
              ? '1px solid rgba(0, 0, 0, 0.08)'
              : '1px solid rgba(255, 255, 255, 0.07)';

          let cardShadow = resolvedLight
            ? '0 4px 14px rgba(0, 0, 0, 0.04)'
            : '0 4px 16px rgba(0, 0, 0, 0.18)';

          if (plan.isRecommended) {
            cardBg = resolvedAmoled
              ? 'rgba(255, 255, 255, 0.035)'
              : resolvedLight
                ? '#ffffff'
                : 'rgba(255, 255, 255, 0.05)';

            cardBorder = resolvedLight
              ? `2px solid ${accent.from}`
              : `1.5px solid ${accent.from}`;

            cardShadow = resolvedLight
              ? `0 8px 24px rgba(0, 0, 0, 0.08), 0 0 16px ${accent.from}18`
              : resolvedAmoled
                ? `0 8px 30px rgba(0, 0, 0, 0.95), 0 0 16px ${accent.from}25`
                : `0 10px 32px rgba(0, 0, 0, 0.35), 0 0 20px ${accent.from}22`;
          }

          // Icon Pod Config
          let PlanIconComp = Circle;
          let planIconColor = '#94a3b8';
          let planIconBg = 'rgba(148, 163, 184, 0.12)';

          if (plan.id === 'core') {
            PlanIconComp = Layers3;
            planIconColor = '#3b82f6';
            planIconBg = 'rgba(59, 130, 246, 0.12)';
          } else if (plan.id === 'pro') {
            PlanIconComp = BadgeCheck;
            planIconColor = '#a855f7';
            planIconBg = 'rgba(168, 85, 247, 0.12)';
          }

          return (
            <div
              key={plan.id}
              className="pricing-card"
              style={{
                background: cardBg,
                borderRadius: 20,
                border: cardBorder,
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                boxShadow: cardShadow,
                boxSizing: 'border-box',
                height: '100%',
              }}
            >
              {/* Recommended Floating Badge */}
              {plan.isRecommended && (
                <div
                  style={{
                    position: 'absolute',
                    top: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                    color: 'white',
                    padding: '4px 14px',
                    borderRadius: 9999,
                    fontSize: '10px',
                    fontWeight: 800,
                    fontFamily: 'var(--studio-font-display)',
                    letterSpacing: '0.08em',
                    boxShadow: `0 4px 12px color-mix(in srgb, ${accent.to} 35%, transparent)`,
                    whiteSpace: 'nowrap',
                    zIndex: 2,
                  }}
                >
                  {isEs ? 'RECOMENDADO' : 'RECOMMENDED'}
                </div>
              )}

              {/* Plan Header */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 11,
                      background: planIconBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <PlanIconComp size={18} color={planIconColor} style={{ strokeWidth: 2.2 }} />
                  </div>
                  <p
                    style={{
                      fontFamily: 'var(--studio-font-display)',
                      fontWeight: 800,
                      fontSize: '1.25rem',
                      color: textPrimary,
                      margin: 0,
                      letterSpacing: '-0.015em',
                    }}
                  >
                    {planName}
                  </p>
                </div>
                <p
                  style={{
                    fontSize: '12.5px',
                    color: textSecondary,
                    marginTop: 4,
                    lineHeight: 1.45,
                    minHeight: 36,
                  }}
                >
                  {planDesc}
                </p>
              </div>

              {/* Divider */}
              <div style={{ height: 1, borderTop: dividerBorder, marginBottom: 16 }} />

              {/* Price Row */}
              <div
                style={{
                  marginBottom: 18,
                  display: 'flex',
                  alignItems: 'baseline',
                  flexWrap: 'wrap',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--studio-font-display)',
                    fontWeight: 900,
                    fontSize: '2rem',
                    color: plan.isRecommended ? accent.from : textPrimary,
                    letterSpacing: '-0.025em',
                    lineHeight: 1,
                  }}
                >
                  {planPrice}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: textSecondary,
                  }}
                >
                  {isEs ? '/ mes' : '/ month'}
                </span>

                {plan.id !== 'free' && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: '9.5px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: plan.isRecommended
                        ? `${accent.from}15`
                        : resolvedLight
                          ? 'rgba(0,0,0,0.05)'
                          : 'rgba(255,255,255,0.08)',
                      border: plan.isRecommended
                        ? `1px solid ${accent.from}30`
                        : resolvedLight
                          ? '1px solid rgba(0,0,0,0.10)'
                          : '1px solid rgba(255,255,255,0.10)',
                      color: plan.isRecommended ? accent.from : textSecondary,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isEs ? 'PRÓXIMAMENTE' : 'COMING SOON'}
                  </span>
                )}
              </div>

              {/* Feature Checklist */}
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '0 0 24px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 11,
                  flex: 1,
                }}
              >
                {planFeatures.map((feat, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 9,
                      fontSize: '13px',
                      color: textPrimary,
                      lineHeight: 1.45,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: 17,
                        color: plan.isRecommended ? accent.from : '#10b981',
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      check_circle
                    </span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Action Button */}
              {(() => {
                let btnText = isEs ? 'Elegir Plan' : 'Select Plan';
                let btnStyle: React.CSSProperties = {
                  width: '100%',
                  minHeight: 44,
                  borderRadius: 12,
                  fontFamily: 'var(--studio-font-display)',
                  fontWeight: 800,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  transition: 'all 180ms ease',
                };
                let ActionIconComp: React.ComponentType<any> | null = null;
                const iconSize = 16;

                if (status === 'active') {
                  btnText = isEs ? 'Plan Activo' : 'Active Plan';
                  ActionIconComp = CheckCircle;
                  btnStyle = {
                    ...btnStyle,
                    border: '1.5px solid #10b981',
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                    cursor: 'default',
                  };
                } else if (status === 'admin_bypass') {
                  btnText = isEs ? 'Acceso de Admin' : 'Admin Active';
                  ActionIconComp = ShieldCheck;
                  btnStyle = {
                    ...btnStyle,
                    border: '1px solid #ef4444',
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: '#ef4444',
                    cursor: 'default',
                  };
                } else if (status === 'included') {
                  btnText = isEs ? 'Incluido en Pro' : 'Included in Pro';
                  ActionIconComp = BadgeCheck;
                  btnStyle = {
                    ...btnStyle,
                    border: resolvedLight ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.12)',
                    background: resolvedLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
                    color: textSecondary,
                    cursor: 'default',
                    opacity: 0.85,
                  };
                } else if (plan.id !== 'free') {
                  // Paid plan not owned: disabled Coming Soon CTA
                  btnText = isEs ? 'Próximamente' : 'Coming Soon';
                  if (plan.id === 'core') ActionIconComp = Layers3;
                  else if (plan.id === 'pro') ActionIconComp = BadgeCheck;

                  btnStyle = {
                    ...btnStyle,
                    border: resolvedLight ? '1px solid rgba(0,0,0,0.10)' : '1px solid rgba(255,255,255,0.10)',
                    background: resolvedLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)',
                    color: textMuted,
                    cursor: 'not-allowed',
                    opacity: 0.7,
                  };
                } else if (status === 'downgraded') {
                  btnText = isEs ? 'Bajar de Plan' : 'Downgrade';
                  ActionIconComp = Info;
                  btnStyle = {
                    ...btnStyle,
                    border: resolvedLight ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.12)',
                    background: resolvedLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
                    color: textSecondary,
                  };
                } else {
                  // Available / upgrade for Free plan
                  btnText = isEs ? 'Elegir Plan' : 'Select Plan';
                  ActionIconComp = Circle;
                  btnStyle = {
                    ...btnStyle,
                    border: resolvedLight ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(255,255,255,0.15)',
                    background: resolvedLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
                    color: textPrimary,
                  };
                }

                const isInteractive =
                  (status === 'available' || status === 'downgraded') && plan.id === 'free';

                return (
                  <Button
                    variant={plan.isRecommended ? 'primary' : 'secondary'}
                    fullWidth={true}
                    disabled={!isInteractive}
                    onClick={isInteractive ? () => handleCheckout(plan.id) : undefined}
                    style={btnStyle}
                    icon={ActionIconComp && <ActionIconComp size={iconSize} style={{ strokeWidth: 2.2 }} />}
                  >
                    {btnText}
                  </Button>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* ── 4. Helpful Support & Security Footnote ── */}
      <div
        style={{
          marginTop: 24,
          padding: '12px 16px',
          borderRadius: 14,
          background: resolvedLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)',
          border: dividerBorder,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Sparkles size={16} color={accent.from} style={{ flexShrink: 0 }} />
        <p
          style={{
            fontSize: '11.5px',
            color: textSecondary,
            margin: 0,
            lineHeight: 1.45,
          }}
        >
          {isEs
            ? 'Todos los planes de Livex incluyen almacenamiento local seguro y soporte continuo. Para dudas sobre facturación o acceso de administrador, contacta al equipo de soporte.'
            : 'All Livex plans include secure local storage and continuous support. For billing questions or admin access, contact developer support.'}
        </p>
      </div>
    </div>
  );
}

const MemoizedLivexPricingSection = React.memo(LivexPricingSectionBase, (prevProps, nextProps) => {
  return (
    prevProps.lang === nextProps.lang &&
    prevProps.profile?.role === nextProps.profile?.role &&
    prevProps.profile?.subscriptionStatus === nextProps.profile?.subscriptionStatus &&
    prevProps.profile?.subscriptionId === nextProps.profile?.subscriptionId &&
    prevProps.profile?.currentPeriodEnd === nextProps.profile?.currentPeriodEnd &&
    prevProps.user?.uid === nextProps.user?.uid &&
    prevProps.isAmoled === nextProps.isAmoled &&
    prevProps.isLight === nextProps.isLight &&
    prevProps.accent.from === nextProps.accent.from &&
    prevProps.accent.to === nextProps.accent.to &&
    prevProps.accent.mid === nextProps.accent.mid
  );
});

export const LivexPricingSection = MemoizedLivexPricingSection;
export const StudioPricingSection = MemoizedLivexPricingSection;
export default MemoizedLivexPricingSection;
