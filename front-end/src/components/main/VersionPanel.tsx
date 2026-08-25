import type { ReactNode } from 'react'
import type { ProjectFile } from '../../data/project'
import { IconButton } from '../ui/IconButton'
import { FileTree } from './FileTree'

interface VersionPanelProps {
  projectName: string
  branch: string
  files: ProjectFile[]
  /** Ticked paths, not names — two folders can hold the same filename. */
  checked: ReadonlySet<string>
  onToggleFile: (path: string) => void
  /** Loading, error or empty copy, shown in place of the tree. */
  children?: ReactNode
  onPreviousVersion?: () => void
  onNextVersion?: () => void
  /** Opens the expanded browser. The heading is the control, not the whole card. */
  onExpand?: () => void
}

/**
 * The lower of Main's two cards: a flat #EFEFEF surface holding the file tree.
 *
 * The whole card opens the expanded browser. Not by wrapping the contents in a
 * button -- the card is full of controls, and a button containing a checkbox is
 * invalid and unreachable by keyboard both -- but by laying one behind them. The
 * backing button fills the card and the contents sit above it, so a press lands on
 * whatever specific control it was aimed at and on the card everywhere else, which
 * is most of it: the tree's rows are only as wide as their labels.
 */
export function VersionPanel({
  projectName,
  branch,
  files,
  checked,
  onToggleFile,
  children,
  onPreviousVersion,
  onNextVersion,
  onExpand,
}: VersionPanelProps) {
  return (
    <div className="relative mb-[35px] rounded-cs-panel bg-cs-card px-[22px] pt-[21px] pb-[25px]">
      {/* Behind everything, and inset to the card's own radius so its focus ring and
          hover wash follow the card's silhouette rather than boxing it. */}
      <button
        type="button"
        onClick={onExpand}
        aria-label={`Browse the files in ${projectName}`}
        className="absolute inset-0 z-0 cursor-pointer rounded-cs-panel border-none bg-transparent p-0 outline-none transition-colors duration-150 ease-out motion-reduce:transition-none hover:bg-cs-hover focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-cs-accent"
      />

      <div className="pointer-events-none relative z-10">
        <div className="text-[13px] font-medium text-cs-text-primary">{projectName}</div>
        <div className="mt-[7px] mb-[16px] text-[11px] font-medium text-cs-text-tertiary">
          {branch}
        </div>
      </div>

      {/* Above the backing button, and `w-fit` so it claims only the width its rows
          actually occupy -- the rest of the card's area belongs to the button. */}
      <div className="relative z-10 w-fit">
        {children}
        <FileTree files={files} checked={checked} onToggle={onToggleFile} />
      </div>

      <span className="absolute top-[20px] right-[28px] z-10 inline-flex gap-[16px]">
        <IconButton
          icon="chevron-left"
          label="Previous version"
          iconClassName="h-[11px] w-[7px] opacity-40"
          onClick={onPreviousVersion}
        />
        <IconButton
          icon="chevron-right"
          label="Next version"
          iconClassName="h-[11px] w-[7px] opacity-40"
          onClick={onNextVersion}
        />
      </span>
    </div>
  )
}
