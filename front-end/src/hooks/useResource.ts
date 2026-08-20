import { useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import { useRevision } from '../api/revision'

export interface Resource<T> {
  data?: T
  /**
   * True until the first response lands. A refetch triggered by changing
   * `deps` deliberately does NOT raise it again: the previous result stays on
   * screen while the new one is in flight, so switching branches swaps the
   * file tree in place instead of blanking the panel and flashing "Loading".
   */
  loading: boolean
  error?: string
}

/**
 * Reads one thing from the API and re-reads it when `deps` change.
 *
 * Deliberately small. A cache, retries and deduplication all belong to a
 * query library, and adding one before there is a second consumer of the
 * same endpoint would be furniture without a room. What this does need to
 * get right is the two things a naive useEffect fetch gets wrong: it aborts
 * the in-flight request when the inputs change, so a slow response for the
 * old branch cannot land after a fast one for the new branch, and it drops
 * the result if the component unmounted first.
 *
 * `fetcher` is intentionally not in the dependency list -- it is an inline
 * arrow at every call site and would be a new function on every render.
 * `deps` is the honest declaration of what the request actually varies on.
 *
 * The revision counter is appended to those deps, so any successful write
 * anywhere in the app re-runs this request. See api/revision.ts.
 */
export function useResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
): Resource<T> {
  const [state, setState] = useState<Resource<T>>({ loading: true })
  const revision = useRevision()

  useEffect(() => {
    const controller = new AbortController()
    let live = true

    fetcher(controller.signal)
      .then((data) => {
        if (live) setState({ data, loading: false })
      })
      .catch((cause: unknown) => {
        // An abort is this hook cancelling itself, not a failure to report.
        if (!live || controller.signal.aborted) return
        setState({
          loading: false,
          error:
            cause instanceof ApiError
              ? `${String(cause.status)}: ${cause.message}`
              : 'Could not reach the API. Is the backend running on :8000?',
        })
      })

    return () => {
      live = false
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, revision])

  return state
}
