import { useCallback, useEffect, useState } from 'react'

/** Matches Tailwind's `md` breakpoint — the width at which the rail fits alongside content. */
const DESKTOP_QUERY = '(min-width: 768px)'

/**
 * The sidebar toggle means different things by size: on a desktop it collapses the
 * rail, on a phone it opens an overlay drawer. Crossing the breakpoint resets the
 * sidebar to that size's natural default, but a manual toggle is left alone.
 */
export function useResponsiveSidebar() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches)
  const [open, setOpen] = useState(isDesktop)

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY)
    const onChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches)
      setOpen(event.matches)
    }
    query.addEventListener('change', onChange)
    return () => {
      query.removeEventListener('change', onChange)
    }
  }, [])

  const toggle = useCallback(() => {
    setOpen((previous) => !previous)
  }, [])

  /** Picking something in the drawer should get the drawer out of the way. */
  const dismissOnMobile = useCallback(() => {
    if (!isDesktop) setOpen(false)
  }, [isDesktop])

  return { isDesktop, open, toggle, dismissOnMobile }
}
