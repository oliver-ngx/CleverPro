import { MENU_ITEM } from './FloatingMenu'

interface SortMenuProps<T extends string> {
  /** The order in force, which heads the card rather than appearing in the list. */
  value: T
  options: { value: T; label: string }[]
  onSelect: (value: T) => void
}

/**
 * The orders a list can be shown in: the current one as a heading, a rule, then the
 * others.
 *
 * The branch menu's shape, for the branch menu's reason — the list holds what the
 * value is *not*, because the current order already heads the card and repeating it
 * below would put a row there that does nothing.
 *
 * Contents only. The rail's copy is floated by a `FloatingMenu`; the pane's hangs
 * off the header pill in a `Popover` of its own, because the pill already has a slot
 * for exactly that and the member menu uses it.
 */
export function SortMenu<T extends string>({ value, options, onSelect }: SortMenuProps<T>) {
  const current = options.find((option) => option.value === value)

  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate pb-[8px] text-[13px]/[130%] font-semibold text-cs-text-tertiary">
        {current?.label ?? 'Sort'}
      </span>

      <div className="h-px bg-cs-hairline" />

      <div className="flex flex-col items-start gap-[9px] pt-[9px]">
        {options
          .filter((option) => option.value !== value)
          .map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitem"
              onClick={() => {
                onSelect(option.value)
              }}
              className={`${MENU_ITEM} text-cs-text-branch hover:text-cs-text-primary`}
            >
              {option.label}
            </button>
          ))}
      </div>
    </div>
  )
}
