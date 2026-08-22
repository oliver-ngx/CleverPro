/**
 * Reading real files off the machine the browser is running on.
 *
 * This is the one thing the app could not do until now. Every other attachment
 * names paths the server already holds; these carry bytes the server has never
 * seen, which is what makes work on disk into a version in Compiler.
 *
 * Two pickers, because a file input can be one or the other and never both:
 * `webkitdirectory` turns the OS chooser into a directory chooser, and dropping
 * it turns it back into a file chooser. They are otherwise the same code, and
 * they produce the same shape.
 *
 * Both use `<input type="file">` rather than the File System Access API. The
 * newer API can re-read a selection later without asking again, which would be
 * the right choice for a product that watches a directory — but it is Chromium
 * only, and nothing here needs to re-read: an attachment is a snapshot taken at
 * a moment, and taking the next one means picking again anyway.
 */

/**
 * Which chooser produced a selection. Both attach the same way — see below; the
 * kind survives because the two are named and drawn differently.
 */
export type PickedKind = 'folder' | 'files'

/** What came back off disk: a name, and real content at real paths. */
export interface PickedSource {
  /**
   * Which chooser this came from. It decides the tile's glyph and how the
   * selection is named, and nothing else: both kinds merge onto the branch.
   */
  kind: PickedKind
  /** What the attachment is called: the folder's name, or the file's. */
  name: string
  /**
   * Path relative to the *project root*, forward-slashed, to its text.
   *
   * A folder keeps its own name at the head of every path, so picking `scripts/`
   * gives `scripts/build.py` and the folder lands inside the project as a folder
   * rather than becoming the project. Loose files have no such prefix and land at
   * the root under their own names.
   */
  files: Record<string, string>
  /** How many files were left out, and why, for the composer to report. */
  skipped: { count: number; reason: string }[]
}

/**
 * Directories never worth reading: build output, dependencies and version
 * control. A `node_modules` alone can be a hundred thousand files, which would
 * hang the tab long before it ever reached the server.
 *
 * Only ever applied to a folder, and never to the folder that was picked — a
 * directory named by hand was named deliberately, so choosing `dist/` itself
 * attaches it, while a `dist/` found *inside* the selection is skipped. A file
 * chosen by name is likewise never filtered.
 */
const SKIP_DIRECTORIES = new Set([
  '.git',
  '.next',
  '.venv',
  '__pycache__',
  'build',
  'dist',
  'node_modules',
  'venv',
])

/**
 * Ceilings, set to clear a real project rather than to be cautious.
 *
 * They exist because the failure mode without them is not an error message. The
 * whole selection is read into memory, serialised into one JSON body, parsed by
 * the server, and then kept: every push stores a *complete* snapshot of the tree,
 * so the backend's memory grows with versions times tree size (see `PushRecord`).
 * Past some size the tab stops responding and the server bloats, and neither says
 * why. A ceiling turns that into a sentence under the tile naming what was left
 * out.
 *
 * So they are deliberately generous rather than tight. 5 MB clears any source
 * file, including the lockfiles and fixtures that routinely run past a megabyte;
 * 20,000 files clears a large repository once dependencies and build output are
 * excluded; 50 MB clears the two together. Anything past them is a disk image
 * rather than a project.
 *
 * Raising them further is this block and nothing else — no other code reads the
 * numbers, and the reasons printed beside a skipped file are generated from them,
 * so the messages stay true whatever they are set to. `Infinity` removes a limit
 * outright, with the consequences above.
 */
const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_FILES = 20_000
const MAX_TOTAL_BYTES = 50 * 1024 * 1024

/** "5 MB", "512 KB" — how a ceiling is named in the sentence that reports it. */
function describeBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${String(Math.round(bytes / 1024 / 1024))} MB`
    : `${String(Math.round(bytes / 1024))} KB`
}

/**
 * Compiler stores and diffs text. A binary would survive neither the JSON trip
 * nor the line-based diff, so it is left out rather than corrupted quietly — and
 * a NUL byte is the same thing every other tool uses to tell the two apart.
 */
function isBinary(text: string): boolean {
  return text.includes('\u0000')
}

/**
 * Opens the system's chooser and reads what comes back.
 *
 * Resolves to `undefined` if the picker was dismissed. Browsers disagree about
 * how a cancelled picker announces itself — Chromium fires `cancel`, others
 * simply never fire anything — so this settles on `cancel` when it comes and
 * otherwise stays pending until `change` does. An abandoned promise costs a
 * closure; a promise that rejects on a maybe-cancel costs a false error on
 * screen.
 */
async function pick(kind: PickedKind): Promise<PickedSource | undefined> {
  const input = document.createElement('input')
  input.type = 'file'
  if (kind === 'folder') input.webkitdirectory = true
  else input.multiple = true
  input.style.display = 'none'
  document.body.append(input)

  const chosen = await new Promise<FileList | undefined>((resolve) => {
    input.addEventListener('change', () => {
      resolve(input.files ?? undefined)
    })
    input.addEventListener('cancel', () => {
      resolve(undefined)
    })
    input.click()
  })

  input.remove()
  if (chosen === undefined || chosen.length === 0) return undefined

  return readSelection([...chosen], kind)
}

/** A whole directory: its tree becomes the branch's tree. */
export function pickProjectFolder(): Promise<PickedSource | undefined> {
  return pick('folder')
}

/** One or more loose files: they merge onto whatever the branch already holds. */
export function pickFiles(): Promise<PickedSource | undefined> {
  return pick('files')
}

/**
 * What the selection is called.
 *
 * A folder input reports no name of its own, so the only place the folder's name
 * exists is at the head of every entry's relative path. A file selection has no
 * single name at all once there is more than one file, so it is counted instead.
 */
function nameOf(list: File[], kind: PickedKind): string {
  if (kind === 'files') {
    return list.length === 1 ? list[0].name : `${String(list.length)} files`
  }
  const [first] = (list[0].webkitRelativePath || list[0].name).split('/')
  return first === '' ? 'folder' : first
}

async function readSelection(list: File[], kind: PickedKind): Promise<PickedSource> {
  const files: Record<string, string> = {}
  const skipped = new Map<string, number>()
  const skip = (reason: string) => {
    skipped.set(reason, (skipped.get(reason) ?? 0) + 1)
  }

  let count = 0
  let bytes = 0

  for (const file of list) {
    // A folder keeps its own name at the head of the path, which is what puts it
    // inside the project rather than in place of it: pick `scripts/` and the
    // project gains `scripts/`. A loose file has no prefix and lands at the root.
    const path = kind === 'folder' ? file.webkitRelativePath : file.name
    if (path === '') continue

    // `slice(1, -1)` skips both the picked folder's own name and the file's, so
    // the filter reads only the directories found *within* the selection.
    if (
      kind === 'folder' &&
      path.split('/').slice(1, -1).some((segment) => SKIP_DIRECTORIES.has(segment))
    ) {
      skip('in a build or dependency folder')
      continue
    }
    if (file.size > MAX_FILE_BYTES) {
      skip(`larger than ${describeBytes(MAX_FILE_BYTES)}`)
      continue
    }
    if (count >= MAX_FILES) {
      skip(`past the first ${MAX_FILES.toLocaleString('en-US')} files`)
      continue
    }
    if (bytes + file.size > MAX_TOTAL_BYTES) {
      skip(`over ${describeBytes(MAX_TOTAL_BYTES)} in total`)
      continue
    }

    const text = await file.text()
    if (isBinary(text)) {
      skip('not a text file')
      continue
    }

    files[path] = text
    count += 1
    bytes += file.size
  }

  return {
    kind,
    name: nameOf(list, kind),
    files,
    skipped: [...skipped].map(([reason, count]) => ({ reason, count })),
  }
}
