import { useMemo, useState } from 'react'
import { api } from '../api/client'
import { toArchiveRows } from '../api/adapters'
import { PageBody } from '../components/layout/PageBody'
import type { DataTableColumn } from '../components/ui/DataTable'
import { DataTable } from '../components/ui/DataTable'
import { ResourceState } from '../components/ui/ResourceState'
import { useAction } from '../hooks/useAction'
import { useResource } from '../hooks/useResource'

/** The same inset Activity takes -- the two log screens are drawn from one margin. */
const PADDING = 'px-[16px] pt-[20px] pb-[35px] md:pt-[28px] md:pr-[36px] md:pl-[30px]'

/**
 * The same three-column geometry as Activity, measured off the archive frame: the
 * version runs to 73% of the table's width, then Time, then Action. The Action
 * column starts at exactly the same offset on both screens.
 */
const COLUMNS: DataTableColumn[] = [
  { key: 'version', label: 'Activity', width: 'minmax(0,1fr)' },
  { key: 'time', label: 'Time', width: '17%' },
  { key: 'action', label: 'Action', width: '10%', action: true },
]

interface ArchiveProps {
  /** Prefixed onto each version label; the API returns the label alone. */
  projectName: string
}

/**
 * The shelf: every version ever published to Main, newest first, and a way to
 * put any of them live.
 *
 * Exactly one row reads "Applied" -- what production is actually serving --
 * and it is not necessarily the top one. A push advances Main without
 * touching production, so the newest version sitting above the applied one is
 * the normal state of a project mid-flight, not a bug.
 *
 * Every other row reads "Undo", and pressing it applies that version
 * immediately: production changes, the deploy URL follows, and the "Applied"
 * marker moves to that row. Nothing is deleted -- the change is recorded as a
 * new deployment pointing at an existing version, so this list only ever grows.
 *
 * It is Maintainer-and-above, and that is not pre-empted here. The row keeps
 * its word and the server's refusal is shown if it comes, because release
 * authority is the kind of thing that changes under a page already open.
 *
 * A row's overflow menu offers to remove it, and that removal is this component's
 * alone. Nothing on the shelf can actually be destroyed -- the backend's invariant 4
 * has no record ever deleted, and there is no endpoint for it -- so a dismissed row
 * is held here by its version label and returns on the next load. The interaction is
 * being settled ahead of deciding what deletion should mean to the server.
 */
export default function Archive({ projectName }: ArchiveProps) {
  const archive = useResource((signal) => api.archive(signal), [])
  // Labels, not positions: applying a version refetches the shelf, and the row that
  // was at a given index before is not the row there afterwards.
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set())
  const rows = useMemo(
    () =>
      archive.data === undefined
        ? []
        : toArchiveRows(archive.data, projectName).filter(
            (row) => !dismissed.has(row.versionLabel),
          ),
    [archive.data, projectName, dismissed],
  )
  const action = useAction()

  return (
    <PageBody className={PADDING}>
      <ResourceState
        loading={archive.loading}
        error={archive.error ?? action.error}
        empty="No version has been pushed to Main yet."
        emptyWhen={rows.length === 0}
      />
      {rows.length > 0 && (
        <DataTable
          columns={COLUMNS}
          rows={rows}
          minWidth={560}
          labelKey="version"
          onDelete={(row) => {
            setDismissed((current) => new Set(current).add(row.versionLabel))
          }}
          onAction={(row) => {
            // "Applied" is a status, not a control -- that version is already live.
            if (row.action !== 'Undo') return
            action.run(() => api.rollback(row.versionLabel))
          }}
        />
      )}
    </PageBody>
  )
}
