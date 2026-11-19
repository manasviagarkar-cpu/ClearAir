import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    ignores: ['dist/**', 'node_modules/**'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        document: 'readonly',
        window: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        console: 'readonly',
        process: 'readonly',
        FormData: 'readonly',
        DocumentFragment: 'readonly',
        HTMLElement: 'readonly',
        HTMLFormElement: 'readonly',
        HTMLSelectElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLDListElement: 'readonly',
        NodeListOf: 'readonly',
        Element: 'readonly',
        URL: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      'no-control-regex': 'off',       // sanitizeText intentionally strips control chars
      'no-useless-assignment': 'off',   // idiomatic let-then-reassign-in-branches pattern
      'max-lines-per-function': ['warn', { max: 60, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', { max: 10 }],
    },
  },
  {
    // Relax function-length for test.js (each runTest call is naturally long)
    files: ['test.js'],
    rules: {
      'max-lines-per-function': 'off',
    },
  },
  {
    // Relax function-length for main.js (initClearAirApp is a large bootstrap)
    files: ['src/main.js'],
    rules: {
      'max-lines-per-function': ['warn', { max: 250, skipBlankLines: true, skipComments: true }],
    },
  },
];
