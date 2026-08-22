import { useState } from 'react'
import { flattenFilePaths, iconForFile } from '../../api/adapters'
import { api } from '../../api/client'
import type { AttachmentInput } from '../../api/client'
import type { MemberDto } from '../../api/types'
import { useAction } from '../../hooks/useAction'
import { useOverlayDismiss } from '../../hooks/useOverlayDismiss'
import { useResource } from '../../hooks/useResource'
import type { PickedKind, PickedSource } from '../../lib/picker'
import { pickFiles, pickProjectFolder } from '../../lib/picker'
import { BranchSelect } from '../main/BranchSelect'
import { ComposerRow } from '../ui/ComposerRow'
import { FloatingMenu, MENU_ITEM } from '../ui/FloatingMenu'
import { MentionField } from './MentionField'
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
 * What the Attach glyph offers, and in which order. Files first, because
 * attaching a few is the common act; a folder is the rarer one that replaces the
 * branch's whole tree.
 */
const ATTACH_CHOICES: { kind: PickedKind; word: string }[] = [
  { kind: 'files', word: 'Files…' },
  { kind: 'folder', word: 'Folder…' },
]

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
 * Things can be attached from two places. Off the user's machine, through the Attach
 * glyph in the title bar, which offers any number of loose **files** or a whole
 * **folder**. Or out of the project itself: the whole of the branch's **current version**, which
 * is the tile, and individual **files** of it, the capsules beneath. All of them are
 * pressable, and all of them start attached or not according to what there is.
 *
 * Only a version is a whole tree. Anything read off the machine — a folder as much
 * as a loose file — merges onto what is already there, so nothing off disk displaces
 * anything: a folder picked as `scripts/` gives the project a `scripts/`, keeping
 * its own name at the head of every path so it lands *inside* the project rather
 * than in place of it.
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
 * Files move content only if they were read here. One picked off the machine was,
 * so its text travels with the request and overwrites whatever that path held. One
 * picked out of the branch's own tree was not — a path handed over JSON has no bytes
 * attached to it — so the backend carries its existing content forward and the diff
 * is zero lines.
 *
 * Either way only the named paths change. Nothing sent from this window can remove a
 * file from a branch; a version is the one attachment that states a whole tree, and
 * the only one that can therefore drop something from it.
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
  // What this commit or push will be called. Required, like the comment: there
  // is no automatic name to fall back to -- see the Name row.
  const [name, setName] = useState('')
  // A list rather than a set: the frame writes the mentions out in the order they
  // were typed, so that order is data now and not an accident of iteration.
  const [viewBy, setViewBy] = useState<readonly string[]>([])
  const [source, setSource] = useState<PickedSource | undefined>(undefined)
  const [reading, setReading] = useState(false)
  const action = useAction()

  const tree = useResource((signal) => api.branchFiles(branch, signal), [branch])
  const paths = tree.data === undefined ? [] : flattenFilePaths(tree.data)

  // The version is attached by default when there is one: it is the only
  // attachment that carries real content, and it is the one a push usually
  // means. Switching branches re-reads the tree but not this — an explicit
  // choice about what to send is the user's, not the branch's.
  const [versionOff, setVersionOff] = useState(false)
  const versionAttached = versionLabel !== undefined && !versionOff
  const [attachedPaths, setAttachedPaths] = useState<ReadonlySet<string>>(new Set())

  // Whatever was read off the machine, folder or files. Addressed exactly like the
  // capsules below -- all of them are paths that merge onto the branch -- so the two
  // travel together and are counted together everywhere the rules care about loose
  // files.
  const diskFiles = source?.files ?? {}
  const diskPaths = Object.keys(diskFiles)

  // Every file on the branch, addressed the way the API addresses them. The tray
  // lists exactly what the buttons will send — no more, and nothing it will not.
  const chosenPaths = paths.filter((path) => attachedPaths.has(path))

  // The Push-validity rule, in the three lines it actually is.
  const whole = versionAttached
  const loose = chosenPaths.length + diskPaths.length
  const mixed = whole && loose > 0
  const empty = !whole && loose === 0

  const label = comment.trim()
  const chosenName = name.trim()
  // Two strings the sender has to write. The comment is the log line the rest
  // of the team reads; the name is what the thing itself will be called, and
  // on a push it becomes the version's label. Nothing generates either, so
  // neither button works until both are there; beyond that the two buttons
  // differ only by the rule above.
  const ready =
    label !== '' && chosenName !== '' && !empty && !action.pending && !reading
  const attachment: AttachmentInput = {
    ...(versionAttached ? { versionRef: versionLabel } : {}),
    ...(diskPaths.length === 0 ? {} : { fileContents: diskFiles }),
    paths: chosenPaths,
  }

  const fileCount = source === undefined ? 0 : Object.keys(source.files).length

  const take = (kind: PickedKind) => {
    setReading(true)
    void (kind === 'folder' ? pickProjectFolder() : pickFiles())
      .then((picked) => {
        if (picked !== undefined) setSource(picked)
      })
      .finally(() => {
        setReading(false)
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
          {/* The only control in the product that reaches off the browser, and the
              reason it asks first: a file input is a directory chooser or a file
              chooser and can never be both, so something has to pick which dialog
              opens. Asking in a card keeps that one control rather than putting two
              glyphs in the title bar for what reads as a single act. */}
          <FloatingMenu
            trigger={({ open, onClick }) => (
              <IconButton
                icon="archive-in"
                label={reading ? 'Reading…' : 'Attach from your machine'}
                expanded={open}
                disabled={reading}
                iconClassName="h-[17px] w-[22px]"
                onClick={onClick}
              />
            )}
          >
            {(close) => (
              <div className="flex min-w-0 flex-col">
                <span className="truncate pb-[8px] text-[13px]/[130%] font-semibold text-cp-text-tertiary">
                  Attach
                </span>

                <div className="h-px bg-cp-hairline" />

                <div className="flex flex-col items-start gap-[9px] pt-[9px]">
                  {ATTACH_CHOICES.map(({ kind, word }) => (
                    <button
                      key={kind}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        take(kind)
                        close()
                      }}
                      className={`${MENU_ITEM} text-cp-text-branch hover:text-cp-text-primary`}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </FloatingMenu>
          <IconButton
            icon="commit"
            label="Commit"
            disabled={!ready}
            iconClassName="h-[15px] w-[22px] text-cp-text-primary"
            onClick={() => {
              action.run(
                () => api.commit(branch, label, attachment, [...viewBy], chosenName),
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
              action.run(() => api.push(branch, label, attachment, chosenName), onDismiss)
            }}
          />
        </>
      }
    >
      {/* Empty means the whole team, which is what the API does with an empty
          view_by — so naming nobody is a broadcast, not a mistake. The field says as
          much in its placeholder rather than in a caption beside it.

          Routing applies to a commit and to nothing else: a pushed version is on the
          branch and visible to everyone regardless of who is named here. */}
      <ComposerRow label="View by:" grows>
        <MentionField members={members} chosen={viewBy} onChange={setViewBy} />
      </ComposerRow>

      {/* What the thing being sent is called, written by the person sending it.
          There is deliberately no generated fallback: the branch could mint a
          label of its own ("V4" on Main, a date stamp elsewhere) and a commit
          could be named after the files it touched, but a name nobody chose is
          a name nobody recognises later, so both buttons stay dead until this
          is filled in.

          It is not decoration either. On a push it becomes the version's label,
          which is what Archive lists, what undo names, and what the file browser
          reads a version's contents by -- so the server refuses one the branch
          already holds rather than quietly adjusting it, and says so in the
          error above the tile. The placeholder is an example rather than an
          instruction, matching the Comment row below. */}
      <ComposerRow label="Name:">
        <input
          type="text"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
          }}
          placeholder="e.g.  V4"
          className="min-w-0 flex-1 border-none bg-transparent text-right text-[14px] font-medium text-cp-text-file outline-none placeholder:text-cp-text-composer"
        />
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
        {/* What was read off disk, folder or files. Drawn as one of the file rows
            rather than as a tile: it names paths to change, which is what the
            capsules below name, where the version tile alone names a whole tree.
            Pressing it puts the selection down again. */}
        {source !== undefined && (
          <div className="mb-[15px]">
            <VersionRow
              icon={source.kind === 'folder' ? 'folder' : iconForFile(source.name).icon}
              // A folder is drawn as one; a single file wears the glyph its own
              // extension earns, at the size that glyph is drawn everywhere else.
              iconSize={source.kind === 'folder' ? 20 : iconForFile(source.name).size}
              title={source.name}
              subtitle={`${String(fileCount)} file${fileCount === 1 ? '' : 's'} from your machine${
                source.skipped.length === 0
                  ? ''
                  : ` · ${String(source.skipped.reduce((total, entry) => total + entry.count, 0))} skipped`
              }`}
              selected
              onClick={() => {
                setSource(undefined)
              }}
            />
          </div>
        )}

        {/* What was left out, and why. Silently dropping a file the user believes
            they attached is the one thing this must not do. */}
        {source !== undefined && source.skipped.length > 0 && (
          <p className="mt-[-8px] mb-[15px] text-[11px] font-normal text-cp-text-composer">
            Skipped{' '}
            {source.skipped
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
          disabled={versionLabel === undefined}
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
