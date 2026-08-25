import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { usePresence } from '../../hooks/usePresence'
import { DISCLOSURE_MS } from '../../lib/motion'

interface DisclosureProps {
  open: boolean
  children: ReactNode
}

/**
 * Content that opens and shuts to its own height.
 *
 * Sized through `grid-template-rows` between `0fr` and `1fr` rather than a max-height
 * guess, as `OptionSelect` and `Swap` are: a grid track resolves `1fr` to the real
 * height of what is inside it, so a folder holding two files and a folder holding two
 * hundred each open to exactly their own size and no further.
 *
 * **Why the children are not simply left mounted.** The two components above keep both
 * of their faces in the document, because each holds one small thing. A file tree does
 * not: mounting every folder's contents would put a whole project in the DOM to draw
 * the handful of rows actually disclosed. So the children are mounted while open and
 * for the length of the exit after that, and are gone the rest of the time.
 *
 * **Why the extra frame.** That makes the enter harder than the exit. Content mounted
 * and expanded in the same commit has no collapsed frame to move from, so the browser
 * has nothing to interpolate and the folder would snap open and animate only shut.
 * The track therefore mounts at `0fr` and flips on the next animation frame, which is
 * the first frame the new rows have actually been laid out in.
 */
export function Disclosure({ open, children }: DisclosureProps) {
  const present = usePresence(open, DISCLOSURE_MS)
  const [flipped, setFlipped] = useState(false)

  // Shutting needs no frame of its own -- the track is already at its full height, so
  // it has something to move from. Reset during the render that closed it, the way
  // `usePresence` mounts during the render that opened it, so the next opening starts
  // collapsed again instead of snapping.
  if (!open && flipped) setFlipped(false)

  useEffect(() => {
    if (!open) return

    const frame = requestAnimationFrame(() => {
      setFlipped(true)
    })
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [open])

  if (!present) return null

  const expanded = open && flipped

  return (
    <div
      style={{ transitionDuration: `${String(DISCLOSURE_MS)}ms` }}
      className={`grid transition-[grid-template-rows] ease-cs motion-reduce:transition-none ${
        expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      {/* `inert` while it is folding away, so a row on its way out cannot take a
          click or hold a tab stop. */}
      <div className="overflow-hidden" inert={!open}>
        {children}
      </div>
    </div>
  )
}
