import { useCallback, useEffect, useState } from 'react'

/** Kept in step with --animate-cp-sheet-out, for the unmount fallback only. */
const EXIT_MS = 180

/**
 * The closing half of an overlay's life, which every overlay in this app handles the
 * same way: Escape starts the exit, and the caller unmounts once it has finished.
 *
 * The timer is belt and braces. If `animationend` never arrives — a backgrounded tab,
 * animations disabled by a user stylesheet — the overlay would otherwise stay up for
 * good, so it is also dismissed on a timer a little longer than the animation.
 */
export function useOverlayDismiss(onDismiss: () => void) {
  const [closing, setClosing] = useState(false)

  const close = useCallback(() => {
    setClosing(true)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [close])

  useEffect(() => {
    if (!closing) return

    const timer = window.setTimeout(onDismiss, EXIT_MS + 120)
    return () => {
      window.clearTimeout(timer)
    }
  }, [closing, onDismiss])

  return { closing, close }
}
