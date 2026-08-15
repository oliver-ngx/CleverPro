import { useState } from 'react'
import { AppWindow } from '../components/layout/AppWindow'
import { PageHeader } from '../components/layout/PageHeader'
import { Sidebar } from '../components/layout/Sidebar'
import { BranchSelect } from '../components/main/BranchSelect'
import { DetailRow } from '../components/main/DetailRow'
import { ProjectThumbnail } from '../components/main/ProjectThumbnail'
import { VersionPanel } from '../components/main/VersionPanel'
import { BRANCHES, NAV_ITEMS, PROJECT, PROJECT_FILES, TEAM } from '../data/compiler'
import { useResponsiveSidebar } from '../hooks/useResponsiveSidebar'

const ALL_FILE_NAMES = new Set(PROJECT_FILES.map((file) => file.name))

export default function Main() {
  const [nav, setNav] = useState('Main')
  const [branch, setBranch] = useState(BRANCHES[0])
  const [checked, setChecked] = useState<ReadonlySet<string>>(ALL_FILE_NAMES)
  const { open: sidebarOpen, toggle: toggleSidebar, dismissOnMobile } = useResponsiveSidebar()

  const toggleFile = (name: string) => {
    setChecked((current) => {
      const next = new Set(current)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <AppWindow>
      <Sidebar
        title="Compiler"
        navItems={NAV_ITEMS}
        activeNav={nav}
        onSelectNav={(label) => {
          setNav(label)
          dismissOnMobile()
        }}
        team={TEAM}
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

      <div className="flex min-w-0 flex-1 flex-col">
        <PageHeader title={nav} onToggleSidebar={toggleSidebar} />

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
              <a
                href={`https://${PROJECT.deployHost}`}
                className="min-w-0 truncate text-[13px] font-normal"
              >
                {PROJECT.deployHost}
              </a>
            </DetailRow>

            <DetailRow label="Branches" height={53} divider={false}>
              <BranchSelect current={branch} branches={BRANCHES} onSelect={setBranch} />
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
      </div>
    </AppWindow>
  )
}
