export type PersonName = 'oliver' | 'eden-sears' | 'juliana'

interface AvatarProps {
  person: PersonName
  /**
   * Only for an avatar that stands alone. Everywhere in this product a face sits
   * beside the name it belongs to, so by default it is decorative — labelling it
   * would push the raw id into the accessible name of whatever contains it.
   */
  label?: string
  /** 19px in the settings stack; the source draws them between 26 and 43. */
  size?: number
  /** Ring colour, used to punch each face out of the one behind it in a stack. */
  ring?: string
}

/**
 * Ported from the design system's `media/Avatar`: a teammate's photo, always
 * circular. The source's only bitmaps besides the project artwork.
 */
export function Avatar({ person, label, size = 19, ring }: AvatarProps) {
  return (
    <span
      role={label === undefined ? undefined : 'img'}
      aria-hidden={label === undefined}
      aria-label={label}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(/assets/avatars/${person}.png)`,
        boxShadow: ring === undefined ? undefined : `0 0 0 2px ${ring}`,
      }}
      className="inline-block shrink-0 rounded-cp-pill bg-cover bg-center bg-no-repeat"
    />
  )
}
