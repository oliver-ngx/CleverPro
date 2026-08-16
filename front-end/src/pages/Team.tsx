import { ActionComposer } from '../components/team/ActionComposer'
import { VersionDetail } from '../components/team/VersionDetail'
import { VersionToolbar } from '../components/team/VersionToolbar'
import { DiffStat } from '../components/ui/DiffStat'
import { VersionRow } from '../components/ui/VersionRow'
import type { PaneEntry, TeamMember } from '../data/compiler'
import { TEAM_PANES } from '../data/compiler'

interface TeamProps {
  person: TeamMember
  /** The open version, if the pane is split. */
  version?: PaneEntry
  /** Selecting the open version again closes it. */
  onSelectVersion: (entry: PaneEntry) => void
  /** The Action window, which only your own pane has. */
  actionOpen: boolean
  onCloseAction: () => void
  branch: string
  branches: string[]
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
  version,
  onSelectVersion,
  actionOpen,
  onCloseAction,
  branch,
  branches,
  onSelectBranch,
}: TeamProps) {
  const entries = TEAM_PANES[person.id]
  const split = version !== undefined
  // The rail spells your own name "Oliver (You)"; a byline should not.
  const [author] = person.name.split(' (')

  return (
    <>
      <div className="flex min-h-0 flex-1">
        {/* Padding and spacing are identical in both states on purpose: the only
            thing that may change here is the column's width. */}
        <div
          className={`flex shrink-0 flex-col gap-[9px] overflow-x-hidden overflow-y-auto px-[16px] pt-[20px] pb-[35px] md:pt-[27px] md:pr-[25px] md:pl-[22px] ${
            split ? 'w-[420px] @max-[860px]:hidden' : 'w-full'
          }`}
        >
          {entries.map((entry) => (
            <VersionRow
              key={entry.title}
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
        className={`absolute inset-y-0 right-0 left-[420px] z-10 flex flex-col border-l border-cp-hairline bg-cp-window @max-[860px]:top-[41px] @max-[860px]:left-0 @max-[860px]:border-l-0 ${
          split ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Shut, the panel is merely parked off the edge — it would still take tab
            stops without `inert`, the same trap the collapsed rail has. */}
        <div inert={!split} className="flex min-h-0 flex-1 flex-col">
          <div className="flex h-[41px] shrink-0 items-start justify-between gap-[12px] pt-[15px] pr-[17px] pl-[29px]">
            <VersionToolbar
              onClose={() => {
                if (version !== undefined) onSelectVersion(version)
              }}
            />
          </div>
          {version !== undefined && <VersionDetail entry={version} author={author} />}
        </div>
      </div>

      {/* Above the panel: the window covers the whole pane, not one half of it. */}
      {actionOpen && (
        <ActionComposer
          branch={branch}
          branches={branches}
          onSelectBranch={onSelectBranch}
          onDismiss={onCloseAction}
        />
      )}
    </>
  )
}
