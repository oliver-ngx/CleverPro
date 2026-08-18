import type { ReactNode } from 'react'

interface PopoverProps {
  children: ReactNode
  /**
   * The design system draws this surface at 196px, but that is its size in the
   * 2204px source frame. This app renders the same screen at 1400px, so the
   * popover is transcribed at the page's scale like every other metric here.
   */
  width?: number
}

/**
 * What the surface is made of, separate from the box that floats. Main's branch panel
 * is the same #E5E5E5 card sitting inside a page rather than over one, and it reads as
 * the same object only for as long as both are described here once.
 */
export const POPOVER_SURFACE = 'rounded-cp-popover bg-cp-popover px-[11px] pt-[8px] pb-[10px]'

/** The floating one: the surface above, at the width the source fixes. */
export function Popover({ children, width = 126 }: PopoverProps) {
  return (
    <div style={{ width }} className={POPOVER_SURFACE}>
      {children}
    </div>
  )
}
