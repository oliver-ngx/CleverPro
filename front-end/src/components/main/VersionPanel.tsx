import type { ProjectFile } from '../../data/compiler'
import { IconButton } from '../ui/IconButton'
import { FileTree } from './FileTree'

interface VersionPanelProps {
  projectName: string
  branch: string
  files: ProjectFile[]
  checked: ReadonlySet<string>
  onToggleFile: (name: string) => void
  onPreviousVersion?: () => void
  onNextVersion?: () => void
}

/** The one content surface on Main: a flat #F4F4F4 card holding the file tree. */
export function VersionPanel({
  projectName,
  branch,
  files,
  checked,
  onToggleFile,
  onPreviousVersion,
  onNextVersion,
}: VersionPanelProps) {
  return (
    <div className="relative mb-[35px] rounded-cp-panel bg-cp-panel px-[22px] pt-[21px] pb-[25px]">
      <div className="text-[13px] font-medium text-cp-text-primary">{projectName}</div>
      <div className="mt-[7px] mb-[16px] text-[11px] font-medium text-cp-text-tertiary">
        {branch}
      </div>

      <FileTree files={files} checked={checked} onToggle={onToggleFile} />

      <span className="absolute top-[20px] right-[28px] inline-flex gap-[16px]">
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
