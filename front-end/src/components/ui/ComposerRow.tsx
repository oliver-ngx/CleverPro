import type { ReactNode } from 'react'

interface ComposerRowProps {
  /** The trailing colon belongs to the label — this is the only place the product uses one. */
  label: string
  children?: ReactNode
  /** Hairline beneath the row. The last row in the window omits it. */
  divider?: boolean
  /**
   * The value can grow taller than the row and the row grows with it — the mention
   * field opens its suggestions inside the row, and the comment field grows a line at
   * a time as a paragraph is written. 50 then sets where the row starts rather than
   * where it ends, and the label holds its line instead of drifting down beside
   * whatever the value has become.
   */
  grows?: boolean
}

/**
 * Ported from the design system's `overlays/ComposerRow`: a labelled line in the
 * Action window, with room for a value to its right.
 *
 * The spec puts the row at 100px tall with 14px of top padding. The frame draws 78
 * with 26, which scales to 50 and 17, and the frame wins. The label is #A0A0A0
 * rather than the secondary grey the spec's type role names.
 *
 * The box is `relative` because the Branches row's popover anchors to it.
 */
export function ComposerRow({
  label,
  children,
  divider = true,
  grows = false,
}: ComposerRowProps) {
  return (
    <>
      <div
        className={`relative flex shrink-0 items-start justify-between gap-[16px] px-[5px] pt-[17px] ${
          grows ? 'min-h-[50px] pb-[14px]' : 'h-[50px]'
        }`}
      >
        <span className="shrink-0 text-[14px] font-medium text-cp-text-composer">{label}</span>
        {children}
      </div>
      {divider && <div className="h-px shrink-0 bg-cp-hairline" />}
    </>
  )
}
