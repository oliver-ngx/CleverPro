import type { ReactNode } from 'react'
import type { PersonName } from './Avatar'
import { AvatarStack } from './AvatarStack'
import type { IconName } from './Icon'
import { Icon } from './Icon'

interface VersionRowProps {
  icon: IconName
  /** The source draws each glyph at its own size; none of them share one. */
  iconSize: number
  title: string
  /** Second line. Only the taller variant carries one. */
  subtitle?: string
  /** Sits between the title and the faces — a diff stat, in practice. */
  meta?: ReactNode
  avatars?: PersonName[]
  /** The open version, filled rather than merely hovered. */
  selected?: boolean
  onClick?: () => void
}

/**
 * Ported from the design system's `data/VersionRow`. Two shapes exist: a 41px capsule
 * listing one commit in a teammate's pane, and a taller 50px row carrying a
 * title/subtitle pair at radius 14. Passing a `subtitle` is what selects the second,
 * because that is the only thing that distinguishes them.
 *
 * The `Team/Others/View` frame draws a third — a 26px capsule for the history column
 * once a version is open — and it is deliberately not built. The user asked for the
 * history to give up width and nothing else when the editor opens, so these rows keep
 * their height and simply narrow. Do not reinstate the compact shape from the frame.
 *
 * The whole row is the control, so it is a button rather than a div with a click
 * handler — it is reachable by keyboard and announces itself as pressable.
 */
export function VersionRow({
  icon,
  iconSize,
  title,
  subtitle,
  meta,
  avatars,
  selected = false,
  onClick,
}: VersionRowProps) {
  const tall = subtitle !== undefined

  // A selected row is already the colour the hover wash lands on, so lifting it again
  // would read as fading towards white under the pointer. It stays put.
  const fill = selected
    ? 'bg-cp-row-active'
    : 'bg-cp-field hover:bg-cp-row-hover active:bg-cp-row-active'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? 'true' : undefined}
      className={`flex w-full shrink-0 cursor-pointer items-center gap-[16px] border-none pr-[13px] pl-[16px] text-left transition-colors duration-[120ms] ease-cp outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cp-accent motion-reduce:transition-none ${
        tall ? 'h-[50px] rounded-cp-attachment' : 'h-[41px] rounded-cp-pill'
      } ${fill}`}
    >
      <Icon name={icon} className="h-auto shrink-0" style={{ width: iconSize }} />

      <span className="flex min-w-0 flex-1 flex-col gap-[4px]">
        <span className="truncate text-[11px] font-medium text-cp-text-secondary">{title}</span>
        {subtitle !== undefined && (
          <span className="truncate text-[9px] font-normal text-cp-text-subtle">{subtitle}</span>
        )}
      </span>

      {meta}
      {avatars !== undefined && avatars.length > 0 && (
        <AvatarStack
          people={avatars}
          size={28}
          overlap={15}
          ring={selected ? 'var(--color-cp-row-active)' : 'var(--color-cp-field)'}
        />
      )}
    </button>
  )
}
