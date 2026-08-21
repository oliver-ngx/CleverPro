/// <reference types="vite/client" />

/**
 * The environment variables this app reads, declared so they are typed rather
 * than `any`.
 *
 * Vite's own `ImportMetaEnv` carries an index signature, which means a typo in
 * a variable name type-checks happily and arrives as `undefined` at runtime.
 * Naming them here turns that into a compile error.
 */
interface ImportMetaEnv {
  /**
   * Where the API lives. Unset in normal use: `/api` is same-origin and
   * proxied to the backend, which is what keeps every request free of CORS.
   * Set it only when the client is served from a different host than the API.
   */
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
