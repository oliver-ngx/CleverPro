import { useState } from 'react'
import { AppWindow } from './components/layout/AppWindow'
import { PageHeader } from './components/layout/PageHeader'
import { Sidebar } from './components/layout/Sidebar'
import { Avatar } from './components/ui/Avatar'
import type { IconName } from './components/ui/Icon'
import type { PaneEntry, TeamMember } from './data/compiler'
import { BRANCHES, NAV_ITEMS, TEAM } from './data/compiler'
import { useResponsiveSidebar } from './hooks/useResponsiveSidebar'
import Activity from './pages/Activity'
import Archive from './pages/Archive'
import Main from './pages/Main'
import Settings from './pages/Settings'
import Team from './pages/Team'

/** The rail selects one of two things, so the open view is one of two things. */
type View = { kind: 'page'; label: string } | { kind: 'person'; person: TeamMember }

/**
 * The window and its rail, with one view inside. The rail's nav items open a page;
 * its teammates open that person's pane, which is why the view is a union rather
 * than a single label.
 *
 * The header changes with the view too: a teammate's pane leads with their face and
 * carries a different set of toolbar actions, and your own pane sets the "(You)"
 * after your name in a lighter weight the way the source does.
 *
 * Branches live here rather than on Main because two screens choose from the same
 * list — Main's detail row and the Action window on your own pane.
 */
function App() {
  const [view, setView] = useState<View>({ kind: 'page', label: 'Main' })
  const [actionOpen, setActionOpen] = useState(false)
  const [version, setVersion] = useState<PaneEntry | undefined>(undefined)
  const [branches, setBranches] = useState<string[]>(BRANCHES)
  const [branch, setBranch] = useState(BRANCHES[0])
  const { open: sidebarOpen, toggle: toggleSidebar, dismissOnMobile } = useResponsiveSidebar()

  const person = view.kind === 'person' ? view.person : undefined

  // A new branch is switched to as soon as it exists — the reason to make one is to
  // work in it, and the source moves the selection too.
  const addBranch = (name: string) => {
    setBranches((current) => [...current, name])
    setBranch(name)
  }

  // Both overlays belong to the pane they were opened from, so leaving takes them
  // with you rather than dropping them onto whatever comes next.
  const show = (next: View) => {
    setView(next)
    setActionOpen(false)
    setVersion(undefined)
    dismissOnMobile()
  }

  let title: React.ReactNode = view.kind === 'page' ? view.label : person?.name
  let leading: React.ReactNode
  let actions: IconName[] = ['at-sign', 'ellipsis']

  if (person !== undefined) {
    if (person.self === true) {
      // "Oliver (You)" — the name semibold, the parenthetical regular.
      const [name] = person.name.split(' (')
      title = (
        <>
          {name} <span className="font-normal">(You)</span>
        </>
      )
      // The leading glyph is the Action window's switch, and the frame swaps it
      // while the window is up.
      actions = [actionOpen ? 'close' : 'archive-in', 'filter', 'ellipsis']
    } else {
      leading = <Avatar person={person.id} size={28} />
      actions = ['filter', 'ellipsis']
    }
  }

  return (
    <AppWindow>
      <Sidebar
        title="Compiler"
        navItems={NAV_ITEMS}
        activeNav={view.kind === 'page' ? view.label : ''}
        onSelectNav={(label) => {
          show({ kind: 'page', label })
        }}
        team={TEAM}
        activePerson={person?.id}
        onSelectPerson={(selected) => {
          show({ kind: 'person', person: selected })
        }}
        open={sidebarOpen}
        onToggle={toggleSidebar}
      />

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={toggleSidebar}
          className="absolute inset-0 z-20 cursor-default border-none bg-black/20 p-0 md:hidden"
        />
      )}

      {/*
        `relative` so a view's overlay covers this pane and not the rail beside it,
        and a container so the split view can ask how much room the pane itself has.
        The viewport cannot answer that: collapsing the rail widens the pane by 299px
        without the window changing size at all.
      */}
      <div className="@container relative flex min-w-0 flex-1 flex-col">
        <PageHeader
          title={title}
          leading={leading}
          actions={actions}
          onAction={(icon) => {
            if (icon === 'archive-in' || icon === 'close') setActionOpen(icon === 'archive-in')
          }}
          split={version !== undefined}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
        />
        {person !== undefined && (
          <Team
            person={person}
            version={version}
            onSelectVersion={(entry) => {
              // The row is a switch: picking the open one shuts the detail again.
              setVersion((current) => (current === entry ? undefined : entry))
            }}
            actionOpen={actionOpen && person.self === true}
            onCloseAction={() => {
              setActionOpen(false)
            }}
            branch={branch}
            branches={branches}
            onSelectBranch={setBranch}
          />
        )}
        {view.kind === 'page' && view.label === 'Main' && (
          <Main
            branch={branch}
            branches={branches}
            onSelectBranch={setBranch}
            onAddBranch={addBranch}
          />
        )}
        {view.kind === 'page' && view.label === 'Activity' && <Activity />}
        {view.kind === 'page' && view.label === 'Archive' && <Archive />}
        {view.kind === 'page' && view.label === 'Settings' && <Settings />}
      </div>
    </AppWindow>
  )
}

export default App
