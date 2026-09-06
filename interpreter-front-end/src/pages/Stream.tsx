import { Icon } from '@cs/components/ui/Icon'
import { EntryCard } from '../components/EntryCard'
import type { ChangeRecord } from '../data/types'
import { byDay, noticeFor } from '../lib/derive'

interface StreamProps {
  /** `Latest` across every project, or one project's name. */
  title: string
  records: ChangeRecord[]
  /** Latest hides the header's controls; a project's stream shows them. */
  isLatest: boolean
  fixed: string[]
  /** The change whose panel is open beside this, if any. */
  openId: string | undefined
  expanded: string[]
  onOpen: (changeId: string) => void
  onToggleBatch: (changeId: string) => void
  onReview: (changeId: string) => void
  onFix: (problemId: string) => void
}

/**
 * The reading surface, and the screen Interpreter opens on.
 *
 * A history rather than a feed: grouped by day, newest first, every entry the
 * same shape whether a person or an agent wrote it. That symmetry is deliberate
 * — the moment agent output is styled as a different kind of event, the product
 * becomes a log with robots in it rather than one account of what happened.
 *
 * Latest and a project's own stream differ in one thing only: Latest has no
 * filter or overflow control, because there is nothing yet to scope a
 * cross-project view by. Every card is identical either way.
 *
 * The stream never unmounts. The detail panel opens beside it rather than over
 * it, so the card being explained stays in view.
 */
export function Stream({
  title,
  records,
  isLatest,
  fixed,
  openId,
  expanded,
  onOpen,
  onToggleBatch,
  onReview,
  onFix,
}: StreamProps) {
  const days = byDay(records)

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-cs-window animate-cs-page-in motion-reduce:animate-none">
      <div className="flex shrink-0 items-start gap-[14px] pt-[26px] pr-[38px] pb-[6px] pl-[38px]">
        <h1 className="min-w-0 flex-1 truncate text-[22px] leading-[1.2] font-bold tracking-[-0.02em] text-cs-text-primary">
          {title}
        </h1>

        {/* Drawn, pressable, inert. Neither frame gives them a menu, and
            inventing one would put undesigned behaviour on screen.

            Sized and spaced exactly as Home draws the same two glyphs, so the
            header reads the same everywhere in Cseudocode rather than being
            near enough. */}
        {!isLatest && (
          <div className="mt-[8px] flex shrink-0 items-center gap-[14px] text-cs-text-primary">
            <button
              type="button"
              aria-disabled
              aria-label="Filter"
              className="flex cursor-pointer items-center border-none bg-transparent p-0"
            >
              <Icon name="filter" className="h-[8px] w-[14px]" />
            </button>
            <button
              type="button"
              aria-disabled
              aria-label="More"
              className="flex cursor-pointer items-center border-none bg-transparent p-0"
            >
              <Icon name="ellipsis" className="h-[4px] w-[16px]" />
            </button>
          </div>
        )}
      </div>

      <div className="scroll-hidden min-h-0 flex-1 overflow-y-auto px-[38px] pb-[50px]">
        {days.length === 0 && (
          <div className="py-[80px] text-center text-[11px] text-interp-day">Nothing to show here.</div>
        )}

        {days.map((day) => (
          <div key={day.label}>
            <div className="pt-[18px] pb-[10px] text-[10px] text-interp-day">{day.label}</div>
            {day.entries.map((record) => (
              <EntryCard
                key={record.id}
                record={record}
                notice={noticeFor(record, fixed)}
                expanded={expanded.includes(record.id)}
                selected={openId === record.id}
                onOpen={onOpen}
                onToggleBatch={() => {
                  onToggleBatch(record.id)
                }}
                onReview={() => {
                  onReview(record.id)
                }}
                onFix={() => {
                  if (record.caused !== undefined) onFix(record.caused)
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
