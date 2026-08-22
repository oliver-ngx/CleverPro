import { Avatar } from './Avatar'

interface AvatarStackProps {
  /** Display names. A face is found for each, or initials drawn instead. */
  people: string[]
  size?: number
  /** The source overlaps faces by roughly half their width. */
  overlap?: number
}

/**
 * Ported from the design system's `media/AvatarStack`. Earlier faces sit above
 * later ones, so the stack reads left-to-right rather than as a pile.
 *
 * The faces meet edge to edge. A ring in the surface's colour behind each one would
 * separate them, but it draws as a pale outline around every photo, and the design
 * does not have one — the overlap alone is what tells the faces apart.
 */
export function AvatarStack({ people, size = 19, overlap = 9 }: AvatarStackProps) {
  return (
    <span className="inline-flex items-center">
      {people.map((person, index) => (
        <span
          key={person}
          style={{ marginLeft: index === 0 ? 0 : -overlap, zIndex: people.length - index }}
          className="relative inline-flex"
        >
          <Avatar person={person} size={size} />
        </span>
      ))}
    </span>
  )
}
