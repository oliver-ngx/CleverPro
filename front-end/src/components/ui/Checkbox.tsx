import { Icon } from './Icon'

interface CheckboxProps {
  checked: boolean
  label: string
  /** The source offers three near-identical blues for this fill. */
  accentColor?: string
  onChange: () => void
}

/**
 * 14px square at radius 6: accent fill when on, white with a hairline ring when off.
 *
 * 14px is a fingertip's worth of nothing, so on a touch screen a pseudo-element grows
 * the target to 24 without moving the box — the file rows are 24px apart, so the
 * targets meet and never overlap.
 */
export function Checkbox({
  checked,
  label,
  accentColor = 'var(--color-cp-accent)',
  onChange,
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      style={{ background: checked ? accentColor : undefined }}
      className={`relative inline-flex size-[14px] shrink-0 cursor-pointer items-center justify-center rounded-cp-checkbox border-none p-0 transition-colors duration-150 ease-out motion-reduce:transition-none pointer-coarse:after:absolute pointer-coarse:after:-inset-[5px] pointer-coarse:after:content-[''] ${
        checked ? '' : 'bg-cp-white shadow-cp-checkbox-off'
      }`}
    >
      {checked && <Icon name="checkmark" className="size-[7px] animate-cp-check-in motion-reduce:animate-none" />}
    </button>
  )
}
