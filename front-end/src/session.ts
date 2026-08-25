import { useSyncExternalStore } from 'react'
import { bumpRevision } from './api/revision'
import { DEFAULT_USER } from './config'

/**
 * Who the app is acting as.
 *
 * The API has no sessions: every mutating request names its own `actor` and the
 * backend matches members by display name. That is a stand-in for
 * authentication rather than a substitute for it, and this module is the
 * client-side half of the same stand-in — one place that answers "who am I",
 * so that the day identity becomes real, it is this file that changes and not
 * the eight callers that ask.
 *
 * It is not decoration on read paths either. The Activity table's action word
 * is computed per viewer, a member's own pane is the one with the Action
 * window, and Settings renders fewer sections to a Contributor than to the
 * Owner. Switching here changes what the product *is* from where you are
 * standing, which is exactly why being able to switch is worth having.
 *
 * Built the same way as `api/revision.ts`: a module-level value, a set of
 * listeners, and `useSyncExternalStore`. Switching also bumps the revision, so
 * every live read refetches as itself rather than showing the previous
 * member's answers until something else happens to invalidate them.
 */
const KEY = 'cseudocode.acting-member'

function stored(): string | undefined {
  // Storage throws outright in some contexts — a private window with site data
  // blocked, an embedded preview — and a switcher is not worth a blank screen.
  try {
    return localStorage.getItem(KEY) ?? undefined
  } catch {
    return undefined
  }
}

let actor = stored() ?? DEFAULT_USER
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** For callers outside React — the API client, which reads it per request. */
export function currentUser() {
  return actor
}

/**
 * Act as somebody else from now on.
 *
 * Remembered across reloads, because the point of switching is to look around
 * as that person and a reload in the middle of that would put you back.
 */
export function setCurrentUser(name: string) {
  if (name === actor) return
  actor = name
  try {
    localStorage.setItem(KEY, name)
  } catch {
    // Then it lasts for this tab only, which is still useful.
  }
  for (const listener of listeners) listener()
  bumpRevision()
}

/** For components, which re-render when it changes. */
export function useCurrentUser() {
  return useSyncExternalStore(subscribe, currentUser)
}
