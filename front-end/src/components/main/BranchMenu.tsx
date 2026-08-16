import { Icon } from '../ui/Icon'

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
        <span className="text-[13px] font-semibold text-cp-text-tertiary">{current}</span>
        <Icon name="chevron-up-down" className="h-[11px] w-[8px] shrink-0 opacity-84" />
      </div>

      <div className="h-px bg-cp-hairline" />

      <div className="flex flex-col items-start gap-[9px] pt-[9px]">
        {branches
          .filter((branch) => branch !== current)
          .map((branch) => (
            <button
              key={branch}
              type="button"
              onClick={() => {
                onSelect(branch)
              }}
              className="cursor-pointer border-none bg-transparent p-0 text-left text-[11px]/[130%] font-normal text-cp-text-branch transition-colors duration-150 ease-out motion-reduce:transition-none hover:text-cp-text-primary"
            >
              {branch}
            </button>
          ))}
        {onAdd !== undefined && (
          <button
            type="button"
            onClick={onAdd}
            className="cursor-pointer border-none bg-transparent p-0 text-left text-[11px] font-normal text-cp-text-branch transition-colors duration-150 ease-out motion-reduce:transition-none hover:text-cp-text-primary"
          >
            + Add Branches
          </button>
        )}
      </div>
    </div>
  )
}
