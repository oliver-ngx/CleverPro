/**
 * The one version the detail pane opens: the file it changed, the note left with it,
 * and when it landed.
 */
/** A run of code sharing one colour. `k` is absent for the viewer's base grey. */
export interface CodeToken {
  t: string
  k?: 'comment' | 'decl' | 'ident' | 'keyword' | 'prop' | 'string' | 'value'
}

/**
 * The file the version view opens, one array of tokens per line.
 *
 * The design system says the viewer shows "plain black on white with grey line
 * numbers", but the frame colours the code, so the frame wins and the colours are
 * transcribed here. They are the source's own, not a highlighter's output — nothing
 * parses this text, and its oddities are reproduced rather than tidied: the comment
 * block closes with another `/*` instead of `*\/`, and two lines carry a stray
 * leading space and a run of trailing ones.
 */
export const VERSION_SOURCE: CodeToken[][] = [
  [
    { t: 'import', k: 'keyword' },
    { t: ' ' },
    { t: 'React,', k: 'decl' },
    { t: ' ' },
    { t: '{', k: 'keyword' },
    { t: ' ' },
    { t: 'useState, useRef, useEffect, useCallback', k: 'ident' },
    { t: ' ' },
    { t: '}', k: 'keyword' },
    { t: ' ' },
    { t: 'from', k: 'keyword' },
    { t: ' ' },
    { t: '\'react\'', k: 'string' },
  ],
  [
    { t: 'import', k: 'keyword' },
    { t: ' ' },
    { t: '{', k: 'keyword' },
    { t: ' ' },
    { t: 'LANGUAGE_MAP, LANGUAGE_LIST, CODE_LOG_CONFIG ', k: 'ident' },
    { t: ' ' },
    { t: '}', k: 'keyword' },
    { t: ' ' },
    { t: 'from', k: 'keyword' },
    { t: ' ' },
    { t: '\'../utils/constants\'', k: 'string' },
  ],
  [
    { t: 'import', k: 'keyword' },
    { t: ' ' },
    { t: '{', k: 'keyword' },
    { t: ' ' },
    { t: 'highlight', k: 'ident' },
    { t: ' ' },
    { t: '}', k: 'keyword' },
    { t: ' ' },
    { t: 'from', k: 'keyword' },
    { t: ' ' },
    { t: '\'../utils/codeHelpers\'', k: 'string' },
  ],
  [
    { t: 'import', k: 'keyword' },
    { t: ' ' },
    { t: '{', k: 'keyword' },
    { t: ' ' },
    { t: 'detectLanguageFromPaste, getLanguageInfo, truncateFilename', k: 'ident' },
    { t: ' ' },
    { t: '}', k: 'keyword' },
    { t: ' ' },
    { t: 'from', k: 'keyword' },
    { t: ' ' },
    { t: '\'../utils/fileHelpers\'', k: 'string' },
  ],
  [],
  [{ t: '/* ', k: 'comment' }],
  [{ t: ' *  CODE FILE PAD CONFIG', k: 'comment' }],
  [{ t: ' *', k: 'comment' }],
  [{ t: ' *  This is the per-file editor: title + language chip + scrollable', k: 'comment' }],
  [{ t: ' *  code area + multipurpose menu (Browse/Copy/Star/Delete).', k: 'comment' }],
  [{ t: ' *  Visual knobs first so you can tune without hunting in JSX.', k: 'comment' }],
  [{ t: '/* ', k: 'comment' }],
  [
    { t: 'const', k: 'decl' },
    { t: ' ' },
    { t: 'PAD_CONFIG =', k: 'ident' },
    { t: ' ' },
    { t: '{', k: 'keyword' },
  ],
  [{ t: '  ' }, { t: '// Header chrome', k: 'comment' }],
  [{ t: '  ' }, { t: 'headerPaddingTop:', k: 'prop' }, { t: ' ' }, { t: '\'14px\',', k: 'value' }],
  [{ t: '  ' }, { t: 'headerPaddingX:', k: 'prop' }, { t: ' \'16px\',', k: 'value' }],
  [
    { t: '  ' },
    { t: 'headerPaddingBottom:', k: 'prop' },
    { t: ' ' },
    { t: '\'8px\',', k: 'value' },
  ],
  [
    { t: ' ' },
    { t: '  glassCircleSize:', k: 'prop' },
    { t: ' ' },
    { t: '44, ', k: 'value' },
    { t: '                      ' },
  ],
  [
    { t: '  ' },
    { t: 'glassCircleBg:', k: 'prop' },
    { t: ' ' },
    { t: '\'rgba(255,255,255,0.08)\',', k: 'value' },
  ],
  [
    { t: '  ' },
    { t: 'glassCircleBorder:', k: 'prop' },
    { t: ' ' },
    { t: '\'0.5px solid rgba(255,255,255,0.12)\',', k: 'value' },
  ],
  [
    { t: '  ' },
    { t: 'glassIconSize:', k: 'prop' },
    { t: ' ' },
    { t: '20,  ', k: 'value' },
    { t: '                      ' },
  ],
  [],
  [{ t: '  // Title', k: 'comment' }],
  [{ t: '  ' }, { t: 'titleFontSize:', k: 'prop' }, { t: ' ' }, { t: '\'32px\',', k: 'value' }],
  [{ t: '  ' }, { t: 'titleFontWeight:', k: 'prop' }, { t: ' ' }, { t: '700,', k: 'value' }],
  [
    { t: ' ' },
    { t: '  titleLetterSpacing:', k: 'prop' },
    { t: ' ' },
    { t: '\'-0.5px\',', k: 'value' },
  ],
  [{ t: '  ' }, { t: 'titleColor:', k: 'prop' }, { t: ' ' }, { t: '\'#fff\',', k: 'value' }],
  [{ t: '  ' }, { t: 'titlePaddingX:', k: 'prop' }, { t: ' ' }, { t: '\'16px\',', k: 'value' }],
  [{ t: '  ' }, { t: 'titleMarginTop:', k: 'prop' }, { t: ' ' }, { t: '\'14px\',', k: 'value' }],
  [{ t: '  ' }, { t: 'titleMarginBottom:', k: 'prop' }, { t: ' ' }, { t: '\'12px\',', k: 'value' }],
  [],
]

