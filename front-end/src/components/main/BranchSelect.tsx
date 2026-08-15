import { useCallback, useEffect, useState } from 'react'
import { Icon } from '../ui/Icon'
import { Popover } from '../ui/Popover'
import { BranchMenu } from './BranchMenu'

interface BranchSelectProps {
  current: string
  branches: string[]
  onSelect: (branch: string) => void
  onAdd?: () => void
}

/** Kept in step with --animate-cp-popover-out, for the unmount fallback only. */
const EXIT_MS = 140

type MenuState = 'closed' | 'open' | 'closing'

/**
 * The branch control swaps in place: closed it is a value in the detail row,
 * open it becomes the popover, with a full-window scrim behind it. Closing keeps
 * the popover mounted for the length of its exit animation.
 */
export function BranchSelect({ current, branches, onSelect, onAdd }: BranchSelectProps) {
  const [state, setState] = useState<MenuState>('closed')

  const close = useCallback(() => {
    setState((previous) => (previous === 'open' ? 'closing' : previous))
  }, [])

  useEffect(() => {
    if (state !== 'open') return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [state, close])

  // If animationend never arrives — a backgrounded tab, animations disabled by a user
  // stylesheet — the menu would otherwise stay up for good. Unmount on a timer too.
  useEffect(() => {
    if (state !== 'closing') return

    const timer = window.setTimeout(() => {
      setState('closed')
    }, EXIT_MS + 120)
    return () => {
      window.clearTimeout(timer)
    }
  }, [state])

  if (state === 'closed') {
    return (
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={false}
        onClick={() => {
          setState('open')
        }}
        className="inline-flex cursor-pointer items-center gap-[6px] border-none bg-transparent p-0 text-[13px] font-semibold text-cp-text-tertiary"
      >
        {current}
        <Icon name="chevron-up-down" className="h-[11px] w-[8px]" />
      </button>
    )
  }

  const closing = state === 'closing'

  return (
    <>
      {/* The scrim goes as soon as closing starts, so a click during the exit lands on
          whatever the user was aiming at rather than being swallowed. */}
      {!closing && (
        <button
          type="button"
          aria-label="Close branch menu"
          onClick={close}
          className="fixed inset-0 z-5 cursor-default border-none bg-transparent p-0"
        />
      )}
      {/* Radius sits on the same box as the shadow so the drop follows the popover's
          silhouette rather than casting from a square. The offsets land the menu's
          header directly over the trigger it replaces, and it scales out of that
          same corner. */}
      <div
        onAnimationEnd={(event) => {
          if (closing && event.target === event.currentTarget) setState('closed')
        }}
        className={`absolute top-[9px] right-[9px] md:right-[37px] z-10 origin-top-right overflow-hidden rounded-cp-popover shadow-cp-popover ${
          closing
            ? 'pointer-events-none animate-cp-popover-out motion-reduce:animate-cp-popover-out-reduced'
            : 'animate-cp-popover-in motion-reduce:animate-cp-popover-in-reduced'
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
            onAdd={() => {
              onAdd?.()
              close()
            }}
          />
        </Popover>
      </div>
    </>
  )
}
