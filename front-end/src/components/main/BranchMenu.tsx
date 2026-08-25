import { Icon } from '../ui/Icon'
import { BranchList } from './BranchList'

interface BranchMenuProps {
  current: string
  branches: string[]
  onSelect: (branch: string) => void
  /** Omitted where there is nowhere to put a new branch, as in the Action window. */
  onAdd?: () => void
}

/**
 * Contents of the branch popover: the current branch, a rule, then the alternatives.
 * The header repeats the closed-state trigger at the same size, so opening the menu
 * reads as the value expanding rather than a separate panel appearing.
 */
export function BranchMenu({ current, branches, onSelect, onAdd }: BranchMenuProps) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-[6px] pb-[8px]">
        <span className="text-[13px] font-semibold text-cs-text-tertiary">{current}</span>
        <Icon name="chevron-up-down" className="h-[11px] w-[8px] shrink-0" />
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
  )
}
