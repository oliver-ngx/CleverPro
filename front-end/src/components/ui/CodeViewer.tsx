import { useMemo } from 'react'
import type { CodeToken } from '../../data/versionSource'
import type { IconName } from './Icon'
import { Icon } from './Icon'

/** Base grey carries the untagged runs, so it lives on the block, not on a token. */
const TOKEN_COLOUR: Record<NonNullable<CodeToken['k']>, string> = {
  comment: 'text-cp-code-comment',
  decl: 'text-cp-code-decl',
  ident: 'text-cp-code-ident',
  keyword: 'text-cp-code-keyword',
  prop: 'text-cp-code-prop',
  string: 'text-cp-code-string',
  value: 'text-cp-code-value',
}

interface CodeViewerProps {
  filename: string
  /** Glyph beside the filename. The source only ever opens Swift. */
  icon?: IconName
  lines: CodeToken[][]
  startLine?: number
}

/**
 * Ported from the design system's `data/CodeViewer`: a #F0F0F0 shell holding a white
 * sheet, both at the source's 28 radius, with a right-aligned gutter beside the code.
 * Roboto Mono appears here and nowhere else in the product.
 *
 * The spec sets the code 16/150% in grey with no colour; the frame draws it at 122%
 * and colours every run, so the frame wins on both. Nothing is highlighted at
 * runtime — the colours are transcribed with the text, because they are the source's
 * and not a parser's.
 *
 * This is the one place the type ladder is set aside: 16px lands on 10 here rather
 * than the usual 11, because a fixed number of lines has to fit a fixed sheet and
 * rounding the glyphs up would push the last of them out of it.
 *
 * Long lines wrap rather than scroll, which is what the source does — and why its
 * own gutter slips a line behind the code from the fourth line down.
 */
export function CodeViewer({ filename, icon = 'swift', lines, startLine = 1 }: CodeViewerProps) {
  // One text node for the whole gutter rather than an element per line, and rebuilt
  // only when the file does — the numbers are the same string on every render.
  const gutter = useMemo(
    () => lines.map((_, index) => startLine + index).join('\n'),
    [lines, startLine],
  )

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-cp-code bg-cp-field px-[8px] pt-[10px] pb-[10px]">
      <div className="flex shrink-0 items-center gap-[8px] pb-[11px] pl-[11px]">
        <Icon name={icon} className="size-[13px] shrink-0" />
        <span className="truncate text-[13px] font-normal text-cp-text-file">{filename}</span>
      </div>

      <div className="flex min-h-0 flex-1 gap-[7px] overflow-auto rounded-cp-code bg-cp-white px-[14px] py-[8px] font-mono text-[10px]/[122%] font-medium text-cp-code">
        {/* Decorative: a screen reader reading "1 2 3" before the code helps nobody. */}
        <pre aria-hidden="true" className="m-0 w-[18px] shrink-0 text-right select-none">
          {gutter}
        </pre>
        <pre className="m-0 min-w-0 flex-1 whitespace-pre-wrap">
          {lines.map((line, index) => (
            // A blank line is an empty box with no height, so it keeps the source's
            // own zero-width space to hold one open.
            <span key={index} className="block">
              {line.length === 0
                ? '\u200b'
                : line.map((token, part) => (
                    <span
                      key={part}
                      className={token.k === undefined ? undefined : TOKEN_COLOUR[token.k]}
                    >
                      {token.t}
                    </span>
                  ))}
            </span>
          ))}
        </pre>
      </div>
    </div>
  )
}
