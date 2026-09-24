import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    rules: {
      // Allow deliberately-unused bindings when prefixed with an underscore.
      // This is the conventional signal for values that must be named (to
      // document a callback signature or to strip a field via object rest)
      // but are intentionally not read, e.g. `const { portrait: _p, ...rest }`.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      // Dev-experience only: this rule flags modules that export a component
      // alongside a constant/helper/type, which disables Vite Fast Refresh for
      // that file during `npm run dev`. It has no effect on the built app or on
      // correctness. A handful of files legitimately co-locate a small helper,
      // re-export, or type with their component; splitting each into a separate
      // module purely to satisfy Fast Refresh is not worth the churn. Keep it as
      // a warning so the hint stays visible without failing the lint gate.
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    // Test files legitimately reach for `any` when stubbing DOM/browser APIs and
    // building partial mocks, where forcing precise types adds noise without
    // improving safety. Relax the ban on explicit `any` for tests only.
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
])
