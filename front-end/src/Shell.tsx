import { useState } from 'react'
import App from './App'
import { AppWindow } from './components/layout/AppWindow'
import { ErrorBoundary } from './components/layout/ErrorBoundary'
import { ProductRail } from './components/layout/ProductRail'
import type { ModuleLabel } from './data/products'
import type { ProjectEntry } from './data/projects'
import CompilerProjects from './pages/CompilerProjects'
import Home from './pages/Home'

/**
 * Cseudocode, one level above a project.
 *
 * Everything the product had until now was *inside* one project — `App` is the
 * Compiler interface for Orchid Lab and nothing else, and it assumed it was the
 * whole application. This wraps it rather than changing it: Home and the
 * project list are drawn here, and the moment a project is opened `App` renders
 * on its own and this file is out of the way entirely.
 *
 * Which is why `App` is returned bare rather than as a child of `AppWindow`:
 * `App` draws its own window, its own rail and its own header, exactly as it
 * did when it was the root. Not one line of it changed to make this work.
 *
 * Going back up a level is the top-left of whichever rail is on screen, and it
 * is the same gesture at both levels: inside a project the rail's title is that
 * project's name, and pressing it leaves; in the shell the title is the
 * wordmark, and pressing it goes Home. Both land on Home rather than on the
 * list, so leaving a project and clearing the module are the one action.
 */
export function Shell() {
  const [module, setModule] = useState<ModuleLabel | undefined>(undefined)
  /**
   * The project being worked on, if any. Held as the whole row rather than a
   * boolean so that the day `PROJECT_ID` stops being a constant, what to open
   * is already sitting here.
   */
  const [opened, setOpened] = useState<ProjectEntry | undefined>(undefined)

  /** Up and out, from wherever: back to Home with nothing selected. */
  const goHome = () => {
    setOpened(undefined)
    setModule(undefined)
  }

  // The project takes the window. See the note above on why it is not wrapped.
  if (opened !== undefined) return <App onExit={goHome} />

  return (
    <AppWindow>
      <ProductRail
        active={module}
        onHome={goHome}
        onSelect={(label) => {
          // Only Compiler is built. The other five are pressable and go
          // nowhere -- they are drawn at full strength in the design, so they
          // are not greyed out, and selecting one would light a rail row over a
          // body that has nothing in it.
          if (label === 'Compiler') setModule('Compiler')
        }}
      />

      <div className="@container relative flex min-h-0 min-w-0 flex-1 flex-col bg-cs-window">
        {/* Keyed on the open module for the reason App keys its own: a screen
            that has thrown can be left by picking another one, and React will
            not reset a boundary by itself. */}
        <ErrorBoundary key={module ?? 'home'}>
          {module === 'Compiler' ? <CompilerProjects onOpen={setOpened} /> : <Home />}
        </ErrorBoundary>
      </div>
    </AppWindow>
  )
}
