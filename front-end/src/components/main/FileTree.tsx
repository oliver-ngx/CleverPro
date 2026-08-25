import { useState } from 'react'
import type { ProjectFile } from '../../data/project'
import { Checkbox } from '../ui/Checkbox'
import { Icon } from '../ui/Icon'

interface FileTreeProps {
  files: ProjectFile[]
  /** Paths that are currently ticked. */
  checked: ReadonlySet<string>
  onToggle: (path: string) => void
  accentColor?: string
}

/**
 * The project's contents inside the version panel.
 *
 * The source draws folders with a disclosure chevron and never draws one open, so
 * for a long time this drew one level and left the chevron as decoration. A real
 * project makes that untenable — point the app at a directory on disk and the
 * interesting files are all two levels down — so the chevron now does what it
 * looks like it does, and the shut state is still exactly what the frame drew.
 *
 * Which files are ticked belongs to the page, because the panel is a picker and
 * the selection outlives it. Which folders are open belongs here, because it is
 * nobody else's business and it should not survive a branch switch.
 */
export function FileTree({ files, checked, onToggle, accentColor }: FileTreeProps) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())

  const toggleFolder = (path: string) => {
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const rows = (list: ProjectFile[], depth: number) =>
    list.map((file) => (
      <div key={file.path} className="flex flex-col items-start gap-[6px]">
        <div
          style={{ marginLeft: depth * 14 }}
          className="flex items-center gap-[8px] rounded-[6px] py-[2px] pr-[6px] transition-colors duration-150 ease-out motion-reduce:transition-none hover:bg-cs-hover"
        >
          <Checkbox
            checked={checked.has(file.path)}
            label={file.path}
            accentColor={accentColor}
            onChange={() => {
              onToggle(file.path)
            }}
          />
          {file.isFolder ? (
            // The whole label opens the folder, not just the chevron: an 6x4
            // glyph is not a target, and the row already reads as one thing.
            <button
              type="button"
              aria-expanded={open.has(file.path)}
              onClick={() => {
                toggleFolder(file.path)
              }}
              className="flex cursor-pointer items-center gap-[8px] border-none bg-transparent p-0 text-left outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-cs-accent"
            >
              <span className="text-[10px] font-medium text-cs-text-primary">{file.name}</span>
              <Icon
                name="chevron-small"
                className={`h-[6px] w-[4px] opacity-50 transition-transform duration-150 ease-out motion-reduce:transition-none ${
                  open.has(file.path) ? 'rotate-[270deg]' : 'rotate-90'
                }`}
              />
            </button>
          ) : (
            <span className="text-[10px] font-medium text-cs-text-primary">{file.name}</span>
          )}
        </div>

        {file.isFolder && open.has(file.path) && rows(file.children, depth + 1)}
      </div>
    ))

  return <div className="flex flex-col items-start gap-[6px]">{rows(files, 0)}</div>
}
