import type { MouseEvent } from 'react'
import type { IconName } from './Icon'
import { Icon } from './Icon'

interface IconButtonProps {
  icon: IconName
  label: string
  /** Tailwind sizing/colour classes for the glyph itself. */
  iconClassName: string
  className?: string
  /** Handed the event, because a button that opens a menu is measured by its rect. */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  /** Set only on a button that opens something, which it then announces. */
  expanded?: boolean
  /**
   * Refuses the press and halves the glyph. The design system defines no
   * disabled state for these, so this borrows the one it does define — the
   * 0.55 press dim — and holds it, rather than inventing a second treatment.
   */
  disabled?: boolean
}

/**
 * A bare glyph that is genuinely a control: no chrome, but focusable and labelled.
 * The design system gives glyph buttons one state and one only — press dims to 0.55.
 * No hover wash, no scale, no colour change.
 *
 * These are drawn between 8 and 17px, which a cursor can hit and a fingertip cannot.
 * On a touch screen an invisible pseudo-element grows the target by 6px on every side
 * without touching the layout — the glyphs stay exactly where the design puts them.
 * 6px rather than more because the tightest rows here are 12px apart, so the targets
 * meet without overlapping and a tap never lands on the wrong one.
 */
export function IconButton({
  icon,
  label,
  iconClassName,
  className,
  onClick,
  expanded,
  disabled = false,
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      {...(expanded === undefined ? {} : { 'aria-haspopup': 'menu' as const, 'aria-expanded': expanded })}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex cursor-pointer items-center justify-center border-none bg-transparent p-0 transition-opacity duration-150 ease-out motion-reduce:transition-none active:opacity-[0.55] disabled:cursor-default disabled:opacity-[0.35] pointer-coarse:after:absolute pointer-coarse:after:-inset-[6px] pointer-coarse:after:content-[''] ${className ?? ''}`}
    >
      <Icon name={icon} className={iconClassName} />
    </button>
  )
}
