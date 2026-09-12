import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier';
import livexPlugin from 'eslint-plugin-livex';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/.android/**',
      '**/.ios/**',
      '**/coverage/**',
      'apps/studio-android/android/**',
      'artifacts/**',
      'scratch/**',
      'scripts/**',
      'docs/**',
      'firebase-public*/**',
      'screenshots/**',
      'session_logs/**',
      '**/public/**',
      'packages/ui-shared/src/features/stagex/stage-core/**',
      'TakesPanel_old.tsx',
      'before*.js',
      'temp*.js',
      'remove_syncEngine.js',
      'run_ast_fix.js',
      'search.js',
      'test*.js',
      'test*.mjs',
      'check_*.js',
      'fix_*.js',
      'extract*.js',
      'generate_*.js',
      'tools/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      livex: livexPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+

      // ── Tier 1: ERROR — violations cause runtime crashes or logic bugs ──
      'react-hooks/rules-of-hooks': 'error',   // Hook ordering violations = runtime crash
      'no-redeclare': 'error',                  // Shadowing causes silent bugs
      'no-self-assign': 'error',                // Dead code / copy-paste bug
      'no-duplicate-case': 'error',             // Unreachable switch branch
      'no-fallthrough': 'error',                // Unintentional case fall-through
      'no-func-assign': 'error',                // Overwriting function declarations
      'getter-return': 'error',                 // Getter without return = undefined

      // ── Tier 2: WARN — code quality issues to address incrementally ──
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/refs': 'warn',
      'no-undef': 'warn',
      'no-useless-escape': 'warn',
      'no-empty': 'warn',
      'prefer-const': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      'no-cond-assign': 'warn',
      '@typescript-eslint/no-this-alias': 'warn',
      'no-sparse-arrays': 'warn',
      'no-control-regex': 'warn',
      'no-prototype-builtins': 'warn',
      '@typescript-eslint/no-array-constructor': 'warn',
      'no-constant-binary-expression': 'warn',
      'no-case-declarations': 'warn',
      'no-irregular-whitespace': 'warn',
      'react-hooks/immutability': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      'no-extra-boolean-cast': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/purity': 'warn',
      'react/no-unescaped-entities': 'warn',
      'react/jsx-no-comment-textnodes': 'warn',
      'react/display-name': 'warn',

      // ── Livex Custom Architectural Rules ──
      'livex/no-hardcoded-colors': 'warn',
      'livex/no-inline-springs': 'warn',
      'livex/no-stores-outside-core': 'warn',   // Architectural boundary: stores belong in studio-core (rule has false positives for stores already in core)
      'livex/no-cross-feature-imports': 'error',
      'livex/no-raw-ui-primitives': 'warn',
    },
  },
  // ── Targeted overrides for God Files with known conditional-hook violations ──
  // These files have inline sub-components that call hooks conditionally.
  // They will be decomposed in Phase 2, which eliminates the violations structurally.
  // Until then, keep the rule as warn for these specific files only.
  {
    files: [
      'apps/studio-android/src/App.tsx',
      'apps/studio-android/src/EmergencyDebugOverlay.tsx',
      'packages/ui-web/src/landing/StudioLandingPage.tsx',
    ],
    rules: {
      'react-hooks/rules-of-hooks': 'warn', // Phase 2: decompose → error
    },
  },
  // ── TDZ Hook Order & Variable Scope Guard ──
  // Prevents using hooks, refs, motion values, and local state before their declaration line.
  // Hard failure in navigation, shared layout, android app, and web app shells.
  {
    files: [
      'packages/ui-shared/src/features/hub/navigation/**/*.{ts,tsx}',
      'packages/ui-shared/src/shared/layout/**/*.{ts,tsx}',
      'packages/ui-shared/src/navigation/**/*.{ts,tsx}',
      'apps/studio-android/src/**/*.{ts,tsx}',
      'apps/studio-web/src/**/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-use-before-define': [
        'error',
        {
          functions: false,
          classes: true,
          variables: true,
          allowNamedExports: false,
          typedefs: false,
          ignoreTypeReferences: true,
        },
      ],
    },
  },
  prettierConfig // Must be last to disable conflicting rules
);
