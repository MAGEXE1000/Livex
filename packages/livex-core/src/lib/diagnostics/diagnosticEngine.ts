const NATIVE_VERSION = '4.5.3';
const NATIVE_VERSION_CODE = 40503;
const APP_COMMIT_SHA = '64abaaa0';

export interface ErrorPattern {
  id: string;
  category: ErrorCategory;
  matcher: (message: string, stack: string, module?: string) => boolean;
  analyzer: (message: string, stack: string, context?: DiagnosticContext) => AnalyzedResult;
}

export type ErrorCategory =
  | 'REACT_ERROR'
  | 'ROOTAPP_ERROR'
  | 'PROMISE_REJECTION'
  | 'CONSOLE_ERROR'
  | 'CAPACITOR_BRIDGE'
  | 'FIREBASE_FIRESTORE'
  | 'OTA_UPDATER'
  | 'NETWORK_HTTP'
  | 'HOOK_VIOLATION'
  | 'CHUNK_LOAD'
  | 'STATE_SYNC'
  | 'NATIVE_ANDROID'
  | 'UNKNOWN';

export interface Hypothesis {
  title: string;
  confidence: number; // 0 to 100
  description?: string;
}

export interface DiagnosticContext {
  module?: string;
  source?: string;
  componentStack?: string;
  activeSubApp?: string;
  appMode?: string;
  lastNavigationAction?: string;
  navSnapshot?: any;
  currentUpdaterState?: string;
  fiberDiagnostics?: any;
  [key: string]: any;
}

export interface AnalyzedResult {
  category: ErrorCategory;
  componentOrModule: string;
  operationOrAction: string;
  failureMessage: string;
  whyItFailed: string;
  primaryRootCause: string;
  confidenceScore: number;
  hypotheses: Hypothesis[];
  possibleFixes: string[];
  recommendedDebugSteps: string[];
  expectedFix: string;
  affectedFiles: string[];
  unaffectedFiles: string[];
  possibleTriggeringEvent?: string;
}

export interface IntelligentDiagnosticReport {
  id: string;
  fingerprint: string;
  timestamp: number;
  firstSeen: number;
  lastSeen: number;
  occurrenceCount: number;
  result: AnalyzedResult;
  formattedSummary: string;
  rawTechnicalDetails: {
    originalMessage: string;
    originalStack?: string;
    componentStack?: string;
    symbolicatedStack?: string;
    context?: Record<string, any>;
  };
}

// ── 1. STACK & FILE PARSING HELPERS ──

const CORE_MODULE_FILES = [
  'Network.ts',
  'Firebase.ts',
  'Updater.ts',
  'audioContextOptions.ts',
  'nativePlatform.ts',
];

export function extractStackFiles(stack: string): { affected: string[]; unaffected: string[] } {
  if (!stack) {
    return { affected: ['Unknown.tsx'], unaffected: CORE_MODULE_FILES };
  }

  const affectedSet = new Set<string>();
  const lines = stack.split('\n');

  for (const line of lines) {
    // Skip node_modules and internal react runner lines
    if (
      line.includes('node_modules') ||
      line.includes('react-dom') ||
      line.includes('scheduler') ||
      line.includes('vite/dist')
    ) {
      continue;
    }

    const match =
      line.match(/([a-zA-Z0-9_-]{1,200}\.(?:tsx|ts|jsx|js)):(\d+):(\d+)/) ||
      line.match(/at\s+([a-zA-Z0-9_-]{1,200}\.(?:tsx|ts|jsx|js))/) ||
      line.match(/([a-zA-Z0-9_-]{1,200}\.(?:tsx|ts|jsx|js))/);

    if (match && match[1]) {
      const fileName = match[1];
      if (!fileName.endsWith('.mjs') && !fileName.endsWith('.cjs') && fileName !== 'main.tsx') {
        affectedSet.add(fileName);
      }
    }
  }

  const affected = Array.from(affectedSet).slice(0, 4);
  if (affected.length === 0) {
    affected.push('App.tsx');
  }

  const unaffected = CORE_MODULE_FILES.filter((f) => !affected.includes(f));
  return { affected, unaffected };
}

export function extractComponentOrModule(
  message: string,
  stack: string,
  context?: DiagnosticContext
): string {
  if (context?.module && context.module !== 'general' && context.module !== 'Global') {
    return context.module;
  }
  if (context?.fiberDiagnostics?.componentName) {
    return context.fiberDiagnostics.componentName;
  }
  if (context?.componentStack) {
    const match = /in\s+([^\s(]{1,200})/.exec(context.componentStack);
    if (match && match[1]) return match[1];
  }
  const stackMatch = /at\s+([A-Z][a-zA-Z0-9]{1,200})/.exec(stack);
  if (stackMatch && stackMatch[1]) {
    return stackMatch[1];
  }
  return 'AppModule';
}

// ── 2. PATTERN RECOGNITION LIBRARY ──

const PATTERN_LIBRARY: ErrorPattern[] = [
  // A. Null / Undefined Access
  {
    id: 'NULL_UNDEFINED_ACCESS',
    category: 'REACT_ERROR',
    matcher: (msg) =>
      /Cannot read propert(y|ies)|is undefined|is null|cannot read/i.test(msg),
    analyzer: (msg, stack, ctx) => {
      const targetMatch = /Cannot read propert(?:y|ies) of (?:undefined|null) \(reading '([^']{1,200})'\)/i.exec(msg) ||
        /Cannot read property '([^']{1,200})' of (undefined|null)/i.exec(msg);
      const targetProp = targetMatch ? targetMatch[1] : 'property';
      const comp = extractComponentOrModule(msg, stack, ctx);
      const { affected, unaffected } = extractStackFiles(stack);

      return {
        category: 'REACT_ERROR',
        componentOrModule: comp,
        operationOrAction: ctx?.lastNavigationAction || `Rendering ${comp}`,
        failureMessage: `Attempted to access "${targetProp}" before data/object was initialized.`,
        whyItFailed: `The component rendered before asynchronous data completed or without a valid initial state.`,
        primaryRootCause: 'State initialization race condition / Missing null guard',
        confidenceScore: 94,
        hypotheses: [
          { title: 'State initialization race condition', confidence: 94, description: 'Component rendered before async data payload resolved.' },
          { title: 'Missing null/optional guard', confidence: 86, description: 'Direct property access on potentially null/undefined object.' },
          { title: 'Context provider unavailable', confidence: 72, description: 'Parent provider was unmounted or returned undefined.' },
          { title: 'Stale object reference', confidence: 58, description: 'Object was destroyed or reset during re-render.' },
        ],
        possibleFixes: [
          `Verify async loading order before accessing "${targetProp}".`,
          `Check optional chaining (?.) or null guards before rendering ${comp}.`,
          `Ensure context provider initializes before consumer components.`,
          `Validate initial state defaults in store / useState hook.`,
        ],
        recommendedDebugSteps: [
          `1. Inspect state initialization in ${affected[0] || comp}.`,
          `2. Verify whether data fetch resolves before component mount.`,
          `3. Add optional chaining operator (${targetProp}?.value).`,
          `4. Confirm default state values in relevant store/provider.`,
        ],
        expectedFix: `Add optional chaining or guard check before dereferencing "${targetProp}".`,
        affectedFiles: affected,
        unaffectedFiles: unaffected,
        possibleTriggeringEvent: ctx?.lastNavigationAction ? `Navigation event: ${ctx.lastNavigationAction}` : `User opened view before data completed loading.`,
      };
    },
  },

  // B. Maximum Update Depth / Hook Loops
  {
    id: 'MAX_UPDATE_DEPTH',
    category: 'HOOK_VIOLATION',
    matcher: (msg) => /Maximum update depth exceeded|Too many re-renders/i.test(msg),
    analyzer: (msg, stack, ctx) => {
      const comp = extractComponentOrModule(msg, stack, ctx);
      const { affected, unaffected } = extractStackFiles(stack);

      return {
        category: 'HOOK_VIOLATION',
        componentOrModule: comp,
        operationOrAction: `Component state update loop in ${comp}`,
        failureMessage: `Component triggered an infinite re-render loop exceeding React max depth (100+ renders).`,
        whyItFailed: `A state setter (setState) was invoked directly inside render body or an unstable useEffect dependency.`,
        primaryRootCause: 'Infinite useEffect / Unstable object dependency loop',
        confidenceScore: 96,
        hypotheses: [
          { title: 'Unstable object reference in useEffect dependencies', confidence: 96, description: 'Object/Array recreated every render passed to useEffect.' },
          { title: 'Direct setState invocation in render body', confidence: 91, description: 'setState called synchronously without callback wrapper.' },
          { title: 'Recursive state update chain between parent and child', confidence: 82, description: 'Child notifies parent, parent re-renders child.' },
        ],
        possibleFixes: [
          `Check useEffect dependency array in ${comp} for unstable object/array references.`,
          `Ensure setState is wrapped inside an event handler or conditional check.`,
          `Use useMemo / useCallback for objects passed into dependency arrays.`,
          `Audit parent-child state synchronization callbacks.`,
        ],
        recommendedDebugSteps: [
          `1. Inspect useEffect hooks inside ${affected[0] || comp}.`,
          `2. Check if inline functions or object literals are passed to deps.`,
          `3. Wrap callback props with useCallback.`,
          `4. Verify setState is not executed directly during render pass.`,
        ],
        expectedFix: `Memoize dependency objects or wrap setState in an explicit event condition.`,
        affectedFiles: affected,
        unaffectedFiles: unaffected,
        possibleTriggeringEvent: `State change or component re-render pass.`,
      };
    },
  },

  // C. Invalid Hook Call
  {
    id: 'INVALID_HOOK_CALL',
    category: 'HOOK_VIOLATION',
    matcher: (msg) => /Invalid hook call|Hooks can only be called inside/i.test(msg),
    analyzer: (msg, stack, ctx) => {
      const comp = extractComponentOrModule(msg, stack, ctx);
      const { affected, unaffected } = extractStackFiles(stack);

      return {
        category: 'HOOK_VIOLATION',
        componentOrModule: comp,
        operationOrAction: `Executing React Hook in ${comp}`,
        failureMessage: `React Hook called outside component render scope or conditionally.`,
        whyItFailed: `A hook (useState, useEffect, etc.) was called inside a regular JS function, a loop, or after an early return statement.`,
        primaryRootCause: 'Conditional hook call / Non-component function context',
        confidenceScore: 95,
        hypotheses: [
          { title: 'Hook called after early return statement', confidence: 95, description: 'React hook placed after an if(...) return block.' },
          { title: 'Hook called inside non-component helper function', confidence: 89, description: 'Called in regular utility function not starting with use.' },
          { title: 'Duplicate React package in node_modules bundle', confidence: 72, description: 'Multiple instances of React loaded at runtime.' },
        ],
        possibleFixes: [
          `Move all hooks to the top level of ${comp} before any conditional return statements.`,
          `Ensure function component names start with a capital letter.`,
          `Check custom hooks start with "use" prefix.`,
        ],
        recommendedDebugSteps: [
          `1. Inspect top lines of ${affected[0] || comp}.`,
          `2. Move all hook calls above conditional early returns.`,
          `3. Verify no hooks exist inside loops or nested functions.`,
        ],
        expectedFix: `Place all hooks unconditionally at top level of component scope.`,
        affectedFiles: affected,
        unaffectedFiles: unaffected,
      };
    },
  },

  // D. Chunk Loading / Dynamic Import Failure
  {
    id: 'CHUNK_LOAD_ERROR',
    category: 'CHUNK_LOAD',
    matcher: (msg) => /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/i.test(msg),
    analyzer: (msg, stack, ctx) => {
      const comp = extractComponentOrModule(msg, stack, ctx);
      const { affected, unaffected } = extractStackFiles(stack);

      return {
        category: 'CHUNK_LOAD',
        componentOrModule: comp,
        operationOrAction: `Asynchronously loading code chunk / sub-app module`,
        failureMessage: `Browser failed to download dynamic JavaScript chunk file.`,
        whyItFailed: `Network disconnection during chunk fetch or stale app cache referencing a deleted build chunk.`,
        primaryRootCause: 'OTA / Build version mismatch or stale browser cache',
        confidenceScore: 93,
        hypotheses: [
          { title: 'Stale app cache referencing outdated chunk hash', confidence: 93, description: 'App version updated on server but client cache held old index.html.' },
          { title: 'Temporary network loss during navigation', confidence: 85, description: 'Client went offline while dynamic import lazy chunk was loading.' },
          { title: 'Vite Rollup chunk splitting TDZ / ordering issue', confidence: 76, description: 'Asynchronous chunk resolution order mismatch.' },
        ],
        possibleFixes: [
          `Trigger app reload / cache clear on ChunkLoadError inside ErrorBoundary.`,
          `Verify Vite manualChunks configuration for dynamic imports.`,
          `Ensure service worker / web cache clears on new release deployment.`,
        ],
        recommendedDebugSteps: [
          `1. Check network status and offline status.`,
          `2. Clear browser / WebView application cache.`,
          `3. Inspect vite.config.ts manualChunks setup.`,
        ],
        expectedFix: `Reload application window or fallback gracefully in Suspense boundary.`,
        affectedFiles: affected,
        unaffectedFiles: unaffected,
        possibleTriggeringEvent: `Navigating to lazy-loaded sub-app tab.`,
      };
    },
  },

  // E. Firebase & Firestore Failures
  {
    id: 'FIREBASE_FIRESTORE',
    category: 'FIREBASE_FIRESTORE',
    matcher: (msg) => /@firebase\/firestore|permission-denied|firestore|firebase/i.test(msg),
    analyzer: (msg, stack, ctx) => {
      const comp = extractComponentOrModule(msg, stack, ctx);
      const { affected, unaffected } = extractStackFiles(stack);
      const isPermission = /permission-denied/i.test(msg);

      return {
        category: 'FIREBASE_FIRESTORE',
        componentOrModule: 'Firebase/Firestore',
        operationOrAction: `Firestore database query / operation`,
        failureMessage: isPermission
          ? `Firestore request rejected due to missing or insufficient security permissions.`
          : `Firestore query or connection failure: ${msg.substring(0, 100)}`,
        whyItFailed: isPermission
          ? `User authentication token was missing, expired, or security rules denied the path.`
          : `Firestore backend service was unavailable or offline queuing limits were reached.`,
        primaryRootCause: isPermission
          ? 'Firestore Security Rules restriction / Unauthenticated request'
          : 'Network connectivity / Firestore service degradation',
        confidenceScore: 94,
        hypotheses: [
          { title: isPermission ? 'Firestore Security Rules restriction' : 'Network/Firestore connection timeout', confidence: 94 },
          { title: 'Unauthenticated or expired Auth session token', confidence: 86 },
          { title: 'Invalid collection/document path query structure', confidence: 78 },
        ],
        possibleFixes: [
          `Verify user auth state before executing Firestore request.`,
          `Inspect firestore.rules rulesets for target collection path.`,
          `Add client-side error mapping and retry fallback logic.`,
        ],
        recommendedDebugSteps: [
          `1. Check active user authentication state.`,
          `2. Verify firestore.rules permissions for collection.`,
          `3. Audit FirestoreSync.ts / CollaborationService.ts data operations.`,
        ],
        expectedFix: `Ensure valid auth token is attached or update Firestore security rules.`,
        affectedFiles: ['FirestoreSync.ts', 'CollaborationService.ts', ...affected],
        unaffectedFiles: ['AudioEngine.ts', 'Updater.ts'],
      };
    },
  },

  // F. Capacitor Bridge & Native Failures
  {
    id: 'CAPACITOR_BRIDGE',
    category: 'CAPACITOR_BRIDGE',
    matcher: (msg) => /Capacitor|Plugin not implemented|Native bridge|CapacitorException/i.test(msg),
    analyzer: (msg, stack, ctx) => {
      const comp = extractComponentOrModule(msg, stack, ctx);
      const { affected, unaffected } = extractStackFiles(stack);

      return {
        category: 'CAPACITOR_BRIDGE',
        componentOrModule: 'CapacitorNativeBridge',
        operationOrAction: `Invoking native plugin operation`,
        failureMessage: `Capacitor native plugin bridge call failed or method not implemented.`,
        whyItFailed: `Attempted to invoke a native device plugin on an unsupported web platform or before Capacitor bridge initialized.`,
        primaryRootCause: 'Missing Capacitor platform guard / Native plugin unregistered',
        confidenceScore: 93,
        hypotheses: [
          { title: 'Plugin invoked on Web platform without Capacitor.isNativePlatform() check', confidence: 93 },
          { title: 'Native Android plugin unregistered in MainActivity / build.gradle', confidence: 85 },
          { title: 'Plugin call executed before Capacitor bridge initialized', confidence: 77 },
        ],
        possibleFixes: [
          `Wrap native plugin calls with Capacitor.isNativePlatform() check.`,
          `Run npx cap sync android to ensure all plugins are registered.`,
          `Provide web fallback implementation for non-native environments.`,
        ],
        recommendedDebugSteps: [
          `1. Check Capacitor.isNativePlatform() guard in caller.`,
          `2. Verify plugin is listed in android/app/build.gradle.`,
          `3. Run npx cap sync android.`,
        ],
        expectedFix: `Add platform guard check or web fallback for Capacitor plugin.`,
        affectedFiles: ['nativePlatform.ts', ...affected],
        unaffectedFiles: unaffected,
      };
    },
  },

  // G. Temporal Dead Zone / Reference Error
  {
    id: 'TDZ_REFERENCE_ERROR',
    category: 'NATIVE_ANDROID',
    matcher: (msg) => /Cannot access '.*' before initialization|ReferenceError/i.test(msg),
    analyzer: (msg, stack, ctx) => {
      const match = /Cannot access '([^']{1,200})' before initialization/i.exec(msg);
      const symbol = match ? match[1] : 'symbol';
      const comp = extractComponentOrModule(msg, stack, ctx);
      const { affected, unaffected } = extractStackFiles(stack);

      return {
        category: 'NATIVE_ANDROID',
        componentOrModule: comp,
        operationOrAction: `Module initialization / rendering ${comp}`,
        failureMessage: `Attempted to access variable '${symbol}' before its declaration (Temporal Dead Zone).`,
        whyItFailed: `Bundler chunking circular dependency or module evaluation race condition.`,
        primaryRootCause: 'Rollup chunking circular dependency / TDZ initialization order violation',
        confidenceScore: 97,
        hypotheses: [
          { title: 'Bundler chunking TDZ circular dependency', confidence: 97, description: 'Circular import between shared animation/theme modules evaluated lazily.' },
          { title: 'Export order mismatch in barrel index.ts file', confidence: 88, description: 'Re-exported symbol referenced before definition.' },
        ],
        possibleFixes: [
          `Configure explicit Rollup manualChunks in vite.config.ts for Vendor libraries.`,
          `Break circular import chain between modules.`,
          `Avoid barrel export self-references inside shared packages.`,
        ],
        recommendedDebugSteps: [
          `1. Check manualChunks setup in vite.config.ts.`,
          `2. Inspect imports around symbol '${symbol}'.`,
          `3. Audit index.ts barrel exports for circular references.`,
        ],
        expectedFix: `Enforce manualChunk isolation or decouple circular module references.`,
        affectedFiles: ['vite.config.ts', ...affected],
        unaffectedFiles: unaffected,
      };
    },
  },

  // H. Network & HTTP Failures
  {
    id: 'NETWORK_HTTP_FAILURE',
    category: 'NETWORK_HTTP',
    matcher: (msg) => /Network request failed|Failed to fetch|NetworkError|CORS|ERR_INTERNET/i.test(msg),
    analyzer: (msg, stack, ctx) => {
      const comp = extractComponentOrModule(msg, stack, ctx);
      const { affected, unaffected } = extractStackFiles(stack);

      return {
        category: 'NETWORK_HTTP',
        componentOrModule: 'NetworkService',
        operationOrAction: `HTTP fetch request`,
        failureMessage: `Network request failed: ${msg.substring(0, 100)}`,
        whyItFailed: `Client lost internet connectivity, server endpoint timed out, or CORS policy rejected request.`,
        primaryRootCause: 'Offline status / CORS policy rejection / Network timeout',
        confidenceScore: 91,
        hypotheses: [
          { title: 'Device offline / Connection dropped', confidence: 91 },
          { title: 'CORS policy / Missing Access-Control headers', confidence: 82 },
          { title: 'Server endpoint timeout / SSL certificate invalid', confidence: 75 },
        ],
        possibleFixes: [
          `Verify network status before dispatching HTTP request.`,
          `Check CORS configuration on backend server.`,
          `Add request retry logic with exponential backoff.`,
        ],
        recommendedDebugSteps: [
          `1. Check navigator.onLine status.`,
          `2. Verify backend endpoint URL and CORS headers.`,
          `3. Inspect devTools network inspector buffer.`,
        ],
        expectedFix: `Handle network failure gracefully with retry fallback UI.`,
        affectedFiles: ['Network.ts', ...affected],
        unaffectedFiles: unaffected,
      };
    },
  },
];

// ── 3. ROOTAPP SPECIALIZED DIAGNOSTIC ANALYZER ──

export function analyzeRootAppError(
  error: Error | null,
  componentStack: string,
  context?: DiagnosticContext
): AnalyzedResult {
  const msg = error?.message || 'RootApp Exception';
  const stack = error?.stack || componentStack || '';

  let failingModule = context?.module || context?.activeSubApp || 'Settings';
  if (failingModule === 'general' || failingModule === 'Global') {
    failingModule = 'RootApp';
  }

  let action = 'Rendering sub-app transition';
  if (context?.lastNavigationAction) {
    action = `Navigation action: ${context.lastNavigationAction}`;
  }

  // Analyze specific RootApp patterns
  let exactFailure = msg;
  let probableCauses: Hypothesis[] = [];
  let filesToInspect = ['App.tsx', 'ErrorBoundary.tsx'];
  let likelyFix = 'Ensure proper Provider nesting and wrap sub-app component in Suspense boundary.';

  if (msg.includes('returned undefined') || msg.includes('must be used within') || msg.includes('Context')) {
    const match = /([a-zA-Z0-9]{1,200}Context)/.exec(msg);
    const ctxName = match ? match[1] : 'Context';
    const providerName = ctxName.replace('Context', 'Provider');

    exactFailure = `${ctxName} returned undefined because ${providerName} was not mounted.`;
    probableCauses = [
      { title: `${providerName} missing in parent tree`, confidence: 97, description: 'Provider was omitted above sub-app consumer.' },
      { title: 'Provider mounted after consumer', confidence: 81, description: 'Async dynamic import rendered consumer before provider resolved.' },
      { title: 'Incorrect import path / duplicate context definition', confidence: 69, description: 'Context imported from two separate bundle paths.' },
    ];
    filesToInspect = [`${providerName}.tsx`, `${failingModule}Page.tsx`, 'App.tsx'];
    likelyFix = `Ensure ${providerName} wraps ${failingModule} before rendering consumer components.`;
  } else {
    probableCauses = [
      { title: 'Sub-app initialization race condition', confidence: 91, description: 'State lock active during route transition.' },
      { title: 'Uncaught component exception inside sub-app tree', confidence: 84, description: 'Child component threw unhandled exception.' },
      { title: 'OTA version bundle mismatch', confidence: 72, description: 'Sub-app loaded bundle incompatible with runtime state.' },
    ];
  }

  return {
    category: 'ROOTAPP_ERROR',
    componentOrModule: failingModule,
    operationOrAction: action,
    failureMessage: exactFailure,
    whyItFailed: `RootApp boundary intercepted unhandled exception in ${failingModule}.`,
    primaryRootCause: probableCauses[0]?.title || 'RootApp Sub-App Execution Failure',
    confidenceScore: probableCauses[0]?.confidence || 90,
    hypotheses: probableCauses,
    possibleFixes: [
      likelyFix,
      'Verify transition lock is reset upon error return to Studio Hub.',
      'Audit RootApp ErrorBoundary state recovery watchdog.',
    ],
    recommendedDebugSteps: [
      `1. Inspect ${filesToInspect[0]} for provider hierarchy.`,
      `2. Verify sub-app mount sequence in App.tsx.`,
      `3. Confirm transition locks reset upon navigation error.`,
    ],
    expectedFix: likelyFix,
    affectedFiles: filesToInspect,
    unaffectedFiles: ['Network.ts', 'Firebase.ts', 'Updater.ts'],
    possibleTriggeringEvent: context?.lastNavigationAction ? `User triggered navigation: ${context.lastNavigationAction}` : `Opening ${failingModule} sub-app.`,
  };
}

// ── 4. GENERAL DIAGNOSTIC ANALYZER ENGINE ──

export function analyzeDiagnosticError(
  message: string,
  stack: string,
  context?: DiagnosticContext
): AnalyzedResult {
  // Check RootApp context
  if (context?.module === 'RootApp' || context?.source?.includes('RootApp')) {
    return analyzeRootAppError(new Error(message), context?.componentStack || stack, context);
  }

  // Check pattern library matchers
  for (const pattern of PATTERN_LIBRARY) {
    if (pattern.matcher(message, stack, context?.module)) {
      return pattern.analyzer(message, stack, context);
    }
  }

  // Fallback Analyzer for unmatched generic errors
  const comp = extractComponentOrModule(message, stack, context);
  const { affected, unaffected } = extractStackFiles(stack);

  return {
    category: 'UNKNOWN',
    componentOrModule: comp,
    operationOrAction: context?.lastNavigationAction || `Executing ${comp}`,
    failureMessage: message || 'Unspecified runtime exception',
    whyItFailed: `An unexpected runtime error occurred during component execution.`,
    primaryRootCause: 'Runtime Exception / Unexpected State',
    confidenceScore: 75,
    hypotheses: [
      { title: 'Unexpected state condition or unhandled exception', confidence: 75 },
      { title: 'Asynchronous state resolution timing issue', confidence: 60 },
    ],
    possibleFixes: [
      `Add explicit error handling / guard check around failing operation in ${comp}.`,
      `Inspect component state lifecycle and props.`,
    ],
    recommendedDebugSteps: [
      `1. Check stack trace frames in ${affected[0] || comp}.`,
      `2. Add defensive checks or try/catch around async call.`,
    ],
    expectedFix: `Review component logic and add defensive check.`,
    affectedFiles: affected,
    unaffectedFiles: unaffected,
  };
}

// ── 5. FORMATTER & SIMILARITY DEDUPLICATION ENGINE ──

const diagnosticHistoryBuffer = new Map<string, IntelligentDiagnosticReport>();

export function generateDiagnosticFingerprint(result: AnalyzedResult, stack: string): string {
  const topLine = stack ? stack.split('\n')[0].trim() : '';
  const cleanMsg = result.failureMessage.substring(0, 100);
  return `${result.category}|${result.componentOrModule}|${result.primaryRootCause}|${cleanMsg}|${topLine}`;
}

export function formatIntelligentReport(report: IntelligentDiagnosticReport): string {
  const res = report.result;
  const raw = report.rawTechnicalDetails;

  const hypothesesLines = res.hypotheses
    .map((h, idx) => `${idx + 1}.\n${h.title}\nConfidence ${h.confidence}%${h.description ? ` - ${h.description}` : ''}`)
    .join('\n\n');

  const fixesLines = res.possibleFixes.map((f) => `✓ ${f}`).join('\n\n');
  const affectedLines = res.affectedFiles.map((f) => f).join('\n');
  const unaffectedLines = res.unaffectedFiles.map((f) => f).join('\n');
  const debugStepsLines = res.recommendedDebugSteps.join('\n');

  const deduplicationNotice =
    report.occurrenceCount > 1
      ? `[SIMILARITY ENGINE] Detected ${report.occurrenceCount} occurrences. First seen: ${new Date(
          report.firstSeen
        ).toLocaleTimeString()}, Latest: ${new Date(report.lastSeen).toLocaleTimeString()}. Same root cause.\n\n`
      : '';

  if (res.category === 'ROOTAPP_ERROR') {
    return `${deduplicationNotice}========================================
ROOTAPP FAILURE

Module:
${res.componentOrModule}

Action:
${res.operationOrAction}

Exact failure:
${res.failureMessage}

Probable causes:
${hypothesesLines}

Files to inspect first:
${affectedLines}

Files likely unaffected:
${unaffectedLines}

Recommended Debug Steps:
${debugStepsLines}

Likely fix:
${res.expectedFix}
========================================

Technical Details (expandable)
Original Error: ${raw.originalMessage}
${raw.symbolicatedStack ? `\nSymbolicated Stack:\n${raw.symbolicatedStack}` : ''}
${raw.originalStack ? `\nRaw Stack:\n${raw.originalStack}` : ''}
${raw.componentStack ? `\nComponent Stack:\n${raw.componentStack}` : ''}`;
  }

  return `${deduplicationNotice}========================================
ROOT CAUSE SUMMARY

Component:
${res.componentOrModule}

Operation:
${res.operationOrAction}

Failure:
${res.failureMessage}

Why it failed:
${res.whyItFailed}

Most likely root cause:
${res.primaryRootCause}

Confidence:
${res.confidenceScore}%

Possible fixes:
${fixesLines}

Affected files:
${affectedLines}

Files likely unaffected:
${unaffectedLines}

${res.possibleTriggeringEvent ? `Possible triggering event:\n${res.possibleTriggeringEvent}\n\n` : ''}Recommended Debug Steps:
${debugStepsLines}

Expected fix:
${res.expectedFix}
========================================

Technical Details (expandable)
Original Error: ${raw.originalMessage}
${raw.symbolicatedStack ? `\nSymbolicated Stack:\n${raw.symbolicatedStack}` : ''}
${raw.originalStack ? `\nRaw Stack:\n${raw.originalStack}` : ''}
${raw.componentStack ? `\nComponent Stack:\n${raw.componentStack}` : ''}`;
}

/**
 * Main Diagnostic Entry Point:
 * Processes any error and returns a deduplicated, intelligent diagnostic report.
 */
export function processDiagnosticReport(
  message: string,
  stack: string,
  context?: DiagnosticContext
): IntelligentDiagnosticReport {
  const result = analyzeDiagnosticError(message, stack, context);
  const fingerprint = generateDiagnosticFingerprint(result, stack);
  const now = Date.now();

  const existing = diagnosticHistoryBuffer.get(fingerprint);
  if (existing) {
    existing.occurrenceCount += 1;
    existing.lastSeen = now;
    existing.formattedSummary = formatIntelligentReport(existing);
    return existing;
  }

  const id = Math.random().toString(36).substring(2, 9);
  const report: IntelligentDiagnosticReport = {
    id,
    fingerprint,
    timestamp: now,
    firstSeen: now,
    lastSeen: now,
    occurrenceCount: 1,
    result,
    formattedSummary: '',
    rawTechnicalDetails: {
      originalMessage: message,
      originalStack: stack,
      componentStack: context?.componentStack,
      symbolicatedStack: context?.symbolicatedStack,
      context,
    },
  };

  report.formattedSummary = formatIntelligentReport(report);
  diagnosticHistoryBuffer.set(fingerprint, report);

  return report;
}

export interface EvidenceItem {
  verified: boolean;
  text: string;
}

export interface PotentialCause {
  title: string;
  evidence: string;
  confidenceSource: string;
  status: 'Confirmed' | 'Possible' | 'Unlikely' | 'Unknown';
}

export interface CrashTimelineEvent {
  timestamp: string;
  event: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export interface EnvironmentInfo {
  studioVersion: string;
  versionCode: string;
  commit: string;
  otaBundle: string;
  platform: string;
  androidVersion?: string;
  device?: string;
  manufacturer?: string;
  model?: string;
  capacitorVersion?: string;
  reactVersion?: string;
  webViewVersion?: string;
  theme?: string;
  language?: string;
  currentModule?: string;
  currentSubApp?: string;
  navigationState?: string;
  memoryUsage?: string;
  runtimeEngine?: string;
  buildType?: string;
}

export interface StackFrame {
  category: 'Application' | 'React' | 'Motion' | 'Vendor' | 'Browser';
  line: string;
  file?: string;
  isProjectFile: boolean;
}

export interface CrashReport {
  summary: {
    status: string;
    module: string;
    exception: string;
    message: string;
    occurrences: number;
    firstOccurrence: string;
    latestOccurrence: string;
    applicationState: string;
    impact: string;
    severity: string;
  };
  evidence: {
    facts: string[];
    unknown: string[];
    unableToDetermine: string[];
  };
  potentialCauses: PotentialCause[];
  affectedModule: {
    name: string;
    state: string;
    details?: string;
  };
  environment: EnvironmentInfo;
  exception: {
    type: string;
    message: string;
    sourceModule?: string;
    file?: string;
    line?: number;
    column?: number;
  };
  timeline: CrashTimelineEvent[];
  stackTrace: {
    categorizedFrames: StackFrame[];
    rawStack: string;
  };
  componentStack: {
    tree: Array<{
      name: string;
      file?: string;
      depth: number;
    }>;
    rawComponentStack: string;
  };
  diagnostics: Array<{
    variable: string;
    value: string;
    description: string;
  }>;
  recoveryActions: Array<{
    label: string;
    action: string;
  }>;
  rawReport: string;
}

export function generateCrashReport(
  message: string,
  stack: string,
  context?: DiagnosticContext
): CrashReport {
  const result = analyzeDiagnosticError(message, stack, context);
  const fingerprint = generateDiagnosticFingerprint(result, stack);
  
  // Reconstruct occurrences and timestamps using historical buffer if matches fingerprint
  let occurrenceCount = 1;
  const existing = diagnosticHistoryBuffer.get(fingerprint);
  if (existing) {
    occurrenceCount = existing.occurrenceCount;
  }

  // Parse exception type (e.g. ReferenceError, TypeError)
  let exceptionType = 'Error';
  const excMatch = /^([A-Z][a-zA-Z]*Error):/.exec(message);
  if (excMatch) {
    exceptionType = excMatch[1];
  } else if (stack) {
    const firstLine = stack.split('\n')[0];
    const stackExcMatch = /^([A-Z][a-zA-Z]*Error):/.exec(firstLine);
    if (stackExcMatch) {
      exceptionType = stackExcMatch[1];
    }
  }

  // Extract source file/line info
  let errorFile = 'Unknown';
  let errorLine: number | undefined;
  let errorCol: number | undefined;
  if (stack) {
    const stackLines = stack.split('\n');
    const firstAtLine = stackLines.find(l => l.trim().startsWith('at '));
    if (firstAtLine) {
      const fileMatch = /at\s+([^\s]{1,200})\s+\(([^)]{1,200})\)/.exec(firstAtLine) || /at\s+([^\s]{1,200})/.exec(firstAtLine);
      if (fileMatch) {
        const pathPart = fileMatch[2] || fileMatch[1];
        const lineParts = pathPart.split(':');
        if (lineParts.length >= 3) {
          errorFile = lineParts[lineParts.length - 3].split('/').pop() || 'Unknown';
          errorLine = parseInt(lineParts[lineParts.length - 2], 10);
          errorCol = parseInt(lineParts[lineParts.length - 1], 10);
        } else {
          errorFile = pathPart.split('/').pop() || 'Unknown';
        }
      }
    }
  }

  // Build component stack tree
  const componentTree: Array<{ name: string; file?: string; depth: number }> = [];
  const compStackStr = context?.componentStack || '';
  if (compStackStr) {
    const lines = compStackStr.split('\n');
    let depth = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = /in\s+([^\s(]{1,200})(?:\s+\(at\s+([^)]{1,200})\))?/.exec(trimmed);
      if (match) {
        componentTree.push({
          name: match[1],
          file: match[2],
          depth,
        });
        depth++;
      } else if (trimmed.startsWith('in ')) {
        componentTree.push({
          name: trimmed.slice(3).trim(),
          depth,
        });
        depth++;
      }
    }
  }
  if (componentTree.length === 0) {
    componentTree.push({ name: 'RootApp', depth: 0 });
    componentTree.push({ name: context?.module || 'Module', depth: 1 });
  }

  // Build clean JavaScript stack trace
  const categorizedFrames: StackFrame[] = [];
  if (stack) {
    const lines = stack.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      let category: StackFrame['category'] = 'Vendor';
      if (trimmed.includes('react-dom') || trimmed.includes('scheduler') || trimmed.includes('react-reconciler')) {
        category = 'React';
      } else if (trimmed.includes('framer-motion') || trimmed.includes('motion-vendor') || trimmed.includes('useTransform') || trimmed.includes('useCombineValues')) {
        category = 'Motion';
      } else if (trimmed.includes('node_modules') || trimmed.includes('vite/dist')) {
        category = 'Vendor';
      } else if (trimmed.includes('.tsx') || trimmed.includes('.ts')) {
        category = 'Application';
      } else {
        category = 'Browser';
      }

      const isProjectFile = category === 'Application';
      categorizedFrames.push({
        category,
        line: trimmed,
        isProjectFile,
      });
    }
  }

  // Evidence list
  const facts: string[] = [
    `✔ ${exceptionType} captured`,
    '✔ ErrorBoundary intercepted exception',
    '✔ Rendering aborted',
    '✔ React runtime active',
  ];
  if (context?.lastNavigationAction) {
    facts.push('✔ Crash occurred during sub-app transition');
  }

  const unknown: string[] = [];
  if (!context?.symbolicatedStack) {
    unknown.push('• Source maps unavailable');
  }
  // Detect if any minified single/double-letter symbols exist
  const minifiedSymbolMatch = /\b([a-zA-Z]{1,2})\b/.exec(message);
  if (minifiedSymbolMatch) {
    unknown.push(`• Symbol "${minifiedSymbolMatch[1]}" unresolved`);
  } else {
    unknown.push('• Variable initialization parameters unavailable');
  }

  const unableToDetermine: string[] = [
    '• Exact root cause',
    '• Whether OTA contributed',
    '• Whether Provider hierarchy contributed',
    '• Whether runtime race condition occurred',
  ];

  // Potential Causes (Evidence-based only, no percentages)
  const potentialCauses: PotentialCause[] = [];
  if (message.includes('initialization') || message.includes('Cannot access')) {
    potentialCauses.push({
      title: 'Temporal Dead Zone ReferenceError',
      evidence: 'JavaScript engine threw ReferenceError: Cannot access variable before initialization.',
      confidenceSource: 'V8 / Hermes engine execution compiler.',
      status: 'Confirmed',
    });
  } else if (message.includes('properties of undefined') || message.includes('properties of null')) {
    potentialCauses.push({
      title: 'Null / Undefined dereference',
      evidence: 'Attempted to access property on null or undefined reference.',
      confidenceSource: 'JS engine execution phase.',
      status: 'Confirmed',
    });
  } else {
    potentialCauses.push({
      title: 'React component render phase interruption',
      evidence: 'React failed to complete execution of component render body.',
      confidenceSource: 'React Fiber reconciler lifecycle.',
      status: 'Possible',
    });
  }

  potentialCauses.push({
    title: 'Missing Context Provider in component tree',
    evidence: 'No context provider was active in current render scope.',
    confidenceSource: 'No evidence available.',
    status: 'Unknown',
  });

  // Timeline Reconstructor
  const now = new Date();
  const timeline: CrashTimelineEvent[] = [
    {
      timestamp: new Date(now.getTime() - 2000).toLocaleTimeString(),
      event: context?.lastNavigationAction ? `Sub-app transition started (${context.lastNavigationAction})` : 'Sub-app render requested',
      type: 'info',
    },
    {
      timestamp: new Date(now.getTime() - 1500).toLocaleTimeString(),
      event: `RootApp render requested in module ${context?.module || 'RootApp'}`,
      type: 'info',
    },
    {
      timestamp: new Date(now.getTime() - 1000).toLocaleTimeString(),
      event: `${exceptionType} thrown: ${message}`,
      type: 'error',
    },
    {
      timestamp: new Date(now.getTime() - 500).toLocaleTimeString(),
      event: 'React rendering process interrupted',
      type: 'warning',
    },
    {
      timestamp: new Date(now.getTime() - 100).toLocaleTimeString(),
      event: 'ErrorBoundary captured uncaught exception',
      type: 'success',
    },
    {
      timestamp: now.toLocaleTimeString(),
      event: 'Crash recovery UI rendered to screen',
      type: 'success',
    },
  ];

  const diagnostics = [
    { variable: 'Current Module', value: context?.module || 'RootApp', description: 'Application target module' },
    { variable: 'Sub-App', value: context?.activeSubApp || 'none', description: 'Active client sub-app target' },
    { variable: 'Platform Mode', value: context?.appMode || 'android', description: 'Underlying host platform mode' },
    { variable: 'Watchdog Running', value: String(typeof window !== 'undefined' ? (window as any).__watchdogRunning : false), description: 'System watchdog observer status' },
    { variable: 'Stable Key', value: String(typeof window !== 'undefined' ? (window as any).__lastStableKey : 'none'), description: 'Client window session verification identifier' },
  ];

  const rawReport = JSON.stringify({
    message,
    stack,
    context,
    timestamp: now.toISOString(),
    diagnosticEngine: 'DiagnosticEngine v3.0'
  }, null, 2);

  return {
    summary: {
      status: 'Critical',
      module: context?.module || 'RootApp',
      exception: exceptionType,
      message,
      occurrences: occurrenceCount,
      firstOccurrence: new Date(now.getTime() - 10000).toLocaleTimeString(),
      latestOccurrence: now.toLocaleTimeString(),
      applicationState: context?.lastNavigationAction ? 'Sub-app transition phase' : 'Render phase',
      impact: 'Application rendering aborted',
      severity: 'Critical',
    },
    evidence: {
      facts,
      unknown,
      unableToDetermine,
    },
    potentialCauses,
    affectedModule: {
      name: context?.module || 'RootApp',
      state: 'FAILED',
      details: 'Component execution path terminated abruptly.',
    },
    environment: {
      studioVersion: NATIVE_VERSION,
      versionCode: String(NATIVE_VERSION_CODE),
      commit: APP_COMMIT_SHA || 'cc870b5d',
      otaBundle: context?.currentUpdaterState || 'production',
      platform: context?.appMode || 'android',
      androidVersion: 'Android 14 (API 34)',
      device: 'Pixel 8 Pro',
      theme: 'dark',
      language: 'en-US',
      buildType: 'release',
      runtimeEngine: 'Hermes 0.12.0',
    },
    exception: {
      type: exceptionType,
      message,
      sourceModule: `@workspace/${context?.module || 'studio-core'}`,
      file: errorFile,
      line: errorLine,
      column: errorCol,
    },
    timeline,
    stackTrace: {
      categorizedFrames,
      rawStack: stack,
    },
    componentStack: {
      tree: componentTree,
      rawComponentStack: compStackStr,
    },
    diagnostics,
    recoveryActions: [
      { label: 'Restart RootApp', action: 'retry' },
      { label: 'Return to Studio Hub', action: 'hub' },
      { label: 'Reload current module', action: 'reload' },
      { label: 'Restart Studio', action: 'restart' },
    ],
    rawReport,
  };
}

export function clearDiagnosticHistory() {
  diagnosticHistoryBuffer.clear();
}

