interface SidebarPersonProps {
  name: string
  online: boolean
}

export function SidebarPerson({ name, online }: SidebarPersonProps) {
  return (
    <div className="flex h-[30px] items-center justify-between rounded-cp-nav pr-[12px] pl-[13px] transition-colors duration-[120ms] ease-cp hover:bg-cp-hover">
      <span className="text-[13px] font-medium text-cp-text-primary">{name}</span>
      {online && (
        <span
          role="status"
          aria-label={`${name} is online`}
          className="size-[7px] rounded-full bg-cp-presence"
        />
      )}
    </div>
  )
}
