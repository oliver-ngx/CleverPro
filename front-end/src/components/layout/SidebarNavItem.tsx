import type { IconName } from '../ui/Icon'
import { Icon } from '../ui/Icon'

interface SidebarNavItemProps {
  label: string
  icon: IconName
  selected: boolean
  onSelect: () => void
}

/**
 * One row in the rail's nav. `aria-current` rather than a pressed state: these select
 * a page, and only one of them is ever the open one.
 */
export function SidebarNavItem({ label, icon, selected, onSelect }: SidebarNavItemProps) {
  return (
    <button
      type="button"
      aria-current={selected ? 'page' : undefined}
      onClick={onSelect}
      className={`flex h-[29px] w-full cursor-pointer items-center gap-[8px] rounded-cs-nav border-none pl-[11px] text-left transition-colors duration-150 ease-out motion-reduce:transition-none ${
        selected ? 'bg-cs-selected' : 'bg-transparent hover:bg-cs-hover'
      }`}
    >
      <Icon name={icon} className="size-[15px]" />
      <span className="text-[14px] font-medium text-cs-text-primary">{label}</span>
    </button>
  )
}
