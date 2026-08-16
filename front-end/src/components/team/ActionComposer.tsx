import { BRANCH_ATTACHMENTS } from '../../data/compiler'
import { useOverlayDismiss } from '../../hooks/useOverlayDismiss'
import { BranchSelect } from '../main/BranchSelect'
import { ComposerRow } from '../ui/ComposerRow'
import { Icon } from '../ui/Icon'
import { IconButton } from '../ui/IconButton'
import { Sheet } from '../ui/Sheet'
import { VersionRow } from '../ui/VersionRow'

interface ActionComposerProps {
  branch: string
  branches: string[]
  onSelectBranch: (branch: string) => void
  /** Called once the exit animation has finished and the window can be unmounted. */
  onDismiss: () => void
}

/**
 * The Action window over your own pane: `Sheet`, `ComposerRow` and `VersionRow`
 * composed into one screen.
 *
 * It wears the same chrome and the same box as the Add Branch sheet, because the user
 * asked for one style and one size across both. The shared box is the one the source
 * fixes here, so this window is unchanged and the sheet grew to meet it. Nothing in
 * this file sets a fill, a radius, a shadow or a size; that all belongs to `Sheet`.
 *
 * The attachments are the same two things a new branch carries, drawn differently —
 * the project as a wide tile in a filled panel, then the loose files as capsules
 * beneath it. Their glyph sizes are the frame's, not the Add Branch sheet's, which
 * draws the same two attachments much larger.
 *
 * Unlike that sheet this one does dismiss on a click outside, because it has no
 * footer — without it the only way out would be Escape.
 */
export function ActionComposer({
  branch,
  branches,
  onSelectBranch,
  onDismiss,
}: ActionComposerProps) {
  const { closing, close } = useOverlayDismiss(onDismiss)
  const [project, ...files] = BRANCH_ATTACHMENTS

  return (
    <Sheet
      title="Action"
      closing={closing}
      onScrimClick={close}
      onExited={onDismiss}
      actions={
        <>
          <IconButton icon="archive-in" label="Attach" iconClassName="h-[17px] w-[22px]" />
          <IconButton
            icon="commit"
            label="Commit"
            iconClassName="h-[15px] w-[22px] text-cp-text-primary"
          />
          <IconButton
            icon="push"
            label="Push"
            iconClassName="h-[16px] w-[23px] text-cp-text-primary"
          />
        </>
      }
    >
      {/* The source draws these two with no value beside them. Nothing is invented to
          fill them — the design system defines no input state for either, and guessing
          one would be inventing product. */}
      <ComposerRow label="View by:" />
      <ComposerRow label="Comment:" />

      <ComposerRow label="Branches:">
        <BranchSelect
          current={branch}
          branches={branches}
          onSelect={onSelectBranch}
          // The row is padded far more tightly than a detail row on Main, so the menu
          // sits closer to the edge it opens from.
          menuPosition="top-[9px] right-[5px]"
        />
      </ComposerRow>

      <ComposerRow label="Attachment:" divider={false} />

      <div className="mt-[4px] px-[17px]">
        <div className="flex h-[82px] shrink-0 items-center gap-[25px] rounded-[20px] bg-cp-field px-[23px]">
          <Icon name={project.icon} className="h-[53px] w-[40px] shrink-0" />
          <span className="flex min-w-0 flex-col gap-[5px]">
            <span className="truncate text-[14px] font-medium text-cp-text-file">
              {project.name}
            </span>
            {/* Drawn as "Main" in the frame; it is the branch, the same value the Add
                Branch sheet puts under this tile. */}
            <span className="truncate text-[11px] font-normal text-cp-text-file">{branch}</span>
          </span>
        </div>

        <div className="mt-[15px] flex flex-col gap-[15px]">
          {files.map((file) => (
            <VersionRow key={file.name} icon={file.icon} iconSize={18} title={file.name} />
          ))}
        </div>
      </div>
    </Sheet>
  )
}
