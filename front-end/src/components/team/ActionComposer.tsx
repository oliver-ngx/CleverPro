import { useState } from 'react'
import { flattenFilePaths, iconForFile } from '../../api/adapters'
import { api } from '../../api/client'
import type { AttachmentInput } from '../../api/client'
import type { MemberDto } from '../../api/types'
import { useAction } from '../../hooks/useAction'
import { useOverlayDismiss } from '../../hooks/useOverlayDismiss'
import { useResource } from '../../hooks/useResource'
import type { PickedFolder } from '../../lib/folder'
import { pickProjectFolder } from '../../lib/folder'
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
  /**
   * The branch's current version label, if it has one. This is what the tile
   * attaches; a branch nothing has been pushed to has no version to send, so
   * the tile is inert until it does.
   */
  versionLabel?: string
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
 * **The attachment is a set, and the set decides what the window can do.**
 *
 * Three kinds of thing can be attached. A **folder** off the user's machine, chosen
 * with the Attach glyph in the title bar. The whole of the branch's **current
 * version**, which is the tile. Or individual **files**, the capsules beneath it.
 * All three are pressable, and all three start attached or not according to what
 * there actually is.
 *
 * A folder and a version are both whole trees, so attaching a folder puts the
 * version down — two answers to "what should this branch become" is one too many.
 *
 * Push has to resolve to one unambiguous next state of the branch, so it accepts a
 * set of exactly one kind. Attach a whole tree *and* a file and the bundle no longer
 * says whether that file overrides what the tree already holds or merely repeats it,
 * and Push goes dead the moment that happens rather than waiting to be refused on
 * submit. Commit has no such requirement — a proposal is read by a person, so it may
 * carry whatever mixture its author meant.
 *
 * The server enforces the same rule and answers a mixed push with a 422. The dead
 * icon is the courtesy; the 422 is the guarantee.
 *
 * ---
 *
 * **What each kind of attachment actually moves.**
 *
 * A folder moves content that was never here before: it is read off disk, bytes
 * and all, and pushing it replaces the branch's tree with what is actually in
 * that directory. This is how a project on somebody's machine becomes a project
 * in Compiler, and it is the only attachment that can introduce a file that did
 * not already exist.
 *
 * A version moves real content too, but the server assembles it: the client names
 * the label and the backend resolves it to that version's stored snapshot.
 * Nothing is uploaded, so nothing is lost.
 *
 * Files move no content at all, and cannot. A path that came out of a tree the
 * browser was handed over JSON has no bytes attached to it, so the backend
 * carries each named path's existing content forward and the diff is zero lines.
 * That is the honest shape of it: a file attachment moves *which* files a version
 * names, and a folder attachment moves what is in them.
 */
export function ActionComposer({
  projectName,
  branch,
  branches,
  onSelectBranch,
  versionLabel,
  members,
  onDismiss,
  closing = false,
}: ActionComposerProps) {
  useOverlayDismiss(onDismiss)

  const [comment, setComment] = useState('')
  const [viewBy, setViewBy] = useState<ReadonlySet<string>>(new Set())
  const [folder, setFolder] = useState<PickedFolder | undefined>(undefined)
  const [reading, setReading] = useState(false)
  const action = useAction()

  const tree = useResource((signal) => api.branchFiles(branch, signal), [branch])
  const paths = tree.data === undefined ? [] : flattenFilePaths(tree.data)

  // The version is attached by default when there is one: it is the only
  // attachment that carries real content, and it is the one a push usually
  // means. Switching branches re-reads the tree but not this — an explicit
  // choice about what to send is the user's, not the branch's.
  const [versionOff, setVersionOff] = useState(false)
  const versionAttached = versionLabel !== undefined && !versionOff && folder === undefined
  const [attachedPaths, setAttachedPaths] = useState<ReadonlySet<string>>(new Set())

  // Every file on the branch, addressed the way the API addresses them. The tray
  // lists exactly what the buttons will send — no more, and nothing it will not.
  const chosenPaths = paths.filter((path) => attachedPaths.has(path))

  // The Push-validity rule, in the two lines it actually is.
  const whole = versionAttached || folder !== undefined
  const mixed = whole && chosenPaths.length > 0
  const empty = !whole && chosenPaths.length === 0

  const label = comment.trim()
  // The comment is the log line the rest of the team reads, so neither button
  // works without one; beyond that the two differ only by the rule above.
  const ready = label !== '' && !empty && !action.pending && !reading
  const attachment: AttachmentInput = {
    ...(folder === undefined ? {} : { folder: { name: folder.name, files: folder.files } }),
    ...(versionAttached ? { versionRef: versionLabel } : {}),
    paths: chosenPaths,
  }

  const fileCount = folder === undefined ? 0 : Object.keys(folder.files).length

  const toggleRecipient = (name: string) => {
    setViewBy((current) => {
      const next = new Set(current)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const togglePath = (path: string) => {
    setAttachedPaths((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
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
          {/* The only control in the product that reaches off the browser. */}
          <IconButton
            icon="archive-in"
            label={reading ? 'Reading folder…' : 'Attach a folder'}
            disabled={reading}
            iconClassName="h-[17px] w-[22px]"
            onClick={() => {
              setReading(true)
              void pickProjectFolder()
                .then((picked) => {
                  if (picked !== undefined) setFolder(picked)
                })
                .finally(() => {
                  setReading(false)
                })
            }}
          />
          <IconButton
            icon="commit"
            label="Commit"
            disabled={!ready}
            iconClassName="h-[15px] w-[22px] text-cp-text-primary"
            onClick={() => {
              action.run(
                () => api.commit(branch, label, attachment, [...viewBy]),
                onDismiss,
              )
            }}
          />
          <IconButton
            icon="push"
            label={mixed ? 'Push (unavailable: the attachment mixes a version with files)' : 'Push'}
            disabled={!ready || mixed}
            iconClassName="h-[16px] w-[23px] text-cp-text-primary"
            onClick={() => {
              action.run(() => api.push(branch, label, attachment), onDismiss)
            }}
          />
        </>
      }
    >
      {/* Empty means the whole team, which is what the API does with an empty
          view_by — so no recipient selected is a broadcast, not a mistake.

          The row is captioned rather than hidden or dimmed. Routing applies to a
          commit and to nothing else: a pushed version is on the branch and visible
          to everyone regardless of what is picked here. Saying so once is clearer
          than a control that greys in and out as the attachment changes shape. */}
      <ComposerRow label="View by:">
        <span className="flex flex-wrap items-center justify-end gap-[8px]">
          <span className="text-[11px] font-normal text-cp-text-composer">Commit only</span>
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

      <ComposerRow label="Attachment:" divider={false}>
        {mixed && (
          <span className="text-right text-[11px] font-normal text-cp-text-composer">
            A whole tree and files together — Push needs one or the other
          </span>
        )}
      </ComposerRow>

      <div className="mt-[4px] px-[17px]">
        {/* A folder that was read off disk. It stands in front of the version tile
            because it answers the same question and answers it louder: this is what
            the branch should become. Pressing it puts the folder down again. */}
        {folder !== undefined && (
          <button
            type="button"
            aria-pressed
            onClick={() => {
              setFolder(undefined)
            }}
            className="mb-[15px] flex h-[82px] w-full shrink-0 cursor-pointer items-center gap-[25px] rounded-[20px] border-none bg-cp-row-active px-[23px] text-left outline-none transition-colors duration-150 ease-out motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-cp-accent"
          >
            <Icon name="file-blank" className="h-[53px] w-[40px] shrink-0" />
            <span className="flex min-w-0 flex-col gap-[5px]">
              <span className="truncate text-[14px] font-medium text-cp-text-file">
                {folder.name}
              </span>
              <span className="truncate text-[11px] font-normal text-cp-text-file">
                {fileCount} file{fileCount === 1 ? '' : 's'} from your machine
                {folder.skipped.length === 0
                  ? ''
                  : ` · ${String(folder.skipped.reduce((total, entry) => total + entry.count, 0))} skipped`}
              </span>
            </span>
          </button>
        )}

        {/* What was left out, and why. Silently dropping a file the user believes
            they attached is the one thing this must not do. */}
        {folder !== undefined && folder.skipped.length > 0 && (
          <p className="mt-[-8px] mb-[15px] text-[11px] font-normal text-cp-text-composer">
            Skipped{' '}
            {folder.skipped
              .map((entry) => `${String(entry.count)} ${entry.reason}`)
              .join(', ')}
            .
          </p>
        )}

        {/* The whole of this branch's current version. Pressing it takes it out of
            the bundle, which is what makes a file-only push possible. */}
        <button
          type="button"
          aria-pressed={versionAttached}
          disabled={versionLabel === undefined || folder !== undefined}
          onClick={() => {
            setVersionOff((current) => !current)
          }}
          className={`flex h-[82px] w-full shrink-0 cursor-pointer items-center gap-[25px] rounded-[20px] border-none px-[23px] text-left outline-none transition-colors duration-150 ease-out motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-cp-accent disabled:cursor-default disabled:opacity-[0.45] ${
            versionAttached ? 'bg-cp-row-active' : 'bg-cp-field'
          }`}
        >
          <Icon name="file-blank" className="h-[53px] w-[40px] shrink-0" />
          <span className="flex min-w-0 flex-col gap-[5px]">
            <span className="truncate text-[14px] font-medium text-cp-text-file">
              {versionLabel === undefined ? projectName : `${projectName} ${versionLabel}`}
            </span>
            {/* Drawn as "Main" in the frame; it is the branch, the same value the Add
                Branch sheet puts under this tile. */}
            <span className="truncate text-[11px] font-normal text-cp-text-file">
              {versionLabel === undefined ? `${branch} — nothing pushed yet` : branch}
            </span>
          </span>
        </button>

        {action.error !== undefined && (
          <div role="alert" className="mt-[12px] text-[11px] font-medium text-cp-text-primary">
            {action.error}
          </div>
        )}

        <div className="mt-[15px] flex flex-col gap-[15px]">
          {paths.map((path) => {
            const { icon, size } = iconForFile(path)
            return (
              <VersionRow
                key={path}
                icon={icon}
                iconSize={size}
                title={path}
                selected={attachedPaths.has(path)}
                onClick={() => {
                  togglePath(path)
                }}
              />
            )
          })}
        </div>
      </div>
    </Sheet>
  )
}
