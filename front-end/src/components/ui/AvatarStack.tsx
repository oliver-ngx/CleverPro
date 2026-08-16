import type { PersonName } from './Avatar'
import { Avatar } from './Avatar'

interface AvatarStackProps {
  people: PersonName[]
  size?: number
  /** The source overlaps faces by roughly half their width. */
  overlap?: number
  ring?: string
}

/**
 * Ported from the design system's `media/AvatarStack`. Earlier faces sit above
 * later ones, so the stack reads left-to-right rather than as a pile.
 */
export function AvatarStack({
  people,
  size = 19,
  overlap = 9,
  ring = 'var(--color-cp-panel)',
}: AvatarStackProps) {
  return (
    <span className="inline-flex items-center">
      {people.map((person, index) => (
        <span
          key={person}
          style={{ marginLeft: index === 0 ? 0 : -overlap, zIndex: people.length - index }}
          className="relative inline-flex"
        >
          <Avatar person={person} size={size} ring={ring} />
        </span>
      ))}
    </span>
  )
}
