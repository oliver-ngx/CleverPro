/**
 * The seam between the wire and the screens.
 *
 * Everything here is a pure function, and every one of them exists because the
 * API describes a system while the components describe a drawing. These tests
 * pin the translation: a rename on the server that this file does not follow
 * shows up as a failure rather than as an empty row on a screen nobody opened
 * during review.
 */
import { describe, expect, it } from 'vitest'
import {
  avatarFor,
  flattenFilePaths,
  flattenFiles,
  iconForFile,
  toActivityRows,
  toArchiveRows,
  toFiles,
  toPaneEntries,
  toProject,
} from './adapters'
import type { FileNodeDto, MemberActivityDto } from './types'

const file = (name: string, path: string): FileNodeDto => ({
  name,
  type: 'file',
  path,
  checked: true,
})

const folder = (name: string, path: string, children: FileNodeDto[]): FileNodeDto => ({
  name,
  type: 'folder',
  path,
  checked: true,
  children,
})

describe('toProject', () => {
  it('fuses the name and version the design prints as one string', () => {
    const project = toProject({
      preview_image: '/p.png',
      project_name: 'Orchid Lab',
      current_version: 'V3',
      deploy_url: 'orchid-lab.cleverpro.com',
      branches: [],
    })
    expect(project.version).toBe('Orchid Lab V3')
    expect(project.deployHost).toBe('orchid-lab.cleverpro.com')
  })

  it('leaves off a version a project does not have yet', () => {
    const project = toProject({
      preview_image: null,
      project_name: 'Orchid Lab',
      current_version: null,
      deploy_url: null,
      branches: [],
    })
    expect(project.version).toBe('Orchid Lab')
    // Null until the first deploy: a push alone never sets it, which is the
    // whole point of the invariant.
    expect(project.deployHost).toBeNull()
  })
})

describe('toFiles', () => {
  it('sorts folders before files, alphabetically at every level', () => {
    const nodes = [
      file('README.md', 'README.md'),
      folder('src', 'src', [file('b.ts', 'src/b.ts'), file('a.ts', 'src/a.ts')]),
      folder('api', 'api', []),
    ]
    const tree = toFiles(nodes)
    expect(tree.map((entry) => entry.name)).toEqual(['api', 'src', 'README.md'])
    expect(tree[1].children.map((entry) => entry.name)).toEqual(['a.ts', 'b.ts'])
  })

  it('keeps the tree nested rather than flattening it to the top level', () => {
    const tree = toFiles([folder('src', 'src', [file('a.ts', 'src/a.ts')])])
    expect(tree[0].isFolder).toBe(true)
    expect(tree[0].children).toHaveLength(1)
  })
})

describe('flattenFiles', () => {
  it('yields folders as well as files, in drawing order', () => {
    const tree = toFiles([
      folder('src', 'src', [file('a.ts', 'src/a.ts')]),
      file('z.md', 'z.md'),
    ])
    expect(flattenFiles(tree).map((entry) => entry.path)).toEqual(['src', 'src/a.ts', 'z.md'])
  })
})

describe('flattenFilePaths', () => {
  it('drops folders and sorts, because a folder is only a grouping in the drawing', () => {
    const paths = flattenFilePaths([
      folder('src', 'src', [file('b.ts', 'src/b.ts'), file('a.ts', 'src/a.ts')]),
      file('README.md', 'README.md'),
    ])
    expect(paths).toEqual(['README.md', 'src/a.ts', 'src/b.ts'])
  })
})

describe('toActivityRows', () => {
  it('flips the feed, which arrives oldest-first and is read newest-first', () => {
    const rows = toActivityRows([
      {
        event_id: 'e1',
        actor: 'Ada',
        type: 'push',
        description: 'first',
        branch: 'main',
        commit_id: null,
        timestamp: 1,
        action: 'View',
      },
      {
        event_id: 'e2',
        actor: 'Bo',
        type: 'commit',
        description: 'second',
        branch: 'main',
        commit_id: 'commit-1',
        timestamp: 2,
        action: 'Merge',
      },
    ])
    expect(rows.map((row) => row.activity)).toEqual(['second', 'first'])
    // A push row carries no commit, so its action word is inert.
    expect(rows[1].commitId).toBe('')
    expect(rows[0].commitId).toBe('commit-1')
  })
})

describe('toArchiveRows', () => {
  it('prefixes the project name onto the bare label the API returns', () => {
    const rows = toArchiveRows(
      [{ version_label: 'V6', pushed_by: 'Ada', time: 1_785_000_000, action: 'Applied' }],
      'Orchid Lab',
    )
    expect(rows[0].version).toBe('Orchid Lab V6')
    // The bare label is kept alongside, because that is what Undo posts.
    expect(rows[0].versionLabel).toBe('V6')
  })
})

describe('iconForFile', () => {
  it('chooses the glyph from the extension, and falls back for anything else', () => {
    expect(iconForFile('ContentView.swift').icon).toBe('swift')
    expect(iconForFile('README.md').icon).toBe('book-md')
    expect(iconForFile('TableContent.css').icon).toBe('file')
    expect(iconForFile('no extension at all').icon).toBe('file')
  })
})

describe('avatarFor', () => {
  it('returns undefined for a name the design never drew a face for', () => {
    expect(avatarFor('Oliver')).toBe('oliver')
    expect(avatarFor('Somebody Else')).toBeUndefined()
  })
})

describe('toPaneEntries', () => {
  const team = [
    { name: 'Oliver', role: 'owner' as const },
    { name: 'Juliana', role: 'contributor' as const },
  ]

  const commitRow: MemberActivityDto = {
    event_id: 'e1',
    type: 'commit',
    description: 'Committed refined ContentView.js v2.1',
    comment: 'refined ContentView.js v2.1',
    branch: 'main',
    commit_id: 'commit-9',
    timestamp: 1_785_000_000,
    files: ['src/ContentView.js', 'src/TableContent.css'],
    status: 'pending',
    flagged: false,
    diff: { added: 45, removed: 0 },
  }

  it('titles a commit by the files it changed, not by its message', () => {
    const [entry] = toPaneEntries([commitRow], 'Oliver', team, 'Orchid Lab')
    expect(entry.title).toBe('ContentView.js, TableContent.css')
    // The message travels alongside, to be read under the file preview.
    expect(entry.comment).toBe('refined ContentView.js v2.1')
    expect(entry.commitId).toBe('commit-9')
    expect(entry.status).toBe('pending')
  })

  it('falls back to the comment when a commit named no path', () => {
    const [entry] = toPaneEntries(
      [{ ...commitRow, files: [] }],
      'Oliver',
      team,
      'Orchid Lab',
    )
    expect(entry.title).toBe('refined ContentView.js v2.1')
  })

  it('titles a push by the project at the version it produced', () => {
    const [entry] = toPaneEntries(
      [
        {
          event_id: 'e2',
          type: 'push',
          description: 'Pushed Orchid Lab V3 to main',
          comment: 'Orchid Lab V3',
          branch: 'main',
          commit_id: null,
          timestamp: 1_785_000_000,
          version_label: 'V3',
        },
      ],
      'Oliver',
      team,
      'Orchid Lab',
    )
    expect(entry.title).toBe('Orchid Lab V3')
    // The subtitle is what selects the taller row shape.
    expect(entry.subtitle).toBe('Preview')
    expect(entry.commitId).toBeUndefined()
  })

  it('leaves the author out of the face stack beside their own row', () => {
    const [entry] = toPaneEntries([commitRow], 'Oliver', team, 'Orchid Lab')
    expect(entry.avatars).toEqual(['juliana'])
  })
})
