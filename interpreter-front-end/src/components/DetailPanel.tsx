import type { ChangeRecord } from '../data/types'
import { actorOf, intentSentence, thingOf, when } from '../lib/derive'
import { Symbol } from './Symbols'

interface DetailPanelProps {
  record: ChangeRecord
  /** Set when a batch child was opened, so the head reads as that child. */
  childId: string | undefined
  onClose: () => void
  onShowOnMap: (thingId: string) => void
  onViewCode: (thingId: string) => void
}

/** A section heading in the panel. Small, dark, and doing very little. */
function Label({ children }: { children: string }) {
  return <div className="mt-[22px] mb-[8px] text-[10px] font-semibold text-cs-text-primary">{children}</div>
}

/**
 * The Translate surface: one change, in full.
 *
 * It sits **beside** the stream rather than over it. The frame shrinks the
 * stream to make room instead of covering it, and that is the right call — the
 * point of the panel is to explain an entry you can still see, so keeping the
 * card in view while its explanation opens is what makes this reading rather
 * than navigating. A slide-over would have hidden the thing being explained.
 *
 * Three sections, and the order is the argument again. **Why** first, because
 * that is the half no other tool has. **What it changed** second — the things
 * this change edited, with the verb it applied to each. **What else it
 * affected** last: the things it did not touch and changed the behaviour of
 * anyway, one plain sentence each. That third list is the one worth the whole
 * product, because it is what a diff cannot tell you.
 *
 * A thing whose change was partial — a column added to a table rather than the
 * table rewritten — is drawn unchecked and greyed, and does not appear in the
 * verb table below. `321:132` shows exactly one row in that state.
 */
export function DetailPanel({ record, childId, onClose, onShowOnMap, onViewCode }: DetailPanelProps) {
  const actor = actorOf(record.by)
  const child = record.children?.find((c) => c.id === childId)

  // A batch child has its own sentence and its own reason, but everything below
  // -- what was touched, what was affected -- belongs to the change as a whole.
  const title = child === undefined ? `${actor.name} ${record.what}` : `${actor.name} ${lower(child.what)}`
  const why = child === undefined ? record.why : child.why
  const source = child?.intentSource ?? record.intentSource

  const edited = record.touched.filter((id) => record.verbs[id] !== 'new column')
  const partial = record.touched.filter((id) => record.verbs[id] === 'new column')

  return (
    <div className="scroll-hidden flex min-h-0 w-[46%] shrink-0 flex-col overflow-y-auto bg-cs-window px-[26px] pt-[22px] pb-[26px] animate-cs-page-in motion-reduce:animate-none">
      <div className="flex items-start gap-[10px]">
        <Symbol name="translate" className="mt-[3px] h-[11px] w-[14.1px] shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] leading-[1.3] font-semibold text-cs-text-primary">{title}</div>
          <div className="mt-[2px] text-[9px] text-interp-day">{when(record.hours)}</div>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="shrink-0 cursor-pointer border-none bg-transparent p-0 text-[13px] leading-none text-interp-chevron"
        >
          ✕
        </button>
      </div>

      <Label>Why</Label>
      <div className={`text-[12px] leading-[1.4] ${why === '' ? 'text-interp-day' : 'text-cs-text-primary'}`}>
        {why === '' ? 'No reason recorded.' : why}
      </div>
      <div className="mt-[3px] text-[9px] text-interp-day">{intentSentence(source)}</div>

      <Label>What it changed</Label>
      <div className="rounded-[14px] bg-interp-card px-[16px] py-[13px]">
        {edited.map((id) => (
          <Row key={id} name={thingOf(id)?.name ?? id} checked />
        ))}
        {partial.map((id) => (
          <Row key={id} name={thingOf(id)?.name ?? id} checked={false} />
        ))}
      </div>

      {/* The verbs, two to a row. Only the things fully edited appear -- a
          partial change has no single verb to print. */}
      <div className="mt-[10px] rounded-[14px] bg-interp-card px-[16px] py-[6px]">
        <div className="grid grid-cols-2 gap-x-[18px]">
          {edited.map((id) => (
            <div
              key={id}
              className="flex items-baseline justify-between gap-[10px] border-b border-cs-hairline py-[8px] last:border-b-0"
            >
              <span className="text-[11px] text-cs-text-primary">{thingOf(id)?.name ?? id}</span>
              <span className="font-mono text-[9px] text-interp-day">{record.verbs[id]}</span>
            </div>
          ))}
        </div>
      </div>

      <Label>What else it affected</Label>
      <div className="rounded-[14px] bg-interp-card px-[16px] py-[6px]">
        {record.affected.map((id) => (
          <div
            key={id}
            className="flex items-baseline gap-[14px] border-b border-cs-hairline py-[9px] last:border-b-0"
          >
            <span className="w-[120px] shrink-0 text-[11px] text-cs-text-primary">{thingOf(id)?.name ?? id}</span>
            <span className="min-w-0 flex-1 font-mono text-[9px] text-interp-day">
              {record.effects[id] ?? 'no change in behaviour'}
            </span>
          </div>
        ))}
      </div>

      {/* Never rounded, never omitted. This line is the visible proof that the
          model knows more than an indexer -- and the proof only holds while it
          is allowed to say a small number. */}
      <div className="mt-[14px] text-[9px] text-interp-day">
        Watched {record.watched} of {record.total} · read the rest from your code
      </div>

      <div className="mt-auto flex items-center gap-[34px] pt-[26px]">
        <button
          type="button"
          onClick={() => {
            onShowOnMap(record.touched[0])
          }}
          className="cursor-pointer border-none bg-transparent p-0 text-[10px] text-cs-link"
        >
          Show on map
        </button>
        <button
          type="button"
          onClick={() => {
            onViewCode(record.touched[0])
          }}
          className="cursor-pointer border-none bg-transparent p-0 text-[10px] text-cs-link"
        >
          View code
        </button>
      </div>
    </div>
  )
}

function Row({ name, checked }: { name: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-[9px] py-[3px]">
      {checked ? (
        <span className="relative flex h-[13px] w-[13px] shrink-0 items-center justify-center rounded-full bg-cs-link">
          <Symbol name="check" className="h-[5px] w-[6px] text-cs-white" />
        </span>
      ) : (
        <span className="h-[13px] w-[13px] shrink-0 rounded-full border border-cs-text-tertiary" />
      )}
      <span className={`text-[11px] ${checked ? 'text-cs-text-primary' : 'text-interp-day'}`}>{name}</span>
    </div>
  )
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1).replace(/\.$/, '')
