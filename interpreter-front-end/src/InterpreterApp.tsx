import { useMemo, useState } from 'react'
import { AppWindow } from '@cs/components/layout/AppWindow'
import { DetailPanel } from './components/DetailPanel'
import { ProjectSidebar } from './components/ProjectSidebar'
import { Setup } from './components/Setup'
import { PROJECTS } from './data/seed'
import type { ChangeRecord, InterpreterProject } from './data/types'
import { records as allRecords, visible } from './lib/derive'
import { Stream } from './pages/Stream'
import { ThingView } from './pages/ThingView'

interface InterpreterAppProps {
  /** Up and out, to Cseudocode. The wordmark invokes it. */
  onExit: () => void
}

/** What the stream has opened beside it, if anything. */
interface Opened {
  /** The record the panel explains. */
  recordId: string
  /** Set when a batch child was opened, so the head reads as that child. */
  childId?: string
}

/** The full-window descent into one thing, as a map or as its code. */
interface Descent {
  thingId: string
  mode: 'map' | 'code'
}

/**
 * Interpreter, the whole module.
 *
 * Unlike Compiler and Configs there is no project list above this: pressing
 * Interpreter in the Cseudocode rail lands here directly, on **Latest** — every
 * project's changes in one history. That is the right first screen for a product
 * whose job is to say what happened, because what happened rarely respects a
 * project boundary, and picking a project first would hide exactly the entries
 * you did not know to look for.
 *
 * Three layers, and they nest rather than stack. The stream is always there. The
 * detail panel opens **beside** it, taking width rather than covering it, so the
 * card being explained stays in view. The map and the code take the whole window
 * because at that depth the stream is no longer the subject.
 *
 * State is `useState` and nothing is fetched. The seed fixture is complete
 * enough to demonstrate the whole product, which is deliberate: the client is
 * finished before a backend exists, so the interface decides the shape of the
 * API rather than the reverse.
 */
export default function InterpreterApp({ onExit }: InterpreterAppProps) {
  /** `undefined` is Latest — every project at once. */
  const [projectId, setProjectId] = useState<string | undefined>(undefined)
  const [settingUp, setSettingUp] = useState<InterpreterProject | undefined>(undefined)
  const [indexed, setIndexed] = useState<string[]>(PROJECTS.filter((p) => p.indexed).map((p) => p.id))

  const [opened, setOpened] = useState<Opened | undefined>(undefined)
  const [descent, setDescent] = useState<Descent | undefined>(undefined)
  const [expanded, setExpanded] = useState<string[]>([])

  /** Written by the sheets, never merged into the seeded log. */
  const [newRecords] = useState<ChangeRecord[]>([])
  /** Problems repaired in this session. Drives the Notice banners and the map's edges. */
  const [fixed] = useState<string[]>([])
  const [letThrough] = useState<string[]>([])

  const projects = useMemo(() => PROJECTS.map((p) => ({ ...p, indexed: indexed.includes(p.id) })), [indexed])

  const records = useMemo(() => allRecords(newRecords, letThrough), [newRecords, letThrough])
  const shown = useMemo(
    () => visible(records, { projectId, branch: 'main', window: 'all' }),
    [records, projectId],
  )

  const openProject = (project: InterpreterProject) => {
    // A project Interpreter has not read cannot be shown, so it is read first.
    // The pause is the point -- see `Setup`.
    setOpened(undefined)
    setDescent(undefined)
    if (!indexed.includes(project.id)) {
      setSettingUp(project)
      return
    }
    setProjectId(project.id)
  }

  /**
   * Opening a card, and closing it again.
   *
   * A toggle rather than a one-way door: the card is the control, so pressing
   * the same one twice puts it back. Pressing a different card swaps the panel
   * rather than closing it, which is what makes reading several in a row feel
   * like turning pages.
   *
   * A child id belongs to a record rather than being one, so the record is found
   * by looking through the batches as well as the log -- the panel needs both:
   * the child's sentence and reason, and the parent's touched and affected.
   */
  const open = (id: string) => {
    const direct = records.find((r) => r.id === id)
    if (direct !== undefined) {
      setOpened((prev) => (prev?.recordId === id && prev.childId === undefined ? undefined : { recordId: id }))
      return
    }
    const parent = records.find((r) => r.children?.some((c) => c.id === id) === true)
    if (parent === undefined) return
    setOpened((prev) => (prev?.childId === id ? undefined : { recordId: parent.id, childId: id }))
  }

  const openedRecord = opened === undefined ? undefined : records.find((r) => r.id === opened.recordId)
  const projectName = projects.find((p) => p.id === projectId)?.name ?? 'Latest'
  const title = projectId === undefined ? 'Latest' : projectName

  // The map and the code take the whole window rather than the pane beside the
  // sidebar. At that depth the project list is not the context any more -- the
  // breadcrumb is -- and the frames give the descent the full width.
  if (descent !== undefined) {
    return (
      <AppWindow>
        <ThingView
          thingId={descent.thingId}
          projectName={title}
          mode={descent.mode}
          fixed={fixed}
          onMode={(mode) => {
            setDescent({ ...descent, mode })
          }}
          onClose={() => {
            setDescent(undefined)
          }}
          onSelect={(thingId) => {
            setDescent({ ...descent, thingId })
          }}
        />
      </AppWindow>
    )
  }

  return (
    <AppWindow>
      <ProjectSidebar
        projects={projects}
        selected={settingUp?.id ?? projectId}
        onSelect={openProject}
        onExit={onExit}
      />

      <div className="@container relative flex min-h-0 min-w-0 flex-1 flex-row bg-cs-window">
        {settingUp !== undefined ? (
          <Setup
            project={settingUp}
            onDone={() => {
              setIndexed((prev) => [...prev, settingUp.id])
              setProjectId(settingUp.id)
              setSettingUp(undefined)
            }}
          />
        ) : (
          <>
            <Stream
              title={title}
              records={shown}
              isLatest={projectId === undefined}
              fixed={fixed}
              openId={opened?.recordId}
              expanded={expanded}
              onOpen={open}
              onToggleBatch={(id) => {
                setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
              }}
              onReview={open}
              onFix={() => {
                // The repair sheet is drawn in a frame that has not been
                // transcribed. Nothing happens rather than something invented.
              }}
            />

            {openedRecord !== undefined && (
              <DetailPanel
                record={openedRecord}
                childId={opened?.childId}
                onClose={() => {
                  setOpened(undefined)
                }}
                onShowOnMap={(thingId) => {
                  setDescent({ thingId, mode: 'map' })
                }}
                onViewCode={(thingId) => {
                  setDescent({ thingId, mode: 'code' })
                }}
              />
            )}
          </>
        )}
      </div>
    </AppWindow>
  )
}
