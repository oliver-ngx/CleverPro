interface SidebarPersonProps {
  name: string
  online: boolean
  selected: boolean
  onSelect: () => void
}

/** Selecting a teammate opens their pane, so the row is a control like a nav item. */
export function SidebarPerson({ name, online, selected, onSelect }: SidebarPersonProps) {
  return (
    <button
      type="button"
      aria-current={selected ? 'page' : undefined}
      onClick={onSelect}
      className={`flex h-[30px] w-full cursor-pointer items-center justify-between rounded-cp-nav border-none pr-[12px] pl-[13px] text-left ${
        selected ? 'bg-cp-selected' : 'bg-transparent hover:bg-cp-hover'
      }`}
    >
      <span className="text-[13px] font-medium text-cp-text-primary">{name}</span>
      {online && (
        // The row is a button now, so the dot's label lands inside its accessible
        // name — "Eden Sears is online" there would read as the name twice over.
        <span role="status" aria-label="Online" className="size-[7px] rounded-full bg-cp-presence" />
      )}
    </button>
  )
}
