import { useMemo, useState } from 'react'
import { filesFromPaths, iconForFile, toFiles } from '../../api/adapters'
import { api } from '../../api/client'
import type { PaneEntry } from '../../data/team'
import { useResource } from '../../hooks/useResource'
import { highlight } from '../../lib/highlight'
import { CodeViewer } from '../ui/CodeViewer'
import { BrowserTree } from '../main/BrowserTree'

interface VersionFilesProps {
  entry: PaneEntry
  /** The branch's current version, which is where a commit's paths are readable. */
  fallbackVersion?: string
}

/**
 * What a history row opens onto: its structure first, and a file's contents only once
 * one has been picked.
 *
 * A row is one of two things and the source only ever drew the first. A **commit**
 * naming a single file is a file, and opens straight into the viewer as it always
 * has. Anything else — a push, which is a whole version, or a commit touching several
 * files — is a *structure*, and opening it onto one arbitrary file's contents would
 * be picking one at random and calling it the version. So those open onto the tree,
 * and the viewer appears under it when a file is chosen.
 *
 * **Where the contents come from.** A push names the version it produced, so its
 * files are read at that label exactly. A commit names none — it is a proposal, and
 * the API stores content per *version* — so its paths are read at the branch's
 * current version, which is the nearest thing that exists. A path the commit changed
 * but that is not in that version reads as missing rather than as empty, which is
 * the honest answer: the content genuinely is not retrievable.
 *
 * This is also what retires the fixture. The viewer's body used to be
 * `VERSION_SOURCE` on every row, because reaching real content needed a branch and a
 * version label that a ledger row did not carry. It carries both now.
 */
export function VersionFiles({ entry, fallbackVersion }: VersionFilesProps) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())
  const [selected, setSelected] = useState<string | undefined>(undefined)

  // Joined into one string so it can be a dependency: the array is rebuilt on
  // every render, its contents are not.
  const pathKey = (entry.files ?? []).join('\u0000')
  // A push is a whole tree; a commit is a set of paths. Only the first has a tree to
  // ask the server for.
  const wholeVersion = entry.versionLabel !== undefined
  const label = entry.versionLabel ?? fallbackVersion
  const branch = entry.branch

  const tree = useResource(
    (signal) =>
      wholeVersion && branch !== undefined && entry.versionLabel !== undefined
        ? api.versionFiles(branch, entry.versionLabel, signal)
        : Promise.resolve(undefined),
    [wholeVersion, branch, entry.versionLabel],
  )

  const files = useMemo(
    () =>
      tree.data === undefined
        ? filesFromPaths(pathKey === '' ? [] : pathKey.split('\u0000'))
        : toFiles(tree.data),
    [tree.data, pathKey],
  )

  const file = useResource(
    (signal) =>
      selected === undefined || branch === undefined || label === undefined
        ? Promise.resolve(undefined)
        : api.fileContent(branch, label, selected, signal),
    [branch, label, selected],
  )

  const lines = useMemo(
    () => (file.data === undefined ? [] : highlight(file.data.content)),
    [file.data],
  )

  return (
    <div className="flex shrink-0 flex-col gap-[13px]">
      <div className="rounded-cs-code bg-cs-field px-[10px] pt-[10px] pb-[12px]">
        {tree.loading ? (
          <span className="text-[11px] font-normal text-cs-text-tertiary">Reading…</span>
        ) : files.length === 0 ? (
          <span className="text-[11px] font-normal text-cs-text-tertiary">
            This version names no files.
          </span>
        ) : (
          <BrowserTree
            files={files}
            open={open}
            onToggleFolder={(path) => {
              setOpen((current) => {
                const next = new Set(current)
                if (next.has(path)) next.delete(path)
                else next.add(path)
                return next
              })
            }}
            selected={selected}
            onSelectFile={setSelected}
          />
        )}
      </div>

      {selected !== undefined && (
        <div className="flex h-[380px] shrink-0">
          {file.error !== undefined ? (
            <p role="alert" className="text-[11px] font-medium text-cs-text-primary">
              {file.error}
            </p>
          ) : (
            <CodeViewer
              filename={selected}
              icon={iconForFile(selected).icon}
              lines={file.loading ? [] : lines}
            />
          )}
        </div>
      )}
    </div>
  )
}
