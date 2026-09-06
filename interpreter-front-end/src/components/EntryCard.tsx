import type { MouseEvent, ReactNode } from 'react'
import type { ChangeRecord, Problem } from '../data/types'
import { actorOf, thirdLine, when } from '../lib/derive'
import type { SymbolName } from './Symbols'
import { Symbol } from './Symbols'

interface BannerProps {
  symbol: SymbolName
  tintClass: string
  inkClass: string
  children: ReactNode
}

/**
 * The tinted strip inside a card. Three exist and they never mean the same
 * thing: orange is a change Interpreter questioned, blue is what to do about
 * this one, purple is something it left wrong. A card can carry more than one,
 * in that order, because they answer different questions.
 *
 * Inset 22 from the card's edge with 8 of radius, from `321:133`.
 */
function Banner({ symbol, tintClass, inkClass, children }: BannerProps) {
  return (
    <div className={`mt-[10px] flex items-start gap-[8px] rounded-[8px] px-[11px] py-[6px] ${tintClass}`}>
      <Symbol name={symbol} className={`mt-[1px] h-[12px] w-[12px] shrink-0 ${inkClass}`} />
      <div className={`min-w-0 flex-1 text-[11px] leading-[1.35] ${inkClass}`}>{children}</div>
    </div>
  )
}

interface EntryCardProps {
  record: ChangeRecord
  notice: Problem | undefined
  expanded: boolean
  selected: boolean
  onOpen: (changeId: string) => void
  onToggleBatch: () => void
  onReview: () => void
  onFix: () => void
}

/**
 * One change in the stream.
 *
 * The order of the lines is the argument the product makes, so it does not vary:
 * **who did what**, then when, then **why**, then what it means for everything
 * else. A diff puts the code first and the reasoning nowhere; this puts the
 * reasoning where the eye lands and leaves the code two clicks away.
 *
 * A missing reason is drawn, not hidden. `No reason recorded.` in muted grey is
 * a true statement about the project, and one of the few things here that cannot
 * be manufactured afterwards — filling it from the diff would turn the one
 * honest signal into a guess wearing an author's voice.
 *
 * Metrics come from `321:133` and `321:63` scaled by 0.6343, the factor the rest
 * of the client uses: 20 of radius, 20 of padding, an 11×9 mark 20 from the left
 * with the title 39 in.
 */
export function EntryCard({
  record,
  notice,
  expanded,
  selected,
  onOpen,
  onToggleBatch,
  onReview,
  onFix,
}: EntryCardProps) {
  const actor = actorOf(record.by)
  const isBatch = record.batchOf !== undefined
  const blocked = record.status === 'blocked'
  const waiting = record.status === 'waiting'
  const hasReason = record.why !== ''
  /** A batch opens the one line worth reading, not the batch. */
  const opensWith = isBatch && record.flagChild !== undefined ? record.flagChild : record.id

  /**
   * The card is the target. Three things open it -- the card, the chevron, and
   * *Show me* -- because all three mean the same thing, and a card that reads as
   * one object should not have one live corner. The links inside it that mean
   * something else stop the event here so they are not swallowed.
   */
  const swallow = (run: () => void) => (event: MouseEvent) => {
    event.stopPropagation()
    run()
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${actor.name} ${record.what}`}
      onClick={() => {
        onOpen(opensWith)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(opensWith)
        }
      }}
      className={`relative mb-[22px] cursor-pointer rounded-[20px] px-[20px] pt-[20px] pb-[18px] transition-colors duration-150 ease-out motion-reduce:transition-none ${
        selected ? 'bg-cs-selected' : 'bg-interp-card hover:bg-cs-row-hover'
      }`}
    >
      <Symbol name="chevron" className="absolute top-[22px] right-[20px] h-[9px] w-[5.4px] text-interp-chevron" />

      <div className="flex items-start gap-[9px] pr-[60px]">
        <Symbol name="translate" className="mt-[2px] h-[9px] w-[11.6px] shrink-0" />
        <span className="min-w-0 flex-1 text-[12px] leading-[1.3] font-semibold text-cs-text-primary">
          {actor.name} {record.what}
        </span>
      </div>

      <div className="mt-[2px] mb-[9px] ml-[20px] text-[9px] text-interp-day">{when(record.hours)}</div>

      <div className={`text-[11px] ${hasReason ? 'text-cs-text-primary' : 'text-interp-day'}`}>
        {hasReason ? record.why : 'No reason recorded.'}
      </div>

      {thirdLine(record) !== '' && <div className="mt-[1px] text-[9px] text-interp-day">{thirdLine(record)}</div>}

      {record.flag !== undefined && (
        <Banner symbol="ladybug" tintClass="bg-interp-flag-tint" inkClass="text-interp-flag">
          {record.flag}
        </Banner>
      )}

      {/* Blue is not only a blocked change. A landed one can carry what to do
          next, which is what `321:63` shows on the renamed-field entry. */}
      {(blocked || waiting || record.buildNote !== undefined) && (
        <Banner symbol="wrench" tintClass="bg-interp-build-tint" inkClass="text-interp-build">
          {blocked
            ? 'Blocked — this would have broken your cancel flow.'
            : waiting
              ? 'Waiting on you — nothing has landed yet.'
              : record.buildNote}
        </Banner>
      )}

      <div className="mt-[10px] flex items-center gap-[24px]">
        <button
          type="button"
          onClick={swallow(() => {
            onOpen(opensWith)
          })}
          className="cursor-pointer border-none bg-transparent p-0 text-[10px] text-cs-link"
        >
          {isBatch ? 'Read the one that matters' : 'Show me'}
        </button>

        {isBatch && (
          <button
            type="button"
            onClick={swallow(onToggleBatch)}
            className="cursor-pointer border-none bg-transparent p-0 text-[10px] text-cs-link"
          >
            {expanded
              ? `Hide the other ${String((record.batchOf ?? 1) - 1)}`
              : `See all ${String(record.batchOf ?? 0)} landed`}
          </button>
        )}

        {!isBatch && (blocked || waiting) && (
          <button
            type="button"
            onClick={swallow(onReview)}
            className="cursor-pointer border-none bg-transparent p-0 text-[10px] text-cs-link"
          >
            {blocked ? 'Let it through' : 'Review'}
          </button>
        )}
      </div>

      {isBatch && expanded && record.children !== undefined && (
        <div className="mt-[10px] flex flex-col gap-[2px]">
          {record.children.map((child) => (
            <button
              key={child.id}
              type="button"
              onClick={swallow(() => {
                onOpen(child.id)
              })}
              className="cursor-pointer rounded-[8px] border-none bg-cs-window px-[11px] py-[7px] text-left transition-colors duration-150 ease-out hover:bg-cs-row-hover motion-reduce:transition-none"
            >
              <div className="text-[11px] text-cs-text-primary">{child.what}</div>
              <div className={`text-[9px] ${child.why === '' ? 'text-interp-day' : 'text-cs-text-subtle'}`}>
                {child.why === '' ? 'No reason recorded.' : child.why}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* The Notice sits inside the change that caused it rather than in a list
          of its own. That adjacency is the finding: not "something is wrong
          somewhere" but "this is what went wrong, and this is what did it". */}
      {notice !== undefined && (
        <Banner symbol="warning" tintClass="bg-interp-risk-tint" inkClass="text-interp-risk">
          <span className="block">
            Since this change, {notice.title.charAt(0).toLowerCase()}
            {notice.title.slice(1)}
          </span>
          <button
            type="button"
            onClick={swallow(onFix)}
            className="mt-[1px] block cursor-pointer border-none bg-transparent p-0 text-[8px] text-interp-risk"
          >
            Fix this
          </button>
        </Banner>
      )}
    </div>
  )
}
