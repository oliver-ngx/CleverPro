interface ConfirmActionProps {
  /** The question, in full. Never truncated — it is the thing being asked. */
  question: string
  /** What the answer costs, when that is not obvious from the question alone. */
  note?: string
  /** The verb that commits. Named for the act, never "OK" or "Yes". */
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  /** Greys both words and refuses the press, while a write is in flight. */
  disabled?: boolean
}

const WORD =
  'cursor-pointer border-none bg-transparent p-0 text-left text-[11px]/[130%] font-normal transition-colors duration-150 ease-out disabled:cursor-default disabled:opacity-50 motion-reduce:transition-none'

/**
 * The question this product asks before an act it cannot take back, and the two
 * answers to it.
 *
 * It is contents rather than a container: the caller decides what it sits in, the
 * same way `BranchList` is drawn once inside a floating popover and once inside a
 * card that unfolds in place. The row menu on the log tables floats it; the
 * ownership transfer on Settings unfolds it. Both are the #E5E5E5 surface, so the
 * question reads as the same object wherever it is asked.
 *
 * Confirming is deliberately the *second* press, never the first — choosing and
 * committing are different acts when the act is final. The confirming word is named
 * for what it does and wears the destructive colour; Cancel is a plain word beside
 * it rather than a competing button, because backing out should be the easy one.
 *
 * Nothing here is width-constrained. The question and the note wrap and the surface
 * grows to hold them, so a longer question is a taller card rather than a clipped
 * one.
 */
export function ConfirmAction({
  question,
  note,
  confirmLabel,
  onConfirm,
  onCancel,
  disabled = false,
}: ConfirmActionProps) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="pb-[8px] text-[13px]/[130%] font-semibold text-cs-text-tertiary">
        {question}
      </span>

      {note !== undefined && (
        <span className="pb-[8px] text-[11px]/[130%] font-normal text-cs-text-branch">{note}</span>
      )}

      <div className="h-px bg-cs-hairline" />

      <div className="flex flex-col items-start gap-[9px] pt-[9px]">
        <button
          type="button"
          disabled={disabled}
          onClick={onConfirm}
          className={`${WORD} font-medium text-cs-destructive hover:opacity-[0.75]`}
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onCancel}
          className={`${WORD} text-cs-text-branch hover:text-cs-text-primary`}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
