/**
 * The app is rendered through a CSS `zoom` on `<body>` — see `--cs-ui-scale` in
 * index.css — so there are two units in play, and code that measures the viewport
 * and then writes a CSS length has a foot in each.
 *
 * A measurement (`DOMRect`, `window.innerWidth`) comes back in *screen* pixels,
 * with the zoom already in it. A length written into a style inside the app is a
 * *design* pixel, and gets multiplied by the zoom on its way to the screen. Handing
 * one straight to the other is the classic off-by-a-fifth: a menu measured 200px
 * from the right edge and given `right: 200px` lands at 160.
 *
 * Divide the measurement by this to convert it into design pixels first.
 */
export function uiScale(): number {
  if (typeof document === 'undefined') return 1

  // What the element is *actually* zoomed by, which is the honest answer wherever
  // the browser will give it (Chrome 128+, and the standardised `zoom` behind it).
  const applied = (document.body as HTMLElement & { currentCSSZoom?: number }).currentCSSZoom
  if (typeof applied === 'number' && applied > 0) return applied

  // Elsewhere, the declared value. It is the same number unless something has
  // nested a second zoom inside the first, which nothing does.
  const declared = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--cs-ui-scale'),
  )
  return Number.isFinite(declared) && declared > 0 ? declared : 1
}
