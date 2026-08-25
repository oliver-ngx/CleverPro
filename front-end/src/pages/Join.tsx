import { useState } from 'react'
import { api } from '../api/client'
import { useAction } from '../hooks/useAction'
import { useResource } from '../hooks/useResource'
import { setCurrentUser } from '../session'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'

interface JoinProps {
  /** The token out of the link. Whether it is any good is the server's answer. */
  token: string
  /** Taken in, and now acting as themselves — the app takes over from here. */
  onJoined: () => void
}

/**
 * What somebody sees when they follow a project's link.
 *
 * Not a frame from the source, which draws no such screen: the design opens
 * straight into a project that already has you in it. It is built from the
 * pieces the Add Branch sheet is built from — the same card, field and buttons —
 * so it looks like the product rather than like scaffolding around it.
 *
 * There are two endings, and they are drawn apart because they are genuinely
 * different. A project whose link admits people outright takes you in and the
 * app opens; one that does not puts you in a queue only its Owner can see, and
 * nothing more will happen on this screen — so it says so plainly rather than
 * leaving a spinner running against an event that is not coming.
 *
 * A name is all that is asked for, and the server believes it. That is the
 * whole of identity in this product today; see `session.ts`.
 */
export function Join({ token, onJoined }: JoinProps) {
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const join = useAction()

  // Named before you are in it: following a link to "a project" and being asked
  // to type your name into nothing in particular is a worse thing to receive.
  const overview = useResource((signal) => api.overview(signal), [])
  const project = overview.data?.project_name ?? 'this project'

  const cleaned = name.trim()

  return (
    <div className="flex min-h-[var(--cs-viewport-h)] items-center justify-center bg-cs-desktop p-[24px] font-ui">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (cleaned === '' || join.pending) return
          join.run(
            () => api.join(token, cleaned),
            (result) => {
              if (result.status === 'joined') {
                // Straight in, and as themselves — nobody should arrive at a
                // project already acting as somebody else who happens to be
                // stored in this browser.
                setCurrentUser(cleaned)
                onJoined()
              } else {
                setPending(true)
              }
            },
          )
        }}
        className="flex w-full max-w-[420px] flex-col gap-[18px] rounded-cs-overlay bg-cs-window p-[32px] shadow-cs-window"
      >
        {pending ? (
          <>
            <h1 className="m-0 text-[15px] font-semibold text-cs-text-primary">
              Asked to join {project}
            </h1>
            <p className="m-0 text-[13px]/[150%] font-normal text-cs-text-tertiary">
              This project does not let people in on the link alone, so {cleaned} is
              waiting for its Owner to answer. Nothing else happens here — come back
              through the same link once they have.
            </p>
          </>
        ) : (
          <>
            <h1 className="m-0 text-[15px] font-semibold text-cs-text-primary">
              Join {project}
            </h1>
            <p className="m-0 text-[13px]/[150%] font-normal text-cs-text-tertiary">
              Your name is how everyone here will know you, and how the project
              addresses work to you.
            </p>

            <TextField
              label="Name"
              value={name}
              autoFocus
              placeholder="e.g.  Dana Whitfield"
              onChange={(event) => {
                setName(event.target.value)
              }}
              {...(join.error === undefined ? {} : { error: join.error })}
            />

            <div className="flex items-center justify-end gap-[16px]">
              {/* A member following their own old link lands here and is told
                  they are already in, which is true and useless on its own.
                  This is the way out -- the link is spent, the project is not. */}
              {join.error !== undefined && (
                <button
                  type="button"
                  onClick={onJoined}
                  className="cursor-pointer border-none bg-transparent p-0 text-[13px] font-medium text-cs-link-alt outline-none transition-opacity duration-150 ease-out motion-reduce:transition-none active:opacity-[0.55] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-4 focus-visible:outline-cs-accent"
                >
                  Open {project}
                </button>
              )}
              <Button type="submit" disabled={cleaned === '' || join.pending}>
                {join.pending ? 'Joining…' : 'Join'}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
