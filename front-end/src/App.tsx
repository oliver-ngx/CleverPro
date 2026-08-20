import type { ReactNode } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { toProject, toTeam } from './api/adapters'
import { api } from './api/client'
import { AppWindow } from './components/layout/AppWindow'
import { MobileNav } from './components/layout/MobileNav'
import { PageHeader } from './components/layout/PageHeader'
import { Sidebar } from './components/layout/Sidebar'
import { MemberMenu } from './components/team/MemberMenu'
import { Avatar } from './components/ui/Avatar'
import type { IconName } from './components/ui/Icon'
import { CURRENT_USER } from './config'
import type { PageLabel } from './data/navigation'
import { NAV_ITEMS } from './data/navigation'
import type { PaneEntry, TeamMember } from './data/team'
import { useAction } from './hooks/useAction'
import { useOverlayDismiss } from './hooks/useOverlayDismiss'
import { useResource } from './hooks/useResource'
import Activity from './pages/Activity'
import Archive from './pages/Archive'
import Main from './pages/Main'
import Settings from './pages/Settings'
import Team from './pages/Team'

/** The rail selects one of two things, so the open view is one of two things. */
type View = { kind: 'page'; label: PageLabel } | { kind: 'person'; person: TeamMember }

/** What the header wears for a given view. */
interface HeaderContent {
  title: ReactNode
  /** Shown before the title. Only a teammate's pane has one. */
  leading?: ReactNode
  actions: IconName[]
}

/**
 * The header changes with the view: a teammate's pane leads with their face and
 * carries a different set of toolbar actions, and your own pane sets the "(You)"
 * after your name in a lighter weight the way the source does.
 *
 * `actionOpen` reaches in because the leading glyph on a Self pane is the Action
 * window's switch, and the frame swaps it while the window is up.
 */
function headerFor(view: View, actionOpen: boolean): HeaderContent {
  if (view.kind === 'page') {
    return { title: view.label, actions: ['at-sign', 'ellipsis'] }
  }

  const { person } = view

  if (person.self !== true) {
    return {
      title: person.name,
      leading: <Avatar person={person.id} size={28} />,
      actions: ['filter', 'ellipsis'],
    }
  }

  // "Oliver (You)" — the name semibold, the parenthetical regular.
  const [name] = person.name.split(' (')
  return {
    title: (
      <>
        {name} <span className="font-normal">(You)</span>
      </>
    ),
    actions: [actionOpen ? 'close' : 'archive-in', 'filter', 'ellipsis'],
  }
}

/**
 * The window and its rail, with one view inside. The rail's nav items open a page;
 * its teammates open that person's pane, which is why the view is a union rather
 * than a single label.
 *
 * Branches live here rather than on Main because two screens choose from the same
 * list — Main's detail row and the Action window on your own pane.
 */
function App() {
  const [view, setView] = useState<View>({ kind: 'page', label: 'Main' })
  const [actionOpen, setActionOpen] = useState(false)
  const [version, setVersion] = useState<PaneEntry | undefined>(undefined)
  // The overflow glyph on a teammate's pane, which is where role changes and
  // removals live -- the product has no roster screen, so administration hangs
  // off the person it affects.
  const [memberMenuOpen, setMemberMenuOpen] = useState(false)
  const administer = useAction()

  // One overview call serves three things — the project card, the branch list
  // and the Archive table's version prefix — so it is fetched once up here
  // rather than three times down there.
  const overview = useResource((signal) => api.overview(signal), [])
  const members = useResource((signal) => api.team(signal), [])

  const project = useMemo(
    () =>
      overview.data === undefined
        ? { name: 'Compiler', version: '', deployHost: null, previewSrc: null }
        : toProject(overview.data),
    [overview.data],
  )
  const team = useMemo(
    () => (members.data === undefined ? [] : toTeam(members.data, CURRENT_USER)),
    [members.data],
  )

  // The server owns the branch list outright now: creating one POSTs, which
  // bumps the revision counter, which refetches this. Nothing is layered on
  // top locally, so what is on screen is what exists.
  const branches = useMemo(
    () => (overview.data?.branches ?? []).map((entry) => entry.name),
    [overview.data],
  )

  // Held as a name rather than an index so it survives the list arriving, and
  // falls back to whatever is first until it does.
  const [selectedBranch, setSelectedBranch] = useState<string | undefined>(undefined)
  const branch = selectedBranch ?? (branches.length > 0 ? branches[0] : 'main')

  // The label of what the branch currently holds. The Action window attaches
  // this by name and the server resolves it to the real snapshot, so a branch
  // nothing has been pushed to genuinely has nothing whole to send.
  const versionLabel =
    (overview.data?.branches ?? []).find((entry) => entry.name === branch)?.latest_version ??
    undefined

  const { title, leading, actions } = headerFor(view, actionOpen)

  // Every overlay belongs to the pane it was opened from, so leaving takes them
  // with you rather than dropping them onto whatever comes next.
  const show = (next: View) => {
    setView(next)
    setActionOpen(false)
    setVersion(undefined)
    setMemberMenuOpen(false)
  }

  const closeMemberMenu = useCallback(() => {
    setMemberMenuOpen(false)
  }, [])

  // Escape shuts it, as it shuts everything else in the product.
  useOverlayDismiss(closeMemberMenu, memberMenuOpen)

  // Who is signed in, and whose pane is open. Both are needed before the menu
  // can say what this member is allowed to do to that one.
  const viewerRole = (members.data ?? []).find((member) => member.name === CURRENT_USER)?.role
  const subject =
    view.kind === 'person'
      ? (members.data ?? []).find((member) => member.name === view.person.name.split(' (')[0])
      : undefined

  // Keyed by label rather than switched on, so adding a nav item without a screen to
  // open is a type error rather than a rail entry that does nothing. Only the element
  // the rail has selected is ever rendered; the rest are unbuilt descriptions.
  const pages: Record<PageLabel, ReactNode> = {
    Main: (
      <Main
        project={project}
        members={members.data ?? []}
        branch={branch}
        branches={branches}
        onSelectBranch={setSelectedBranch}
      />
    ),
    Activity: <Activity />,
    Archive: <Archive projectName={project.name} />,
    Settings: <Settings projectName={project.name} />,
  }

  // The rail and the phone's tab bar are two drawings of one thing, so they are handed
  // the same selection and the same handlers; only one of them is ever on screen.
  const navigation = {
    navItems: NAV_ITEMS,
    activeNav: view.kind === 'page' ? view.label : undefined,
    onSelectNav: (label: PageLabel) => {
      show({ kind: 'page', label })
    },
    team,
    activePerson: view.kind === 'person' ? view.person.id : undefined,
    onSelectPerson: (selected: TeamMember) => {
      show({ kind: 'person', person: selected })
    },
  }

  return (
    <AppWindow>
      <Sidebar title={project.name} {...navigation} />

      {/*
        `relative` so a view's overlay covers this pane and not the rail beside it,
        and a container so the split view can ask how much room the pane itself has.
        The viewport cannot answer that: the rail beside it takes 299px the window's
        own width says nothing about.

        `min-h-0` because on a phone this is a row in a column, above the tab bar —
        without it the pane would grow to fit its content and push the bar off screen
        instead of scrolling inside itself.
      */}
      <div className="@container relative flex min-h-0 min-w-0 flex-1 flex-col">
        <PageHeader
          title={title}
          leading={leading}
          actions={actions}
          onAction={(icon) => {
            if (icon === 'archive-in' || icon === 'close') setActionOpen(icon === 'archive-in')
            if (icon === 'ellipsis' && view.kind === 'person') {
              setMemberMenuOpen((open) => !open)
            }
          }}
          menu={
            memberMenuOpen && view.kind === 'person' && subject !== undefined ? (
              <MemberMenu
                name={subject.name}
                role={subject.role}
                viewerRole={viewerRole}
                self={view.person.self === true}
                pending={administer.pending}
                onSetRole={(next) => {
                  administer.run(
                    () =>
                      next === 'maintainer'
                        ? api.grantMaintainer(subject.name)
                        : api.revokeMaintainer(subject.name),
                    closeMemberMenu,
                  )
                }}
                onRemove={() => {
                  administer.run(() => api.removeMember(subject.name), () => {
                    // Their pane is gone along with them, so there is nowhere
                    // to stay -- the project opens where it opened.
                    show({ kind: 'page', label: 'Main' })
                  })
                }}
              />
            ) : undefined
          }
          split={version !== undefined}
        />

        {administer.error !== undefined && (
          <div
            role="alert"
            className="shrink-0 px-[22px] pt-[8px] text-[11px] font-medium text-cp-text-primary"
          >
            {administer.error}
          </div>
        )}
        {view.kind === 'person' ? (
          <Team
            person={view.person}
            members={members.data ?? []}
            projectName={project.name}
            version={version}
            onSelectVersion={(entry) => {
              // The row is a switch: picking the open one shuts the detail again.
              setVersion((current) => (current === entry ? undefined : entry))
            }}
            actionOpen={actionOpen && view.person.self === true}
            onCloseAction={() => {
              setActionOpen(false)
            }}
            branch={branch}
            branches={branches}
            versionLabel={versionLabel}
            onSelectBranch={setSelectedBranch}
          />
        ) : (
          pages[view.label]
        )}
      </div>

      <MobileNav {...navigation} />
    </AppWindow>
  )
}

export default App
