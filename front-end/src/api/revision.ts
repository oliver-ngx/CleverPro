import { useSyncExternalStore } from 'react'

/**
 * A counter every successful write bumps, which every read subscribes to.
 *
 * The API has no push channel and no per-resource cache, so after a mutation
 * the screen is simply stale -- merging a commit changes its Activity row,
 * rolling production back changes which Archive row says "Applied", and
 * pushing changes the version on Main. Rather than have each caller
 * remember which of its neighbours to refresh, useResource treats this
 * number as an input: bumping it re-runs every live request.
 *
 * That is blunt -- a comment on one commit refetches the file tree too --
 * but on a handful of small endpoints it is cheaper than a cache layer and
 * cannot go subtly wrong. Swap it for a query library when the payloads or
 * the endpoint count make it worth the dependency.
 */
let revision = 0
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function snapshot() {
  return revision
}

export function bumpRevision() {
  revision += 1
  for (const listener of listeners) listener()
}

export function useRevision() {
  return useSyncExternalStore(subscribe, snapshot)
}
