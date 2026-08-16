import type { ComponentPropsWithRef, ReactNode } from 'react'
import { useId } from 'react'
import { FieldLabel } from './FieldLabel'

interface TextFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'className' | 'id'> {
  label?: string
  /** Trailing glyph action on the label row. */
  labelAction?: ReactNode
  /**
   * The source draws single-line fields 58px tall at radius 18, and taller ones at
   * radius 22. Deploy is drawn at 85 — roomier than Name for no stated reason, but
   * both Add Branch frames agree on it. Scaled those are 37 and 54, and stepped up
   * again by the sheet's 14/11 they are 47 and 66.
   */
  height?: number
  radius?: 'field' | 'tall'
  /** Shown under the field when the value is rejected. Sets up aria-describedby. */
  error?: string
}

/**
 * Ported from the design system's `forms/TextField`: a filled #F0F0F0 input,
 * 58px tall at radius 18 in the source, placeholder #818181.
 *
 * Its metrics carry the Add Branch sheet's 14/11 step-up, taken so the sheet reads at
 * the same scale as the Action window it is now the same size as — 47 tall at radius
 * 14, 11px text, 19px of side padding. The value stays a step under the label, which
 * is how the source draws it and where the Action window's own secondary text sits.
 *
 * The source specifies `outline: none`. Honouring that alone would leave a focused
 * field with nothing on screen saying so, so the ring comes back for keyboard users
 * only and the pointer view is exactly as drawn.
 */
export function TextField({
  label,
  labelAction,
  height = 47,
  radius = 'field',
  error,
  ...rest
}: TextFieldProps) {
  const id = useId()
  const errorId = useId()

  return (
    <div>
      {label !== undefined && (
        <FieldLabel htmlFor={id} action={labelAction}>
          {label}
        </FieldLabel>
      )}
      <input
        id={id}
        aria-invalid={error !== undefined}
        aria-describedby={error === undefined ? undefined : errorId}
        style={{ height }}
        className={`w-full border-none bg-cp-field px-[19px] text-[11px] font-medium text-cp-text-primary outline-none placeholder:text-cp-text-placeholder focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cp-accent ${
          radius === 'tall' ? 'rounded-[18px]' : 'rounded-cp-attachment'
        }`}
        {...rest}
      />
      {error !== undefined && (
        <p id={errorId} className="mt-[6px] px-[19px] text-[10px]/[100%] text-cp-text-branch">
          {error}
        </p>
      )}
    </div>
  )
}
