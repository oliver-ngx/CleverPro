import type { IconName } from './Icon'
import { Icon } from './Icon'

interface AttachmentTileProps {
  icon: IconName
  name: string
  /** Second, smaller caption — the branch a project snapshot was taken from. */
  branch?: string
  /** Each source glyph is drawn at its own size, so the tile does not impose one. */
  iconSize: number
}

/**
 * Ported from the design system's `forms/AttachmentTile`: a large glyph or page
 * bitmap over a one- or two-line caption.
 *
 * The component spec and the Add Branch frame disagree on this tile's metrics — the
 * spec says a 176-wide tile with 20px/18px captions, the frame draws 129 with
 * 13px/11px, which scales to 82 with 9px/7px. The frame wins here because it is the
 * screen being built, and its numbers are what the rest of this sheet was transcribed
 * against.
 *
 * Those numbers then carry the sheet's 14/11 step-up to 106 with 11px/9px captions,
 * so the tile reads at the Action window's scale. The glyph well is 94 rather than the
 * full 104 that step implies: the sheet has to fit the Action window's fixed 578, and
 * this well is the one piece of it with height to give.
 */
export function AttachmentTile({ icon, name, branch, iconSize }: AttachmentTileProps) {
  return (
    <div className="w-[106px] text-center">
      <div className="flex h-[94px] items-center justify-center">
        <Icon name={icon} className="h-auto" style={{ width: iconSize }} />
      </div>
      <div className="mt-[9px] text-[11px]/[100%] font-medium text-cp-text-tertiary">{name}</div>
      {branch !== undefined && (
        <div className="mt-[5px] text-[9px]/[100%] font-medium text-cp-text-tertiary">{branch}</div>
      )}
    </div>
  )
}