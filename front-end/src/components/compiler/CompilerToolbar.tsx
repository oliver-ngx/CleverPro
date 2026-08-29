import type { IconName } from '../ui/Icon'
import { Icon } from '../ui/Icon'

interface CompilerToolbarProps {
  query: string
  onQuery: (value: string) => void
}

/**
 * One inert action on the right of the toolbar.
 *
 * A real `button` rather than a span, and focusable, because the design draws
 * these as controls and they are pressable — they simply have nothing behind
 * them yet. Opening a folder, syncing a repository and filtering the list are
 * three unspecified features, and guessing at any of them would put behaviour
 * on screen that nobody designed. `aria-disabled` says so to a screen reader
 * without the greying-out that `disabled` implies, since the design draws them
 * at full strength.
 */
function ToolbarAction({
  icon,
  label,
  iconClass,
}: {
  icon: IconName
  label?: string
  iconClass: string
}) {
  return (
    <button
      type="button"
      aria-disabled
      className="flex cursor-pointer items-center gap-[7px] border-none bg-transparent p-0"
    >
      <Icon name={icon} className={iconClass} />
      {label !== undefined && (
        <span className="text-[10px] whitespace-nowrap text-cs-action">{label}</span>
      )}
    </button>
  )
}

/**
 * The row over the project list: a search field on the left, three actions and
 * a filter glyph on the right, and a hairline under the lot.
 *
 * Only the search works. The other four are drawn and inert — see ToolbarAction.
 *
 * The two paddings are both from the source and are genuinely different: the
 * hairline runs from 437 to 2108 in the 2204 frame (68 and 61 from the rail and
 * the right edge here), while the controls sit 25px inside that. Hence a rule
 * that is wider than the row above it.
 */
export function CompilerToolbar({ query, onQuery }: CompilerToolbarProps) {
  return (
    <div className="px-[68px] pt-[56px]">
      <div className="flex items-center justify-between px-[25px]">
        <div className="flex min-w-0 items-center gap-[9px]">
          <Icon name="search" className="size-[10px] shrink-0" />
          <input
            value={query}
            onChange={(event) => {
              onQuery(event.target.value)
            }}
            type="search"
            aria-label="Search projects"
            placeholder="Search"
            // The source specifies no box at all here — a glyph, a word and the
            // rule underneath are the whole field — so the input is transparent
            // and borderless, and the focus ring is the only thing added back.
            className="w-[180px] min-w-0 border-none bg-transparent text-[11px] text-cs-text-primary outline-none placeholder:text-cs-text-search focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cs-accent"
          />
        </div>

        <div className="flex shrink-0 items-center gap-[22px]">
          <ToolbarAction icon="folder-open" label="Open Folder" iconClass="h-[12px] w-[13px]" />
          <ToolbarAction icon="folder-new" label="New Folder" iconClass="h-[12px] w-[17px]" />
          <ToolbarAction icon="git-sync" label="Sync from GitHub" iconClass="h-[13px] w-[12px]" />
          <ToolbarAction icon="filter" iconClass="h-[9px] w-[15px] text-cs-action" />
        </div>
      </div>

      <div className="mt-[16px] h-px bg-cs-hairline" />
    </div>
  )
}
