import type { IconName } from './Icon'
import { Icon } from './Icon'

interface IconButtonProps {
  icon: IconName
  label: string
  /** Tailwind sizing/colour classes for the glyph itself. */
  iconClassName: string
  className?: string
  onClick?: () => void
}

/** A bare glyph that is genuinely a control: no chrome, but focusable and labelled. */
export function IconButton({ icon, label, iconClassName, className, onClick }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center justify-center border-none bg-transparent p-0 ${className ?? ''}`}
    >
      <Icon name={icon} className={iconClassName} />
    </button>
  )
}
