import type { PaneEntry } from '../../data/team'
import { Icon } from '../ui/Icon'
import { IconButton } from '../ui/IconButton'

interface VersionToolbarProps {
  onClose: () => void
  /**
   * The commit this version came from, when it came from one. A push row has
   * none: notes, retraction, flags and forwarding all attach to a proposal, and
   * a pushed version is not one.
   */
  commit?: { id: string; status?: PaneEntry['status']; flagged?: boolean }
  /** Whether the open version is the signed-in user's own work. */
  mine: boolean
  /** True while one of these actions is in flight. */
  pending?: boolean
  onRetract: () => void
  onPush: () => void
  onFlag: () => void
}

/**
 * The version view's own controls, which sit in the detail half of the split header
 * rather than in the page's toolbar pill.
 *
 * They divide into what you do to the version — restore, retract, comment, forward,
 * push, export — and what you do about it: flag it, mute it, the overflow menu, and
 * the close that returns the pane to a single column.
 *
 * Which of them are live, and why the rest are not:
 *
 * - **Retract** is the trash glyph, and it is deliberately not called Delete. It
 *   withdraws a proposal nobody adopted; it does not remove history. So it is
 *   offered only on your own commit and only while it is still pending — once
 *   anyone has merged it or it has been pushed, it *is* history and the control
 *   goes dead. The server refuses it too, on the same two grounds.
 * - **Push** promotes this commit's attachment onto its branch. Any member may.
 * - **Flag** is a toggle, and the glyph carries its state — lit when set. The
 *   source draws a disclosure chevron beside it, so it is drawn here too, but the
 *   design system defines exactly one flag colour and there is nothing to pick
 *   between; it stays decorative until a second one exists.
 * - **Restore**, **Comment**, **Export**, **Forward**, **Mute** and the overflow are
 *   inert. Comment has nothing to open: the notes under the preview are the author's
 *   own and are read rather than replied to, so there is no field for it to reach.
 *   Restore and Export have no defined target — what "archive a commit" should mean is an
 *   open question in the product spec, not something to guess at here. Forward
 *   re-proposes this version to a new set of recipients under your name, which
 *   needs a recipient picker and an endpoint that copies an attachment; neither
 *   exists yet. Mute suppresses notifications for one thread, and there is no
 *   notification system to suppress. Each is drawn because the source draws it.
 *
 * Glyph sizes are per-symbol, as everywhere else in this design. The arrow leaving a
 * box is the one glyph with no name in the design system's set; "export" is what it
 * depicts.
 */
export function VersionToolbar({
  onClose,
  commit,
  mine,
  pending = false,
  onRetract,
  onPush,
  onFlag,
}: VersionToolbarProps) {
  const status = commit?.status
  const live = commit !== undefined && !pending
  const retractable = live && mine && status === 'pending'
  const pushable = live && status !== 'retracted'

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
            label={
              retractable
                ? 'Retract'
                : status === undefined
                  ? 'Retract (a pushed version is history)'
                  : mine
                    ? `Retract (already ${status})`
                    : 'Retract (only its author can)'
            }
            disabled={!retractable}
            onClick={onRetract}
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
            label="Forward"
            iconClassName="h-[10px] w-[15px] text-cp-text-primary"
          />
          <IconButton
            icon="push"
            label="Push"
            disabled={!pushable}
            onClick={onPush}
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
        {/* The flag carries a disclosure chevron, so it is drawn as a picker — the
            design system's one flag colour is the only one there is to pick, so the
            chevron stays decorative and the glyph itself is the toggle. */}
        <span className="inline-flex items-center gap-[4px]">
          <IconButton
            icon="flag"
            label={commit?.flagged === true ? 'Unflag' : 'Flag'}
            disabled={!live}
            onClick={onFlag}
            iconClassName={`h-[10px] w-[9px] ${commit?.flagged === true ? '' : 'opacity-45'}`}
          />
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
