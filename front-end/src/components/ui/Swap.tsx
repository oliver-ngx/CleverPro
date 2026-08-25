import type { ReactNode } from 'react'

interface SwapProps {
  /** False shows `front`, true shows `back`. */
  swapped: boolean
  front: ReactNode
  /** May be absent until there is something to swap to. */
  back?: ReactNode
  /** Layout for the box the two faces share. */
  className?: string
}

/** Both faces resize the same way, so the box's height only ever changes once. */
const TRACK =
  'grid transition-[grid-template-rows] duration-300 ease-cs motion-reduce:transition-none'
const FADE = 'transition-opacity duration-200 ease-out motion-reduce:transition-none'

/**
 * Two faces of one surface, and the movement between them.
 *
 * This is `OptionSelect`'s open-and-close generalised: the outgoing face collapses
 * as the incoming one grows, both through `grid-template-rows` between `0fr` and
 * `1fr` rather than a max-height guess, so a face of any height arrives at exactly
 * its own size. The box therefore has one height at every moment of the movement
 * and never jumps to meet the new contents.
 *
 * The fades are offset against the resize on purpose. The face leaving goes first
 * and the face arriving waits — `delay-100` — so the two are never both legible on
 * top of each other, and the box is seen to change size rather than to cross-dissolve.
 *
 * Width is not animated, and does not need to be: both faces are always in the
 * document, so a box sized to its contents is already as wide as the wider of the
 * two before either is shown. It resizes in one axis, which is the one the eye is
 * following.
 *
 * The collapsed face is `inert`, so nothing invisible takes a click or a tab stop
 * while it is folded away.
 */
export function Swap({ swapped, front, back, className = 'flex min-w-0 flex-col' }: SwapProps) {
  return (
    <div className={className}>
      <Face showing={!swapped}>{front}</Face>
      {back !== undefined && <Face showing={swapped}>{back}</Face>}
    </div>
  )
}

function Face({ showing, children }: { showing: boolean; children: ReactNode }) {
  return (
    <div className={`${TRACK} ${showing ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
      <div className="overflow-hidden" inert={!showing}>
        <div className={`${FADE} ${showing ? 'opacity-100 delay-100' : 'opacity-0'}`}>
          {children}
        </div>
      </div>
    </div>
  )
}
