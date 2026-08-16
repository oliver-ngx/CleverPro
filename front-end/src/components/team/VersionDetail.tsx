import { memo } from 'react'
import type { PaneEntry } from '../../data/team'
import { VERSION_NOTES, VERSION_SOURCE, VERSION_STAMP } from '../../data/versionSource'
import { CodeViewer } from '../ui/CodeViewer'
import { CommentBlock } from '../ui/CommentBlock'

interface VersionDetailProps {
  entry: PaneEntry
  /** Whose pane this is — the note under the diff is theirs. */
  author: string
}

/**
 * The right half of the split: when the version landed, the file it changed, and the
 * note its author left.
 *
 * The source draws one version open — Eden's ContentView.swift v3 — so every version
 * shows that file. Only the name and glyph in the viewer's header change with the row
 * you pick, because the file itself is the one piece of content the frame gives.
 *
 * Memoised because that file is several hundred elements and both props are stable —
 * the entry is the very object the pane was handed. Without this, every unrelated
 * change in App (the rail collapsing, a branch being picked) would rebuild the whole
 * listing behind the panel.
 */
export const VersionDetail = memo(function VersionDetail({ entry, author }: VersionDetailProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto pt-[13px] pr-[11px] pb-[24px] pl-[14px]">
      <span className="mb-[8px] shrink-0 self-end text-[11px] font-normal text-cp-text-stamp">
        {VERSION_STAMP}
      </span>

      <div className="flex h-[497px] shrink-0">
        <CodeViewer filename={entry.title} icon={entry.icon} lines={VERSION_SOURCE} />
      </div>

      <div className="mt-[32px] shrink-0 pl-[9px]">
        <CommentBlock author={author} items={VERSION_NOTES} />
      </div>
    </div>
  )
})
