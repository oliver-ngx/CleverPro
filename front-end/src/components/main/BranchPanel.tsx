import { POPOVER_SURFACE } from '../ui/Popover'
import { BranchList } from './BranchList'
import { BranchTrigger } from './BranchTrigger'

interface BranchPanelProps {
  id: string
  open: boolean
  onToggle: () => void
  current: string
  branches: string[]
  onSelect: (branch: string) => void
  /**
   * Omitted from a project where this member may not create a branch, which
   * takes "+ Add Branches" off the list rather than offering a control the
   * server would refuse.
   */
  onAdd?: () => void
  /** The row's closed height, which the value is centred in while it is just a value. */
  rowHeight: number
}

/** Both halves grow and shrink the same way, so the row's height only ever changes once. */
const TRACK = 'grid transition-[grid-template-rows] duration-300 ease-cs motion-reduce:transition-none'
const FADE = 'transition-opacity duration-200 ease-out motion-reduce:transition-none'

/**
 * The branch value, and the popover it opens into — drawn in the flow rather than over
 * it, so opening extends the card the row sits in instead of covering it.
 *
 * It is the popover in every other respect: the same #E5E5E5 surface, the same value
 * and chevron heading it, the same hairline, the same names beneath. Only the shadow
 * goes, because nothing here is above anything.
 *
 * The two halves are one swap. The value collapses as the card opens, and the card's
 * own heading arrives where the value just was — its top padding is set so that
 * heading lands on the row's centre line, level with the label. So the value is never
 * drawn twice and never leaves a gap where it used to be: it reads as the value itself
 * unfolding, which is what the popover did by covering the row. Pressing the heading
 * puts it back.
 *
 * Both halves size through `grid-template-rows` between `0fr` and `1fr` rather than a
 * max-height guess: a grid track resolves `1fr` to the content's real height, so the
 * list can be any length and the row opens to exactly its size and no further. The
 * inner boxes carry the `overflow-hidden` that clips content taller than its track.
 *
 * No scrim and no click-outside: this is part of the card, not something over it.
 * Escape shuts it too — the page wires that up.
 */
export function BranchPanel({
  id,
  open,
  onToggle,
  current,
  branches,
  onSelect,
  onAdd,
  rowHeight,
}: BranchPanelProps) {
  return (
    <div className="flex min-w-0 flex-col items-end">
      {/* The value at rest. `inert` while it is collapsed, so nothing invisible takes
          a click or a tab stop. */}
      <div className={`${TRACK} ${open ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
        <div className="overflow-hidden" inert={open}>
          <div
            style={{ height: rowHeight }}
            className={`flex items-center ${FADE} ${open ? 'opacity-0' : 'opacity-100 delay-100'}`}
          >
            <BranchTrigger
              current={current}
              expanded={open}
              controls={id}
              onClick={onToggle}
            />
          </div>
        </div>
      </div>

      <div id={id} className={`${TRACK} ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden" inert={!open}>
          {/* Opening, the card waits for the row to have somewhere to put it; closing,
              it leaves first so the row shuts on an empty panel. */}
          <div
            className={`pt-[10px] pb-[16px] ${FADE} ${open ? 'opacity-100 delay-100' : 'opacity-0'}`}
          >
            <div className={POPOVER_SURFACE}>
              <div className="pb-[8px]">
                <BranchTrigger current={current} expanded controls={id} heading onClick={onToggle} />
              </div>

              <div className="h-px bg-cs-hairline" />

              <BranchList
                current={current}
                branches={branches}
                onSelect={onSelect}
                onAdd={onAdd}
                className="flex flex-col items-start gap-[9px] pt-[9px]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
