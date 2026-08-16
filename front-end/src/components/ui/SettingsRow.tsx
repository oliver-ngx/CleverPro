import type { ReactNode } from 'react'
import { Icon } from './Icon'

interface SettingsRowProps {
  label: string
  /** Plain grey text on the right — the row's current setting. */
  value?: string
  /** Replaces `value` when the right-hand side is a control rather than a reading. */
  action?: ReactNode
  chevron?: boolean
  /** Hairline beneath the row, inset. The last row in a group omits it. */
  divider?: boolean
}

/**
 * Ported from the design system's `surfaces/SettingsRow`. The source draws these
 * at 55px rather than the component's stated 49 — the frame wins, as it does
 * everywhere the two disagree.
 *
 * A row with a chevron is a disclosure, but nothing is behind any of them yet, so
 * they are not buttons. The chevron reads as affordance, not as a broken control.
 */
export function SettingsRow({
  label,
  value,
  action,
  chevron = false,
  divider = true,
}: SettingsRowProps) {
  return (
    <>
      <div className="flex h-[35px] items-center justify-between gap-[16px] pr-[19px] pl-[30px]">
        <span className="shrink-0 text-[13px] font-medium text-cp-text-primary">{label}</span>
        <span className="flex min-w-0 items-center gap-[9px] text-[13px] font-medium text-cp-text-tertiary">
          {action ?? <span className="truncate">{value}</span>}
          {chevron && <Icon name="chevron-small" className="h-[7px] w-[4px] shrink-0 opacity-84" />}
        </span>
      </div>
      {divider && <div className="mx-[22px] h-px bg-cp-hairline" />}
    </>
  )
}
