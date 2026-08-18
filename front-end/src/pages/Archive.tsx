import { PageBody } from '../components/layout/PageBody'
import type { DataTableColumn } from '../components/ui/DataTable'
import { DataTable } from '../components/ui/DataTable'
import { ARCHIVE } from '../data/logs'

/** The same inset Activity takes — the two log screens are drawn from one margin. */
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

/** Every version of the project, newest first, each one undoable. */
export default function Archive() {
  return (
    <PageBody className={PADDING}>
      <DataTable columns={COLUMNS} rows={ARCHIVE} minWidth={560} />
    </PageBody>
  )
}
