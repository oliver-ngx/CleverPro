import type { CodeToken } from '../../data/versionSource'
import { CodeLines } from './CodeLines'
import type { IconName } from './Icon'
import { Icon } from './Icon'

interface CodeViewerProps {
  filename: string
  /** Glyph beside the filename. The source only ever opens Swift. */
  icon?: IconName
  lines: CodeToken[][]
  startLine?: number
}

/**
 * Ported from the design system's `data/CodeViewer`: a #F0F0F0 shell holding a white
 * sheet, both at the source's 28 radius, with a filename and glyph above the code.
 *
 * The code itself is `CodeLines`, shared with the expanded file browser. The spec
 * sets it 16/150% in grey with no colour; the frame draws it at 122% and colours
 * every run, so the frame wins on both — see that component for the rest.
 *
 * What this file's sample does *not* share is where its colours come from: they are
 * transcribed with the text in `VERSION_SOURCE`, because they are the designer's and
 * not a parser's. The browser, which opens files nobody drew, colours them with
 * `lib/highlight`.
 */
export function CodeViewer({ filename, icon = 'swift', lines, startLine = 1 }: CodeViewerProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-cs-code bg-cs-field px-[8px] pt-[10px] pb-[10px]">
      <div className="flex shrink-0 items-center gap-[8px] pb-[11px] pl-[11px]">
        <Icon name={icon} className="size-[13px] shrink-0" />
        <span className="truncate text-[13px] font-normal text-cs-text-file">{filename}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-cs-code bg-cs-white px-[14px] py-[8px]">
        <CodeLines lines={lines} startLine={startLine} />
      </div>
    </div>
  )
}
