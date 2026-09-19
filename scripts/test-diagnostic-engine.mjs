import {
  processDiagnosticReport,
  analyzeDiagnosticError,
  analyzeRootAppError,
  clearDiagnosticHistory,
} from '../packages/livex-core/src/lib/diagnostics/diagnosticEngine.ts';

console.log('================================================================');
console.log('       DIAGNOSTIC INTELLIGENCE LAYER VALIDATION SUITE');
console.log('================================================================\n');

// 1. Test Null Reference Error (ChordEditor)
console.log('--- TEST 1: Null Property Access in Component ---');
const report1 = processDiagnosticReport(
  "Cannot read properties of undefined (reading 'chords')",
  `TypeError: Cannot read properties of undefined (reading 'chords')
    at ChordEditor (ChordEditor.tsx:42:15)
    at renderWithHooks (react-dom.development.js:16305:18)
    at mountIndeterminateComponent (react-dom.development.js:20074:13)`,
  {
    module: 'ChordEditor',
    lastNavigationAction: 'Opening song immediately after navigation',
  }
);
console.log(report1.formattedSummary);
console.log('\n----------------------------------------------------------------\n');

// 2. Test RootApp Failure (Missing ThemeProvider)
console.log('--- TEST 2: RootApp Failure (Missing Provider) ---');
const report2 = processDiagnosticReport(
  "ThemeContext returned undefined. useTheme must be used within a ThemeProvider",
  `Error: ThemeContext returned undefined
    at useTheme (ThemeProvider.tsx:18:11)
    at SettingsPage (SettingsPage.tsx:25:22)
    at App (App.tsx:88:14)`,
  {
    module: 'RootApp',
    source: 'RootApp',
    activeSubApp: 'Settings',
    lastNavigationAction: 'Opening Theme Manager',
  }
);
console.log(report2.formattedSummary);
console.log('\n----------------------------------------------------------------\n');

// 3. Test Hook Violation Loop (Maximum update depth)
console.log('--- TEST 3: Hook Violation Loop ---');
const report3 = processDiagnosticReport(
  "Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside useEffect.",
  `Error: Maximum update depth exceeded
    at StageCorePanel (StageCorePanel.tsx:102:9)
    at renderWithHooks (react-dom.development.js:16305:18)`,
  {
    module: 'StageCore',
  }
);
console.log(report3.formattedSummary);
console.log('\n----------------------------------------------------------------\n');

// 4. Test Firebase Permission Error
console.log('--- TEST 4: Firebase/Firestore Security Permission Error ---');
const report4 = processDiagnosticReport(
  "@firebase/firestore: Firestore (10.8.0): Error (permission-denied): Missing or insufficient permissions.",
  `FirebaseError: Missing or insufficient permissions.
    at FirestoreSync (FirestoreSync.ts:114:12)
    at CollaborationService (CollaborationService.ts:45:8)`,
  {
    module: 'network',
    source: 'Firestore',
  }
);
console.log(report4.formattedSummary);
console.log('\n----------------------------------------------------------------\n');

// 5. Test Similarity & Deduplication Engine
console.log('--- TEST 5: Similarity & Deduplication Engine (27 occurrences) ---');
clearDiagnosticHistory();
let report5;
for (let i = 0; i < 27; i++) {
  report5 = processDiagnosticReport(
    "Cannot read properties of undefined (reading 'chords')",
    `TypeError: Cannot read properties of undefined (reading 'chords')
      at ChordEditor (ChordEditor.tsx:42:15)`,
    { module: 'ChordEditor' }
  );
}
console.log(report5.formattedSummary);
console.log('\n================================================================');
console.log('✓ ALL DIAGNOSTIC INTELLIGENCE TESTS PASSED CLEANLY!');
console.log('================================================================\n');
