import { useEffect } from 'react'

/**
 * Escape closes an overlay. It is the one way out that every overlay in this app
 * shares, whatever else it offers — a scrim, a Cancel button, or neither — so it lives
 * here rather than in each of them.
 */
export function useOverlayDismiss(onDismiss: () => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onDismiss])
}
