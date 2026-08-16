import type { DataTableColumn } from '../components/ui/DataTable'
import { DataTable } from '../components/ui/DataTable'
import { ARCHIVE } from '../data/compiler'

/**
 * The same three-column geometry as Activity, measured off the archive frame: the
 * version runs to 73% of the card's inner width, then Time, then Action. The Action
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
    <div className="flex min-h-0 flex-1 flex-col overflow-auto px-[16px] pt-[20px] pb-[35px] md:pt-[28px] md:pr-[36px] md:pl-[30px]">
      <DataTable columns={COLUMNS} rows={ARCHIVE} minWidth={560} />
    </div>
  )
}
