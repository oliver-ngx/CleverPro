import type { MouseEvent, ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useOverlayDismiss } from '../../hooks/useOverlayDismiss'
import { usePresence } from '../../hooks/usePresence'
import { POPOVER_EXIT_MS } from '../../lib/motion'
import { uiScale } from '../../lib/scale'
import { Popover } from './Popover'

interface FloatingMenuProps {
  /**
   * The control that opens it. Handed the open state, because a trigger usually
   * has to say so — a pressed look, an `aria-expanded`, or in the log tables an
   * ellipsis that stays visible for as long as its menu is.
   */
  trigger: (props: {
    open: boolean
    onClick: (event: MouseEvent<HTMLElement>) => void
  }) => ReactNode
  /** The menu's contents, handed the way to close itself. */
  children: (close: () => void) => ReactNode
  /** Run each time it opens, for a caller with a state to reset. */
  onOpen?: () => void
  minWidth?: number
  maxWidth?: number
}

/** One shared style for a menu's words, so every floating menu reads alike. */
export const MENU_ITEM =
  'cursor-pointer border-none bg-transparent p-0 text-left text-[11px]/[130%] font-normal transition-colors duration-150 ease-out disabled:cursor-default disabled:opacity-50 motion-reduce:transition-none'

/** Breathing room kept between the menu and the edge of the viewport. */
const MARGIN = 12

/** Below this much room underneath the trigger, opening downward is not worth it. */
const COMFORTABLE = 160

interface Anchor {
  /** Distance from the viewport's right edge; the menu grows leftward from here. */
  right: number
  /** Distance from the top edge, or from the bottom when `above`. */
  y: number
  /** True when the menu opens upward because there was more room there. */
  above: boolean
}

/**
 * Where the menu goes, decided from the trigger alone.
 *
 * It opens downward by default and flips up only when downward is genuinely
 * cramped *and* upward is roomier — a control near the foot of the window would
 * otherwise get a menu squeezed into a few pixels and made to scroll, with all
 * the space it needed directly above it.
 *
 * Everything the trigger and the viewport report is in screen pixels, and every
 * number this returns is written back out as a CSS length inside the zoomed app —
 * so the whole calculation is converted to design pixels once, up front. That also
 * keeps `COMFORTABLE` and the 4px gap below meaning what they say: they are design
 * measurements, and they are compared against design measurements.
 */
function anchorFor(rect: DOMRect): Anchor {
  const scale = uiScale()
  const right = (window.innerWidth - rect.right) / scale
  const below = (window.innerHeight - rect.bottom) / scale
  const above = rect.top / scale

  return below < COMFORTABLE && above > below
    ? { right, y: (window.innerHeight - rect.top) / scale + 4, above: true }
    : { right, y: rect.bottom / scale + 4, above: false }
}

/**
 * A popover that floats over the page, anchored to whatever opened it.
 *
 * A control with alternatives normally unfolds the card it sits in rather than
 * floating over it, and where the surface can grow that is still the right
 * answer — see `OptionSelect`. This is for the surfaces that cannot: a 25px
 * table row, or a sheet fixed at the Action window's height.
 *
 * **Why it is `fixed` rather than `absolute`.** Its callers sit inside boxes that
 * clip — a table that scrolls sideways, a sheet with its own bounds — and a
 * container that clips one axis clips the other too, so a menu positioned inside
 * one would be cut off at its edge and would add a scrollbar reaching for room it
 * cannot have. A fixed element is not clipped by an ancestor's overflow, so the
 * menu is measured off the trigger and placed in viewport coordinates instead.
 *
 * **Why it is also portalled.** `fixed` only means "against the viewport" while no
 * ancestor establishes a containing block, and `transform`, `filter`,
 * `backdrop-filter` and `will-change` all do. The Action window is a `Sheet`, whose
 * scrim is a backdrop blur and whose panel animates a transform, so a menu left
 * inside it resolved its coordinates against the sheet and landed nowhere near its
 * trigger — while the same component on the log tables, which have no such
 * ancestor, was correct. Rendering into `document.body` is what makes the viewport
 * the viewport again, wherever the trigger happens to live.
 *
 * That measurement is a snapshot: scrolling or resizing while it is open closes
 * it rather than leaving it stranded beside the control it belongs to.
 *
 * **Nothing here has a fixed size.** Width, height and which side it opens on are
 * all decided from the trigger's rect at the moment of opening, and the surface is
 * sized to its contents, so anything put inside it fits: it grows until it would
 * leave the viewport, then wraps, then scrolls.
 */
export function FloatingMenu({
  trigger,
  children,
  onOpen,
  minWidth = 126,
  maxWidth = 280,
}: FloatingMenuProps) {
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<Anchor>({ right: 0, y: 0, above: false })
  const present = usePresence(open, POPOVER_EXIT_MS)

  const close = useCallback(() => {
    setOpen(false)
  }, [])

  useOverlayDismiss(close, open)

  // The anchor was measured once, at the moment of opening. Anything that moves the
  // trigger out from under it invalidates that, and there is no honest way to
  // re-point a menu at a control that may by then be off screen.
  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open, close])

  return (
    <>
      {trigger({
        open,
        onClick: (event) => {
          setAnchor(anchorFor(event.currentTarget.getBoundingClientRect()))
          onOpen?.()
          setOpen(true)
        },
      })}

      {present &&
        createPortal(
          <>
            {/* Only while genuinely open: a closing menu has nothing left to dismiss,
                and a full-window catcher outliving it would swallow the first click
                aimed at whatever is underneath. Portalled to the end of the document,
                it also covers a sheet's own scrim, so a click meant for the menu
                cannot dismiss the window behind it on the way past. */}
            {open && (
              <button
                type="button"
                aria-label="Close menu"
                onClick={close}
                className="fixed inset-0 z-60 cursor-default border-none bg-transparent p-0"
              />
            )}
            <div
              role="menu"
              inert={!open}
              // Bounded by the room actually there rather than by a guess: the
              // surface may take everything between the trigger and the far edge of
              // the viewport, less a margin, and scrolls only once it has used all
              // of it.
              style={{
                right: anchor.right,
                ...(anchor.above ? { bottom: anchor.y } : { top: anchor.y }),
                // The viewport in the app's own units, for the same reason the
                // anchor is: a bare 100vw inside the zoom is a fifth short.
                maxWidth: `calc(var(--cs-viewport-w) - ${String(anchor.right + MARGIN)}px)`,
                maxHeight: `calc(var(--cs-viewport-h) - ${String(anchor.y + MARGIN)}px)`,
              }}
              className={`fixed z-70 overflow-y-auto rounded-cs-popover shadow-cs-popover motion-reduce:animate-none ${
                anchor.above ? 'origin-bottom-right' : 'origin-top-right'
              } ${open ? 'animate-cs-popover-in' : 'animate-cs-popover-out'}`}
            >
              <Popover width="fit" minWidth={minWidth} maxWidth={maxWidth}>
                {children(close)}
              </Popover>
            </div>
          </>,
          document.body,
        )}
    </>
  )
}
