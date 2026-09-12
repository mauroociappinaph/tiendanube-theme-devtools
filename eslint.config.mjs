import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import reactPlugin from 'eslint-plugin-react';

export default tseslint.config(
  {
    ignores: [
      'dist/',
      'node_modules/',
      '*.config.*',
      'scripts/',
      '.temp-*',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      react: reactPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    rules: {
      // TypeScript strictness
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/prefer-for-of': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],

      // Preact / React
      'react/jsx-key': 'error',
      'react/no-unknown-property': 'warn',

      // General
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'prefer-template': 'warn',
      'no-throw-literal': 'error',

      // File structure
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 40, skipBlankLines: true, skipComments: true }],
      'max-depth': ['warn', 4],
      'max-params': ['warn', 4],
      'complexity': ['warn', 10],
    },
  },
  // Prettier must be last to disable conflicting rules
  eslintConfigPrettier,
);
