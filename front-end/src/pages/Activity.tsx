import { PageBody } from '../components/layout/PageBody'
import type { DataTableColumn } from '../components/ui/DataTable'
import { DataTable } from '../components/ui/DataTable'
import { ACTIVITY } from '../data/logs'

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
 * rail than Main's detail rows — 30px rather than 95 — so the table runs nearly the
 * full width of the pane.
 */
export default function Activity() {
  return (
    <PageBody className={PADDING}>
      <DataTable columns={COLUMNS} rows={ACTIVITY} />
    </PageBody>
  )
}
