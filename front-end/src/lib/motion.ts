/**
 * How long each exit animation runs, in milliseconds.
 *
 * These duplicate durations declared in `index.css`, and they have to: `usePresence`
 * keeps a dismissed overlay in the tree for exactly this long, and CSS cannot tell it
 * when the animation is over — see that hook for why a timer beats an `animationend`
 * listener here. Keeping both numbers in one module means the pairing with the
 * stylesheet is stated once rather than rediscovered in each overlay.
 *
 * Change a duration here, change its `--animate-cp-*-out` token to match.
 */

/** Matches `--animate-cp-sheet-out`. Shared by the Add Branch sheet and the Action window. */
export const SHEET_EXIT_MS = 160

/** Matches `--animate-cp-popover-out`. The branch menu. */
export const POPOVER_EXIT_MS = 140
