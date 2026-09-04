import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: { globals: globals.browser },
    rules: { '@typescript-eslint/consistent-type-imports': 'error' },
  },
  { files: ['*.config.ts', 'e2e/**/*.ts', 'tools/**/*.ts'], languageOptions: { globals: globals.node } },
);
