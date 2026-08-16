import { useState } from 'react'
import { AddBranchSheet } from '../components/main/AddBranchSheet'
import { BranchSelect } from '../components/main/BranchSelect'
import { DetailRow } from '../components/main/DetailRow'
import { ProjectThumbnail } from '../components/main/ProjectThumbnail'
import { VersionPanel } from '../components/main/VersionPanel'
import { PROJECT, PROJECT_FILES } from '../data/compiler'

const ALL_FILE_NAMES = new Set(PROJECT_FILES.map((file) => file.name))

interface MainProps {
  branch: string
  branches: string[]
  onSelectBranch: (branch: string) => void
  onAddBranch: (name: string) => void
}

/**
 * The project's detail rows over its current version.
 *
 * The branch list is App's rather than this page's: the Action window on a
 * teammate's pane selects from the same list, so a branch made here has to be one
 * that screen can see.
 */
export default function Main({ branch, branches, onSelectBranch, onAddBranch }: MainProps) {
  const [addingBranch, setAddingBranch] = useState(false)
  const [checked, setChecked] = useState<ReadonlySet<string>>(ALL_FILE_NAMES)

  const toggleFile = (name: string) => {
    setChecked((current) => {
      const next = new Set(current)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-[24px] overflow-auto pt-[20px] pr-[16px] pl-[16px] md:gap-[35px] md:pt-[27px] md:pr-[48px] md:pl-[56px] xl:pr-[79px] xl:pl-[95px]">
        <div className="pt-[5px] pb-[9px]">
          <DetailRow label="Preview" height={102}>
            <ProjectThumbnail name={PROJECT.name} src={PROJECT.previewSrc} />
          </DetailRow>

          <DetailRow label="Project" height={47}>
            <span className="min-w-0 truncate text-[13px] font-semibold text-cp-text-tertiary">
              {PROJECT.version}
            </span>
          </DetailRow>

          <DetailRow label="Deploy" height={53}>
            <a href={`https://${PROJECT.deployHost}`} className="min-w-0 truncate text-[13px] font-normal">
              {PROJECT.deployHost}
            </a>
          </DetailRow>

          <DetailRow label="Branches" height={53} divider={false}>
            <BranchSelect
              current={branch}
              branches={branches}
              onSelect={onSelectBranch}
              onAdd={() => {
                setAddingBranch(true)
              }}
            />
          </DetailRow>
        </div>

        <VersionPanel
          projectName={PROJECT.name}
          branch={branch}
          files={PROJECT_FILES}
          checked={checked}
          onToggleFile={toggleFile}
        />
      </div>

      {/* Outside the scroll container: the sheet covers the pane, it does not ride
          along with the content underneath it. */}
      {addingBranch && (
        <AddBranchSheet
          sourceBranch={branch}
          branches={branches}
          onConfirm={onAddBranch}
          onDismiss={() => {
            setAddingBranch(false)
          }}
        />
      )}
    </>
  )
}
