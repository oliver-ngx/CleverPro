import type { CodeToken } from '../data/versionSource'

/**
 * Colouring arbitrary file text for the browser's preview pane.
 *
 * The design system is explicit that its own code sample is *transcribed* rather
 * than parsed — `VERSION_SOURCE` carries the designer's colours token by token, and
 * that is the right call for one fixed sample drawn in a frame. It cannot be the
 * call here: this pane opens whatever file was clicked, so there is nothing to
 * transcribe and the alternative to parsing is grey.
 *
 * So this produces the same `CodeToken` shape the transcription does, against the
 * same seven `--color-cp-code-*` values, and `CodeLines` cannot tell the two apart.
 * What it is not is a language server. It knows comments, strings, numbers and two
 * word lists, applied identically to every file type — enough that a preview reads
 * as code, and deliberately short of pretending to understand what it is reading. A
 * word that is a keyword in one language and an identifier in another is coloured as
 * the keyword, and that is accepted rather than worked around.
 */

/** Words that introduce or control, drawn in the frame's violet. */
const KEYWORDS = new Set([
  'as', 'async', 'await', 'break', 'case', 'catch', 'class', 'continue', 'def',
  'default', 'del', 'elif', 'else', 'except', 'export', 'extends', 'finally',
  'for', 'from', 'func', 'global', 'if', 'implements', 'import', 'in', 'interface',
  'is', 'lambda', 'match', 'new', 'not', 'or', 'pass', 'raise', 'return', 'struct',
  'switch', 'throw', 'try', 'type', 'while', 'with', 'yield',
])

/** Words that declare or name a binding, drawn in the frame's blue. */
const DECLARATIONS = new Set([
  'and', 'auto', 'bool', 'const', 'enum', 'false', 'final', 'int', 'let', 'nil',
  'none', 'null', 'private', 'protected', 'public', 'self', 'static', 'string',
  'super', 'this', 'true', 'undefined', 'var', 'void', 'where',
])

/**
 * Comment, string, number, word — in that order, because the first three may all
 * contain something that looks like the fourth.
 *
 * The backtick is written ``` so that the whole alternation fits inside one
 * `String.raw` literal, which cannot otherwise contain the character that closes it.
 *
 * Every branch is line-bounded, which is the honest limit of the approach and shows
 * in one place: a block comment or a template literal spanning several lines is only
 * coloured on the line that opens it. Carrying that state between lines would mean
 * carrying it per language, which is the point where this stops being a preview and
 * starts being a parser.
 */
const PATTERN = new RegExp(
  [
    String.raw`\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)`,
    String.raw`"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\u0060(?:\\.|[^\u0060\\])*\u0060`,
    String.raw`\b\d[\d_]*(?:\.\d+)?\b`,
    String.raw`[A-Za-z_$][\w$]*`,
  ].join('|'),
  'g',
)

/**
 * Which of the four alternatives matched, read off the match itself.
 *
 * The branches are mutually exclusive on their first character, so there is no need
 * to ask the engine which group filled — and asking would mean treating capture
 * groups as optional, which TypeScript does not type them as.
 */
function classify(text: string): CodeToken['k'] {
  const first = text[0]
  if (first === '/') return 'comment'
  if (first === '"' || first === "'" || first === '`') return 'string'
  if (first >= '0' && first <= '9') return 'value'

  const lower = text.toLowerCase()
  if (KEYWORDS.has(lower)) return 'keyword'
  if (DECLARATIONS.has(lower)) return 'decl'
  // Capitalised words read as types and constants in every language here; the frame
  // gives those the same deep blue it gives imported names.
  return /^[A-Z]/.test(text) ? 'ident' : undefined
}

/**
 * A `#` comment, which the pattern above deliberately does not carry.
 *
 * Python and shell mark comments with `#` — and CSS writes colours as `#fff`, so a
 * rule matching `#` anywhere would green the rest of any line holding one. Requiring
 * it to open the line keeps every full-line comment in a script and costs only the
 * trailing `x = 1  # note` form, which is the safer way round.
 */
function isHashComment(line: string): boolean {
  return line.trimStart().startsWith('#')
}

/** Splits text into the line-of-tokens shape `CodeLines` draws. */
export function highlight(text: string): CodeToken[][] {
  // A trailing newline terminates the last line rather than opening an empty one.
  const lines = text.replace(/\n$/, '').split('\n')

  return lines.map((line) => {
    if (line === '') return []
    if (isHashComment(line)) return [{ t: line, k: 'comment' }]

    const tokens: CodeToken[] = []
    let at = 0

    for (const match of line.matchAll(PATTERN)) {
      const whole = match[0]
      if (match.index > at) tokens.push({ t: line.slice(at, match.index) })

      const kind = classify(whole)
      tokens.push(kind === undefined ? { t: whole } : { t: whole, k: kind })
      at = match.index + whole.length
    }

    if (at < line.length) tokens.push({ t: line.slice(at) })
    return tokens
  })
}
