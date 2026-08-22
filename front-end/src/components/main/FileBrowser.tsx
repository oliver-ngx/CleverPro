import { useMemo, useState } from 'react'
import { api } from '../../api/client'
import type { ProjectFile } from '../../data/project'
import { useOverlayDismiss } from '../../hooks/useOverlayDismiss'
import { useResource } from '../../hooks/useResource'
import { highlight } from '../../lib/highlight'
import { CodeLines } from '../ui/CodeLines'
import { IconButton } from '../ui/IconButton'
import { BrowserTree } from './BrowserTree'

interface FileBrowserProps {
  projectName: string
  branch: string
  /** The version whose contents are being read. Absent on a branch never pushed to. */
  versionLabel?: string
  files: ProjectFile[]
  /** Escape closes it; the header pill's cross is the drawn way out. */
  onDismiss: () => void
  /** True while the exit is running, after which the page unmounts it. */
  closing?: boolean
}

/**
 * The file structure, opened out: the project's tree down the left and the file it
 * has selected previewed on the right.
 *
 * Transcribed from `Main File Tree Expanded` (Figma node 125:449). The frame is a
 * 1459x1131 card on the 2204 source, split by a vertical rule at a 251px column, with
 * the project's name and branch heading the tree and the open file's name heading the
 * code. Scaled at 1400/2204 those are a 159px column under a 46px header band, which
 * is what the layout below is.
 *
 * **What it covers.** The frame draws this filling the content pane with the rail
 * still beside it, so it is a layer over the pane rather than a sheet over the app —
 * no scrim, no blur, no dimming of anything. It is `absolute inset-0` inside the
 * pane, which is exactly the box `Sheet` uses for the same reason.
 *
 * **What it does not cover.** The frame keeps the window's header bar — the view's
 * title and its pill — above the card, and swaps that pill's leading glyph for a
 * close cross while this is open. So the browser is positioned against the body area
 * rather than the pane, and the state that opens it lives in `App`, which is what
 * owns the pill. Escape closes it too, as it closes everything here.
 *
 * **Its own toolbar** is the four glyphs the frame draws at the code pane's top
 * right. They are inert, like most of the version view's toolbar: the source draws
 * them and defines no behaviour for any of them.
 *
 * **Reading a file.** Content is fetched per selection rather than with the tree —
 * the tree endpoint returns paths, and a project of any size would be pointless to
 * send whole for the sake of the one file being looked at. Each request is keyed by
 * path, so re-opening a file already read is served from the client cache without a
 * round trip.
 */
export function FileBrowser({
  projectName,
  branch,
  versionLabel,
  files,
  onDismiss,
  closing = false,
}: FileBrowserProps) {
  // Not while it is leaving: a browser mid-exit has nothing left to close, and the
  // listener it kept would swallow the Escape meant for whatever is underneath.
  useOverlayDismiss(onDismiss, !closing)

  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())
  const [selected, setSelected] = useState<string | undefined>(undefined)

  const file = useResource(
    (signal) =>
      selected === undefined || versionLabel === undefined
        ? Promise.resolve(undefined)
        : api.fileContent(branch, versionLabel, selected, signal),
    [branch, versionLabel, selected],
  )

  // Tokenised once per file rather than per render: this walks every line of the
  // text, and nothing about it changes while the same file is open.
  const lines = useMemo(
    () => (file.data === undefined ? [] : highlight(file.data.content)),
    [file.data],
  )

  const toggleFolder = (path: string) => {
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  return (
    // The whole layer moves, card and padding together, so the browser grows out of
    // the page rather than the card sliding around inside a box already at full size.
    <div
      inert={closing}
      className={`absolute inset-0 z-10 flex flex-col p-[16px] motion-reduce:animate-none md:px-[30px] md:pt-[10px] md:pb-[35px] ${
        closing ? 'animate-cp-browser-out' : 'animate-cp-browser-in'
      }`}
    >
      {/* The same #EFEFEF and the same 30 radius as the detail card and the version
          panel underneath it, so opening the file structure reads as that card
          growing rather than as a different surface arriving over it. The frame
          draws this white; the user asked for it to match the page's own cards. */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-cp-panel bg-cp-card">
        {/* The tree column. It scrolls on its own, because a deep project outruns the
            card long before the file beside it does. */}
        <div className="flex w-[159px] shrink-0 flex-col overflow-auto border-r border-cp-hairline px-[14px] pt-[21px] pb-[20px]">
          {/* The frame sets the name's top 33 below the card and the branch's 24
              under that, with the first tree row 98 down — 21, 15 and 62 at this
              scale, which is what these three boxes add up to. */}
          <div className="h-[16px] shrink-0 px-[8px] text-[13px]/[16px] font-medium text-cp-text-primary">
            {projectName}
          </div>
          <div className="mt-[4px] mb-[8px] h-[13px] shrink-0 px-[8px] text-[11px]/[13px] font-medium text-cp-text-tertiary">
            {branch}
          </div>

          <BrowserTree
            files={files}
            open={open}
            onToggleFolder={toggleFolder}
            selected={selected}
            onSelectFile={setSelected}
          />
        </div>

        {/* The code pane. Its header carries the open file's name and sits above a
            rule that runs the full width of the pane, as the frame draws it. */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* 46px deep and ruled underneath, with the filename 15 in from the
              divider — the frame's 72 and 24 on the 2204 source. */}
          <div className="flex h-[46px] shrink-0 items-center gap-[12px] border-b border-cp-hairline pr-[18px] pl-[15px]">
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-cp-text-primary">
              {selected ?? 'Select a file'}
            </span>

            {/* Drawn because the source draws them, and inert for the same reason
                most of the version view's toolbar is.

                The four are `commit`, `merge`, `export` and `ellipsis`, which is
                what the frame's own exports turn out to be: its 20x17 arrow is
                `export`'s viewBox exactly, and its two branching glyphs are the pair
                the version toolbar already labels Forward and Merge. `merge` carries
                `-scale-x-100` because the frame mirrors it.

                Sizes are per-symbol, as everywhere else in this design, and taken
                from the frame's own boxes: the three arrows land on 11px tall and
                the ellipsis on 3. */}
            <IconButton
              icon="commit"
              label="Forward"
              iconClassName="h-[11px] w-[15px] opacity-40"
            />
            <IconButton
              icon="merge"
              label="Merge"
              iconClassName="h-[11px] w-[16px] -scale-x-100 opacity-40"
            />
            <IconButton
              icon="export"
              label="Export"
              iconClassName="h-[11px] w-[13px] opacity-40"
            />
            <IconButton
              icon="ellipsis"
              label="More actions"
              iconClassName="h-[3px] w-[12px] opacity-40"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-auto pt-[23px] pr-[18px] pb-[20px] pl-[15px]">
            {versionLabel === undefined ? (
              <p className="text-[11px] font-normal text-cp-text-tertiary">
                Nothing has been pushed to {branch} yet, so there is no version to read.
              </p>
            ) : selected === undefined ? (
              <p className="text-[11px] font-normal text-cp-text-tertiary">
                Pick a file from the tree to preview it.
              </p>
            ) : file.loading ? (
              <p className="text-[11px] font-normal text-cp-text-tertiary">Reading…</p>
            ) : file.error !== undefined ? (
              <p role="alert" className="text-[11px] font-medium text-cp-text-primary">
                {file.error}
              </p>
            ) : (
              <CodeLines lines={lines} />
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
