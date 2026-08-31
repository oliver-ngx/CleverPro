import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // The design-system export is reference material, not source: its .jsx.txt /
  // .types.ts files sit outside every tsconfig project on purpose, so typed linting
  // cannot parse them. Read them; don't lint them.
  //
  // Globbed rather than named at the root because the base path is now the repo
  // and not this folder — see eslint.config.js one level up.
  globalIgnores(['**/dist', '**/design-system']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])
