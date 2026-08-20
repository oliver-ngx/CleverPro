import type { RefObject } from 'react'
import { memo, useState } from 'react'
import { api } from '../../api/client'
import type { CommentDto } from '../../api/types'
import type { PaneEntry } from '../../data/team'
import { VERSION_SOURCE } from '../../data/versionSource'
import { useAction } from '../../hooks/useAction'
import { useResource } from '../../hooks/useResource'
import { CodeViewer } from '../ui/CodeViewer'
import { CommentBlock } from '../ui/CommentBlock'

interface VersionDetailProps {
  entry: PaneEntry
  /** Whose pane this is — the note under the diff is theirs. */
  author: string
  /**
   * The note field, held by the pane so the toolbar's Comment glyph can put the
   * cursor in it. A ref rather than a callback prop because focusing is the
   * whole of the interaction — there is no state either side needs to share.
   */
  noteRef?: RefObject<HTMLInputElement | null>
}

/**
 * Groups a thread into the blocks the design draws: one glyph and one "by X"
 * over that person's bullets. Consecutive notes from the same person collapse
 * into a single block, which is exactly the shape the frame shows; a reply
 * from somebody else starts a new one.
 */
function threadBlocks(comments: CommentDto[]) {
  const blocks: { author: string; items: string[] }[] = []
  for (const comment of comments) {
    const last = blocks.at(-1)
    if (last !== undefined && last.author === comment.author) last.items.push(comment.text)
    else blocks.push({ author: comment.author, items: [comment.text] })
  }
  return blocks
}

/**
 * The right half of the split: when the version landed, the file it changed, and the
 * notes left on it.
 *
 * The source draws one version open — Eden's ContentView.swift v3 — so every version
 * shows that file. The listing itself is still the fixture: the API stores real
 * content per version, but reaching it needs the branch and version label that a
 * ledger row does not carry, so the viewer's body is the one thing on this screen
 * still drawn rather than fetched. Its header is real — the filename and glyph come
 * from the row you picked.
 *
 * Directly beneath the viewer sits the commit's own message. It used to be the
 * history row's title, which meant the row read as a sentence and the message had
 * only a truncated capsule to live in; the row now names the file or the project
 * and the message is read here instead.
 *
 * The thread beneath it is real, and only commits have one: the API attaches notes
 * to a commit, so a push row shows the composer nothing to talk about and says so.
 *
 * Still memoised. Its own state — the draft note, the thread — re-renders it
 * regardless, but both props remain stable objects, so the memo goes on doing
 * the job it was added for: keeping an unrelated change in App (the rail
 * collapsing, a branch being picked) from rebuilding several hundred elements
 * of code listing behind the panel.
 */
export const VersionDetail = memo(function VersionDetail({
  entry,
  author,
  noteRef,
}: VersionDetailProps) {
  const [draft, setDraft] = useState('')
  const post = useAction()
  const commitId = entry.commitId
  const thread = useResource(
    (signal) => (commitId === undefined ? Promise.resolve([]) : api.comments(commitId, signal)),
    [commitId],
  )
  const blocks = threadBlocks(thread.data ?? [])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto pt-[13px] pr-[11px] pb-[24px] pl-[14px]">
      <span className="mb-[8px] shrink-0 self-end text-[11px] font-normal text-cp-text-stamp">
        {entry.stamp}
      </span>

      <div className="flex h-[497px] shrink-0">
        <CodeViewer filename={entry.title} icon={entry.icon} lines={VERSION_SOURCE} />
      </div>

      {/* The message its author typed in the Action window. It is read here,
          under the file it was written about, rather than on the history row --
          the row names the artefact, so a comment of any length has somewhere
          to go. Printed verbatim, stray double spaces and all, because the
          product's log lines are copied rather than tidied. */}
      {entry.comment.trim() !== '' && (
        <p className="mt-[18px] mb-0 shrink-0 pl-[9px] text-[13px]/[130%] font-normal text-cp-text-primary">
          {entry.comment}
        </p>
      )}

      <div className="mt-[32px] flex shrink-0 flex-col gap-[20px] pl-[9px]">
        {blocks.map((block) => (
          <CommentBlock key={`${block.author}-${block.items[0]}`} {...block} />
        ))}

        {commitId === undefined ? (
          <span className="text-[11px] font-normal text-cp-text-tertiary">
            Notes are left on commits, not on pushed versions.
          </span>
        ) : (
          <input
            ref={noteRef}
            type="text"
            value={draft}
            disabled={post.pending}
            placeholder={blocks.length === 0 ? `Leave a note for ${author}` : 'Reply'}
            onChange={(event) => {
              setDraft(event.target.value)
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || draft.trim() === '') return
              const text = draft.trim()
              post.run(() => api.addComment(commitId, text), () => {
                setDraft('')
              })
            }}
            className="w-full rounded-cp-pill border-none bg-cp-field px-[16px] py-[9px] text-[13px] font-normal text-cp-text-primary outline-none placeholder:text-cp-text-subtle"
          />
        )}

        {post.error !== undefined && (
          <span role="alert" className="text-[11px] font-medium text-cp-text-primary">
            {post.error}
          </span>
        )}
      </div>
    </div>
  )
})
