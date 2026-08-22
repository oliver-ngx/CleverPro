import { describe, expect, it } from 'vitest'
import { highlight } from './highlight'

/** The concatenated text of a line, which must always equal the input line. */
const text = (line: { t: string }[]) => line.map((token) => token.t).join('')

describe('highlight', () => {
  it('never loses or invents a character', () => {
    const source = "const x = 'a' // note\n\tif (x) { return 1 }\n"
    expect(highlight(source).map(text)).toEqual([
      "const x = 'a' // note",
      '\tif (x) { return 1 }',
    ])
  })

  it('ends the file on its last line rather than an empty one', () => {
    expect(highlight('one\ntwo\n')).toHaveLength(2)
    expect(highlight('one\ntwo')).toHaveLength(2)
    expect(highlight('one\n\n')).toEqual([[{ t: 'one' }], []])
  })

  it('colours comments, strings and numbers by their opening character', () => {
    const [line] = highlight('let n = 42 // why')
    expect(line).toContainEqual({ t: 'let', k: 'decl' })
    expect(line).toContainEqual({ t: '42', k: 'value' })
    expect(line).toContainEqual({ t: '// why', k: 'comment' })
  })

  it('does not mistake a CSS colour for a comment', () => {
    const [line] = highlight('  color: #fff;')
    expect(line.some((token) => token.k === 'comment')).toBe(false)
  })

  it('treats a line opening with # as a comment, for Python and shell', () => {
    expect(highlight('  # set up')).toEqual([[{ t: '  # set up', k: 'comment' }]])
  })

  it('leaves a keyword inside a string uncoloured', () => {
    const [line] = highlight('write("return")')
    expect(line).toContainEqual({ t: '"return"', k: 'string' })
    expect(line.some((token) => token.t === 'return' && token.k === 'keyword')).toBe(false)
  })
})
