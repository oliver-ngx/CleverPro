/**
 * The three teammates the source drew, and the only ones with a photograph.
 *
 * The API has no avatar field — it returns a display name and nothing else — so
 * a face can only be found by matching that name against the assets the design
 * shipped. Everybody else is drawn from their initials, which is what makes a
 * member who joined through the project's link visible at all: they arrive with
 * a name and no picture, and a rail that only draws people it has a PNG for
 * would leave them out of the team entirely.
 *
 * The real fix is an avatar URL on the member payload. Until then, adding a
 * fourth photographed teammate is a PNG and a line here.
 */
// Typed as possibly-absent because it is a lookup over arbitrary names, not a
// table of every member: somebody who joined through the project's link is
// simply not in it, and that is the ordinary case rather than the odd one.
const AVATAR_SLUGS: Record<string, string | undefined> = {
  Oliver: 'oliver',
  'Eden Sears': 'eden-sears',
  Juliana: 'juliana',
}

interface AvatarProps {
  /** A member's display name, exactly as the API spells it. */
  person: string
  /**
   * Only for an avatar that stands alone. Everywhere in this product a face sits
   * beside the name it belongs to, so by default it is decorative — labelling it
   * would push the raw id into the accessible name of whatever contains it.
   */
  label?: string
  /** 19px in the settings stack; the source draws them between 26 and 43. */
  size?: number
}

/**
 * Initials for somebody with no photograph: first letters of the first and last
 * words, or the first two letters of a single name. Upper-cased, because a name
 * typed in lower case is still that person's name and should not read as a typo
 * in the one place it is reduced to two characters.
 */
function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter((word) => word !== '')
  if (words.length === 0) return '?'
  const letters =
    words.length === 1
      ? words[0].slice(0, 2)
      : `${words[0][0]}${words[words.length - 1][0]}`
  return letters.toUpperCase()
}

/**
 * Ported from the design system's `media/Avatar`: a teammate's photo, always
 * circular. The source's only bitmaps besides the project artwork.
 *
 * A member with no photo gets their initials on the field grey instead. Same
 * circle, same size, same place in every row — the difference is which of the
 * two the project happens to have for them, and nothing else about the layout
 * may move because of it.
 */
export function Avatar({ person, label, size = 19 }: AvatarProps) {
  const slug = AVATAR_SLUGS[person]
  const shared = {
    role: label === undefined ? undefined : ('img' as const),
    'aria-hidden': label === undefined,
    'aria-label': label,
  }

  if (slug === undefined) {
    return (
      <span
        {...shared}
        style={{
          width: size,
          height: size,
          // Scaled off the circle rather than fixed, so one component covers
          // the 16px switcher and the 43px pane header without a size table.
          fontSize: Math.max(8, Math.round(size * 0.4)),
        }}
        className="inline-flex shrink-0 items-center justify-center rounded-cs-pill bg-cs-field font-medium text-cs-text-tertiary select-none"
      >
        {initialsFor(person)}
      </span>
    )
  }

  return (
    <span
      {...shared}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(/assets/avatars/${slug}.png)`,
      }}
      className="inline-block shrink-0 rounded-cs-pill bg-cover bg-center bg-no-repeat"
    />
  )
}
