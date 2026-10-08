import React, { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  useSettingsStore,
  useNavigationStore,
  NavigationDispatcher,
  useIsWebDesktop,
  useT,
  type AuthUser,
} from '@workspace/livex-core';
import { HubTab, HelpPageId } from './hubConstants';
import { FAQ_ITEMS, HelpAccordion } from './faqConstants';
import { BouncyAccordion } from '../../../components/motion/bouncy-accordion';
import {
  SettingsScaffold,
  SettingsContentContainer,
} from '../../../shared/layout/StudioLayoutSystem';
import { SharedNavigationContainer } from '../../../navigation/SharedNavigationContainer';
import { AnimatedIcon } from '../../../shared/icons/AnimatedIcon';
import { HUB_SETTINGS_CSS } from '../settings/hubSettingsStyles';

function IconDocs({ active }: { active?: boolean }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
      menu_book
    </span>
  );
}
function IconContact({ active }: { active?: boolean }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
      support_agent
    </span>
  );
}
function IconShortcuts({ active }: { active?: boolean }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
      keyboard
    </span>
  );
}
function IconBug({ active }: { active?: boolean }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
      bug_report
    </span>
  );
}
function IconSecurity({ active }: { active?: boolean }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
      policy
    </span>
  );
}
function IconLegal({ active }: { active?: boolean }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
      gavel
    </span>
  );
}
function IconDownload({ active }: { active?: boolean }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
      download
    </span>
  );
}
function IconNotes({ active }: { active?: boolean }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
      notes
    </span>
  );
}

type HelpPageActiveId = 'main' | HelpPageId;
export function HubHelp({
  accent,
  authUser,
  tab,
  setTab,
}: {
  accent: { from: string; to: string; mid: string };
  authUser?: AuthUser | null;
  tab: HubTab;
  setTab: React.Dispatch<React.SetStateAction<HubTab>>;
}) {
  const historyLength = useNavigationStore((s) => s.history.length);
  const t = useT();
  const lang = useSettingsStore((state) => state.settings.language) ?? 'en';
  const isWebDesktop = useIsWebDesktop();

  const getInitialHelpPage = () => {
    const target =
      typeof window !== 'undefined' ? sessionStorage.getItem('studio:routeToHelpPage') : null;
    if (target) {
      sessionStorage.removeItem('studio:routeToHelpPage');
      return target as HelpPageActiveId;
    }
    return 'main';
  };

  const page = useNavigationStore((s) => {
    const last = s.history[s.history.length - 1];
    return (last?.tab === 'help' ? (last.page ?? 'main') : 'main') as HelpPageActiveId;
  });
  const pageKey = historyLength;

  const curLen = historyLength;
  const prevLenRef = useRef(curLen);
  const prevDirRef = useRef<'forward' | 'backward'>('forward');

  let slideDir: 'forward' | 'backward' = prevDirRef.current;
  if (curLen !== prevLenRef.current) {
    slideDir = curLen >= prevLenRef.current ? 'forward' : 'backward';
    prevDirRef.current = slideDir;
    prevLenRef.current = curLen;
  }

  const [copiedBugTemplate, setCopiedBugTemplate] = useState(false);

  const pageScrollPositions = useRef<Record<string, number>>({});
  const pendingRestoreRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      pageScrollPositions.current[page] = el.scrollTop;
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [page]);

  useEffect(() => {
    const target = pendingRestoreRef.current;
    if (target === null) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = pageScrollPositions.current[target] ?? 0;
    pendingRestoreRef.current = null;
  }, [page, pageKey]);

  const navigate = (to: HelpPageActiveId) => {
    if (scrollRef.current) pageScrollPositions.current[page] = scrollRef.current.scrollTop;
    pendingRestoreRef.current = to;
    NavigationDispatcher.push({ app: 'hub', tab: 'help', page: to });
  };

  const goBack = () => {
    if (scrollRef.current) pageScrollPositions.current[page] = scrollRef.current.scrollTop;
    pendingRestoreRef.current = 'main';
    const store = useNavigationStore.getState();
    if (store.history.length > 1) {
      NavigationDispatcher.pop();
    } else {
      NavigationDispatcher.replace({ app: 'hub', tab: 'settings', page: 'main' });
    }
  };

  function renderHelpCenterContent() {
    return <HelpAccordion accent={accent} lang={lang} />;
  }

  function renderFaqContent() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <HelpAccordion accent={accent} lang={lang} />
      </div>
    );
  }

  function renderKeyboardShortcutsContent() {
    const categories = [
      {
        title: t.help.keyboardShortcuts.stagexTitle,
        shortcuts: [
          { keys: ['Space', '→', '↓'], desc: t.help.keyboardShortcuts.nextScene },
          { keys: ['←', '↑'], desc: t.help.keyboardShortcuts.prevScene },
          { keys: ['Esc'], desc: t.help.keyboardShortcuts.exitStage },
        ],
      },
      {
        title: t.help.keyboardShortcuts.drumexTitle,
        shortcuts: [
          { keys: ['Ctrl', 'Z'], desc: t.help.keyboardShortcuts.undo },
          { keys: ['Ctrl', 'Y'], desc: t.help.keyboardShortcuts.redo },
          { keys: ['Ctrl', 'Shift', 'Z'], desc: t.help.keyboardShortcuts.redoAlt },
        ],
      },
    ];

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
          paddingBottom: 'var(--space-6)',
        }}
      >
        {categories.map((cat, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3
              style={{
                fontSize: 'var(--font-section-label)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--c-text-secondary)',
                opacity: 0.6,
                margin: 0,
              }}
            >
              {cat.title}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {cat.shortcuts.map((sh, j) => (
                <div
                  key={j}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: 'var(--surface-topbar-bg)',
                    border: '1px solid var(--c-border)',
                    borderRadius: 12,
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--c-text-secondary)' }}>{sh.desc}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {sh.keys.map((k, kIdx) => (
                      <React.Fragment key={kIdx}>
                        {kIdx > 0 && (
                          <span
                            style={{
                              color: 'var(--c-text-muted)',
                              fontSize: 12,
                              alignSelf: 'center',
                            }}
                          >
                            +
                          </span>
                        )}
                        <kbd
                          style={{
                            padding: '3px 6px',
                            border: '1px solid var(--c-border)',
                            background: 'var(--surface-topbar-bg)',
                            borderRadius: 6,
                            fontSize: 'var(--font-section-label)',
                            fontWeight: 700,
                            color: 'var(--c-text-primary)',
                            fontFamily: 'monospace',
                          }}
                        >
                          {k}
                        </kbd>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderTermsContent() {
    return (
      <SettingsContentContainer
        style={{
          fontSize: 13,
          color: 'var(--c-text-secondary)',
          lineHeight: 1.6,
          paddingBottom: 'var(--space-6)',
        }}
      >
        <p style={{ margin: 0 }}>{t.help.terms.welcome}</p>
        <h4
          style={{
            color: 'var(--c-text-primary)',
            margin: '8px 0 4px 0',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {t.help.terms.h1}
        </h4>
        <p style={{ margin: 0 }}>{t.help.terms.p1}</p>
        <h4
          style={{
            color: 'var(--c-text-primary)',
            margin: '8px 0 4px 0',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {t.help.terms.h2}
        </h4>
        <p style={{ margin: 0 }}>{t.help.terms.p2}</p>
        <h4
          style={{
            color: 'var(--c-text-primary)',
            margin: '8px 0 4px 0',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {t.help.terms.h3}
        </h4>
        <p style={{ margin: 0 }}>{t.help.terms.p3}</p>
      </SettingsContentContainer>
    );
  }

  function renderPrivacyPolicyContent() {
    return (
      <SettingsContentContainer
        style={{
          fontSize: 13,
          color: 'var(--c-text-secondary)',
          lineHeight: 1.6,
          paddingBottom: 'var(--space-6)',
        }}
      >
        <p style={{ margin: 0 }}>{t.help.privacy.welcome}</p>
        <h4
          style={{
            color: 'var(--c-text-primary)',
            margin: '8px 0 4px 0',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {t.help.privacy.h1}
        </h4>
        <p style={{ margin: 0 }}>{t.help.privacy.p1}</p>
        <h4
          style={{
            color: 'var(--c-text-primary)',
            margin: '8px 0 4px 0',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {t.help.privacy.h2}
        </h4>
        <p style={{ margin: 0 }}>{t.help.privacy.p2}</p>
        <h4
          style={{
            color: 'var(--c-text-primary)',
            margin: '8px 0 4px 0',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {t.help.privacy.h3}
        </h4>
        <p style={{ margin: 0 }}>{t.help.privacy.p3}</p>
      </SettingsContentContainer>
    );
  }

  function renderBugReportContent() {
    return renderHelpCenterContent();
  }

  function renderActivePageContent(activePageId: HelpPageId) {
    switch (activePageId) {
      case 'help-center':
        return renderHelpCenterContent();
      case 'faq':
        return renderFaqContent();
      case 'keyboard-shortcuts':
        return renderKeyboardShortcutsContent();
      case 'terms':
        return renderTermsContent();
      case 'privacy-policy':
        return renderPrivacyPolicyContent();
      case 'bug-report':
        return renderBugReportContent();
      default:
        return renderHelpCenterContent();
    }
  }

  const sections = useMemo(
    () => [
      {
        label: t.hub.studioSettings.helpLabel || (lang === 'es' ? 'Soporte' : 'Support'),
        items: [
          {
            id: 'help-center' as const,
            icon: 'contact_support',
            label:
              t.hub.studioSettings.helpTitle ||
              (lang === 'es' ? 'Ayuda y Soporte' : 'Help & Support'),
          },
          {
            id: 'keyboard-shortcuts' as const,
            icon: 'keyboard',
            label:
              t.hub.studioSettings.keyboardTitle ||
              (lang === 'es' ? 'Atajos de Teclado' : 'Keyboard Shortcuts'),
          },
        ],
      },
    ],
    [t, lang]
  );

  const getPageTitle = (id: HelpPageId) => {
    for (const section of sections) {
      const item = section.items.find((n) => n.id === id);
      if (item) return item.label;
    }
    return t.hub.studioSettings.helpLabel || 'Help & Support';
  };

  const activePageId = page === 'main' ? 'help-center' : page;

  const cardStyle = {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(128,128,128,0.08)',
    borderRadius: '12px',
    marginBottom: '20px',
    overflow: 'hidden',
  };

  const subStyle: React.CSSProperties = {
    animation: `slide-forward 250ms ease both`,
    height: '100%',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    zIndex: 100,
  };

  /* ── MOBILE DRILL DOWN LAYOUTS ──────────────────────────────────── */
  if (!isWebDesktop) {
    const standardScrollPages: HelpPageActiveId[] = [
      'help-center',
      'faq',
      'keyboard-shortcuts',
      'terms',
      'privacy-policy',
      'bug-report',
    ];

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        <SharedNavigationContainer
          activeView={page}
          viewOrder={[
            'main',
            'help-center',
            'faq',
            'keyboard-shortcuts',
            'terms',
            'privacy-policy',
            'bug-report',
          ]}
        >
          {(pageId) => {
            if (standardScrollPages.includes(pageId as HelpPageActiveId)) {
              return (
                <SettingsScaffold title={getPageTitle(pageId as HelpPageId)} onBack={goBack}>
                  {renderActivePageContent(pageId as HelpPageId)}
                </SettingsScaffold>
              );
            }
            if (pageId === 'main') {
              return (
                <SettingsScaffold title={getPageTitle('help-center')} onBack={goBack}>
                  {renderHelpCenterContent()}
                </SettingsScaffold>
              );
            }
            return null;
          }}
        </SharedNavigationContainer>
      </div>
    );
  }

  /* ── DESKTOP LAYOUT ────────────────────────────────────────────── */
  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'var(--surface-float-blur)',
        WebkitBackdropFilter: 'var(--surface-float-blur)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setTab('home');
        }
      }}
    >
      <style>{HUB_SETTINGS_CSS}</style>
      <style>{`
        @keyframes hub-modal-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes settings-content-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .settings-content-animate {
          animation: settings-content-fade-in 150ms ease both;
        }
        .settings-desktop-layout .flex.items-center.justify-between.gap-4 {
          padding-left: 0px !important;
          padding-right: 0px !important;
        }
        .settings-desktop-layout .flex.items-center.justify-between.gap-4[style*="padding-left: 28px"],
        .settings-desktop-layout .flex.items-center.justify-between.gap-4[style*="paddingLeft: 28px"],
        .settings-desktop-layout .flex.items-center.justify-between.gap-4[style*="28px"] {
          padding-left: 12px !important;
        }
        .settings-desktop-layout div[style*="border-bottom"],
        .settings-desktop-layout div[style*="borderBottom"] {
          border-bottom: 1px solid rgba(128, 128, 128, 0.08) !important;
        }
        .settings-desktop-layout button.btn-smooth:not(.active-settings-nav):hover {
          background: var(--sidebar-hover-bg, rgba(255, 255, 255, 0.04)) !important;
        }
      `}</style>
      <div
        style={{
          display: 'flex',
          width: '880px',
          height: '640px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          background: 'var(--app-surface, rgba(18, 18, 18, 0.95))',
          border: '1px solid rgba(128, 128, 128, 0.15)',
          borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)',
          overflow: 'hidden',
          backdropFilter: 'var(--surface-float-blur)',
          WebkitBackdropFilter: 'var(--surface-float-blur)',
          animation: 'hub-modal-fade-in 250ms ease both',
        }}
        className="settings-desktop-layout"
      >
        {/* Left Pane: Sub-navigation */}
        <div
          style={{
            width: '260px',
            flexShrink: 0,
            borderRight: '1px solid rgba(128, 128, 128, 0.08)',
            padding: '24px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            height: '100%',
            overflowY: 'auto',
          }}
        >
          <button
            onClick={() => setTab('home')}
            className="btn-smooth"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(128, 128, 128, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--c-text-primary)',
              marginBottom: 16,
              flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              close
            </span>
          </button>

          <div
            style={{
              padding: '0 8px 16px 8px',
              borderBottom: '1px solid rgba(128, 128, 128, 0.08)',
              marginBottom: 12,
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: 'var(--c-text-primary)',
                margin: 0,
                letterSpacing: '-0.02em',
                fontFamily: 'var(--studio-font-display)',
              }}
            >
              {lang === 'es' ? 'Ayuda de Livex' : 'Livex Help'}
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {sections.map((section, secIdx) => (
              <div key={section.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {secIdx > 0 && (
                  <div
                    style={{
                      height: 1,
                      borderTop: '1px solid rgba(128,128,128,0.08)',
                      margin: '4px 0 10px 0',
                    }}
                  />
                )}
                <span
                  style={{
                    fontSize: 'var(--font-section-label)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--c-text-secondary)',
                    opacity: 0.6,
                    padding: '0 12px 4px 12px',
                  }}
                >
                  {section.label}
                </span>
                {section.items.map((item) => {
                  const isActive = activePageId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.id)}
                      className={`btn-smooth ${isActive ? 'active-settings-nav' : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        background: isActive
                          ? 'var(--sidebar-hover-bg, rgba(255, 255, 255, 0.08))'
                          : 'transparent',
                        color: isActive ? 'var(--c-text-primary)' : 'var(--c-text-secondary)',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: 13,
                        fontFamily: 'var(--type-nav-font, var(--studio-font-body))',
                      }}
                    >
                      <AnimatedIcon
                        name={item.icon}
                        size={16}
                        color={isActive ? accent.from : 'var(--c-text-secondary)'}
                        state={isActive ? 'active' : 'inactive'}
                      />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right Pane: Content */}
        <div
          style={{
            flex: 1,
            padding: 'var(--space-8) var(--space-12)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
          ref={scrollRef}
        >
          <div
            key={activePageId}
            className="settings-content-animate"
            style={{ maxWidth: 'var(--content-max-w)', width: '100%', margin: '0 auto' }}
          >
            <div
              style={{
                marginBottom: 28,
                borderBottom: '1px solid rgba(128, 128, 128, 0.08)',
                paddingBottom: 16,
              }}
            >
              <h1
                style={{
                  fontSize: 'var(--font-display-page)',
                  fontWeight: 800,
                  color: 'var(--c-text-primary)',
                  margin: 0,
                  letterSpacing: '-0.03em',
                  fontFamily: 'var(--studio-font-display)',
                }}
              >
                {getPageTitle(activePageId)}
              </h1>
            </div>

            <Suspense
              fallback={
                <div style={{ color: 'var(--c-text-secondary)', fontSize: 14 }}>
                  Loading help...
                </div>
              }
            >
              {renderActivePageContent(activePageId)}
            </Suspense>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── HELP ACCORDION ───────────────────────────────────────────────── */
interface FAQItem {
  question: string;
  answer: string;
}

export default HubHelp;
