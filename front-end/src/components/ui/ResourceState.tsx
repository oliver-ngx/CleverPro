interface ResourceStateProps {
  loading: boolean
  error?: string
  /** Shown when the request succeeded but returned nothing. */
  empty?: string
  emptyWhen?: boolean
}

/**
 * The three things a screen can show instead of its content: waiting, broken,
 * or genuinely empty.
 *
 * The design system defines none of these -- the Figma frames only ever draw
 * the loaded state -- so this is deliberately the quietest thing that could
 * work: one line of the same muted label type the rest of the product uses,
 * no spinner, no illustration. It is a placeholder for a designed state, and
 * it should be replaced by one rather than elaborated here.
 *
 * Returns null when there is nothing to say, so a caller can render it
 * unconditionally above its content.
 */
export function ResourceState({ loading, error, empty, emptyWhen }: ResourceStateProps) {
  const message = loading
    ? 'Loading...'
    : error !== undefined
      ? error
      : emptyWhen === true && empty !== undefined
        ? empty
        : undefined

  if (message === undefined) return null

  return (
    <div
      role={error === undefined ? 'status' : 'alert'}
      className={`px-[6px] py-[10px] text-[11px] font-medium ${
        error === undefined ? 'text-cp-text-tertiary' : 'text-cp-text-primary'
      }`}
    >
      {message}
    </div>
  )
}
