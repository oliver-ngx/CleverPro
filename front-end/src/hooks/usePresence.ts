import { useEffect, useState } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Keeps an overlay in the tree long enough to play its exit animation.
 *
 * `open` is the caller's real state; the flag returned is whether the overlay should
 * be rendered at all. It turns true the instant `open` does, and stays true for
 * `exitMs` after `open` turns false. The overlay then unmounts, so whatever it was
 * holding — a part-filled form, in practice — is discarded rather than lying in wait
 * to reappear the next time it is opened.
 *
 * The wait is a timer rather than an `animationend` listener, and deliberately so.
 * These exits are two animations on one element, so the event fires more than once
 * and the first one to arrive is not the end of anything; and under
 * `prefers-reduced-motion` the animation is `none`, so the event never fires at all
 * and the overlay would be stranded on screen for good. A timer cannot fail either
 * way. The cost is that the duration has to agree with the animation token in
 * `index.css`, which is why callers take it from a constant declared beside the
 * animation it belongs to rather than writing a number at the call site.
 *
 * Reduced motion drops the wait altogether: with no exit to play, holding the
 * overlay on screen afterwards would be a delay and nothing else.
 */
export function usePresence(open: boolean, exitMs: number) {
  const [present, setPresent] = useState(open)

  // Mounting on the way in is not something to wait a frame for, so it happens
  // during the render that opened it rather than in an effect afterwards.
  if (open && !present) setPresent(true)

  useEffect(() => {
    if (open || !present) return

    const reduced = window.matchMedia(REDUCED_MOTION_QUERY).matches
    const timer = window.setTimeout(() => {
      setPresent(false)
    }, reduced ? 0 : exitMs)

    return () => {
      // Reopening before the exit has finished cancels it: the overlay never left,
      // so it swaps back to its enter animation instead of unmounting underneath it.
      clearTimeout(timer)
    }
  }, [open, present, exitMs])

  return present
}
