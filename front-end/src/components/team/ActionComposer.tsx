import { useState } from 'react'
import { flattenFilePaths } from '../../api/adapters'
import { api } from '../../api/client'
import type { MemberDto } from '../../api/types'
import { useAction } from '../../hooks/useAction'
import { useOverlayDismiss } from '../../hooks/useOverlayDismiss'
import { useResource } from '../../hooks/useResource'
import { BranchSelect } from '../main/BranchSelect'
import { ComposerRow } from '../ui/ComposerRow'
import { Icon } from '../ui/Icon'
import { IconButton } from '../ui/IconButton'
import { Sheet } from '../ui/Sheet'
import { VersionRow } from '../ui/VersionRow'

interface ActionComposerProps {
  projectName: string
  branch: string
  branches: string[]
  onSelectBranch: (branch: string) => void
  /** Everyone a commit can be routed to. */
  members: MemberDto[]
  /** Closes the window, which then plays its exit animation before it unmounts. */
  onDismiss: () => void
  /** True while that exit is running. */
  closing?: boolean
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
 * Unlike that sheet this one does dismiss on a click outside, because it has no
 * footer — without it the only way out would be Escape.
 *
 * ---
 *
 * What Commit and Push actually send, and the one thing they cannot:
 *
 * The attachment is every file on the selected branch, addressed by path. What
 * it is NOT is their contents — a browser cannot read the files behind a tree
 * it was handed over JSON, and there is no endpoint that returns a branch
 * head's file contents to echo back. So `file_contents` goes empty, and the
 * backend does the sane thing with that: a Push carries each named path's
 * existing content forward, promoting the branch as a new version with a real
 * label and a zero-line diff; a Commit records a proposal against those paths,
 * likewise zero-line.
 *
 * That is a genuine limit, not a stub. Sending real content means letting the
 * user pick a folder — `<input webkitdirectory>` or the File System Access
 * API — reading each file as text, and posting the resulting {path: content}
 * map. Until that exists, these two buttons move versions and the ledger
 * honestly, and move bytes not at all.
 */
export function ActionComposer({
  projectName,
  branch,
  branches,
  onSelectBranch,
  members,
  onDismiss,
  closing = false,
}: ActionComposerProps) {
  useOverlayDismiss(onDismiss)

  const [comment, setComment] = useState('')
  const [viewBy, setViewBy] = useState<ReadonlySet<string>>(new Set())
  const action = useAction()

  const tree = useResource((signal) => api.branchFiles(branch, signal), [branch])
  const paths = tree.data === undefined ? [] : flattenFilePaths(tree.data)
  // The capsules under the project tile are the branch's own top-level files,
  // so the tray shows what the two buttons will actually name.
  const looseFiles = (tree.data ?? []).filter((node) => node.type === 'file')

  const label = comment.trim()
  const ready = label !== '' && paths.length > 0 && !action.pending

  const toggleRecipient = (name: string) => {
    setViewBy((current) => {
      const next = new Set(current)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <Sheet
      title="Action"
      closing={closing}
      onScrimClick={onDismiss}
      actions={
        <>
          <IconButton icon="archive-in" label="Attach" iconClassName="h-[17px] w-[22px]" />
          <IconButton
            icon="commit"
            label="Commit"
            disabled={!ready}
            iconClassName="h-[15px] w-[22px] text-cp-text-primary"
            onClick={() => {
              action.run(
                () => api.commit(branch, label, paths, [...viewBy]),
                onDismiss,
              )
            }}
          />
          <IconButton
            icon="push"
            label="Push"
            disabled={!ready}
            iconClassName="h-[16px] w-[23px] text-cp-text-primary"
            onClick={() => {
              action.run(() => api.push(branch, label, paths), onDismiss)
            }}
          />
        </>
      }
    >
      {/* Empty means the whole team, which is what the API does with an empty
          view_by — so no recipient selected is a broadcast, not a mistake. */}
      <ComposerRow label="View by:">
        <span className="flex flex-wrap items-center justify-end gap-[8px]">
          {members.map((member) => (
            <button
              key={member.name}
              type="button"
              onClick={() => {
                toggleRecipient(member.name)
              }}
              className={`cursor-pointer rounded-cp-pill border-none px-[10px] py-[3px] text-[11px] font-medium transition-colors duration-150 ease-out motion-reduce:transition-none ${
                viewBy.has(member.name)
                  ? 'bg-cp-row-active text-cp-text-primary'
                  : 'bg-cp-field text-cp-text-subtle hover:bg-cp-row-hover'
              }`}
            >
              {member.name}
            </button>
          ))}
        </span>
      </ComposerRow>

      {/* The comment is the log line: the backend renders the Activity row as
          "Committed {comment}" or "Pushed {comment} to {branch}", so this field
          is what everyone else will read. Both buttons stay disabled until it
          has something in it. */}
      <ComposerRow label="Comment:">
        <input
          type="text"
          value={comment}
          onChange={(event) => {
            setComment(event.target.value)
          }}
          placeholder="e.g.  Orchid Lab V4"
          className="min-w-0 flex-1 border-none bg-transparent text-right text-[14px] font-medium text-cp-text-file outline-none placeholder:text-cp-text-composer"
        />
      </ComposerRow>

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
          <Icon name="file-blank" className="h-[53px] w-[40px] shrink-0" />
          <span className="flex min-w-0 flex-col gap-[5px]">
            <span className="truncate text-[14px] font-medium text-cp-text-file">
              {projectName}
            </span>
            {/* Drawn as "Main" in the frame; it is the branch, the same value the Add
                Branch sheet puts under this tile. */}
            <span className="truncate text-[11px] font-normal text-cp-text-file">{branch}</span>
          </span>
        </div>

        {action.error !== undefined && (
          <div role="alert" className="mt-[12px] text-[11px] font-medium text-cp-text-primary">
            {action.error}
          </div>
        )}

        <div className="mt-[15px] flex flex-col gap-[15px]">
          {looseFiles.map((file) => (
            <VersionRow key={file.path} icon="book-md" iconSize={18} title={file.name} />
          ))}
        </div>
      </div>
    </Sheet>
  )
}
