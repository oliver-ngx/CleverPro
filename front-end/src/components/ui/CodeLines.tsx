import { useMemo } from 'react'
import type { CodeToken } from '../../data/versionSource'

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

interface CodeLinesProps {
  lines: CodeToken[][]
  startLine?: number
  /** Widens the gutter for a file long enough that three digits do not fit 18px. */
  gutterWidth?: number
}

/**
 * Numbered, coloured source and nothing around it.
 *
 * Split out of `CodeViewer` so the expanded file browser can draw the same code in a
 * different shell: the viewer wraps this in the version view's #F0F0F0 card with a
 * filename and a glyph, while the browser sets it inside a pane that already has a
 * header of its own. The colours, the wrapping and the gutter are the part that has
 * to be identical, and this is that part.
 *
 * Roboto Mono appears here and nowhere else in the product.
 *
 * This is the one place the type ladder is set aside: 16px on the source lands on 10
 * here rather than the usual 11, because a fixed number of lines has to fit a fixed
 * sheet and rounding the glyphs up would push the last of them out of it.
 *
 * Long lines wrap rather than scroll, which is what the source does — and why its own
 * gutter slips a line behind the code from the fourth line down.
 */
export function CodeLines({ lines, startLine = 1, gutterWidth = 18 }: CodeLinesProps) {
  // One text node for the whole gutter rather than an element per line, and rebuilt
  // only when the file does — the numbers are the same string on every render.
  const gutter = useMemo(
    () => lines.map((_, index) => startLine + index).join('\n'),
    [lines, startLine],
  )

  return (
    <div className="flex min-h-0 gap-[7px] font-mono text-[10px]/[122%] font-medium text-cp-code">
      {/* Decorative: a screen reader reading "1 2 3" before the code helps nobody. */}
      <pre
        aria-hidden="true"
        style={{ width: gutterWidth }}
        className="m-0 shrink-0 text-right select-none"
      >
        {gutter}
      </pre>
      <pre className="m-0 min-w-0 flex-1 whitespace-pre-wrap">
        {lines.map((line, index) => (
          // A blank line is an empty box with no height, so it keeps the source's own
          // zero-width space to hold one open.
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
  )
}
