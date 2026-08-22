/**
 * How this product writes a value out.
 *
 * Three small functions that had started to appear in more than one place: the
 * two stamps were private to `api/adapters.ts` and were copied into a page the
 * moment a page needed one, and `titleCase` existed twice over. A formatter
 * copied is a formatter that drifts — one of the copies picks up a comma, and
 * the same timestamp then reads two ways on two screens.
 *
 * They live in `lib/` rather than in `adapters.ts` because they are not part of
 * the wire-to-screen seam. A page formatting something it holds already has no
 * business importing the adapter layer to do it.
 */

/**
 * The API stores roles and statuses as lowercase enums; the product prints them
 * capitalised. Only the first letter — these are single words by definition, and
 * title-casing a phrase is a different job with different rules.
 */
export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** "Jul 24, 2026 at 08:26 PM" — the long-form stamp the detail pane draws. */
export function longStamp(epochSeconds: number): string {
  const at = new Date(epochSeconds * 1000)
  const day = at.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const time = at.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return `${day} at ${time}`
}

/** "Aug 7" — the terse stamp the log tables draw, from epoch seconds. */
export function shortDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}
