import type { ReactNode } from 'react'

interface ComposerRowProps {
  /** The trailing colon belongs to the label — this is the only place the product uses one. */
  label: string
  children?: ReactNode
  /** Hairline beneath the row. The last row in the window omits it. */
  divider?: boolean
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
export function ComposerRow({ label, children, divider = true }: ComposerRowProps) {
  return (
    <>
      <div className="relative flex h-[50px] shrink-0 items-start justify-between gap-[16px] px-[5px] pt-[17px]">
        <span className="shrink-0 text-[14px] font-medium text-cp-text-composer">{label}</span>
        {children}
      </div>
      {divider && <div className="h-px shrink-0 bg-cp-hairline" />}
    </>
  )
}
