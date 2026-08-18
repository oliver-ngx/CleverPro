import { Icon } from '../ui/Icon'
import { IconButton } from '../ui/IconButton'

interface VersionToolbarProps {
  onClose: () => void
}

/**
 * The version view's own controls, which sit in the detail half of the split header
 * rather than in the page's toolbar pill.
 *
 * They divide into what you do to the version — restore, delete, comment, commit,
 * push, export — and what you do about it: flag it, mute it, the overflow menu, and
 * the close that returns the pane to a single column. Only the close does anything;
 * the source defines no behaviour for the rest.
 *
 * Glyph sizes are per-symbol, as everywhere else in this design. The arrow leaving a
 * box is the one glyph with no name in the design system's set; "export" is what it
 * depicts.
 */
export function VersionToolbar({ onClose }: VersionToolbarProps) {
  return (
    <>
      {/* Ten glyphs in one row is the widest thing in the product. The gap between
          the two groups is what gives on a phone, since it is the only spacing here
          that is not holding related glyphs apart. */}
      <span className="flex items-center gap-[14px] md:gap-[26px]">
        <span className="flex items-center gap-[12px]">
          <IconButton icon="archive-out" label="Restore" iconClassName="h-[10px] w-[13px]" />
          <IconButton
            icon="trash"
            label="Delete"
            iconClassName="h-[11px] w-[10px] text-cp-text-primary"
          />
          <IconButton
            icon="message"
            label="Comment"
            iconClassName="size-[11px] text-cp-text-primary"
          />
        </span>
        <span className="flex items-center gap-[12px]">
          <IconButton
            icon="commit"
            label="Commit"
            iconClassName="h-[10px] w-[15px] text-cp-text-primary"
          />
          <IconButton
            icon="push"
            label="Push"
            iconClassName="h-[11px] w-[16px] text-cp-text-primary"
          />
          <IconButton
            icon="export"
            label="Export"
            iconClassName="h-[11px] w-[13px] text-cp-text-primary"
          />
        </span>
      </span>

      <span className="flex items-center gap-[13px]">
        {/* The flag carries a disclosure chevron, so it is a picker rather than a
            toggle — the design system's one flag colour is the only one drawn. */}
        <span className="inline-flex items-center gap-[4px]">
          <IconButton icon="flag" label="Flag" iconClassName="h-[10px] w-[9px]" />
          <Icon name="chevron-small" className="h-[3px] w-[2px] rotate-90 opacity-84" />
        </span>
        <IconButton
          icon="bell-slash"
          label="Mute"
          iconClassName="size-[10px] text-cp-text-primary"
        />
        <IconButton
          icon="ellipsis"
          label="More version actions"
          iconClassName="h-[3px] w-[11px] text-cp-text-primary"
        />
        <IconButton
          icon="close"
          label="Close version"
          iconClassName="size-[8px] text-cp-text-primary"
          onClick={onClose}
        />
      </span>
    </>
  )
}
