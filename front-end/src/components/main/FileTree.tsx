import type { ProjectFile } from '../../data/project'
import { Checkbox } from '../ui/Checkbox'
import { Icon } from '../ui/Icon'

interface FileTreeProps {
  files: ProjectFile[]
  /** Names that are currently ticked. */
  checked: ReadonlySet<string>
  onToggle: (name: string) => void
  accentColor?: string
}

/**
 * The project's contents inside the version panel: a flat, single-level list, because
 * the source draws folders with a disclosure chevron but never draws one open.
 *
 * Which files are ticked belongs to the page, not to the tree — the panel is a picker
 * and the selection outlives it.
 */
export function FileTree({ files, checked, onToggle, accentColor }: FileTreeProps) {
  return (
    <div className="flex flex-col items-start gap-[6px]">
      {files.map((file) => (
        <div
          key={file.name}
          className="flex items-center gap-[8px] rounded-[6px] py-[2px] pr-[6px] transition-colors duration-150 ease-out motion-reduce:transition-none hover:bg-cp-hover"
        >
          <Checkbox
            checked={checked.has(file.name)}
            label={file.name}
            accentColor={accentColor}
            onChange={() => {
              onToggle(file.name)
            }}
          />
          <span className="text-[10px] font-medium text-cp-text-primary">{file.name}</span>
          {file.isFolder && (
            <Icon name="chevron-small" className="h-[6px] w-[4px] rotate-90 opacity-50" />
          )}
        </div>
      ))}
    </div>
  )
}
