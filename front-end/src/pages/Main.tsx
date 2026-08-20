import { useCallback, useId, useMemo, useState } from 'react'
import { toFiles } from '../api/adapters'
import { api } from '../api/client'
import { PageBody } from '../components/layout/PageBody'
import { AddBranchSheet } from '../components/main/AddBranchSheet'
import { BranchPanel } from '../components/main/BranchPanel'
import { DetailRow } from '../components/main/DetailRow'
import { ProjectThumbnail } from '../components/main/ProjectThumbnail'
import { VersionPanel } from '../components/main/VersionPanel'
import { ResourceState } from '../components/ui/ResourceState'
import { useAction } from '../hooks/useAction'
import { useOverlayDismiss } from '../hooks/useOverlayDismiss'
import { usePresence } from '../hooks/usePresence'
import { useResource } from '../hooks/useResource'
import { SHEET_EXIT_MS } from '../lib/motion'

/**
 * The Branches row's closed height. Shared with the panel inside it, which centres the
 * value against this and lands its own heading on the same line once it opens.
 */
const BRANCH_ROW_HEIGHT = 53

export interface MainProject {
  name: string
  version: string
  deployHost: string | null
  previewSrc: string | null
}

interface MainProps {
  project: MainProject
  branch: string
  branches: string[]
  onSelectBranch: (branch: string) => void
}

/**
 * The project's detail rows over its current version.
 *
 * The branch list is App's rather than this page's: the Action window on a
 * teammate's pane selects from the same list, so a branch made here has to be one
 * that screen can see.
 */
export default function Main({
  project,
  branch,
  branches,
  onSelectBranch,
}: MainProps) {
  const [addingBranch, setAddingBranch] = useState(false)
  /**
   * Which files the user has *un*ticked, rather than which are ticked. The API
   * marks every file in a version as included, so "all on" is the resting
   * state -- tracking the exceptions means the tree needs no initialisation
   * when it loads and no resetting when the branch changes under it.
   */
  const [unchecked, setUnchecked] = useState<ReadonlySet<string>>(new Set())
  // The branches extend the card rather than floating over it, so the open state
  // belongs to the page that owns the card and not to the control in the row.
  const [branchesOpen, setBranchesOpen] = useState(false)
  const branchPanelId = useId()
  // The sheet outlives `addingBranch` by the length of its exit, then unmounts and
  // takes the half-typed branch name with it.
  const sheetPresent = usePresence(addingBranch, SHEET_EXIT_MS)
  const create = useAction()

  const tree = useResource((signal) => api.branchFiles(branch, signal), [branch])
  const files = useMemo(() => (tree.data === undefined ? [] : toFiles(tree.data)), [tree.data])
  const checked = useMemo(
    () => new Set(files.map((file) => file.name).filter((name) => !unchecked.has(name))),
    [files, unchecked],
  )

  const closeBranches = useCallback(() => {
    setBranchesOpen(false)
  }, [])

  // Escape shuts the panel, as it shuts everything else in the product. There is no
  // scrim and no click-outside to go with it: the panel is part of the card, so
  // clicking elsewhere on the page is not clicking off anything.
  useOverlayDismiss(closeBranches, branchesOpen)

  const toggleFile = (name: string) => {
    setUnchecked((current) => {
      const next = new Set(current)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <>
      <PageBody className="gap-[24px] pt-[20px] pr-[16px] pl-[16px] md:gap-[35px] md:pt-[27px] md:pr-[48px] md:pl-[56px] xl:pr-[79px] xl:pl-[95px]">
        {/* The four rows are one card, the same surface the file structure below
            them wears. The rows keep their own insets, so the card is a fill under
            them rather than a box they had to be re-laid out inside. */}
        <div className="rounded-cp-panel bg-cp-card pt-[5px] pb-[9px]">
          <DetailRow label="Preview" height={102}>
            {project.previewSrc !== null && (
              <ProjectThumbnail name={project.name} src={project.previewSrc} />
            )}
          </DetailRow>

          <DetailRow label="Project" height={47}>
            <span className="min-w-0 truncate text-[13px] font-semibold text-cp-text-tertiary">
              {project.version}
            </span>
          </DetailRow>

          {/* Empty until something is deployed: pushing to Main advances the
              version above without changing what production serves, so this row
              is legitimately blank on a project that has never been released. */}
          <DetailRow label="Deploy" height={53}>
            {project.deployHost === null ? (
              <span className="min-w-0 truncate text-[13px] font-normal text-cp-text-tertiary">
                Not deployed
              </span>
            ) : (
              <a
                href={`https://${project.deployHost}`}
                className="min-w-0 truncate text-[13px] font-normal"
              >
                {project.deployHost}
              </a>
            )}
          </DetailRow>

          {/* The value opens in place, so it grows this row rather than being a
              separate thing beneath it — and the row growing is what extends the
              card, since the card is only ever as tall as its rows. */}
          <DetailRow label="Branches" height={BRANCH_ROW_HEIGHT} divider={false} grows>
            <BranchPanel
              id={branchPanelId}
              open={branchesOpen}
              onToggle={() => {
                setBranchesOpen((current) => !current)
              }}
              current={branch}
              branches={branches}
              onSelect={(next) => {
                onSelectBranch(next)
                closeBranches()
              }}
              onAdd={() => {
                setAddingBranch(true)
                closeBranches()
              }}
              rowHeight={BRANCH_ROW_HEIGHT}
            />
          </DetailRow>
        </div>

        <VersionPanel
          projectName={project.name}
          branch={branch}
          files={files}
          checked={checked}
          onToggleFile={toggleFile}
        >
          <ResourceState
            loading={tree.loading}
            error={tree.error}
            empty="Nothing has been pushed to this branch yet."
            emptyWhen={files.length === 0}
          />
        </VersionPanel>
      </PageBody>

      {/* Outside the scroll container: the sheet covers the pane, it does not ride
          along with the content underneath it. */}
      {sheetPresent && (
        <AddBranchSheet
          closing={!addingBranch}
          sourceBranch={branch}
          branches={branches}
          pending={create.pending}
          error={create.error}
          onConfirm={(name, deploySubdomain) => {
            create.run(
              () => api.createBranch(name, deploySubdomain),
              () => {
                // A new branch is switched to as soon as it exists — the
                // reason to make one is to work in it, and the source moves
                // the selection too. Only on success: a refused create leaves
                // the sheet open with the server's reason in the name field.
                onSelectBranch(name)
                setAddingBranch(false)
              },
            )
          }}
          onDismiss={() => {
            setAddingBranch(false)
            create.clearError()
          }}
        />
      )}
    </>
  )
}
