import { useCallback, useId, useState } from 'react'
import { useOverlayDismiss } from '../../hooks/useOverlayDismiss'
import { Icon } from './Icon'
import { POPOVER_SURFACE } from './Popover'

interface OptionSelectProps {
  /** What the row reads now. Drawn as the trigger, and as the panel's heading. */
  value: string
  /** Everything it could read instead. The current value is filtered out. */
  options: string[]
  onSelect: (option: string) => void
  /** Names the control for assistive tech — the row's label, in practice. */
  label: string
  /** Greys the trigger and refuses the press, while a write is in flight. */
  disabled?: boolean
  /** The row's closed height, which the value is centred in while it is just a value. */
  rowHeight?: number
}

/** Both halves grow and shrink the same way, so the row's height only ever changes once. */
const TRACK = 'grid transition-[grid-template-rows] duration-300 ease-cp motion-reduce:transition-none'
const FADE = 'transition-opacity duration-200 ease-out motion-reduce:transition-none'

/**
 * A settings value that is a choice: the value in the row, and the alternatives in
 * a card the row unfolds into.
 *
 * This is Main's branch panel wearing a settings row — drawn in the flow rather than
 * over it, so opening it extends the card the row sits in instead of floating above
 * it. It is the same #E5E5E5 surface, the same value and chevron heading it, the same
 * hairline, the same names beneath. The shadow goes, because nothing here is above
 * anything, and there is no scrim and no click-outside for the same reason: this is
 * part of the card, not something covering it. Escape still closes it.
 *
 * The two halves are one swap. The value collapses as the card opens and the card's
 * heading arrives where the value just was, so the value is never drawn twice and
 * never leaves a gap. Both size through `grid-template-rows` between `0fr` and `1fr`
 * rather than a max-height guess: a grid track resolves `1fr` to the content's real
 * height, so a list of any length opens to exactly its size and no further.
 *
 * It replaces a row that cycled its value on every press. Cycling is fine for two
 * states and a lie for three: it hides what the alternatives are, gives no way to
 * skip one, and offers nothing to read before committing. Every one of these rows
 * writes to the server on selection, so the alternatives being visible before the
 * press is the difference between choosing and discovering.
 *
 * The list holds what the value is *not*, which is the branch menu's convention: the
 * current value already heads the card, so repeating it below would put a row there
 * that does nothing.
 */
export function OptionSelect({
  value,
  options,
  onSelect,
  label,
  disabled = false,
  rowHeight = 35,
}: OptionSelectProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  const close = useCallback(() => {
    setOpen(false)
  }, [])

  // Only while it is genuinely open, so a shut panel does not swallow the Escape
  // meant for whatever is above it.
  useOverlayDismiss(close, open)

  const text = 'text-[13px] font-medium text-cp-text-tertiary'
  const chevron = <Icon name="chevron-small" className="h-[7px] w-[4px] shrink-0 opacity-84" />

  // The value as a control, drawn identically closed and as the card's first line —
  // which is what lets the value look like it has moved rather than been copied.
  const trigger = (heading: boolean) => (
    <button
      type="button"
      aria-expanded={heading}
      aria-controls={panelId}
      aria-label={`${label}: ${value}`}
      disabled={disabled && !heading}
      onClick={() => {
        setOpen(!heading)
      }}
      className={`cursor-pointer items-center gap-[9px] border-none bg-transparent p-0 outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-cp-accent disabled:cursor-default disabled:opacity-50 ${text} ${
        heading ? 'flex w-full justify-between' : 'inline-flex'
      }`}
    >
      <span className="truncate">{value}</span>
      {chevron}
    </button>
  )

  return (
    <div className="flex min-w-0 flex-col items-end">
      {/* The value at rest. `inert` while it is collapsed, so nothing invisible takes
          a click or a tab stop. */}
      <div className={`${TRACK} ${open ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
        <div className="overflow-hidden" inert={open}>
          <div
            style={{ height: rowHeight }}
            className={`flex items-center ${FADE} ${open ? 'opacity-0' : 'opacity-100 delay-100'}`}
          >
            {trigger(false)}
          </div>
        </div>
      </div>

      <div id={panelId} className={`${TRACK} ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden" inert={!open}>
          {/* Opening, the card waits for the row to have somewhere to put it; closing,
              it leaves first so the row shuts on an empty panel. The top padding is
              set so the heading lands on the row's centre line, level with the label. */}
          <div className={`pt-[3px] pb-[10px] ${FADE} ${open ? 'opacity-100 delay-100' : 'opacity-0'}`}>
            <div className={POPOVER_SURFACE}>
              <div className="pb-[8px]">{trigger(true)}</div>

              <div className="h-px bg-cp-hairline" />

              <div className="flex flex-col items-start gap-[9px] pt-[9px]">
                {options
                  .filter((option) => option !== value)
                  .map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        onSelect(option)
                        close()
                      }}
                      className="cursor-pointer border-none bg-transparent p-0 text-left text-[11px]/[130%] font-normal text-cp-text-branch transition-colors duration-150 ease-out motion-reduce:transition-none hover:text-cp-text-primary"
                    >
                      {option}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
