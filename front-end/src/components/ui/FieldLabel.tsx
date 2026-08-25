import type { ReactNode } from 'react'

interface FieldLabelProps {
  children: ReactNode
  /** Renders a real `<label>` bound to this control instead of a bare span. */
  htmlFor?: string
  /** Trailing glyph action — the attachment well's button in the Add Branch sheet. */
  action?: ReactNode
}

/**
 * Ported from the design system's `forms/FieldLabel`: the black caption that sits
 * above every field in the Add Branch sheet, with an optional trailing action.
 *
 * 14px rather than the transcribed 11: the user asked for the Add Branch sheet and the
 * Action window to be identical, and 14 is what `ComposerRow` — the Action window's
 * equivalent caption — is drawn at. Everything else in the sheet is scaled by that
 * same 14/11 step. The line height is pinned so the label costs exactly its own
 * height, because the sheet has to fit the Action window's fixed 578.
 *
 * The source draws this as a plain div because it is a static mock. Given an
 * `htmlFor` it renders a real label, so clicking the caption focuses the field.
 */
export function FieldLabel({ children, htmlFor, action }: FieldLabelProps) {
  const text = 'text-[14px]/[100%] font-medium text-cs-text-primary'

  return (
    <div className="mb-[8px] flex items-center justify-between">
      {htmlFor === undefined ? (
        <span className={text}>{children}</span>
      ) : (
        <label htmlFor={htmlFor} className={text}>
          {children}
        </label>
      )}
      {action}
    </div>
  )
}
