import { IconButton } from '../ui/IconButton'

interface PageHeaderProps {
  title: string
  onToggleSidebar: () => void
}

export function PageHeader({ title, onToggleSidebar }: PageHeaderProps) {
  return (
    <div className="flex shrink-0 items-start justify-between pt-[15px] pr-[17px] pl-[22px]">
      <span className="flex items-center gap-[10px]">
        {/* The rail's own toggle goes with the rail, so small screens need one here. */}
        <IconButton
          icon="sidebar-toggle"
          label="Show sidebar"
          iconClassName="size-[14px] text-cp-text-primary"
          className="md:hidden"
          onClick={onToggleSidebar}
        />
        <h1 className="text-[15px] font-semibold text-cp-text-primary">{title}</h1>
      </span>
      <span className="inline-flex h-[26px] items-center gap-[12px] rounded-cp-pill bg-cp-pill-wide px-[11px] opacity-93">
        <IconButton
          icon="at-sign"
          label="Mentions"
          iconClassName="size-[12px] text-cp-text-primary"
        />
        <IconButton
          icon="ellipsis"
          label="More actions"
          iconClassName="h-[4px] w-[11px] text-cp-text-primary"
        />
      </span>
    </div>
  )
}
