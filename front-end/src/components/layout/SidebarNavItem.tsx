import type { IconName } from '../ui/Icon'
import { Icon } from '../ui/Icon'

interface SidebarNavItemProps {
  label: string
  icon: IconName
  selected: boolean
  onSelect: () => void
}

export function SidebarNavItem({ label, icon, selected, onSelect }: SidebarNavItemProps) {
  return (
    <button
      type="button"
      aria-current={selected ? 'page' : undefined}
      onClick={onSelect}
      className={`flex h-[29px] w-full cursor-pointer items-center gap-[8px] rounded-cp-nav border-none pl-[11px] text-left ${
        selected ? 'bg-cp-selected' : 'bg-transparent hover:bg-cp-hover'
      }`}
    >
      <Icon name={icon} className="size-[15px]" />
      <span className="text-[14px] font-medium text-cp-text-primary">{label}</span>
    </button>
  )
}
