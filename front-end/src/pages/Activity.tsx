import { useMemo } from 'react'
import { api } from '../api/client'
import { toActivityRows } from '../api/adapters'
import { PageBody } from '../components/layout/PageBody'
import type { DataTableColumn } from '../components/ui/DataTable'
import { DataTable } from '../components/ui/DataTable'
import { ResourceState } from '../components/ui/ResourceState'
import { CURRENT_USER } from '../config'
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
 * author. That is why CURRENT_USER is in the request path and not just decoration.
 *
 * The Action word is also the control. Pressing "Merge" adopts the commit into
 * your working version and the row immediately reads "Undo"; pressing that
 * reverses it. Neither touches Main -- a merge is a private act, which is why
 * only your own view of the row changes. "View" is inert: the design defines no
 * detail screen to open from here.
 */
export default function Activity() {
  const events = useResource((signal) => api.activity(CURRENT_USER, signal), [])
  const rows = useMemo(
    () => (events.data === undefined ? [] : toActivityRows(events.data)),
    [events.data],
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
