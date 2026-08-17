import { useCallback, useState } from 'react'
import { useOverlayDismiss } from '../../hooks/useOverlayDismiss'
import { usePresence } from '../../hooks/usePresence'
import { POPOVER_EXIT_MS } from '../../lib/motion'
import { Icon } from '../ui/Icon'
import { Popover } from '../ui/Popover'
import { BranchMenu } from './BranchMenu'

interface BranchSelectProps {
  current: string
  branches: string[]
  onSelect: (branch: string) => void
  onAdd?: () => void
  /** Where the menu lands. Detail rows and composer rows pad differently. */
  menuPosition?: string
}

/**
 * The branch control swaps in place: closed it is a value in the detail row,
 * open it becomes the popover, with a full-window scrim behind it.
 */
export function BranchSelect({
  current,
  branches,
  onSelect,
  onAdd,
  menuPosition = 'top-[9px] right-[9px] md:right-[37px]',
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
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={false}
        onClick={() => {
          setOpen(true)
        }}
        className="inline-flex cursor-pointer items-center gap-[6px] border-none bg-transparent p-0 text-[13px] font-semibold text-cp-text-tertiary"
      >
        {current}
        <Icon name="chevron-up-down" className="h-[11px] w-[8px]" />
      </button>
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
        className={`absolute ${menuPosition} z-10 origin-top-right overflow-hidden rounded-cp-popover shadow-cp-popover motion-reduce:animate-none ${
          open ? 'animate-cp-popover-in' : 'animate-cp-popover-out'
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
