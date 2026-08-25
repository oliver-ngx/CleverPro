import type { ProjectFile } from '../../data/project'
import { iconForFile } from '../../api/adapters'
import { Disclosure } from '../ui/Disclosure'
import { Icon } from '../ui/Icon'

interface BrowserTreeProps {
  files: ProjectFile[]
  /** Folders currently disclosed, by path. Owned by the browser, not by a row. */
  open: ReadonlySet<string>
  onToggleFolder: (path: string) => void
  /** The file being previewed, by path, or undefined before one is chosen. */
  selected?: string
  onSelectFile: (path: string) => void
}

/** One row's geometry, shared by folders and files so the column keeps its rhythm. */
const ROW =
  'flex h-[18px] w-full shrink-0 cursor-pointer items-center gap-[6px] rounded-[3px] border-none pr-[8px] text-left text-[10px] font-normal text-cs-text-primary outline-none transition-colors duration-150 ease-out motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-cs-accent'

/**
 * The left column of the expanded file browser: the project's tree, drawn to be read
 * rather than to be picked from.
 *
 * This is not `FileTree` with the checkboxes taken out, and deliberately so. That
 * component is a *picker* — its rows carry a tick that decides what a commit
 * attaches, and its labels are the control that opens a folder. Here a row is a
 * destination: clicking a file previews it, clicking a folder discloses it, and
 * nothing on the screen is selecting anything for a later action. Sharing one
 * component would have meant a `variant` prop deciding whether each row means
 * "include this" or "show me this", which are not two skins of one thing.
 *
 * The frame draws every row with its own glyph — the folder in blue, files wearing
 * the icon their extension earns — at 14px on the 2204 source, so 10px here, with
 * the disclosure chevron pointing right when shut and down when open. Children are
 * indented 24 in the source and so 15 here.
 *
 * A folder's contents open to their own height rather than appearing — see
 * `Disclosure`, which is also why the rows nest here instead of being flattened into
 * one list. Each folder owns the box its children open inside, so a folder opening
 * two levels down pushes the ones beneath it rather than redrawing the column.
 */
export function BrowserTree({
  files,
  open,
  onToggleFolder,
  selected,
  onSelectFile,
}: BrowserTreeProps) {
  const rows = (list: ProjectFile[], depth: number) =>
    list.map((file) => {
      const disclosed = open.has(file.path)
      const isSelected = !file.isFolder && file.path === selected

      return (
        <div key={file.path} className="flex flex-col">
          <button
            type="button"
            style={{ paddingLeft: 8 + depth * 15 }}
            aria-expanded={file.isFolder ? disclosed : undefined}
            aria-current={isSelected ? 'true' : undefined}
            onClick={() => {
              if (file.isFolder) onToggleFolder(file.path)
              else onSelectFile(file.path)
            }}
            className={`${ROW} ${isSelected ? 'bg-cs-popover' : 'bg-transparent hover:bg-cs-hover'}`}
          >
            {file.isFolder ? (
              <Icon name="folder" className="h-[8px] w-[10px] shrink-0" />
            ) : (
              <Icon
                name={iconForFile(file.name).icon}
                className="h-auto w-[8px] shrink-0"
              />
            )}

            <span className="min-w-0 flex-1 truncate">{file.name}</span>

            {/* Only a folder has anything to disclose; a file keeps the space so the
                two kinds of row still end on the same line. */}
            {file.isFolder && (
              <Icon
                name="chevron-small"
                className={`h-[5px] w-[3px] shrink-0 opacity-50 transition-transform duration-150 ease-out motion-reduce:transition-none ${
                  disclosed ? 'rotate-[270deg]' : 'rotate-90'
                }`}
              />
            )}
          </button>

          {file.isFolder && (
            <Disclosure open={disclosed}>
              <div className="flex flex-col">{rows(file.children, depth + 1)}</div>
            </Disclosure>
          )}
        </div>
      )
    })

  return <div className="flex flex-col items-stretch">{rows(files, 0)}</div>
}
