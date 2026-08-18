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
 * tables — 25px rows banded #E8E8E8 against #EFEFEF under semibold headers, with
 * plain words in the action column.
 *
 * Every row carries a fill, so the banding is between the two rather than between a
 * stripe and the page behind it. Only the header sits on the page's own colour.
 *
 * Bands run the full width of the table while the text is inset, so the horizontal
 * padding belongs to each row rather than to the table.
 *
 * Cells are `whitespace-pre`: the source never wraps a log line, and it contains
 * deliberate double spaces the design system says to reproduce rather than tidy.
 * A table cannot honour that and reflow at the same time, so below `minWidth` it
 * scrolls sideways rather than re-wrapping into rows it was never drawn for.
 */
export function DataTable({ columns, rows, minWidth = 720, onAction }: DataTableProps) {
  const grid = columns.map((column) => column.width ?? 'minmax(0,1fr)').join(' ')

  return (
    // `shrink-0` is what keeps the page the thing that scrolls. As a flex child of
    // the scrolling body this table would otherwise shrink to the pane's height and
    // scroll its own rows, putting a scrollbar down the side of the table instead of
    // at the edge of the pane where every other screen has one. At full height there
    // is nothing for it to scroll, so the `overflow-y: auto` that `overflow-x-auto`
    // implies never engages.
    <div className="shrink-0 overflow-x-auto">
      <div style={{ minWidth }}>
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
            // The list stops rather than being cut off: the final row rounds its
            // bottom corners at the nav radius, which is what a 25px row can carry.
            className={`grid h-[25px] items-center px-[22px] text-[11px] font-medium whitespace-pre text-cp-text-primary ${
              index % 2 === 0 ? 'bg-cp-stripe' : 'bg-cp-stripe-alt'
            } ${index === rows.length - 1 ? 'rounded-b-cp-nav' : ''}`}
          >
            {columns.map((column) => (
              <span key={column.key} className={ALIGN[column.align ?? 'left']}>
                {column.action === true ? (
                  <button
                    type="button"
                    onClick={() => {
                      onAction?.(row, column)
                    }}
                    className="cursor-pointer border-none bg-transparent p-0 text-[11px] font-medium text-cp-text-primary transition-opacity duration-150 ease-out motion-reduce:transition-none active:opacity-[0.55]"
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
