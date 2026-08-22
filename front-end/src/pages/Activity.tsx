import { useMemo, useState } from 'react'
import { api } from '../api/client'
import { toActivityRows } from '../api/adapters'
import { PageBody } from '../components/layout/PageBody'
import type { DataTableColumn } from '../components/ui/DataTable'
import { DataTable } from '../components/ui/DataTable'
import { ResourceState } from '../components/ui/ResourceState'
import { useCurrentUser } from '../session'
import { useAction } from '../hooks/useAction'
import { useResource } from '../hooks/useResource'

/** Both log screens are inset alike; the source draws them from the same margins. */
const PADDING = 'px-[16px] pt-[20px] pb-[35px] md:pt-[28px] md:pr-[36px] md:pl-[30px]'

/**
 * Column tracks as proportions of the table's width, so they hold at any pane
 * width rather than only at the frame's. The source measures 499 / 927 / 159 of
 * 1585, and the Action column starts at the same offset here as it does on Archive.
 */
const COLUMNS: DataTableColumn[] = [
  { key: 'who', label: 'Name', width: '31.5%' },
  { key: 'activity', label: 'Activity', width: 'minmax(0,1fr)' },
  { key: 'action', label: 'Action', width: '10%', action: true },
]

/**
 * The Activity log: one table, nothing else. The source sets it much closer to the
 * rail than Main's detail rows -- 30px rather than 95 -- so the table runs nearly
 * the full width of the pane.
 *
 * The feed is viewer-specific, not a global log: the same commit reads "Merge" to
 * a recipient who has not taken it yet, "Undo" to one who has, and "View" to its
 * author. That is why the acting member is in the request path and not just
 * decoration -- switching who the app is acting as changes what this table says.
 *
 * The Action word is also the control. Pressing "Merge" adopts the commit into
 * your working version and the row immediately reads "Undo"; pressing that
 * reverses it. Neither touches Main -- a merge is a private act, which is why
 * only your own view of the row changes. "View" is inert: the design defines no
 * detail screen to open from here.
 *
 * Each row's overflow menu offers to remove it, and that removal reaches no further
 * than this component. The ledger behind this feed is append-only by design -- see
 * invariant 4 in the backend's `core/project.py` -- and there is no endpoint that
 * deletes an event, so a dismissed row is held here by its id and is back on the next
 * load. That is the whole of it for now, deliberately: the interaction is settled
 * first, and what deletion should mean to the server is a separate decision.
 */
export default function Activity() {
  const actor = useCurrentUser()
  const events = useResource((signal) => api.activity(actor, signal), [actor])
  // Ids, not positions: merging a commit refetches the feed, and an index into the
  // old list would then point at somebody else's row.
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set())
  const rows = useMemo(
    () =>
      events.data === undefined
        ? []
        : toActivityRows(events.data).filter((row) => !dismissed.has(row.eventId)),
    [events.data, dismissed],
  )
  const action = useAction()

  return (
    <PageBody className={PADDING}>
      <ResourceState
        loading={events.loading}
        error={events.error ?? action.error}
        empty="Nothing has happened on this project yet."
        emptyWhen={rows.length === 0}
      />
      {rows.length > 0 && (
        <DataTable
          columns={COLUMNS}
          rows={rows}
          labelKey="activity"
          onDelete={(row) => {
            setDismissed((current) => new Set(current).add(row.eventId))
          }}
          onAction={(row) => {
            // Push and undo rows carry no commit, and their word is always
            // "View" -- there is nothing to act on.
            if (row.commitId === '') return
            if (row.action === 'Merge') action.run(() => api.merge(row.commitId))
            else if (row.action === 'Undo') action.run(() => api.unmerge(row.commitId))
          }}
        />
      )}
    </PageBody>
  )
}
