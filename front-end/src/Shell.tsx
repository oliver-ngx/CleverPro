import { useState } from 'react'
import ConfigsApp from '@configs/ConfigsApp'
import type { ConfigsProjectEntry } from '@configs/data/projects'
import ConfigsProjects from '@configs/pages/ConfigsProjects'
import App from './App'
import { AppWindow } from './components/layout/AppWindow'
import { ErrorBoundary } from './components/layout/ErrorBoundary'
import { ProductRail } from './components/layout/ProductRail'
import type { ModuleLabel } from './data/products'
import type { ProjectEntry } from './data/projects'
import CompilerProjects from './pages/CompilerProjects'
import Home from './pages/Home'

/**
 * What is open, and which module opened it.
 *
 * The module is part of it rather than derivable from the project, because it
 * is the thing that decides what appears: the same project can be listed by
 * both modules, and opening Orchid Lab under Compiler opens Compiler while
 * opening a row of that name under Configs would open Configs. A project does
 * not carry an editor around with it — the list you pressed it on does.
 */
type Opened =
  | { module: 'Compiler'; entry: ProjectEntry }
  | { module: 'Configs'; entry: ConfigsProjectEntry }

/**
 * Cseudocode, one level above a project.
 *
 * Everything the product had until now was *inside* one project — `App` is the
 * Compiler interface for Orchid Lab and nothing else, and it assumed it was the
 * whole application. This wraps it rather than changing it: Home and the
 * project lists are drawn here, and the moment a project is opened that
 * module's own root renders on its own and this file is out of the way
 * entirely.
 *
 * Which is why those roots are returned bare rather than as children of
 * `AppWindow`: each draws its own window, and `App` draws its own rail and
 * header too, exactly as it did when it was the root. Not one line of Compiler
 * changed to make either of them work.
 *
 * Going back up a level is the top-left of whatever is on screen, and it is the
 * same gesture everywhere: inside a Compiler project the rail's title is that
 * project's name; inside Configs it is the word Configs; in the shell it is the
 * wordmark. All three land on Home rather than on the list, so leaving a
 * project and clearing the module are the one action.
 */
export function Shell() {
  const [module, setModule] = useState<ModuleLabel | undefined>(undefined)
  /**
   * The project being worked on, if any, and the module that opened it. Held as
   * the whole row rather than a boolean so that the day `PROJECT_ID` stops
   * being a constant, what to open is already sitting here.
   */
  const [opened, setOpened] = useState<Opened | undefined>(undefined)

  /** Up and out, from wherever: back to Home with nothing selected. */
  const goHome = () => {
    setOpened(undefined)
    setModule(undefined)
  }

  // The project takes the window. See the note above on why neither is wrapped.
  if (opened !== undefined) {
    return opened.module === 'Compiler' ? (
      <App onExit={goHome} />
    ) : (
      <ConfigsApp onExit={goHome} />
    )
  }

  return (
    <AppWindow>
      <ProductRail
        active={module}
        onHome={goHome}
        onSelect={(label) => {
          // Compiler and Configs are built. The other four are pressable and go
          // nowhere -- they are drawn at full strength in the design, so they
          // are not greyed out, and selecting one would light a rail row over a
          // body that has nothing in it.
          if (label === 'Compiler' || label === 'Configs') setModule(label)
        }}
      />

      <div className="@container relative flex min-h-0 min-w-0 flex-1 flex-col bg-cs-window">
        {/* Keyed on the open module for the reason App keys its own: a screen
            that has thrown can be left by picking another one, and React will
            not reset a boundary by itself. */}
        <ErrorBoundary key={module ?? 'home'}>
          {module === 'Compiler' ? (
            <CompilerProjects
              onOpen={(entry) => {
                setOpened({ module: 'Compiler', entry })
              }}
            />
          ) : module === 'Configs' ? (
            <ConfigsProjects
              onOpen={(entry) => {
                setOpened({ module: 'Configs', entry })
              }}
            />
          ) : (
            <Home />
          )}
        </ErrorBoundary>
      </div>
    </AppWindow>
  )
}
