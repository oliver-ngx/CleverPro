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
  /** Makes the whole row the control. Without it the row is a reading. */
  onClick?: () => void
  /** Greys the row and refuses the press, while a write is in flight. */
  disabled?: boolean
  /**
   * The value can grow taller than the row, and the row grows with it — a value
   * that opens into a card. 35 then sets where the row starts rather than where
   * it ends, and the label holds its line instead of drifting to the middle of
   * whatever the value has become. Only ever set alongside `action`: a growing
   * row is not itself the control, the thing inside it is.
   */
  grows?: boolean
}

/**
 * Ported from the design system's `surfaces/SettingsRow`. The source draws these
 * at 55px rather than the component's stated 49 — the frame wins, as it does
 * everywhere the two disagree.
 *
 * A chevron marks a row that leads somewhere or changes something. The source
 * drew them as pure affordance with nothing behind them; the rows that now have
 * an `onClick` are real controls, and the ones that do not — a name, a role, a
 * face stack — stay plain text, so the chevron is not a promise the row breaks.
 *
 * The interactive variant is a real `button` rather than a div with a handler:
 * the settings list is a column of controls and it has to be reachable by
 * keyboard. The two branches share every layout class, so an interactive row and
 * a reading row are the same 35px line either way.
 *
 * A row whose value opens into a card grows instead of holding that line — see
 * `grows`, and `OptionSelect`, which is what does the opening.
 */
export function SettingsRow({
  label,
  value,
  action,
  chevron = false,
  divider = true,
  onClick,
  disabled = false,
  grows = false,
}: SettingsRowProps) {
  const LAYOUT = `flex w-full justify-between gap-[16px] pr-[19px] pl-[30px] ${
    grows ? 'min-h-[35px] items-start' : 'h-[35px] items-center'
  }`

  const content = (
    <>
      {/* A growing row is aligned to the top, so the label centres itself against
          the row's closed height rather than against the row — otherwise it would
          slide down the moment the value opened. */}
      <span
        className={`shrink-0 text-[13px] font-medium text-cp-text-primary ${
          grows ? 'flex h-[35px] items-center' : ''
        }`}
      >
        {label}
      </span>
      <span
        className={`flex min-w-0 text-[13px] font-medium text-cp-text-tertiary ${
          grows ? 'flex-col items-end' : 'items-center gap-[9px]'
        }`}
      >
        {action ?? <span className="truncate">{value}</span>}
        {chevron && <Icon name="chevron-small" className="h-[7px] w-[4px] shrink-0 opacity-84" />}
      </span>
    </>
  )

  return (
    <>
      {onClick === undefined ? (
        <div className={LAYOUT}>{content}</div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={onClick}
          // `outline-none` kills the browser's own ring and nulls the style ours
          // is drawn in as a side effect, hence `outline-solid` — the same pair
          // VersionRow needs for the same reason.
          className={`${LAYOUT} cursor-pointer border-none bg-transparent text-left outline-none transition-colors duration-150 ease-out motion-reduce:transition-none hover:bg-cp-hover focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-cp-accent disabled:cursor-default disabled:opacity-50`}
        >
          {content}
        </button>
      )}
      {divider && <div className="mx-[22px] h-px bg-cp-hairline" />}
    </>
  )
}
