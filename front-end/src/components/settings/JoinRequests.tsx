import { api } from '../../api/client'
import { useAction } from '../../hooks/useAction'
import { useResource } from '../../hooks/useResource'
import { useCurrentUser } from '../../session'
import { FloatingMenu, MENU_ITEM } from '../ui/FloatingMenu'

/**
 * Who is waiting at the door, on the Settings row that controls the door.
 *
 * Only rendered to the Owner, because only the Owner can read the list or
 * answer it — the server refuses everybody else, and a control that always
 * fails is worse than no control.
 *
 * The count is the whole of the row when it is shut, because that is the fact
 * somebody scanning Settings needs: is anyone waiting. Opening it lists them
 * with the two answers beside each name.
 *
 * Rejection is silent by design — the server records nothing and tells nobody —
 * so the only sign it happened is the name leaving this list. That is why the
 * two words sit next to each other rather than one of them being a menu
 * somewhere else: they are the same decision.
 */
export function JoinRequests() {
  const actor = useCurrentUser()
  const requests = useResource((signal) => api.joinRequests(actor, signal), [actor])
  const answer = useAction()
  const waiting = requests.data ?? []

  if (waiting.length === 0) {
    return (
      <span className="text-[13px] font-normal text-cp-text-tertiary">
        {requests.error === undefined ? 'Nobody waiting' : requests.error}
      </span>
    )
  }

  return (
    <FloatingMenu
      trigger={({ open, onClick }) => (
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={onClick}
          className="cursor-pointer border-none bg-transparent p-0 text-[13px] font-medium text-cp-link-alt outline-none transition-opacity duration-150 ease-out motion-reduce:transition-none active:opacity-[0.55] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-4 focus-visible:outline-cp-accent"
        >
          {waiting.length} waiting
        </button>
      )}
    >
      {() => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate pb-[8px] text-[13px]/[130%] font-semibold text-cp-text-tertiary">
            Asked to join
          </span>

          <div className="h-px bg-cp-hairline" />

          <div className="flex flex-col gap-[9px] pt-[9px]">
            {waiting.map((request) => (
              <div key={request.name} className="flex items-center justify-between gap-[20px]">
                <span className="truncate text-[13px] font-medium text-cp-text-primary">
                  {request.name}
                </span>
                <span className="flex shrink-0 items-center gap-[12px]">
                  <button
                    type="button"
                    role="menuitem"
                    disabled={answer.pending}
                    onClick={() => {
                      answer.run(() => api.approveJoin(request.name))
                    }}
                    className={`${MENU_ITEM} text-cp-presence hover:opacity-75`}
                  >
                    Admit
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={answer.pending}
                    onClick={() => {
                      answer.run(() => api.rejectJoin(request.name))
                    }}
                    className={`${MENU_ITEM} text-cp-destructive hover:opacity-75`}
                  >
                    Decline
                  </button>
                </span>
              </div>
            ))}
          </div>

          {answer.error !== undefined && (
            <span role="alert" className="pt-[9px] text-[11px] font-medium text-cp-text-primary">
              {answer.error}
            </span>
          )}
        </div>
      )}
    </FloatingMenu>
  )
}
