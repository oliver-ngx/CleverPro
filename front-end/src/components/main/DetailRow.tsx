import type { ReactNode } from 'react'

interface DetailRowProps {
  label: string
  /** Row heights are hand-set in the source, not derived from a scale. */
  height: number
  children: ReactNode
  /** Hairline beneath the row, inset 26px. The last row in a group omits it. */
  divider?: boolean
}

/**
 * A labelled line on Main: the label at the left, its value at the right, a hairline
 * under it. The four of them stack into the page's one detail group.
 *
 * `relative` because the Branches row's popover anchors to it.
 */
export function DetailRow({ label, height, children, divider = true }: DetailRowProps) {
  return (
    <>
      <div
        style={{ height }}
        className="relative flex items-center justify-between gap-[16px] pr-[20px] pl-[12px] md:pr-[48px] md:pl-[32px]"
      >
        <span className="shrink-0 text-[13px] font-medium text-cp-text-primary">{label}</span>
        {children}
      </div>
      {divider && <div className="mx-[10px] h-px bg-cp-hairline md:mx-[26px]" />}
    </>
  )
}
