import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
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
