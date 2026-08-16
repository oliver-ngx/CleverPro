import { useCallback, useEffect, useState } from 'react'
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

  const close = useCallback(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  if (!open) {
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
      <button
        type="button"
        aria-label="Close branch menu"
        onClick={close}
        className="fixed inset-0 z-5 cursor-default border-none bg-transparent p-0"
      />
      {/* Radius sits on the same box as the shadow so the drop follows the popover's
          silhouette rather than casting from a square. The offsets land the menu's
          header directly over the trigger it replaces. */}
      <div
        className={`absolute ${menuPosition} z-10 overflow-hidden rounded-cp-popover shadow-cp-popover`}
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
