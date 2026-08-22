import { useState } from 'react'
import { ConfirmAction } from './ConfirmAction'
import { FloatingMenu, MENU_ITEM } from './FloatingMenu'
import { Icon } from './Icon'
import { Swap } from './Swap'

interface RowMenuProps {
  /** Names the row: the menu's heading, and what the trigger announces. */
  label: string
  /** Called once the second, deliberate press has confirmed it. */
  onDelete: () => void
}

/**
 * The per-row overflow menu on the two log tables: an ellipsis that appears under
 * the pointer at the end of a row, and the popover it opens.
 *
 * The floating, self-sizing, viewport-bounded part of that is `FloatingMenu`,
 * which also explains why a table row's menu floats rather than unfolding the row.
 * What is left here is the trigger and the two things the menu says.
 *
 * **Why deleting takes two presses.** The popover swaps its contents for the
 * question instead of opening something else, which is how this product asks about
 * an act it cannot take back — choosing and confirming are two different presses,
 * as they are when ownership is handed over. Cancel returns to the menu rather than
 * closing it, so backing out of the question does not also back out of the row.
 */
export function RowMenu({ label, onDelete }: RowMenuProps) {
  const [confirming, setConfirming] = useState(false)

  return (
    <FloatingMenu
      onOpen={() => {
        setConfirming(false)
      }}
      trigger={({ open, onClick }) => (
        // Sits in the row's right padding, clear of the Action column rather than
        // over it. Invisible until the row is hovered, but never unmounted and never
        // `pointer-events-none`: it is a real tab stop, and focus brings it into view
        // the same way the pointer does.
        <button
          type="button"
          aria-label={`More actions for ${label}`}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={onClick}
          className={`absolute top-1/2 right-[2px] flex h-[21px] w-[20px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-[5px] border-none bg-transparent p-0 transition-opacity duration-150 ease-out group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-cp-accent motion-reduce:transition-none ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Icon name="ellipsis" className="h-[4px] w-[13px] text-cp-text-primary" />
        </button>
      )}
    >
      {(close) => (
        // The question does not replace the menu, it grows out of it: the surface is
        // one object changing shape, which is also why the two presses read as one
        // continuous act rather than two screens.
        <Swap
          swapped={confirming}
          front={
            <div className="flex min-w-0 flex-col">
              {/* The heading names the row, truncated on purpose: a log line is
                  arbitrarily long and its first few words are the whole of what it
                  contributes to a menu floating away from it. */}
              <span className="truncate pb-[8px] text-[13px]/[130%] font-semibold text-cp-text-tertiary">
                {label}
              </span>

              <div className="h-px bg-cp-hairline" />

              <div className="flex flex-col items-start gap-[9px] pt-[9px]">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setConfirming(true)
                  }}
                  className={`${MENU_ITEM} text-cp-text-branch hover:text-cp-text-primary`}
                >
                  Delete
                </button>
              </div>
            </div>
          }
          back={
            <ConfirmAction
              question="Delete this record?"
              confirmLabel="Delete"
              onConfirm={() => {
                onDelete()
                close()
              }}
              onCancel={() => {
                setConfirming(false)
              }}
            />
          }
        />
      )}
    </FloatingMenu>
  )
}
