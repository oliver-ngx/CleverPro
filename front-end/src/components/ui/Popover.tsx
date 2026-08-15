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

/** The one floating surface in Compiler: flat #E5E5E5, no border. */
export function Popover({ children, width = 126 }: PopoverProps) {
  return (
    <div
      style={{ width }}
      className="rounded-cp-popover bg-cp-popover px-[11px] pt-[8px] pb-[10px]"
    >
      {children}
    </div>
  )
}
