/**
 * Where the repo's linting starts, and almost nothing else.
 *
 * ESLint treats the directory of the config it finds as the boundary of what it
 * may lint. Configs' source is in `configs-front-end`, beside `front-end`
 * rather than inside it, so a config living in `front-end` cannot reach it —
 * it refuses with "outside of base path" — and this file is here to move that
 * boundary up to the repo.
 *
 * The rules are still `front-end/eslint.rules.js` and are re-exported unchanged.
 * That is the point of the split rather than an accident of it: a plugin import
 * resolves relative to the file that writes it, so leaving them there means
 * they resolve in `front-end/node_modules` and the repo root needs no install
 * of its own. It is renamed from `eslint.config.js` only so that ESLint's
 * upward search does not stop at it and put the boundary back where it was.
 *
 * Run it from `front-end`, which is where the binary is: `npm run lint`.
 */
export { default } from './front-end/eslint.rules.js'
