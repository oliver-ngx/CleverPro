/**
 * The transport: how a request is made, and what happens when one fails.
 *
 * Kept apart from `client.ts` so that the list of endpoints reads as a list of
 * endpoints. Nothing in this file knows what a commit or a branch is, and
 * nothing in `client.ts` knows about status codes, JSON parsing or the shape
 * of an error body.
 */

/**
 * Where the API is.
 *
 * Same-origin by default: `/api` is proxied to the backend by Vite in
 * development (see `vite.config.ts`) and is expected to be routed to it by
 * whatever serves the build in production, so no request is ever cross-origin
 * and CORS never enters the picture.
 *
 * `VITE_API_BASE` overrides it for the case that arrangement does not cover —
 * a client deployed to a different host than the API. Setting it means the
 * backend's `CSEUDOCODE_CORS_ORIGINS` has to name this origin, because those
 * requests genuinely are cross-origin.
 */
const BASE = import.meta.env.VITE_API_BASE ?? '/api'

/**
 * A failed request that still reached the server.
 *
 * `status` is kept because the API distinguishes meaningfully and the UI acts
 * on the distinction: 403 is a role the actor does not have, 422 an attachment
 * that does not resolve, 404 a project that is not there.
 */
export class ApiError extends Error {
  // Declared and assigned rather than a constructor parameter property:
  // tsconfig sets erasableSyntaxOnly, so no TypeScript-only syntax that emits
  // runtime code is allowed.
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * Turn a non-OK response into an ApiError carrying the server's own wording.
 *
 * FastAPI puts a human-readable reason in `detail`, and showing it verbatim is
 * more useful than anything this layer could invent — the API refuses things
 * for real reasons and explains them. A body that is not JSON at all (a proxy
 * 502, say) leaves the status line in place.
 */
async function toError(response: Response): Promise<ApiError> {
  let detail = response.statusText
  try {
    const body: unknown = await response.json()
    if (body !== null && typeof body === 'object' && 'detail' in body) {
      detail = String(body.detail)
    }
  } catch {
    // Not JSON; statusText stands.
  }
  return new ApiError(response.status, detail)
}

/**
 * GETs in flight right now, keyed by path.
 *
 * Two components asking for the same thing in the same tick is not
 * hypothetical here: the rail and the Settings screen both read the team, and
 * every successful write re-runs every live read at once (see `revision.ts`),
 * so a bump fires the whole set simultaneously. Sharing the promise means one
 * request instead of two, and — because both callers get the same object —
 * they cannot disagree about what the server said.
 *
 * The entry is removed as soon as the request settles, so this is a
 * coalescing window and not a cache: a later read still goes to the network
 * and still sees fresh data.
 */
const inFlight = new Map<string, { promise: Promise<unknown>; controller: AbortController; subscribers: number }>()

/**
 * A GET, shared with any identical GET already in flight.
 *
 * The abort handling is the fiddly part and is worth stating plainly. Each
 * caller passes its own signal — `useResource` aborts when its inputs change
 * or the component unmounts — but the underlying request belongs to all of
 * them. So the shared request is cancelled only once *every* caller has
 * abandoned it. A single caller walking away rejects its own promise and
 * decrements the count, leaving the others' request untouched.
 */
export async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const existing = inFlight.get(path)
  if (existing !== undefined) {
    existing.subscribers += 1
    return attach<T>(path, existing, signal)
  }

  const controller = new AbortController()
  const promise = (async () => {
    const response = await fetch(`${BASE}${path}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw await toError(response)
    return response.json() as Promise<unknown>
  })().finally(() => {
    inFlight.delete(path)
  })

  // A handler registered here and nowhere else, purely so this promise is
  // never *unhandled*. Every caller attaches its own handlers below and sees
  // the real rejection; the case this covers is the one where nobody is left —
  // the last subscriber walks away, `release` aborts the fetch, and the
  // rejection that follows would otherwise surface as an unhandled promise
  // rejection in the console for a request that was cancelled on purpose.
  promise.catch(() => undefined)

  const entry = { controller, subscribers: 1, promise }
  inFlight.set(path, entry)
  return attach<T>(path, entry, signal)
}

type Entry = { promise: Promise<unknown>; controller: AbortController; subscribers: number }

/**
 * Give one caller its own view of a shared request: it settles with the
 * shared result, or rejects the moment that caller's own signal aborts.
 */
function attach<T>(path: string, entry: Entry, signal?: AbortSignal): Promise<T> {
  const release = () => {
    entry.subscribers -= 1
    // The last one out cancels the request nobody is waiting for any more.
    if (entry.subscribers <= 0 && inFlight.get(path) === entry) {
      entry.controller.abort()
      inFlight.delete(path)
    }
  }

  if (signal === undefined) {
    return entry.promise.finally(release) as Promise<T>
  }
  if (signal.aborted) {
    release()
    return Promise.reject(new DOMException('Aborted', 'AbortError'))
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      release()
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal.addEventListener('abort', onAbort, { once: true })

    entry.promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        release()
        resolve(value as T)
      },
      (cause: unknown) => {
        signal.removeEventListener('abort', onAbort)
        release()
        reject(cause instanceof Error ? cause : new Error(String(cause)))
      },
    )
  })
}

/**
 * Responses that cannot change, kept so they are not asked for twice.
 *
 * A version is a snapshot. Its file tree and the text of each file in it are
 * fixed the moment it is pushed -- history here is append-only, labels are
 * never reused, and nothing in the product edits a version in place. So a
 * response addressed by (branch, version, path) is answerable from memory for
 * as long as the tab is open, and correctness does not depend on how long it
 * is held.
 *
 * The win is not the second click on the same file. It is that every
 * successful write bumps the revision counter and re-runs *every* live read
 * (see `revision.ts`), so merging a commit used to refetch the bytes of the
 * code you were reading, unchanged, every time. Now it does not go out at all.
 *
 * Both ceilings are here rather than spread through the file, and neither is
 * meant to be reached in ordinary use: a session would have to open two
 * hundred files, or sixteen megabytes of them, before anything is dropped.
 * Insertion order is eviction order -- a plain Map iterates oldest-first, so
 * the entry that goes is the one longest unlooked-at.
 */
const IMMUTABLE_MAX_ENTRIES = 200
const IMMUTABLE_MAX_CHARS = 8_000_000

const immutable = new Map<string, { value: unknown; chars: number }>()
let immutableChars = 0

function remember(path: string, value: unknown, chars: number) {
  immutable.set(path, { value, chars })
  immutableChars += chars

  for (const [key, entry] of immutable) {
    if (immutable.size <= IMMUTABLE_MAX_ENTRIES && immutableChars <= IMMUTABLE_MAX_CHARS) break
    immutable.delete(key)
    immutableChars -= entry.chars
  }
}

/**
 * A GET whose answer the caller guarantees can never change.
 *
 * Only ever for a resource addressed by a version -- see the note above. Using
 * it on anything the project can advance (a branch's current tree, the roster,
 * the feed) would show stale data forever, so the guarantee belongs to the
 * caller and the list of callers is `client.ts`.
 */
export async function getImmutable<T>(path: string, signal?: AbortSignal): Promise<T> {
  const hit = immutable.get(path)
  if (hit !== undefined) return hit.value as T

  const value = await get<T>(path, signal)
  // Measured after the fact rather than from a header: the response has already
  // been parsed, and its serialised length is what it costs to keep.
  remember(path, value, JSON.stringify(value).length)
  return value
}

/**
 * A POST, with the acting member injected into every body.
 *
 * The API has no session, so identity travels with each call. Injecting it
 * here rather than at each call site means no component has to know that —
 * and it is the single place to change when identity becomes real, matching
 * the `ActorRequest` seam on the server.
 *
 * Writes are deliberately not deduplicated: two identical POSTs are two
 * distinct intentions, and collapsing them would silently drop one.
 */
export async function post<T>(
  path: string,
  actor: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ actor, ...body }),
  })
  if (!response.ok) throw await toError(response)
  return response.json() as Promise<T>
}

/** Path-safe encoding for the display names and branch names used as ids. */
export const seg = (value: string) => encodeURIComponent(value)
