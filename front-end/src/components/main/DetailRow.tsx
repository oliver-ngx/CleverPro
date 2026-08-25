import type { ReactNode } from 'react'

interface DetailRowProps {
  label: string
  /** Row heights are hand-set in the source, not derived from a scale. */
  height: number
  children: ReactNode
  /** Hairline beneath the row, inset 26px. The last row in a group omits it. */
  divider?: boolean
  /**
   * The value can grow taller than the row, and the row grows with it — the Branches
   * row, whose value opens into a card. `height` then sets where the row starts rather
   * than where it ends, and the label holds its line instead of drifting to the middle
   * of whatever the value has become.
   */
  grows?: boolean
}

/**
 * A labelled line on Main: the label at the left, its value at the right, a hairline
 * under it. The four of them stack into the page's one detail group.
 */
export function DetailRow({
  label,
  height,
  children,
  divider = true,
  grows = false,
}: DetailRowProps) {
  return (
    <>
      <div
        style={grows ? { minHeight: height } : { height }}
        className={`flex justify-between gap-[16px] pr-[20px] pl-[12px] md:pr-[48px] md:pl-[32px] ${
          grows ? 'items-start' : 'items-center'
        }`}
      >
        {/* A growing row is aligned to the top, so the label centres itself against the
            row's closed height rather than against the row — otherwise it would slide
            down the moment the value opened. */}
        <span
          style={grows ? { height } : undefined}
          className={`shrink-0 text-[13px] font-medium text-cs-text-primary ${
            grows ? 'flex items-center' : ''
          }`}
        >
          {label}
        </span>
        {children}
      </div>
      {divider && <div className="mx-[10px] h-px bg-cs-hairline md:mx-[26px]" />}
    </>
  )
}
