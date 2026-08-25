import { memo } from 'react'
import { api } from '../../api/client'
import type { CommentDto } from '../../api/types'
import type { PaneEntry } from '../../data/team'
import { useResource } from '../../hooks/useResource'
import { CodeViewer } from '../ui/CodeViewer'
import { VersionFiles } from './VersionFiles'
import { CommentBlock } from '../ui/CommentBlock'
import { highlight } from '../../lib/highlight'
import { useMemo } from 'react'

interface VersionDetailProps {
  entry: PaneEntry
  /**
   * Whose pane this is. Every row here is theirs -- a member's history is
   * filtered to one actor -- so this is who the row's own message is signed by.
   */
  author: string
  /**
   * The branch's current version. A commit names paths but no version of its own, so
   * this is where its files are read from — see `VersionFiles`.
   */
  fallbackVersion?: string
}

/**
 * Groups what was written about a version into the blocks the design draws: one
 * glyph and one "by X" over that person's bullets. Consecutive notes from the same
 * person collapse into a single block, which is exactly the shape the frame shows; a
 * reply from somebody else starts a new one.
 *
 * The row's own message leads, because it is a note like any other -- it is what its
 * author typed into the Action window's Comment field, so it is signed by them and
 * read in the same place as the rest. Being first, it merges into their block rather
 * than standing above a second heading with the same name on it.
 */
function threadBlocks(author: string, message: string, comments: CommentDto[]) {
  const blocks: { author: string; items: string[] }[] = []
  const all = message === '' ? comments : [{ author, text: message }, ...comments]
  for (const comment of all) {
    // One note may be several lines, and each becomes a bullet of its own. This is
    // the shape the design draws -- a list, not a paragraph -- and it is what
    // somebody pressing Return in the Comment field means by it. Written as one
    // bullet with a newline inside, the second line would hang under the marker and
    // read as a wrap rather than as a point. Blank lines are dropped, so leaving a
    // gap between paragraphs does not leave an empty bullet between them.
    const items = comment.text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '')
    if (items.length === 0) continue
    const last = blocks.at(-1)
    if (last !== undefined && last.author === comment.author) last.items.push(...items)
    else blocks.push({ author: comment.author, items })
  }
  return blocks
}

/**
 * The right half of the split: when the version landed, the file it changed, and the
 * notes left on it.
 *
 * The source draws one version open — Eden's ContentView.swift v3 — so it draws a
 * single file's contents, and that is what a row naming one file still shows, now
 * with the real thing in it rather than the fixture.
 *
 * A row that is not one file does not open that way. A push is a whole version and a
 * commit may touch several paths; either is a *structure*, and showing one of its
 * files' contents would be picking one at random and calling it the version. Those
 * open onto the tree, and a file's contents appear underneath once one is picked —
 * see `VersionFiles`.
 *
 * Beneath the viewer is what was written about this version, and it takes one shape
 * only: the comment glyph, "by X", and that person's lines as bullets. The row's own
 * message is the first of them. It is what its author typed into the Action window's
 * Comment field, so it is theirs and signed as theirs — printing it as a bare
 * paragraph instead made the one thing every row has look unlike the notes beside it.
 *
 * There is no field to add one here: the frame draws an attribution line and its
 * bullets and nothing to type into, and this pane is somebody else's work being read
 * rather than a conversation being had. Writing happens in the Action window, which
 * is where the message comes from.
 *
 * Only commits carry further notes — the API attaches them to a proposal — so a push
 * row shows its message alone.
 *
 * Still memoised. Fetching the thread re-renders it regardless, but both props remain
 * stable objects, so the memo goes on doing the job it was added for: keeping an
 * unrelated change in App (the rail collapsing, a branch being picked) from
 * rebuilding several hundred elements of code listing behind the panel.
 */
export const VersionDetail = memo(function VersionDetail({
  entry,
  author,
  fallbackVersion,
}: VersionDetailProps) {
  const commitId = entry.commitId
  const thread = useResource(
    (signal) => (commitId === undefined ? Promise.resolve([]) : api.comments(commitId, signal)),
    [commitId],
  )
  const blocks = threadBlocks(author, entry.comment.trim(), thread.data ?? [])

  // One named file is a file; a push, or a commit touching several, is a structure.
  const paths = entry.files ?? []
  const single = paths.length === 1 ? paths[0] : undefined
  const structure = single === undefined

  const branch = entry.branch
  const label = entry.versionLabel ?? fallbackVersion
  const source = useResource(
    (signal) =>
      single === undefined || branch === undefined || label === undefined
        ? Promise.resolve(undefined)
        : api.fileContent(branch, label, single, signal),
    [single, branch, label],
  )
  const lines = useMemo(
    () => (source.data === undefined ? [] : highlight(source.data.content)),
    [source.data],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto pt-[13px] pr-[11px] pb-[24px] pl-[14px]">
      <span className="mb-[8px] shrink-0 self-end text-[11px] font-normal text-cs-text-stamp">
        {entry.stamp}
      </span>

      {structure ? (
        <VersionFiles entry={entry} fallbackVersion={fallbackVersion} />
      ) : (
        <div className="flex h-[497px] shrink-0">
          <CodeViewer filename={single} icon={entry.icon} lines={lines} />
        </div>
      )}

      {blocks.length > 0 && (
        <div className="mt-[32px] flex shrink-0 flex-col gap-[20px] pl-[9px]">
          {blocks.map((block, index) => (
            // Index, because two people may write the same words and a block is
            // identified by where it sits in the thread rather than by its text.
            <CommentBlock key={index} {...block} />
          ))}
        </div>
      )}
    </div>
  )
})
