import { useMemo, useRef, useState } from 'react'
import { toPaneEntries } from '../api/adapters'
import { api } from '../api/client'
import { ActionComposer } from '../components/team/ActionComposer'
import { VersionDetail } from '../components/team/VersionDetail'
import { VersionToolbar } from '../components/team/VersionToolbar'
import { DiffStat } from '../components/ui/DiffStat'
import { ResourceState } from '../components/ui/ResourceState'
import { VersionRow } from '../components/ui/VersionRow'
import type { MemberDto } from '../api/types'
import type { PaneEntry, TeamMember } from '../data/team'
import { useAction } from '../hooks/useAction'
import { usePresence } from '../hooks/usePresence'
import { useResource } from '../hooks/useResource'
import { SHEET_EXIT_MS } from '../lib/motion'

interface TeamProps {
  person: TeamMember
  /** Row face stacks (see toPaneEntries) and the composer's recipient list. */
  members: MemberDto[]
  /** The Action window labels its project tile with this, and a push row is
   *  titled by it -- a push promotes the whole project, not one file. */
  projectName: string
  /** The open version, if the pane is split. */
  version?: PaneEntry
  /** Selecting the open version again closes it. */
  onSelectVersion: (entry: PaneEntry) => void
  /** The Action window, which only your own pane has. */
  actionOpen: boolean
  onCloseAction: () => void
  branch: string
  branches: string[]
  /** The branch's current version label, which the Action window can attach whole. */
  versionLabel?: string
  onSelectBranch: (branch: string) => void
}

/**
 * A teammate's pane. There are only two of these in the source and the difference
 * is the shape of the row, not the page: your own pane lists versions of the project
 * as tall rows with a Preview line, while everyone else's lists commits to one source
 * file as capsules carrying a diff stat. `VersionRow` covers both, so this is one
 * component either way.
 *
 * Opening one of those rows splits the pane. The source only draws this for a
 * teammate's pane, but your own history opens the same way — the frames are a sample
 * of the product rather than a list of everything it does.
 *
 * The editor and its toolbar are a single layer, laid out where they will finally
 * sit and pushed off the right edge when shut. Nothing inside is ever resized, so the
 * code is laid out once rather than re-wrapping as the pane changes shape.
 *
 * The history gives up width and nothing else. The `Team/Others/View` frame redraws
 * its rows at 26px for the split, and that is deliberately not followed — the user
 * asked for a purely horizontal shrink, so row heights, padding, glyphs and faces all
 * stay exactly as they are and only the column narrows.
 *
 * A pane narrower than 860px has no room for two columns, so the editor covers the
 * body outright and the history steps aside until the close button brings it back.
 * That threshold is measured against the pane rather than the window, because
 * collapsing the rail gives this screen 299px more to work with. The design system
 * defines no responsive behaviour, so this is the screen's own reduced layout.
 */
export default function Team({
  person,
  members,
  projectName,
  version,
  onSelectVersion,
  actionOpen,
  onCloseAction,
  branch,
  branches,
  versionLabel,
  onSelectBranch,
}: TeamProps) {
  // `person.name` carries the "(You)" suffix the rail draws; the API knows
  // the member by their bare name, so the byline below is also what we ask for.
  const [author] = person.name.split(' (')
  const history = useResource((signal) => api.memberActivity(author, signal), [author])
  const entries = useMemo(
    () =>
      history.data === undefined
        ? []
        : toPaneEntries(history.data, author, members, projectName),
    [history.data, author, members, projectName],
  )
  const split = version !== undefined
  // Closing clears the selection at once, but the panel needs 300ms to get off the
  // pane. Held here, the last version stays on screen until the panel has gone;
  // without it the editor would blank out first and an empty white panel would
  // slide away after it.
  const [shownVersion, setShownVersion] = useState(version)
  if (version !== undefined && version !== shownVersion) setShownVersion(version)
  const composerPresent = usePresence(actionOpen, SHEET_EXIT_MS)

  // The version toolbar's actions. They all act on the open commit, so they are
  // owned here rather than in the toolbar: the toolbar draws the row and decides
  // which glyphs are live, this decides what they do.
  const act = useAction()
  const noteRef = useRef<HTMLInputElement>(null)
  const mine = person.self === true
  const openCommit =
    shownVersion?.commitId === undefined
      ? undefined
      : {
          id: shownVersion.commitId,
          ...(shownVersion.status === undefined ? {} : { status: shownVersion.status }),
          ...(shownVersion.flagged === undefined ? {} : { flagged: shownVersion.flagged }),
        }

  return (
    <>
      <div className="flex min-h-0 flex-1">
        {/* Padding and spacing are identical in both states on purpose: the only
            thing that may change here is the column's width. */}
        <div
          key={person.id}
          className={`flex shrink-0 flex-col gap-[9px] overflow-x-hidden overflow-y-auto px-[16px] pt-[20px] pb-[35px] animate-cp-page-in transition-[width] duration-300 ease-cp motion-reduce:animate-none motion-reduce:transition-none md:pt-[27px] md:pr-[25px] md:pl-[22px] ${
            split ? 'w-[420px] @max-[860px]:hidden' : 'w-full'
          }`}
        >
          <ResourceState
            loading={history.loading}
            error={history.error}
            empty="No commits or pushes from this teammate yet."
            emptyWhen={entries.length === 0}
          />
          {entries.map((entry) => (
            <VersionRow
              key={entry.id}
              icon={entry.icon}
              iconSize={entry.iconSize}
              title={entry.title}
              subtitle={entry.subtitle}
              avatars={entry.avatars}
              selected={entry === version}
              onClick={() => {
                onSelectVersion(entry)
              }}
              meta={
                entry.diff && <DiffStat added={entry.diff.added} removed={entry.diff.removed} />
              }
            />
          ))}
        </div>
      </div>

      {/* Below 860 the panel starts under the header (15px of padding above a
          26px pill) so the title and the rail's toggle stay reachable.
          The divider is this layer's own left border, so it arrives with the panel
          instead of being chased into place separately. The window clips whatever
          hangs off the right, which is where this sits when it is shut. */}
      <div
        className={`absolute inset-y-0 right-0 left-[420px] z-10 flex flex-col border-l border-cp-hairline bg-cp-window transition-transform duration-300 ease-cp motion-reduce:transition-none @max-[860px]:top-[41px] @max-[860px]:left-0 @max-[860px]:border-l-0 ${
          split ? '[transform:translateX(0)]' : '[transform:translateX(100%)]'
        }`}
      >
        {/* Shut, the panel is merely parked off the edge — it would still take tab
            stops without `inert`, the same trap the collapsed rail has. */}
        <div inert={!split} className="flex min-h-0 flex-1 flex-col">
          <div className="flex h-[41px] shrink-0 items-start justify-between gap-[12px] pt-[15px] pr-[14px] pl-[16px] md:pr-[17px] md:pl-[29px]">
            <VersionToolbar
              onClose={() => {
                if (version !== undefined) onSelectVersion(version)
              }}
              commit={openCommit}
              mine={mine}
              pending={act.pending}
              onRetract={() => {
                if (openCommit !== undefined) act.run(() => api.retract(openCommit.id))
              }}
              onMerge={() => {
                if (openCommit !== undefined) act.run(() => api.merge(openCommit.id))
              }}
              onPush={() => {
                if (openCommit !== undefined) act.run(() => api.pushCommit(openCommit.id))
              }}
              onFlag={() => {
                if (openCommit !== undefined) {
                  act.run(() => api.flagCommit(openCommit.id, openCommit.flagged !== true))
                }
              }}
              onComment={() => {
                noteRef.current?.focus()
              }}
            />
          </div>

          {act.error !== undefined && (
            <div
              role="alert"
              className="shrink-0 px-[16px] pb-[8px] text-[11px] font-medium text-cp-text-primary md:px-[29px]"
            >
              {act.error}
            </div>
          )}
          {shownVersion !== undefined && (
            <VersionDetail entry={shownVersion} author={author} noteRef={noteRef} />
          )}
        </div>
      </div>

      {/* Above the panel: the window covers the whole pane, not one half of it. */}
      {composerPresent && (
        <ActionComposer
          closing={!actionOpen}
          projectName={projectName}
          members={members}
          branch={branch}
          branches={branches}
          versionLabel={versionLabel}
          onSelectBranch={onSelectBranch}
          onDismiss={onCloseAction}
        />
      )}
    </>
  )
}
