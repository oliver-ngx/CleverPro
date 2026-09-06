import type { Thing } from '../data/types'

/**
 * The four bands of the map, top to bottom, and how each is drawn.
 *
 * The vertical order is meaningful and fixed — it is how the stack reads, from
 * what a person sees down to what holds the data — so it is never sorted and
 * never made configurable. Labels and colours are `321:132`, which pairs a
 * coloured header over a grey body rather than tinting the whole node, so the
 * band a thing belongs to reads before its name does.
 *
 * Its own file rather than sitting beside the component that draws it: a module
 * exporting both a component and a plain value cannot be hot-reloaded, and React
 * remounts the whole file instead, losing whatever was on screen.
 */
export const BANDS = [
  { key: 'see', label: 'Things you see', headerClass: 'bg-interp-band-see' },
  { key: 'check', label: 'Things that check', headerClass: 'bg-interp-band-check' },
  { key: 'run', label: 'Things that run', headerClass: 'bg-interp-band-run' },
  { key: 'store', label: 'Things that store', headerClass: 'bg-interp-band-store' },
] as const

export type BandKey = (typeof BANDS)[number]['key']

export const bandOf = (kind: Thing['kind']): BandKey => {
  if (kind === 'screen' || kind === 'button' || kind === 'form') return 'see'
  if (kind === 'check') return 'check'
  if (kind === 'endpoint' || kind === 'logic') return 'run'
  return 'store'
}
