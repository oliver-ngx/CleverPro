import type { ComponentPropsWithRef } from 'react'

interface ButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'className'> {
  variant?: 'primary' | 'secondary' | 'destructive'
}

/**
 * Fill, size and radius per variant. Sizing sits here rather than on the shared class
 * because the two footer buttons belong to the sheet and scale with it, while
 * `destructive` is an in-window row on Settings and keeps that screen's sizing.
 */
const VARIANT_STYLE = {
  primary: 'h-[27px] w-[79px] rounded-[8px] bg-cs-presence text-[11px] text-cs-white',
  secondary: 'h-[27px] w-[79px] rounded-[8px] bg-cs-button text-[11px] text-cs-text-primary',
  destructive: 'h-[37px] w-full rounded-cs-panel bg-cs-card text-[13px] text-cs-destructive',
} as const

/**
 * Ported from the design system's `forms/Button`. Two buttons sit side by side in
 * the source, both 97x33 at radius 10: a filled blue primary and a grey secondary.
 * Scaled those are 62x21, and stepped up with the rest of the Add Branch sheet they
 * are 79x27 at radius 8 with 11px text.
 * The third, `destructive`, is not a button-shaped thing at all — it is a full-width
 * red text row on its own card at the foot of Settings.
 *
 * Hover brightens and press dims — the design system's states for a filled button.
 * `enabled:` keeps a disabled button inert under the pointer.
 */
export function Button({ variant = 'primary', type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      // `outline-none` suppresses the browser's own two-tone focus ring, and nulls
      // the style ours is drawn in as a side effect — hence `outline-solid` below.
      className={`cursor-pointer border-none font-medium outline-none transition-[filter,opacity] duration-150 ease-out motion-reduce:transition-none enabled:hover:brightness-[0.96] enabled:active:opacity-60 disabled:cursor-default disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-cs-accent ${VARIANT_STYLE[variant]}`}
      {...rest}
    />
  )
}
