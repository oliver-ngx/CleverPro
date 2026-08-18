interface BranchListProps {
  /** The open branch, which is not offered as something to switch to. */
  current: string
  branches: string[]
  onSelect: (branch: string) => void
  /** Omitted where there is nowhere to put a new branch, as in the Action window. */
  onAdd?: () => void
  /** The container's layout: the popover stacks these left, the card's panel right. */
  className: string
}

/** One shared style, so a branch reads the same wherever the list is drawn. */
const ITEM =
  'cursor-pointer border-none bg-transparent p-0 text-left text-[11px]/[130%] font-normal text-cp-text-branch transition-colors duration-150 ease-out motion-reduce:transition-none hover:text-cp-text-primary'

/**
 * The branches you can switch to, and the way to make another. Drawn twice: inside
 * the popover the Action window opens, and inside the panel Main's card extends into.
 * Only the container's layout differs, so that is all the caller sets.
 */
export function BranchList({ current, branches, onSelect, onAdd, className }: BranchListProps) {
  return (
    <div className={className}>
      {branches
        .filter((branch) => branch !== current)
        .map((branch) => (
          <button
            key={branch}
            type="button"
            onClick={() => {
              onSelect(branch)
            }}
            className={ITEM}
          >
            {branch}
          </button>
        ))}
      {onAdd !== undefined && (
        <button type="button" onClick={onAdd} className={ITEM}>
          + Add Branches
        </button>
      )}
    </div>
  )
}
