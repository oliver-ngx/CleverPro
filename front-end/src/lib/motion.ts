/**
 * How long each exit animation runs, in milliseconds.
 *
 * These duplicate durations declared in `index.css`, and they have to: `usePresence`
 * keeps a dismissed overlay in the tree for exactly this long, and CSS cannot tell it
 * when the animation is over — see that hook for why a timer beats an `animationend`
 * listener here. Keeping both numbers in one module means the pairing with the
 * stylesheet is stated once rather than rediscovered in each overlay.
 *
 * Change a duration here, change its `--animate-cs-*-out` token to match.
 */

/** Matches `--animate-cs-sheet-out`. Shared by the Add Branch sheet and the Action window. */
export const SHEET_EXIT_MS = 160

/** Matches `--animate-cs-popover-out`. The branch menu. */
export const POPOVER_EXIT_MS = 140

/** Matches `--animate-cs-browser-out`. Main's expanded file browser. */
export const BROWSER_EXIT_MS = 170

/**
 * How long a folder takes to open or shut in the file browser's tree.
 *
 * Unlike the constants above this one is not duplicated in `index.css`: the
 * disclosure is a transition rather than a keyframe animation, so `Disclosure`
 * applies this number to the element directly and there is only ever one of it.
 */
export const DISCLOSURE_MS = 200
