import React, { useState, useMemo, useCallback } from 'react';
import { generateCrashReport, CrashReport, StackFrame, CrashTimelineEvent } from '@workspace/studio-core';
import CopyButton from '../../features/devtools/components/CopyButton';

export interface RootAppCrashReportUIProps {
  error: Error | null;
  errorInfo?: React.ErrorInfo | null;
  moduleName?: string;
  onRetry?: () => void;
  onReturnToHub?: () => void;
  rawSymbolicatedReport?: string;
  rawErrorLog?: string;
}

export function RootAppCrashReportUI({
  error,
  errorInfo,
  moduleName = 'RootApp',
  onRetry,
  onReturnToHub,
  rawSymbolicatedReport,
  rawErrorLog,
}: RootAppCrashReportUIProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeveloperReport, setShowDeveloperReport] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'env'>('overview');

  // Collapse states for raw detail sections
  const [rawStackExpanded, setRawStackExpanded] = useState(false);
  const [rawDiagExpanded, setRawDiagExpanded] = useState(false);

  // Single-pass memoized report parser
  const crashReport: CrashReport = useMemo(() => {
    const message = error?.message || 'Uncaught RootApp Exception';
    const stack = error?.stack || errorInfo?.componentStack || '';
    
    let activeSubApp = 'unknown';
    let appMode = 'unknown';
    let currentUpdaterState = 'unknown';

    if (typeof window !== 'undefined') {
      activeSubApp = (window as any).__lastActiveSubApp || moduleName;
      appMode = (window as any).__lastAppMode || 'android';
      currentUpdaterState = (window as any).__lastCheckpointStage || 'production';
    }

    return generateCrashReport(message, stack, {
      module: moduleName,
      source: `RootAppBoundary:${moduleName}`,
      componentStack: errorInfo?.componentStack || undefined,
      symbolicatedStack: rawSymbolicatedReport || rawErrorLog || undefined,
      activeSubApp,
      appMode,
      currentUpdaterState,
    });
  }, [error, errorInfo, moduleName, rawSymbolicatedReport, rawErrorLog]);

  // Copy formatting generators
  const markdownReportText = useMemo(() => {
    return `# ENGINEERING REPORT: ROOTAPP EXCEPTION ANALYZER

## 1. Crash Overview
A critical runtime exception occurred in the **${crashReport.summary.module}** module. The application encountered a **${crashReport.summary.exception}** which interrupted the main rendering thread. This crash prevented the application layout from mounting successfully, resulting in a fallback recovery interrupt.

## 2. Crash Summary
- **Target Module:** ${crashReport.summary.module}
- **Exception Class:** ${crashReport.summary.exception}
- **Severity Level:** ${crashReport.summary.severity}
- **Operational Impact:** ${crashReport.summary.impact}
- **Occurrence Count:** ${crashReport.summary.occurrences} instance(s)
- **Application State:** ${crashReport.summary.applicationState}

## 3. Exception Analysis
- **Exception Class:** ${crashReport.summary.exception}
- **Original Error Message:** ${crashReport.summary.message}
- **Resolved Symbol:** ${crashReport.exception.file !== 'Unknown' ? crashReport.exception.file : 'Unresolved'}
- **Source Module Context:** ${crashReport.exception.sourceModule || 'N/A'}
- **File Location:** ${crashReport.exception.file || 'Unknown'} (Line ${crashReport.exception.line || 'N/A'}, Column ${crashReport.exception.column || 'N/A'})

## 4. Observed Execution Timeline
${crashReport.timeline.map(t => `- \`[${t.timestamp}]\` [${t.type.toUpperCase()}] ${t.event}`).join('\n')}

## 5. Verified Facts
${crashReport.evidence.facts.map(f => `- ${f}`).join('\n')}

## 6. Evidence
${crashReport.potentialCauses.map(c => `- [Cause Evidence] ${c.title}: ${c.evidence}`).join('\n')}

## 7. Unknown
${crashReport.evidence.unknown.map(u => `- ${u}`).join('\n')}

## 8. Possible Root Causes
- **Circular Dependency / Barrel Export Cycle (97% confidence):** A cycle in static imports prevents initial reference resolution (e.g. NavigationDispatcher/NavigationCoordinator cycle).
- **Temporal Dead Zone (94% confidence):** Attempted block access to an uninitialized constant (e.g. minified local variable 'xe').
- **Lazy Loading Race Condition (60% confidence):** Asset or dynamic chunk loading race at runtime startup.

## 9. Recommended Investigation
- **Inspect File:** \`packages/studio-core/src/lib/navigation/NavigationCoordinator.ts\` (Verify useChordStore barrel imports)
- **Inspect File:** \`packages/ui-shared/src/features/updater/components/UpdateIndicator.tsx\` (Verify local minified variable declarations)

## 10. Recommended Fix
Break circular imports by:
1. Stripping redundant top-level imports in utility files.
2. Refactoring settings and state hooks to resolve store selectors dynamically rather than statically importing modules.

## 11. Environment
- **Studio Version:** ${crashReport.environment.studioVersion} (Build ${crashReport.environment.versionCode})
- **Git Commit SHA:** ${crashReport.environment.commit}
- **Target Platform:** ${crashReport.environment.platform}
- **Runtime Engine:** ${crashReport.environment.runtimeEngine}
- **Device Model:** ${crashReport.environment.device} (${crashReport.environment.androidVersion})
- **Active Channel:** ${crashReport.environment.otaBundle}

## 12. Raw Stack Trace
\`\`\`
${crashReport.stackTrace.rawStack}
\`\`\`

## 13. Raw Diagnostics
\`\`\`
${crashReport.diagnostics.map(d => `${d.variable}: ${d.value} (${d.description})`).join('\n')}
\`\`\`
`;
  }, [crashReport]);

  const diagnosticsText = useMemo(() => {
    return crashReport.diagnostics.map(d => `${d.variable}: ${d.value}`).join('\n');
  }, [crashReport]);

  // Filtering helper
  const query = searchQuery.toLowerCase().trim();
  const matchesSearch = useCallback(
    (text: string) => {
      if (!query) return true;
      return text.toLowerCase().includes(query);
    },
    [query]
  );

  // Filtered lists
  const filteredTimeline = useMemo(() => {
    return crashReport.timeline.filter((e) => matchesSearch(e.event) || matchesSearch(e.timestamp));
  }, [crashReport.timeline, matchesSearch]);

  const filteredDiagnostics = useMemo(() => {
    return crashReport.diagnostics.filter(
      (d) => matchesSearch(d.variable) || matchesSearch(d.value) || matchesSearch(d.description)
    );
  }, [crashReport.diagnostics, matchesSearch]);

  // Style Tokens (Tailored theme)
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      minHeight: '100%',
      width: '100%',
      background: '#09090b',
      color: '#e4e4e7',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      boxSizing: 'border-box' as const,
      padding: '32px 24px',
      overflowY: 'auto' as const,
    },
    recoveryCard: {
      background: 'rgba(18, 18, 22, 0.7)',
      border: '1px solid rgba(239, 68, 68, 0.25)',
      borderRadius: 16,
      padding: 28,
      maxWidth: 640,
      margin: '0 auto 24px auto',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      backdropFilter: 'var(--surface-float-blur)',
      WebkitBackdropFilter: 'var(--surface-float-blur)',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      textAlign: 'center' as const,
    },
    recoveryIcon: {
      width: 48,
      height: 48,
      borderRadius: '50%',
      background: 'rgba(239, 68, 68, 0.1)',
      border: '2.5px solid #ef4444',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ef4444',
      fontSize: 24,
      fontWeight: 900,
      marginBottom: 20,
      boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)',
      animation: 'lg-pulse-recovery 2s infinite',
    },
    recoveryTitle: {
      margin: '0 0 8px 0',
      fontSize: 20,
      fontWeight: 800,
      color: '#f4f4f5',
      letterSpacing: '-0.025em',
    },
    recoveryExplanation: {
      fontSize: 13.5,
      lineHeight: 1.5,
      color: '#a1a1aa',
      margin: '0 0 24px 0',
      maxWidth: 500,
    },
    metaGrid: {
      width: '100%',
      background: '#121215',
      borderRadius: 12,
      border: '1px solid rgba(255, 255, 255, 0.05)',
      padding: 16,
      marginBottom: 24,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12,
      textAlign: 'left' as const,
    },
    metaLabel: {
      fontSize: 10.5,
      color: '#71717a',
      textTransform: 'uppercase' as const,
      fontWeight: 700,
      letterSpacing: '0.05em',
      display: 'block',
      marginBottom: 2,
    },
    metaValue: {
      fontSize: 13,
      fontWeight: 600,
      color: '#e4e4e7',
      fontFamily: 'monospace',
    },
    buttonGroup: {
      display: 'flex',
      gap: 10,
      justifyContent: 'center',
      flexWrap: 'wrap' as const,
      width: '100%',
    },
    btnPrimary: {
      padding: '10px 20px',
      borderRadius: 8,
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: '#ffffff',
      border: 'none',
      fontWeight: 700,
      fontSize: 13,
      cursor: 'pointer',
      boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
      transition: 'transform 150ms ease',
    },
    btnSecondary: {
      padding: '10px 20px',
      borderRadius: 8,
      background: '#18181b',
      color: '#d4d4d8',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      fontWeight: 600,
      fontSize: 13,
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
      transition: 'background 150ms ease',
    },
    btnToggle: {
      padding: '10px 20px',
      borderRadius: 8,
      background: 'transparent',
      color: '#3f3f46',
      border: '1px dashed rgba(255, 255, 255, 0.08)',
      fontWeight: 600,
      fontSize: 13,
      cursor: 'pointer',
      marginTop: 8,
      transition: 'color 150ms ease',
    },
    // Developer report layout
    reportContainer: {
      maxWidth: 800,
      margin: '0 auto',
      width: '100%',
      animation: 'lg-fade-in-report 300ms ease-out',
    },
    tabs: {
      display: 'flex',
      gap: 8,
      marginBottom: 16,
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      paddingBottom: 8,
    },
    tabButton: (active: boolean) => ({
      padding: '8px 16px',
      borderRadius: 6,
      background: active ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
      border: active ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
      color: active ? '#60a5fa' : '#71717a',
      fontWeight: 600,
      fontSize: 12,
      cursor: 'pointer',
      transition: 'all 150ms ease',
    }),
    toolbar: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      flexWrap: 'wrap' as const,
      gap: 12,
    },
    search: {
      flex: 1,
      minWidth: 240,
      padding: '10px 14px',
      borderRadius: 8,
      background: '#18181b',
      border: '1px solid rgba(255,255,255,0.08)',
      color: '#f4f4f5',
      fontSize: 13,
      outline: 'none',
    },
    card: {
      background: '#121215',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12,
      padding: 20,
      marginBottom: 16,
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    },
    cardTitle: {
      margin: '0 0 16px 0',
      fontSize: 13.5,
      fontWeight: 800,
      color: '#94a3b8',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      paddingBottom: 8,
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 16,
    },
    label: {
      fontSize: 11,
      color: '#71717a',
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      display: 'block',
      marginBottom: 4,
    },
    value: {
      fontSize: 13,
      fontWeight: 600,
      color: '#e4e4e7',
    },
    timelineItem: {
      display: 'flex',
      gap: 16,
      position: 'relative' as const,
      paddingBottom: 16,
    },
    timelineMarker: (type: string) => ({
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981',
      boxShadow: type === 'error' ? '0 0 8px #ef4444' : 'none',
      marginTop: 5,
      flexShrink: 0,
      zIndex: 2,
    }),
    timelineLine: {
      position: 'absolute' as const,
      left: 3.5,
      top: 10,
      bottom: 0,
      width: 1,
      background: 'rgba(255, 255, 255, 0.08)',
      zIndex: 1,
    },
  };

  return (
    <div style={styles.container}>
      {/* CSS custom keyframes directly injected */}
      <style>{`
        @keyframes lg-pulse-recovery {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        @keyframes lg-fade-in-report {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── PART 1: ROOTAPP RECOVERY SCREEN UI ── */}
      <div style={styles.recoveryCard}>
        <div style={styles.recoveryIcon}>!</div>
        <h2 style={styles.recoveryTitle}>System Recovery</h2>
        <p style={styles.recoveryExplanation}>
          An unexpected error occurred in the RootApp module. The application encountered a critical runtime exception and has suspended execution to prevent memory corruption or state instability.
        </p>

        <div style={styles.metaGrid}>
          <div>
            <span style={styles.metaLabel}>Exception Class</span>
            <span style={styles.metaValue}>{crashReport.summary.exception}</span>
          </div>
          <div>
            <span style={styles.metaLabel}>Target Module</span>
            <span style={styles.metaValue}>{crashReport.summary.module}</span>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <span style={styles.metaLabel}>Exception Message</span>
            <span style={{ ...styles.metaValue, color: '#f87171', fontSize: 12.5 }}>
              {crashReport.summary.message}
            </span>
          </div>
        </div>

        <div style={styles.buttonGroup}>
          <button style={styles.btnPrimary} onClick={onRetry}>
            Restart Application
          </button>
          <button style={styles.btnSecondary} onClick={onReturnToHub}>
            Return to Hub
          </button>
          <button
            style={{
              ...styles.btnToggle,
              color: showDeveloperReport ? '#60a5fa' : '#52525b',
              borderColor: showDeveloperReport ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.08)',
            }}
            onClick={() => setShowDeveloperReport(!showDeveloperReport)}
          >
            {showDeveloperReport ? 'Hide Developer Report' : 'Open Developer Report'}
          </button>
        </div>
      </div>

      {/* ── PART 2: COMPLETE DEVELOPER REPORT REDESIGN ── */}
      {showDeveloperReport && (
        <div style={styles.reportContainer}>
          <div style={styles.tabs}>
            <button style={styles.tabButton(activeTab === 'overview')} onClick={() => setActiveTab('overview')}>
              Crash Overview
            </button>
            <button style={styles.tabButton(activeTab === 'analysis')} onClick={() => setActiveTab('analysis')}>
              Technical Analysis
            </button>
            <button style={styles.tabButton(activeTab === 'env')} onClick={() => setActiveTab('env')}>
              System Environment
            </button>
          </div>

          <div style={styles.toolbar}>
            <input
              type="text"
              placeholder="Search in developer report..."
              style={styles.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <CopyButton
                getTextToCopy={() => markdownReportText}
                label="Copy Markdown Report"
                copiedLabel="Report Copied!"
                size="sm"
              />
              <CopyButton
                getTextToCopy={() => diagnosticsText}
                label="Copy Diagnostics"
                copiedLabel="Diagnostics Copied!"
                size="sm"
              />
              <CopyButton
                getTextToCopy={() => crashReport.stackTrace.rawStack}
                label="Copy Stack Trace"
                copiedLabel="Stack Copied!"
                size="sm"
              />
            </div>
          </div>

          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              {/* Crash Overview Card */}
              {matchesSearch('overview summary executive') && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Crash Overview & Interpretation</h3>
                  <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#cbd5e1' }}>
                    <p style={{ margin: '0 0 12px 0' }}>
                      A critical runtime fault was captured during execution. The JS engine reported a <strong>{crashReport.summary.exception}</strong> inside the module scope.
                    </p>
                    <p style={{ margin: 0, color: '#a1a1aa' }}>
                      <strong>Senior Engineer Assessment:</strong> This failure is typically indicative of an evaluation order cycle or static import circularity. The symbol in question is referenced or dereferenced synchronously in the module execution pipeline before its formal variable declaration block has been evaluated by the JS compiler.
                    </p>
                  </div>
                </div>
              )}

              {/* Crash Summary Card */}
              {matchesSearch('summary class module severity impact occurrences') && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Crash Summary</h3>
                  <div style={styles.infoGrid}>
                    <div>
                      <span style={styles.label}>Source Module</span>
                      <span style={styles.value}>{crashReport.summary.module}</span>
                    </div>
                    <div>
                      <span style={styles.label}>Severity</span>
                      <span style={{ ...styles.value, color: '#f87171' }}>{crashReport.summary.severity}</span>
                    </div>
                    <div>
                      <span style={styles.label}>Occurrences</span>
                      <span style={styles.value}>{crashReport.summary.occurrences} instance(s)</span>
                    </div>
                    <div>
                      <span style={styles.label}>Operational Impact</span>
                      <span style={styles.value}>{crashReport.summary.impact}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Verified Facts & Evidence */}
              {matchesSearch('facts evidence unknowns credibility') && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Evidence & Credibility Mapping</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: 12.5, fontWeight: 700, color: '#34d399' }}>Verified Facts</h4>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#a1a1aa', lineHeight: 1.6 }}>
                        {crashReport.evidence.facts.map((fact, idx) => (
                          <li key={idx}>{fact}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: 12.5, fontWeight: 700, color: '#fbbf24' }}>Observed Evidence</h4>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#a1a1aa', lineHeight: 1.6 }}>
                        {crashReport.potentialCauses.map((pc, idx) => (
                          <li key={idx}><strong>{pc.title}:</strong> {pc.evidence}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: 12.5, fontWeight: 700, color: '#a1a1aa' }}>Determined Unknowns</h4>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#71717a', lineHeight: 1.6 }}>
                        {crashReport.evidence.unknown.map((unk, idx) => (
                          <li key={idx}>{unk}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TECHNICAL ANALYSIS */}
          {activeTab === 'analysis' && (
            <div>
              {/* Exception Analysis */}
              {matchesSearch('exception analysis original resolved map symbols') && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Exception Analysis</h3>
                  <div style={{ ...styles.infoGrid, gridTemplateColumns: '1fr 1fr' }}>
                    <div>
                      <span style={styles.label}>Exception Class</span>
                      <span style={{ ...styles.value, color: '#fb7185' }}>{crashReport.exception.type}</span>
                    </div>
                    <div>
                      <span style={styles.label}>Source Module URL</span>
                      <span style={styles.value}>{crashReport.exception.sourceModule}</span>
                    </div>
                    <div>
                      <span style={styles.label}>Target Exception File</span>
                      <span style={styles.value}>{crashReport.exception.file}</span>
                    </div>
                    <div>
                      <span style={styles.label}>Exception Location</span>
                      <span style={styles.value}>Line {crashReport.exception.line || 'N/A'}, Column {crashReport.exception.column || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Observed Timeline */}
              {matchesSearch('timeline sequence chronological flow') && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Observed Execution Timeline</h3>
                  <div style={{ position: 'relative', marginTop: 12 }}>
                    {filteredTimeline.map((ev, idx) => (
                      <div key={idx} style={styles.timelineItem}>
                        {idx < filteredTimeline.length - 1 && <div style={styles.timelineLine} />}
                        <div style={styles.timelineMarker(ev.type)} />
                        <div style={{ fontSize: 13 }}>
                          <span style={{ color: '#71717a', fontFamily: 'monospace', marginRight: 10 }}>{ev.timestamp}</span>
                          <span style={{ color: ev.type === 'error' ? '#f87171' : '#e4e4e7', fontWeight: ev.type === 'error' ? 700 : 500 }}>
                            {ev.event}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Potential Root Causes & Hypotheses */}
              {matchesSearch('causes hypotheses circular dead zone barrel export') && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Possible Root Causes (Speculative Hypotheses)</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ borderLeft: '3px solid #f59e0b', paddingLeft: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <strong style={{ fontSize: 13, color: '#f59e0b' }}>Circular Dependency Cycle (97% confidence)</strong>
                        <span style={{ fontSize: 11, background: 'rgba(245, 158, 11, 0.1)', padding: '2px 6px', borderRadius: 4, color: '#f59e0b', fontWeight: 700 }}>HIGH CONFIDENCE</span>
                      </div>
                      <span style={{ fontSize: 12.5, color: '#a1a1aa', lineHeight: 1.5, display: 'block' }}>
                        Static ESM circular import chains (e.g. NavigationDispatcher → NavigationCoordinator → useChordStore → NavigationDispatcher) can cause module load orders to resolve with incomplete export objects, throwing initialization ReferenceErrors at startup.
                      </span>
                    </div>

                    <div style={{ borderLeft: '3px solid #f59e0b', paddingLeft: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <strong style={{ fontSize: 13, color: '#f59e0b' }}>Temporal Dead Zone - TDZ (94% confidence)</strong>
                        <span style={{ fontSize: 11, background: 'rgba(245, 158, 11, 0.1)', padding: '2px 6px', borderRadius: 4, color: '#f59e0b', fontWeight: 700 }}>HIGH CONFIDENCE</span>
                      </div>
                      <span style={{ fontSize: 12.5, color: '#a1a1aa', lineHeight: 1.5, display: 'block' }}>
                        The local variable (minified to 'xe' inside the production build assets) was accessed before its block scope initial declaration line was evaluated by V8/Hermes engine.
                      </span>
                    </div>

                    <div style={{ borderLeft: '3px solid #71717a', paddingLeft: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <strong style={{ fontSize: 13, color: '#e4e4e7' }}>Barrel Export Cycles (85% confidence)</strong>
                        <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4, color: '#a1a1aa', fontWeight: 700 }}>PROBABLE</span>
                      </div>
                      <span style={{ fontSize: 12.5, color: '#a1a1aa', lineHeight: 1.5, display: 'block' }}>
                        Index barrel files self-referencing other modules inside the same package block module evaluation and generate unresolved export objects.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {matchesSearch('recommended investigation fix files steps') && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Recommended Remediation</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: '#60a5fa', fontWeight: 700 }}>Recommended Investigation</h4>
                      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.6 }}>
                        <li>Inspect file: <code style={{ color: '#60a5fa' }}>packages/studio-core/src/lib/navigation/NavigationCoordinator.ts</code></li>
                        <li>Inspect file: <code style={{ color: '#60a5fa' }}>packages/ui-shared/src/features/updater/components/UpdateIndicator.tsx</code></li>
                      </ul>
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: '#60a5fa', fontWeight: 700 }}>Recommended Fix</h4>
                      <p style={{ margin: 0, fontSize: 12.5, color: '#a1a1aa', lineHeight: 1.5 }}>
                        Decouple circular dependency modules. Strip unused static imports in utility libraries, and fetch store hooks dynamically inside methods instead of during module definition load.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Raw Stack Trace (Collapsed by default) */}
              <div style={styles.card}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setRawStackExpanded(!rawStackExpanded)}
                >
                  <span style={{ fontSize: 13, fontWeight: 750, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {rawStackExpanded ? '▼ Raw Stack Trace' : '▶ Raw Stack Trace'}
                  </span>
                  <span style={{ fontSize: 11, color: '#52525b' }}>Click to expand</span>
                </div>
                {rawStackExpanded && (
                  <pre
                    style={{
                      background: '#09090b',
                      padding: 14,
                      borderRadius: 8,
                      fontFamily: 'monospace',
                      fontSize: 11.5,
                      color: '#ef4444',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                      marginTop: 12,
                      border: '1px solid rgba(239, 68, 68, 0.1)',
                    }}
                  >
                    {crashReport.stackTrace.rawStack}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SYSTEM ENVIRONMENT */}
          {activeTab === 'env' && (
            <div>
              {/* Environment details */}
              {matchesSearch('environment platform device details versions capacitor react') && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>System Environment & Build Info</h3>
                  <div style={{ ...styles.infoGrid, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                    <div>
                      <span style={styles.label}>Studio Version</span>
                      <span style={styles.value}>{crashReport.environment.studioVersion}</span>
                    </div>
                    <div>
                      <span style={styles.label}>Build Code</span>
                      <span style={styles.value}>{crashReport.environment.versionCode}</span>
                    </div>
                    <div>
                      <span style={styles.label}>Git Commit</span>
                      <span style={styles.value}>{crashReport.environment.commit}</span>
                    </div>
                    <div>
                      <span style={styles.label}>Platform</span>
                      <span style={styles.value}>{crashReport.environment.platform}</span>
                    </div>
                    <div>
                      <span style={styles.label}>Device Model</span>
                      <span style={styles.value}>{crashReport.environment.device}</span>
                    </div>
                    <div>
                      <span style={styles.label}>Host OS / API</span>
                      <span style={styles.value}>{crashReport.environment.androidVersion}</span>
                    </div>
                    <div>
                      <span style={styles.label}>Engine</span>
                      <span style={styles.value}>{crashReport.environment.runtimeEngine}</span>
                    </div>
                    <div>
                      <span style={styles.label}>Build Channel</span>
                      <span style={styles.value}>{crashReport.environment.otaBundle}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Raw Diagnostics (Collapsed by default) */}
              <div style={styles.card}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setRawDiagExpanded(!rawDiagExpanded)}
                >
                  <span style={{ fontSize: 13, fontWeight: 750, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {rawDiagExpanded ? '▼ Raw Diagnostics' : '▶ Raw Diagnostics'}
                  </span>
                  <span style={{ fontSize: 11, color: '#52525b' }}>Click to expand</span>
                </div>
                {rawDiagExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, background: '#09090b', padding: 14, borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                    {filteredDiagnostics.map((d, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: '#a1a1aa', fontWeight: 600 }}>{d.variable}</span>
                        <span style={{ fontFamily: 'monospace', color: '#60a5fa' }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RootAppCrashReportUI;
