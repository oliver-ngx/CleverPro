import { CODE_MARK_LINE, CODE_SAMPLES, LINKS } from '../data/seed'
import type { Certainty, ChangeRecord } from '../data/types'
import { historyFor, linkBroken, openProblems, records as allRecords, thingOf } from '../lib/derive'
import { Icon } from '@cs/components/ui/Icon'
import { Symbol } from '../components/Symbols'
import { BANDS, bandOf } from '../lib/bands'

/** How a relationship's certainty is drawn, and what the legend says about it. */
const CERTAINTY: Record<Certainty, { label: string; stroke: string; width: number; dash: string }> = {
  watched: { label: 'watched it happen', stroke: '#4a4a4a', width: 1.6, dash: '0' },
  told: { label: 'told when build', stroke: '#9a9a9a', width: 1.4, dash: '0' },
  guessed: { label: 'read from your code', stroke: '#c2c2c2', width: 1.1, dash: '4 3' },
}

interface ThingViewProps {
  thingId: string
  projectName: string
  /** `'map'` draws the graph; `'code'` draws the file. Same chrome either way. */
  mode: 'map' | 'code'
  fixed: string[]
  onMode: (mode: 'map' | 'code') => void
  onClose: () => void
  onSelect: (thingId: string) => void
}

/**
 * One thing, seen two ways.
 *
 * The map and the code descent are the same screen in `327:375` and `327:467` —
 * identical breadcrumb, identical facts strip, identical last-said line — and
 * they differ only in what fills the space below and which link is offered. So
 * they are one component with a mode rather than two that must be kept in step.
 *
 * The facts strip is the argument in four numbers: what this uses, what uses it,
 * how many places it is used in, and **how much of that was watched rather than
 * guessed**. That last figure is never rounded and never hidden, because the
 * moment a guess is presented as an observation the product is lying about the
 * only thing that makes it different.
 *
 * The code is deliberately unpleasant to live in: read-only, small, and marked
 * only where an open problem touches it. Nobody should want to stay here.
 */
export function ThingView({ thingId, projectName, mode, fixed, onMode, onClose, onSelect }: ThingViewProps) {
  const thing = thingOf(thingId)
  if (thing === undefined) return null

  const uses = LINKS.filter((l) => l.from === thingId)
  const usedBy = LINKS.filter((l) => l.to === thingId)
  const related = [...uses, ...usedBy]
  const watched = related.filter((l) => l.certainty === 'watched').length
  // Typed explicitly: indexing an array is not checked here, so `[0]` would be
  // `ChangeRecord` and every guard below it would read as dead code.
  const history = historyFor(allRecords([], []), thingId)
  const last: ChangeRecord | undefined = history.length > 0 ? history[0] : undefined

  const lines = CODE_SAMPLES[thingId] ?? [
    `// ${thing.file}`,
    '',
    `export const ${thing.name.replace(/[^A-Za-z0-9]/g, '')} = {`,
    `  kind: '${thing.kind}',`,
    `  area: '${thing.area}'`,
    '}',
  ]
  const markLine = CODE_MARK_LINE[thingId] ?? lines.length
  const problem = openProblems(fixed).find((p) => p.things.includes(thingId))

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-cs-window animate-cs-page-in motion-reduce:animate-none">
      <div className="flex h-[46px] shrink-0 items-center px-[22px]">
        <div className="flex flex-1 items-center justify-center gap-[9px] text-[10px]">
          <span className="text-cs-text-subtle">Interpreter</span>
          <Symbol name="chevron-narrow" className="h-[10px] w-[2.7px] shrink-0 text-cs-text-secondary" />
          <span className="text-cs-text-subtle">{projectName}</span>
          <Symbol name="chevron-narrow" className="h-[10px] w-[2.7px] shrink-0 text-cs-text-secondary" />
          <span className="font-semibold text-cs-text-primary">{thing.name}</span>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="cursor-pointer border-none bg-transparent p-0 text-[13px] leading-none text-cs-text-primary"
        >
          ✕
        </button>
        <button
          type="button"
          aria-disabled
          aria-label="More"
          className="ml-[16px] flex cursor-pointer items-center border-none bg-transparent p-0 text-cs-text-primary"
        >
          <Icon name="ellipsis" className="h-[4px] w-[16px]" />
        </button>
      </div>

      <div className="shrink-0 px-[22px] pb-[10px] text-[10px] font-semibold text-cs-text-primary">{thing.file}</div>

      <div className="flex shrink-0 items-center gap-[64px] bg-interp-card px-[22px] py-[6px] text-[9px]">
        <Fact label="uses" value={String(uses.length)} />
        <Fact label="uses by" value={String(usedBy.length)} />
        <Fact label="uses in" value={`${String(thing.usedBy)} ${thing.usedBy === 1 ? 'place' : 'places'}`} />
        <Fact label="watched" value={`${String(watched)} of ${String(related.length)}`} />
      </div>

      <div className="flex shrink-0 items-baseline gap-[42px] px-[22px] py-[7px] text-[9px]">
        <span className="font-semibold text-cs-text-primary">
          {last === undefined ? 'Nothing recorded yet.' : `${cap(last.what)}.`}
        </span>
        <span className={last?.why === '' ? 'text-interp-day' : 'text-cs-text-subtle'}>
          {last === undefined ? '' : last.why === '' ? 'No reason recorded.' : last.why}
        </span>
      </div>

      <div className="shrink-0 bg-interp-card px-[22px] py-[6px]">
        <button
          type="button"
          onClick={() => {
            onMode(mode === 'map' ? 'code' : 'map')
          }}
          className="cursor-pointer border-none bg-transparent p-0 text-[10px] text-cs-link"
        >
          {mode === 'map' ? 'view code' : 'show on map'}
        </button>
      </div>

      {mode === 'map' ? (
        <>
          <div className="flex shrink-0 items-center gap-[30px] px-[22px] py-[7px]">
            {(['watched', 'told', 'guessed'] as const).map((key) => (
              <div key={key} className="flex items-center gap-[8px] text-[9px] text-cs-text-subtle">
                <svg width="22" height="4" aria-hidden="true">
                  <line
                    x1="0"
                    y1="2"
                    x2="22"
                    y2="2"
                    stroke={CERTAINTY[key].stroke}
                    strokeWidth={CERTAINTY[key].width}
                    strokeDasharray={CERTAINTY[key].dash}
                  />
                </svg>
                {CERTAINTY[key].label}
              </div>
            ))}
          </div>

          <Map thingId={thingId} fixed={fixed} onSelect={onSelect} />
        </>
      ) : (
        <div className="scroll-hidden min-h-0 flex-1 overflow-auto px-[22px] py-[8px]">
          {lines.map((text, i) => {
            const n = i + 1
            const marked = problem !== undefined && n === markLine
            return (
              <div
                key={n}
                className={`flex items-start font-mono text-[9px] leading-[1.85] ${
                  marked ? 'bg-interp-risk-tint' : ''
                }`}
              >
                <span className="w-[26px] shrink-0 pr-[12px] text-right text-cs-text-tertiary">{n}</span>
                <span className="w-[16px] shrink-0">
                  {marked && <Symbol name="warning" className="h-[9px] w-[9px] text-interp-risk" />}
                </span>
                <span className="whitespace-pre text-cs-text-primary">{text}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="font-semibold text-cs-text-primary">{label}:</span>{' '}
      <span className="text-cs-text-subtle">{value}</span>
    </span>
  )
}

interface MapProps {
  thingId: string
  fixed: string[]
  onSelect: (thingId: string) => void
}

/**
 * The graph, in four fixed bands.
 *
 * Only this thing and what it is directly joined to — a whole area at once is a
 * hairball, and the question being asked is always "what does *this* touch?".
 * Edges carry the certainty model in their stroke, and a broken contract is
 * drawn dashed in purple until the problem behind it is repaired, at which point
 * it visibly redraws. That redraw is the most persuasive second in the product.
 */
function Map({ thingId, fixed, onSelect }: MapProps) {
  const neighbours = new Set<string>([thingId])
  for (const link of LINKS) {
    if (link.from === thingId) neighbours.add(link.to)
    if (link.to === thingId) neighbours.add(link.from)
  }
  const ids = [...neighbours]

  return (
    <div className="scroll-hidden min-h-0 flex-1 overflow-auto bg-interp-card px-[22px] py-[20px]">
      <div className="flex flex-wrap items-start gap-[16px]">
        {BANDS.map((band) => {
          const inBand = ids.filter((id) => {
            const t = thingOf(id)
            return t !== undefined && bandOf(t.kind) === band.key
          })
          if (inBand.length === 0) return null
          return inBand.map((id) => {
            const t = thingOf(id)
            const broken = LINKS.some(
              (l) => (l.from === id || l.to === id) && linkBroken(l.broken, fixed),
            )
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onSelect(id)
                }}
                className={`w-[150px] cursor-pointer overflow-hidden rounded-[10px] border-none p-0 text-left ${
                  id === thingId ? 'ring-2 ring-cs-link' : ''
                }`}
              >
                <div className={`px-[10px] py-[6px] font-mono text-[10px] font-bold ${band.headerClass}`}>
                  {band.label}
                </div>
                <div className="flex min-h-[62px] items-start bg-cs-text-tertiary px-[10px] py-[9px] font-mono text-[11px] text-cs-white">
                  {t?.name}
                  {broken && <span className="ml-[4px] text-interp-risk">⚠</span>}
                </div>
              </button>
            )
          })
        })}
      </div>
    </div>
  )
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
