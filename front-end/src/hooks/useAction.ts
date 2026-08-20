import { useCallback, useRef, useState } from 'react'
import { ApiError } from '../api/client'

/**
 * Runs one write at a time and remembers how it went.
 *
 * The counterpart to useResource. It does not refetch anything itself --
 * a successful POST bumps the revision counter inside the client, and every
 * live read is subscribed to that -- so all this owns is the two things the
 * UI needs locally: whether a request is in flight (to disable the control
 * that started it) and what the server said if it refused.
 *
 * Refusals are the interesting case here, not the exception. The API
 * enforces real rules -- 403 for a role that cannot do this, 422 for an
 * attachment that does not resolve unambiguously, 400 for merging something
 * you were never sent -- and surfacing that text verbatim is more useful
 * than any message this layer could invent.
 */
export function useAction() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  // Guards against a double click firing the same mutation twice; `pending`
  // cannot, because the second click is handled before React re-renders.
  const inFlight = useRef(false)

  // Generic in the operation's result so a caller can act on what came back --
  // creating a branch has to know the name the server settled on, which is not
  // necessarily the one the sheet sent.
  const run = useCallback(<T,>(operation: () => Promise<T>, onDone?: (result: T) => void) => {
    if (inFlight.current) return
    inFlight.current = true
    setPending(true)
    setError(undefined)

    operation()
      .then((result) => {
        onDone?.(result)
      })
      .catch((cause: unknown) => {
        setError(
          cause instanceof ApiError
            ? cause.message
            : 'Could not reach the API. Is the backend running on :8000?',
        )
      })
      .finally(() => {
        inFlight.current = false
        setPending(false)
      })
  }, [])

  const clearError = useCallback(() => {
    setError(undefined)
  }, [])

  return { run, pending, error, clearError }
}
