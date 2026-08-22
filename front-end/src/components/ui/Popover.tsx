import type { CSSProperties, ReactNode } from 'react'

interface PopoverProps {
  children: ReactNode
  /**
   * A fixed width in pixels, or `'fit'` to size to whatever is inside.
   *
   * The design system draws this surface at 196px, but that is its size in the
   * 2204px source frame. This app renders the same screen at 1400px, so the
   * popover is transcribed at the page's scale like every other metric here, and
   * 126 stays the default for the surfaces the frame actually draws.
   *
   * `'fit'` is for the ones it does not: a surface whose contents are not known
   * ahead of time cannot be given a width ahead of time either, and a fixed one
   * clips as soon as the contents outgrow it. Sizing to the content and bounding
   * it instead means anything put inside fits, or wraps, rather than being cut.
   */
  width?: number | 'fit'
  /** With `width="fit"`, the smallest it may shrink to. Ignored otherwise. */
  minWidth?: number
  /**
   * With `width="fit"`, the widest it may grow before its contents wrap or
   * truncate. Ignored otherwise. Whatever floats this surface is still
   * responsible for keeping it inside the viewport.
   */
  maxWidth?: number
}

/**
 * What the surface is made of, separate from the box that floats. Main's branch panel
 * is the same #E5E5E5 card sitting inside a page rather than over one, and it reads as
 * the same object only for as long as both are described here once.
 */
export const POPOVER_SURFACE = 'rounded-cp-popover bg-cp-popover px-[11px] pt-[8px] pb-[10px]'

/** The floating one: the surface above, at a fixed width or at its contents'. */
export function Popover({ children, width = 126, minWidth, maxWidth }: PopoverProps) {
  // `max-content` rather than `fit-content`: the bound belongs on `maxWidth`, where a
  // caller can state it, instead of being inherited from whatever box happens to be
  // outside. A surface that floats has no meaningful container width to fit into.
  const style: CSSProperties =
    width === 'fit' ? { width: 'max-content', minWidth, maxWidth } : { width }

  return (
    <div style={style} className={POPOVER_SURFACE}>
      {children}
    </div>
  )
}
