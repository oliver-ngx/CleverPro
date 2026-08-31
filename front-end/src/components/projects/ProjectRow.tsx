import { Icon } from '../ui/Icon'

/**
 * What a row draws, and nothing else.
 *
 * Deliberately not `ProjectEntry`. Compiler and Configs keep separate lists —
 * the same project can appear in both and means a different thing in each, and
 * a row that opens in one may be inert in the other — so the row is given the
 * five things it paints and is told whether it opens, rather than reading a
 * field that belongs to one module's fixture.
 */
export interface ProjectRowData {
  /** Row identity. Not the API's id — two rows may share one project. */
  key: string
  name: string
  /** The branch it is on. Drawn under the name in grey. */
  branch: string
  /** The initial(s) struck across the document icon. */
  monogram: string
  /** That initial's colour, as a `cs-*` text class. */
  monogramClass: string
}

interface ProjectRowProps {
  entry: ProjectRowData
  /** Whether pressing it goes anywhere. Each module decides for itself. */
  openable: boolean
  onOpen: () => void
}

/**
 * One project in a module's list: a document with its initial struck across it,
 * then the name and the branch it is on.
 *
 * The document is the existing `file-blank` glyph, not a new asset. The one the
 * design exports for this row is byte-identical to the one already in
 * public/assets/icons — same file, used twice — so it is reused rather than
 * shipped again under a second name.
 *
 * The initial is sized by how many letters it is: the source draws a single
 * letter larger than a pair, which is the only reading that makes its 48/43/43
 * consistent, since two of those three are the same letter at different sizes.
 *
 * A row that is not `openable` is drawn and does nothing. That is not a
 * disabled state — the design has none — it is a row whose module cannot open
 * that project yet, and pressing it does nothing rather than failing later.
 */
export function ProjectRow({ entry, openable, onOpen }: ProjectRowProps) {
  return (
    <button
      type="button"
      aria-disabled={!openable}
      onClick={() => {
        if (openable) onOpen()
      }}
      // `items-end` with a little padding rather than centring: the source sets
      // the text block low against the document, at about two thirds down, not
      // on its midline.
      className={`flex w-full cursor-pointer items-end gap-[10px] rounded-cs-nav border-none bg-transparent px-[25px] py-[10px] text-left transition-colors duration-150 ease-out motion-reduce:transition-none ${
        openable ? 'hover:bg-cs-hover' : ''
      }`}
    >
      <div className="relative h-[70px] w-[53px] shrink-0">
        <Icon name="file-blank" className="h-[70px] w-[53px]" />
        {/* Centred on the document rather than offset into it. The source
            positions each initial by hand, which lands a single letter in the
            middle and pushes a two-letter one off the right edge — "ML" at 27px
            is about 39 wide, and 15 of left inset plus that is wider than the
            53 the page has. Centring puts one letter exactly where the design
            has it and fixes the pair. */}
        <span
          style={{ fontFamily: 'var(--font-rounded)' }}
          className={`absolute inset-0 flex items-center justify-center font-bold ${
            entry.monogramClass
          } ${entry.monogram.length > 1 ? 'text-[27px]' : 'text-[30px]'}`}
        >
          {entry.monogram}
        </span>
      </div>

      <div className="min-w-0 pb-[13px]">
        <div className="truncate text-[10px] text-cs-text-primary">{entry.name}</div>
        <div className="mt-[3px] truncate text-[9px] text-cs-text-branchline">{entry.branch}</div>
      </div>
    </button>
  )
}
