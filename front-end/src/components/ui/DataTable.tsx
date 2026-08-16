export interface DataTableColumn {
  key: string
  label: string
  /** CSS grid track, e.g. "314px" or "minmax(0,1fr)". Defaults to an even share. */
  width?: string
  align?: 'left' | 'right' | 'center'
  /** Renders the cell as a clickable action word — View, Merge, Undo, Applied. */
  action?: boolean
}

interface DataTableProps {
  columns: DataTableColumn[]
  rows: Record<string, string>[]
  /** Smallest width the grid stays readable at; below it the table scrolls. */
  minWidth?: number
  onAction?: (row: Record<string, string>, column: DataTableColumn) => void
}

const ALIGN = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const

/**
 * Ported from the design system's `data/DataTable`: the Activity and Archive log
 * tables — a flat #F4F4F4 card holding 25px rows striped #E8E8E8, semibold headers
 * and medium cells, with plain words in the action column.
 *
 * Stripes run the full width of the card while the text is inset, so the card takes
 * no horizontal padding of its own and each row carries it instead.
 *
 * Cells are `whitespace-pre`: the source never wraps a log line, and it contains
 * deliberate double spaces the design system says to reproduce rather than tidy.
 * A table cannot honour that and reflow at the same time, so below `minWidth` it
 * scrolls sideways rather than re-wrapping into rows it was never drawn for.
 */
export function DataTable({ columns, rows, minWidth = 720, onAction }: DataTableProps) {
  const grid = columns.map((column) => column.width ?? 'minmax(0,1fr)').join(' ')

  return (
    <div className="overflow-x-auto rounded-cp-panel bg-cp-panel">
      <div style={{ minWidth }} className="pt-[21px] pb-[25px]">
        <div
          role="row"
          style={{ gridTemplateColumns: grid }}
          className="grid h-[20px] items-center px-[22px] text-[11px] font-semibold text-cp-text-primary"
        >
          {columns.map((column) => (
            <span key={column.key} className={ALIGN[column.align ?? 'left']}>
              {column.label}
            </span>
          ))}
        </div>

        {rows.map((row, index) => (
          <div
            // Log lines repeat verbatim across versions, so nothing in a row is a
            // stable key on its own — position is the identity here.
            key={index}
            role="row"
            style={{ gridTemplateColumns: grid }}
            className={`grid h-[25px] items-center px-[22px] text-[11px] font-medium whitespace-pre text-cp-text-primary ${
              index % 2 === 0 ? 'bg-cp-stripe' : ''
            }`}
          >
            {columns.map((column) => (
              <span key={column.key} className={ALIGN[column.align ?? 'left']}>
                {column.action === true ? (
                  <button
                    type="button"
                    onClick={() => {
                      onAction?.(row, column)
                    }}
                    className="cursor-pointer border-none bg-transparent p-0 text-[11px] font-medium text-cp-text-primary active:opacity-[0.55]"
                  >
                    {row[column.key]}
                  </button>
                ) : (
                  row[column.key]
                )}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
