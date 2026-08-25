import { Icon } from '../ui/Icon'

interface BranchTriggerProps {
  current: string
  /** Whether the branches it opens are on screen. */
  expanded: boolean
  /** Set where it opens a popover rather than extending the surface it sits on. */
  popup?: boolean
  /** id of the panel it extends, for the two to be announced as one thing. */
  controls?: string
  /**
   * Set where it heads a card rather than sitting in a row: it then fills the width
   * and pushes the chevron to the far edge, which is how the popover draws its own
   * first line.
   */
  heading?: boolean
  onClick: () => void
}

/**
 * The branch as a value you can press: the name, then the up/down chevron that says
 * it is a choice rather than a label. The Action window's popover, Main's row, and the
 * head of the card that row opens are all this, so the value reads identically in all
 * three — which is what lets the value look like it has moved rather than been copied.
 */
export function BranchTrigger({
  current,
  expanded,
  popup = false,
  controls,
  heading = false,
  onClick,
}: BranchTriggerProps) {
  return (
    <button
      type="button"
      // A popover is a menu you point at; the card's panel is this control's own
      // content unfolding, which is a disclosure and has no popup to announce.
      aria-haspopup={popup ? 'menu' : undefined}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
      className={`cursor-pointer items-center gap-[6px] border-none bg-transparent p-0 text-[13px] font-semibold text-cs-text-tertiary ${
        heading ? 'flex w-full justify-between' : 'inline-flex'
      }`}
    >
      {current}
      <Icon name="chevron-up-down" className={`h-[11px] w-[8px] ${heading ? 'opacity-84' : ''}`} />
    </button>
  )
}
