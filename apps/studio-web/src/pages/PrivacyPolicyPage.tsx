import React, { useEffect } from 'react';
import { LivexLogo } from '@workspace/ui-shared';

interface PrivacyPolicyPageProps {
  navigateTo: (path: string) => void;
}

export default function PrivacyPolicyPage({ navigateTo }: PrivacyPolicyPageProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = 'Privacy Policy — Livex';
    document.documentElement.classList.add('dark', 'amoled', 'privacy-route');
    document.documentElement.classList.remove('light', 'landing-route', 'app-route');

    return () => {
      document.documentElement.classList.remove('privacy-route');
    };
  }, []);

  const sections = [
    { id: 'introduction', label: '1. Introduction' },
    { id: 'collection', label: '2. Information We Collect' },
    { id: 'audio-privacy', label: '3. Audio Files & Stems' },
    { id: 'usage', label: '4. How We Use Data' },
    { id: 'storage', label: '5. Storage & Cloud Sync' },
    { id: 'deletion', label: '6. Data Retention & Deletion' },
    { id: 'third-party', label: '7. Third-Party Services' },
    { id: 'security', label: '8. Security Measures' },
    { id: 'contact', label: '9. Contact & Inquiries' },
  ];

  const scrollToSection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div
      className="privacy-policy-view min-h-screen flex flex-col selection:bg-red-500/30 selection:text-white"
      style={{
        backgroundColor: '#000000',
        color: '#d4d4d8',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Top Navigation Bar */}
      <header
        className="sticky top-0 z-50 backdrop-blur-xl border-b transition-colors duration-200"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.88)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigateTo('/')}
            className="flex items-center gap-3 group text-left cursor-pointer transition-opacity hover:opacity-85 focus:outline-none"
            aria-label="Livex Home"
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center p-1 text-white">
              <LivexLogo size={20} />
            </div>
            <div>
              <span
                className="font-extrabold text-base tracking-tight block leading-tight"
                style={{ color: '#ffffff' }}
              >
                Livex
              </span>
              <span
                className="text-[10px] font-medium tracking-wide uppercase"
                style={{ color: '#a1a1aa' }}
              >
                Privacy & Trust
              </span>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateTo('/')}
              className="text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
              style={{ color: '#a1a1aa' }}
            >
              ← Back to Home
            </button>
            <button
              onClick={() => navigateTo('/app')}
              className="text-xs font-bold text-white bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg transition-all shadow-sm shadow-red-950/40 cursor-pointer"
            >
              Open Workstation
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 md:py-16">
        {/* Hero Header */}
        <div className="mb-12 border-b pb-10" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-4 border"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#f87171',
              borderColor: 'rgba(239, 68, 68, 0.25)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Official Policy & Compliance
          </div>
          <h1
            className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4"
            style={{ color: '#ffffff' }}
          >
            Privacy Policy
          </h1>
          <p className="text-base md:text-lg leading-relaxed max-w-2xl" style={{ color: '#a1a1aa' }}>
            Livex is dedicated to protecting your creative work, musical compositions, and personal
            identifying data with strict local-first processing and zero data resale.
          </p>

          <div
            className="flex flex-wrap items-center gap-6 mt-6 text-xs"
            style={{ color: '#71717a' }}
          >
            <div>
              <span>Effective Date:</span>{' '}
              <strong style={{ color: '#e4e4e7' }}>October 8, 2026</strong>
            </div>
            <div>
              <span>Last Updated:</span>{' '}
              <strong style={{ color: '#e4e4e7' }}>October 8, 2026</strong>
            </div>
            <div>
              <span>App Scope:</span>{' '}
              <strong style={{ color: '#e4e4e7' }}>Livex Web & Android APK</strong>
            </div>
          </div>
        </div>

        {/* Quick Jump Bar */}
        <div
          className="mb-12 p-4 rounded-xl border backdrop-blur-md"
          style={{
            backgroundColor: 'rgba(18, 18, 22, 0.75)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <div
            className="text-[11px] font-bold uppercase tracking-widest mb-3"
            style={{ color: '#a1a1aa' }}
          >
            Table of Contents
          </div>
          <div className="flex flex-wrap gap-2">
            {sections.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                onClick={(e) => scrollToSection(e, sec.id)}
                className="text-xs px-2.5 py-1.5 rounded-md border transition-colors hover:text-white"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: '#d4d4d8',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                }}
              >
                {sec.label}
              </a>
            ))}
          </div>
        </div>

        {/* Policy Body */}
        <div className="space-y-12 text-sm md:text-[15px] leading-relaxed" style={{ color: '#d4d4d8' }}>
          {/* Section 1 */}
          <section id="introduction" className="scroll-mt-24">
            <h2
              className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-3"
              style={{ color: '#ffffff' }}
            >
              <span className="font-mono text-base" style={{ color: '#ef4444' }}>
                01.
              </span>
              Introduction & Scope
            </h2>
            <div className="space-y-3">
              <p>
                Livex (&quot;we&quot;, &quot;our&quot;, or &quot;the Service&quot;) provides a
                unified musician workstation and live rehearsal ecosystem. The suite includes
                specialized tools: <strong>Chordex</strong> (lyric & chord teleprompter, transposition
                engine), <strong>Drumex</strong> (drum sheet and pattern sequencer),{' '}
                <strong>Stagex</strong> (stage plots, tech rider design, and input patches),{' '}
                <strong>Groovex</strong> (multitrack player and backing stem mixer), and{' '}
                <strong>Vocalex</strong> (vocal warmups and pitch monitoring).
              </p>
              <p>
                This Privacy Policy applies to all versions of the Livex software platform,
                including the web application (hosted via Cloudflare Pages at{' '}
                <code
                  className="text-xs px-1.5 py-0.5 rounded border font-mono"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    borderColor: 'rgba(255, 255, 255, 0.12)',
                    color: '#fca5a5',
                  }}
                >
                  https://studio-30f44.web.app
                </code>
                ) and the native installed Android mobile application distributed via APK and
                Google Play.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section id="collection" className="scroll-mt-24">
            <h2
              className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-3"
              style={{ color: '#ffffff' }}
            >
              <span className="font-mono text-base" style={{ color: '#ef4444' }}>
                02.
              </span>
              Information We Collect
            </h2>
            <div className="space-y-4">
              <p>
                We adhere to strict data minimization principles. We only collect information
                necessary to provide core workstation capabilities and user authentication:
              </p>

              <div
                className="p-4 rounded-xl border space-y-3"
                style={{
                  backgroundColor: 'rgba(14, 14, 18, 0.85)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <h3 className="text-base font-semibold" style={{ color: '#ffffff' }}>
                  A. Account Credentials & Profile Data
                </h3>
                <p>
                  When you authenticate into Livex using <strong>Google Sign-In</strong> or{' '}
                  <strong>Email/Password</strong>, we collect your:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>Email address</li>
                  <li>Account display name</li>
                  <li>Profile avatar image URL (provided via Google Identity)</li>
                  <li>Unique Firebase Authentication identifier (UID)</li>
                </ul>
                <p className="text-xs" style={{ color: '#a1a1aa' }}>
                  Note: Passwords are encrypted and handled exclusively by Google Firebase
                  Authentication. Livex servers never receive or store plaintext passwords.
                </p>
              </div>

              <div
                className="p-4 rounded-xl border space-y-3"
                style={{
                  backgroundColor: 'rgba(14, 14, 18, 0.85)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <h3 className="text-base font-semibold" style={{ color: '#ffffff' }}>
                  B. Membership & Subscription Tiers
                </h3>
                <p>
                  Livex offers plan tiers (such as Standard and Pro/Studio tiers) unlocking advanced
                  workspace capacity. For subscribed users, we store:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>Active membership status and entitlement tier</li>
                  <li>Subscription start, expiration, and renewal timestamps</li>
                  <li>Cryptographically signed transaction validation tokens</li>
                </ul>
                <p className="text-xs" style={{ color: '#a1a1aa' }}>
                  Payment card numbers, CVVs, and direct billing accounts are processed directly
                  through certified payment providers (Google Play Billing / Stripe). Livex never
                  collects or stores credit card numbers on its servers.
                </p>
              </div>

              <div
                className="p-4 rounded-xl border space-y-3"
                style={{
                  backgroundColor: 'rgba(14, 14, 18, 0.85)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <h3 className="text-base font-semibold" style={{ color: '#ffffff' }}>
                  C. Workspace & Project Documents
                </h3>
                <p>
                  Your chord charts, song arrangements, drum patterns, stage plots, setlists, and
                  custom preferences are saved in your local device browser storage (IndexedDB &
                  localStorage). When you choose to sign in and activate Cloud Sync, this workspace
                  data is backed up to your private, isolated user document database in Firestore.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section id="audio-privacy" className="scroll-mt-24">
            <h2
              className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-3"
              style={{ color: '#ffffff' }}
            >
              <span className="font-mono text-base" style={{ color: '#ef4444' }}>
                03.
              </span>
              Audio Files & Stem Isolation Policy
            </h2>
            <div
              className="p-5 rounded-xl border space-y-3"
              style={{
                backgroundColor: 'rgba(28, 12, 12, 0.7)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
              }}
            >
              <div
                className="flex items-center gap-2 font-bold text-base"
                style={{ color: '#f87171' }}
              >
                <span className="material-symbols-outlined text-lg">music_note</span>
                Absolute Privacy for Imported Audio & Rehearsal Stems
              </div>
              <p>
                As a music production and live rehearsal tool, Livex allows you to import audio tracks,
                multitrack stems, and click tracks into the Groovex player and Chordex practice panels.
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li>
                  <strong>Local-First Audio Processing:</strong> All stem playback, audio routing, pitch
                  shifting, and time-stretching are computed client-side in real time using the Web
                  Audio API and WebAssembly.
                </li>
                <li>
                  <strong>No Content Mining or AI Training:</strong> We do not scan, transcribe, index,
                  analyze, or utilize your music, vocals, or recordings to train artificial
                  intelligence or machine learning models.
                </li>
                <li>
                  <strong>No Public Distribution:</strong> Your audio files remain private to your
                  account or device. Livex does not distribute, license, or sell user audio.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section id="usage" className="scroll-mt-24">
            <h2
              className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-3"
              style={{ color: '#ffffff' }}
            >
              <span className="font-mono text-base" style={{ color: '#ef4444' }}>
                04.
              </span>
              How Information Is Used
            </h2>
            <div className="space-y-3">
              <p>We use the minimal data collected strictly for the following purposes:</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>
                  <strong>Authentication:</strong> Verifying your identity and keeping you safely signed in
                  across sessions.
                </li>
                <li>
                  <strong>Cross-Device Sync:</strong> Syncing your setlists, chord libraries, and stage
                  diagrams across your web workstation and mobile Android device.
                </li>
                <li>
                  <strong>Entitlements:</strong> Unlocking features and capacity associated with your
                  membership tier.
                </li>
                <li>
                  <strong>App Reliability:</strong> Resolving crashes and verifying update integrity via
                  version compatibility checks.
                </li>
              </ul>
              <p className="font-semibold pt-2" style={{ color: '#ffffff' }}>
                We never sell, rent, monetize, or trade your personal data or musical content with third
                parties, advertisers, or data brokers.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section id="storage" className="scroll-mt-24">
            <h2
              className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-3"
              style={{ color: '#ffffff' }}
            >
              <span className="font-mono text-base" style={{ color: '#ef4444' }}>
                05.
              </span>
              Storage, Offline First & Cloud Sync
            </h2>
            <div className="space-y-3">
              <p>
                Livex is engineered as an <strong>offline-first architecture</strong>. If you use Livex
                without signing in, 100% of your data remains on your physical device. No account is
                created, and no network requests carrying your projects leave your computer or phone.
              </p>
              <p>
                When you sign in, your projects are synchronized to Google Cloud Firestore using
                account-scoped access security rules. Only your authenticated UID can read or write
                your documents.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section id="deletion" className="scroll-mt-24">
            <h2
              className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-3"
              style={{ color: '#ffffff' }}
            >
              <span className="font-mono text-base" style={{ color: '#ef4444' }}>
                06.
              </span>
              Data Retention & Account Deletion (Google Play Compliance)
            </h2>
            <div
              className="p-5 rounded-xl border space-y-4"
              style={{
                backgroundColor: 'rgba(14, 14, 18, 0.85)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <p>
                In compliance with Google Play Store User Data policies and international privacy
                frameworks (GDPR/CCPA), users possess the permanent right to request full deletion of
                their account and all associated cloud data.
              </p>

              <div>
                <h3 className="text-base font-bold mb-2" style={{ color: '#ffffff' }}>
                  Option A: In-App Immediate Deletion
                </h3>
                <p className="mb-2" style={{ color: '#d4d4d8' }}>
                  You can permanently delete your Livex account directly within either the Web or Android
                  application:
                </p>
                <ol className="list-decimal list-inside space-y-1 pl-2" style={{ color: '#d4d4d8' }}>
                  <li>Open the Livex Hub or App Menu.</li>
                  <li>
                    Navigate to <strong>Settings</strong> → <strong>Profile & Account</strong>.
                  </li>
                  <li>
                    Scroll to the bottom to the <strong>Danger Zone</strong>.
                  </li>
                  <li>
                    Click <strong>Delete Account</strong> and confirm with your credentials.
                  </li>
                </ol>
                <p className="text-xs mt-2" style={{ color: '#a1a1aa' }}>
                  This action immediately purges your Firestore cloud document tree, your user profile,
                  and your authentication record from our servers.
                </p>
              </div>

              <div className="border-t pt-4" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                <h3 className="text-base font-bold mb-2" style={{ color: '#ffffff' }}>
                  Option B: Manual Email Deletion Request
                </h3>
                <p style={{ color: '#d4d4d8' }}>
                  If you cannot access your account or prefer manual processing, send an email from your
                  registered account address to:
                </p>
                <div
                  className="mt-2 p-3 rounded-lg border font-mono text-xs flex items-center justify-between"
                  style={{
                    backgroundColor: '#000000',
                    borderColor: 'rgba(255, 255, 255, 0.12)',
                    color: '#f87171',
                  }}
                >
                  <span>stagecore.contact@gmail.com</span>
                  <span className="text-[10px] font-sans uppercase" style={{ color: '#71717a' }}>
                    Subject: Delete Account
                  </span>
                </div>
                <p className="text-xs mt-2" style={{ color: '#a1a1aa' }}>
                  All associated profile records, backups, and database entries will be permanently
                  erased within 30 days of receipt.
                </p>
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section id="third-party" className="scroll-mt-24">
            <h2
              className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-3"
              style={{ color: '#ffffff' }}
            >
              <span className="font-mono text-base" style={{ color: '#ef4444' }}>
                07.
              </span>
              Third-Party Services & Infrastructure
            </h2>
            <div className="space-y-3">
              <p>Livex integrates only trusted, enterprise-grade cloud infrastructure partners:</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>
                  <strong>Google Firebase & Google Cloud:</strong> Powers identity verification (Google
                  Sign-In, Firebase Auth) and encrypted cloud persistence (Cloud Firestore).
                </li>
                <li>
                  <strong>Cloudflare Pages:</strong> Delivers high-speed, DDoS-protected static application
                  assets globally.
                </li>
                <li>
                  <strong>Google Play In-App Billing:</strong> Processes native mobile subscription
                  transactions securely through Google&apos;s encrypted checkout.
                </li>
              </ul>
              <p className="text-xs" style={{ color: '#a1a1aa' }}>
                Livex does not embed third-party advertising SDKs (e.g. AdMob, Meta Audience Network)
                or invasive behavioral tracker trackers.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section id="security" className="scroll-mt-24">
            <h2
              className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-3"
              style={{ color: '#ffffff' }}
            >
              <span className="font-mono text-base" style={{ color: '#ef4444' }}>
                08.
              </span>
              Security & Encryption
            </h2>
            <div className="space-y-3">
              <p>
                We apply modern security practices to protect your data against unauthorized access,
                loss, or alteration:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li>All network communications enforce HTTPS/TLS 1.3 encryption in transit.</li>
                <li>Cloud database entries enforce strict Firebase Security Rules scoped per user UID.</li>
                <li>Local storage is sandboxed to the application origin or Android app sandbox.</li>
              </ul>
            </div>
          </section>

          {/* Section 9 */}
          <section id="contact" className="scroll-mt-24">
            <h2
              className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-3"
              style={{ color: '#ffffff' }}
            >
              <span className="font-mono text-base" style={{ color: '#ef4444' }}>
                09.
              </span>
              Contact Information & Inquiries
            </h2>
            <div
              className="p-6 rounded-xl border space-y-4"
              style={{
                backgroundColor: 'rgba(14, 14, 18, 0.85)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <p style={{ color: '#d4d4d8' }}>
                If you have questions, feedback, or data requests regarding this Privacy Policy or
                Livex data protection practices, please contact our development team:
              </p>
              <div className="space-y-1">
                <div
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: '#a1a1aa' }}
                >
                  Official Privacy Contact
                </div>
                <div className="font-mono text-sm" style={{ color: '#ffffff' }}>
                  stagecore.contact@gmail.com
                </div>
              </div>
              <div className="space-y-1">
                <div
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: '#a1a1aa' }}
                >
                  Product & Engineering
                </div>
                <div className="text-sm" style={{ color: '#d4d4d8' }}>
                  Livex Engineering Team
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="border-t py-12 transition-colors duration-200 mt-16"
        style={{
          backgroundColor: '#0a0a0c',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <div
          className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs"
          style={{ color: '#a1a1aa' }}
        >
          <div className="flex items-center gap-2">
            <LivexLogo size={18} />
            <span className="font-semibold" style={{ color: '#e4e4e7' }}>
              Livex Workspace
            </span>
            <span>© 2026. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => navigateTo('/')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              onClick={() => navigateTo('/app')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Web Workstation
            </button>
            <a
              href="mailto:stagecore.contact@gmail.com"
              className="hover:text-white transition-colors cursor-pointer"
            >
              Contact Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
