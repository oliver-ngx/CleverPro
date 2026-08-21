/**
 * The transport's two non-obvious behaviours: request coalescing, and what
 * happens to a shared request when one of its callers walks away.
 *
 * These are worth testing because they are invisible when they work and
 * subtle when they do not. A coalescing bug shows up as a screen that never
 * loads, or as one component's unmount cancelling another's data.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, get, post } from './http'

/** A fetch that resolves when the test says so, so overlap is deterministic. */
function deferredFetch() {
  const calls: { url: string; resolve: (body: unknown) => void; reject: (cause: unknown) => void }[] = []
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    return new Promise<Response>((resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'))
      })
      calls.push({
        url,
        resolve: (body) => {
          resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response)
        },
        reject,
      })
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return { calls, fetchMock }
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('get', () => {
  it('makes one request for two identical concurrent reads', async () => {
    const { calls, fetchMock } = deferredFetch()

    const first = get<{ n: number }>('/team')
    const second = get<{ n: number }>('/team')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    calls[0].resolve({ n: 1 })
    expect(await first).toEqual({ n: 1 })
    expect(await second).toEqual({ n: 1 })
  })

  it('does not coalesce different paths', async () => {
    const { calls, fetchMock } = deferredFetch()

    const team = get('/team')
    const overview = get('/overview')
    expect(fetchMock).toHaveBeenCalledTimes(2)

    calls[0].resolve([])
    calls[1].resolve({})
    await Promise.all([team, overview])
  })

  it('is a coalescing window, not a cache', async () => {
    const { calls, fetchMock } = deferredFetch()

    const first = get('/team')
    calls[0].resolve([{ name: 'Ada' }])
    await first

    // The entry is gone once it settled, so a later read goes to the network
    // and can see something different.
    const second = get('/team')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    calls[1].resolve([{ name: 'Ada' }, { name: 'Bo' }])
    expect(await second).toHaveLength(2)
  })

  it('one caller aborting does not disturb the other', async () => {
    const { calls } = deferredFetch()
    const leaving = new AbortController()

    const abandoned = get('/team', leaving.signal)
    const staying = get('/team')

    leaving.abort()
    await expect(abandoned).rejects.toThrow(/abort/i)

    // The shared request survived, because somebody is still waiting on it.
    calls[0].resolve([{ name: 'Ada' }])
    expect(await staying).toEqual([{ name: 'Ada' }])
  })

  it('cancels the request once every caller has abandoned it', async () => {
    const { fetchMock } = deferredFetch()
    const a = new AbortController()
    const b = new AbortController()

    const first = get('/team', a.signal)
    const second = get('/team', b.signal)

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    a.abort()
    await expect(first).rejects.toThrow(/abort/i)
    // One left is not none: the request is still wanted.
    expect(init.signal?.aborted).toBe(false)

    b.abort()
    await expect(second).rejects.toThrow(/abort/i)
    // Nobody is waiting on it now, so the underlying fetch was told to stop —
    // and the rejection that follows must not surface as an unhandled one,
    // which is what the noop handler in `get` is for.
    expect(init.signal?.aborted).toBe(true)
  })

  it('rejects immediately for a signal that is already aborted', async () => {
    deferredFetch()
    const controller = new AbortController()
    controller.abort()
    await expect(get('/team', controller.signal)).rejects.toThrow(/abort/i)
  })

  it('a failed request is not left in the in-flight map', async () => {
    const { calls, fetchMock } = deferredFetch()

    const first = get('/team')
    calls[0].reject(new TypeError('network down'))
    await expect(first).rejects.toThrow('network down')

    // If the entry had leaked, this would attach to a settled rejected promise
    // and fail forever rather than retrying.
    const second = get('/team')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    calls[1].resolve([])
    expect(await second).toEqual([])
  })
})

describe('error translation', () => {
  it("carries the server's own wording and status", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          json: () => Promise.resolve({ detail: 'Cy (contributor) cannot deploy' }),
        } as Response),
      ),
    )

    await expect(get('/anything')).rejects.toMatchObject({
      status: 403,
      message: 'Cy (contributor) cannot deploy',
    })
    await expect(get('/anything')).rejects.toBeInstanceOf(ApiError)
  })

  it('falls back to the status line when the body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 502,
          statusText: 'Bad Gateway',
          json: () => Promise.reject(new SyntaxError('not json')),
        } as Response),
      ),
    )

    await expect(get('/anything')).rejects.toMatchObject({
      status: 502,
      message: 'Bad Gateway',
    })
  })
})

describe('post', () => {
  it('injects the actor and never coalesces', async () => {
    const sent: { url: string; body: string }[] = []
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      sent.push({ url, body: typeof init?.body === 'string' ? init.body : '' })
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      } as Response)
    })
    vi.stubGlobal('fetch', fetchMock)

    await Promise.all([
      post('/merge/commit-1', 'Ada', { note: 'x' }),
      post('/merge/commit-1', 'Ada', { note: 'x' }),
    ])

    // Two identical writes are two intentions; collapsing them would drop one.
    expect(sent).toHaveLength(2)
    expect(sent[0].url).toBe('/api/merge/commit-1')
    expect(JSON.parse(sent[0].body)).toEqual({ actor: 'Ada', note: 'x' })
  })
})
