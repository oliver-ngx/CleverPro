import { useCallback, useState } from 'react'
import { useOverlayDismiss } from '../../hooks/useOverlayDismiss'
import { usePresence } from '../../hooks/usePresence'
import { POPOVER_EXIT_MS } from '../../lib/motion'
import { Popover } from '../ui/Popover'
import { BranchMenu } from './BranchMenu'
import { BranchTrigger } from './BranchTrigger'

interface BranchSelectProps {
  current: string
  branches: string[]
  onSelect: (branch: string) => void
  onAdd?: () => void
  /** Where the menu lands, measured from the row it opens over. */
  menuPosition: string
}

/**
 * The branch control swaps in place: closed it is a value in the row, open it becomes
 * the popover, with a full-window scrim behind it.
 *
 * This is the Action window's control. Main's row does not use it — its card can grow,
 * so the branches extend it from below rather than floating over it; see `BranchPanel`.
 * A sheet at a fixed height has nothing to grow, which is why the popover stays here.
 */
export function BranchSelect({
  current,
  branches,
  onSelect,
  onAdd,
  menuPosition,
}: BranchSelectProps) {
  const [open, setOpen] = useState(false)
  // The trigger stays hidden for as long as the menu is on screen, exit included —
  // the two are the same control in two states, so they must never both be visible.
  const present = usePresence(open, POPOVER_EXIT_MS)

  const close = useCallback(() => {
    setOpen(false)
  }, [])

  // Only while it is genuinely open: a closing menu has already given up its
  // selection, and Escape then belongs to whatever is underneath it.
  useOverlayDismiss(close, open)

  if (!present) {
    return (
      <BranchTrigger
        current={current}
        expanded={false}
        popup
        onClick={() => {
          setOpen(true)
        }}
      />
    )
  }

  return (
    <>
      {/* Only while the menu is genuinely open: a closing menu has nothing left to
          dismiss, and a full-window click catcher outliving it would swallow the
          first click aimed at whatever is underneath. */}
      {open && (
        <button
          type="button"
          aria-label="Close branch menu"
          onClick={close}
          className="fixed inset-0 z-5 cursor-default border-none bg-transparent p-0"
        />
      )}
      {/* Radius sits on the same box as the shadow so the drop follows the popover's
          silhouette rather than casting from a square. The offsets land the menu's
          header directly over the trigger it replaces. */}
      <div
        inert={!open}
        className={`absolute ${menuPosition} z-10 origin-top-right overflow-hidden rounded-cs-popover shadow-cs-popover motion-reduce:animate-none ${
          open ? 'animate-cs-popover-in' : 'animate-cs-popover-out'
        }`}
      >
        <Popover>
          <BranchMenu
            current={current}
            branches={branches}
            onSelect={(branch) => {
              onSelect(branch)
              close()
            }}
            onAdd={
              onAdd === undefined
                ? undefined
                : () => {
                    onAdd()
                    close()
                  }
            }
          />
        </Popover>
      </div>
    </>
  )
}
