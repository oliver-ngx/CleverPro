import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

/**
 * Configs lives in its own pair of folders beside this one — `configs-front-end`
 * and `configs-back-end` — so that everything belonging to it can be found, and
 * later merged in, in one move. It is not a second application: Cseudocode is
 * one window with several modules in it, and Configs is one of those modules,
 * so its source is built by this build rather than served by a second dev
 * server.
 *
 * Three aliases join them, and they are the whole arrangement:
 *
 *   `@cs`      the Cseudocode shell and Compiler — this folder's `src`
 *   `@configs` Configs — the sibling folder's `src`
 *   `@interp`  Interpreter — the other sibling's `src`
 *
 * When a module stops being a mockup, its folder folds into `front-end` and its
 * alias becomes an ordinary relative import. Nothing else has to change, which
 * is the point of doing it this way.
 */
const cs = fileURLToPath(new URL('./src', import.meta.url))
const configs = fileURLToPath(new URL('../configs-front-end/src', import.meta.url))
const interp = fileURLToPath(new URL('../interpreter-front-end/src', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@cs': cs,
      '@configs': configs,
      '@interp': interp,
    },
    /**
     * A file in `configs-front-end` is outside this folder, so resolving a bare
     * import from it walks up past the repo and never finds this
     * `node_modules`. The only bare import those files make is the one the JSX
     * transform inserts for them, and this is what makes it — and any React
     * import added later — resolve from here instead of from the importer.
     *
     * Which also means there is one React in the bundle rather than two, the
     * usual reason to reach for this.
     */
    dedupe: ['react', 'react-dom'],
  },
  server: {
    /**
     * `configs-front-end` is outside this project's root, and Vite will not
     * serve files from outside it without being told. The parent is the repo,
     * so this allows the repo.
     */
    fs: { allow: ['..'] },
    /**
     * The API runs as a separate process on :8000. Proxying it through Vite
     * rather than calling it directly means the browser only ever talks to
     * one origin, so no request is ever cross-origin and CORS never enters
     * the picture -- in dev or, later, behind a single host in production.
     *
     * `127.0.0.1` rather than `localhost` on purpose: on Windows `localhost`
     * can resolve to IPv6 ::1 while uvicorn binds IPv4 only, which surfaces
     * as a bewildering ECONNREFUSED against a server that is plainly running.
     */
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
