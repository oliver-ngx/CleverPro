import { useEffect } from 'react'

/**
 * Escape closes an overlay. It is the one way out that every overlay in this app
 * shares, whatever else it offers — a scrim, a Cancel button, or neither — so it lives
 * here rather than in each of them.
 *
 * `enabled` is for overlays that outlive their own dismissal: one playing its exit
 * animation is still mounted but has nothing left to close, and a listener it kept
 * would swallow the Escape meant for whatever is underneath it. Overlays that unmount
 * on dismissal have nothing to switch off and can leave it alone.
 */
export function useOverlayDismiss(onDismiss: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onDismiss, enabled])
}
