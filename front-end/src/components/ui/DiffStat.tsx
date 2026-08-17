interface DiffStatProps {
  added: number
  removed: number
}

/** Ported from the design system's `data/DiffStat`: green additions, red deletions. */
export function DiffStat({ added, removed }: DiffStatProps) {
  return (
    <span className="shrink-0 text-[11px] font-normal whitespace-nowrap">
      <span className="text-cp-diff-add">+{added}</span> <span className="text-cp-diff-remove">-{removed}</span>
    </span>
  )
}
