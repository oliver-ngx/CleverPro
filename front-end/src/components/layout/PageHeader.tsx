import type { ReactNode } from 'react'
import type { IconName } from '../ui/Icon'
import { IconButton } from '../ui/IconButton'

/** Glyph sizes are per-symbol in this design; none of them share one. */
const ACTION_SIZE: Partial<Record<IconName, string>> = {
  'at-sign': 'size-[12px]',
  'archive-in': 'size-[13px]',
  close: 'size-[9px]',
  filter: 'h-[8px] w-[14px]',
  ellipsis: 'h-[4px] w-[11px]',
}

/**
 * The Self pane draws its Action toggle as a plus, and the source file has no plus
 * glyph — the designer made one by rotating the close cross 45 degrees. So `close`
 * means two different marks in this pill depending on the view, and only the view
 * knows which: a cross that shuts something, or a plus that opens one.
 */
const CLOSE_AS_PLUS = 'rotate-45'

const ACTION_LABEL: Partial<Record<IconName, string>> = {
  'at-sign': 'Mentions',
  // The archive glyph is the Action window's switch on a Self pane, and that is
  // the only place the header draws it — so it is named for what it does.
  'archive-in': 'Action',
  close: 'Close',
  filter: 'Filter',
  ellipsis: 'More actions',
}

interface PageHeaderProps {
  /** A node rather than a string: the Self pane sets "(You)" in a lighter weight. */
  title: ReactNode
  /**
   * The teammate's face, shown before their name. Its presence is what makes the
   * heading a profile rather than a page title, and so what makes it a control.
   */
  leading?: ReactNode
  /**
   * A press on that profile, which opens that member's settings. Optional, because
   * a page title is not a person and has nowhere to lead; the profile is a real
   * button either way.
   */
  onSelectProfile?: () => void
  /** The pill's contents. Each screen in the source carries a different set. */
  actions?: IconName[]
  /** Called with the glyph that was pressed. Only some screens act on it. */
  onAction?: (icon: IconName) => void
  /**
   * A panel hanging off the pill, anchored to its right edge. The filter glyph on
   * a teammate's pane opens the history's sort order into it; nothing else uses it.
   * Member administration used to hang here too and now has a page of its own —
   * the overflow glyph opens that instead.
   */
  menu?: ReactNode
  /**
   * Whether that menu is open, as opposed to still on screen playing its exit. The
   * caller keeps the node mounted for the length of that exit and flips this, which
   * is the only way round that works: a dismissed menu that vanished from this prop
   * would have nothing left to animate.
   */
  menuOpen?: boolean
  /**
   * Turns the close cross into a plus — see `CLOSE_AS_PLUS`. Set on the Self pane,
   * whose leading glyph is drawn that way, and nowhere else: everywhere the pill
   * carries a cross it is a cross, and shuts what is open.
   */
  closeAsPlus?: boolean
  /**
   * True when a view has split the pane, which confines the title and its pill to the
   * list half. The detail's own controls are not passed through here — they belong to
   * the panel, so that the whole right side is one layer.
   */
  split?: boolean
}

/**
 * The bar every screen opens with: the view's title and a pill of glyph actions whose
 * contents change with the view. On a teammate's pane the title is their profile, and
 * that is a button — pressing it dims, it takes a tab stop, and it announces itself by
 * their name.
 *
 * It is the page's header rather than the window's, so it sits inside the content
 * pane and narrows to the history's width when a version splits the pane — the detail
 * half brings its own toolbar.
 */
export function PageHeader({
  title,
  leading,
  onSelectProfile,
  actions = ['at-sign', 'ellipsis'],
  onAction,
  menu,
  menuOpen = true,
  closeAsPlus = false,
  split = false,
}: PageHeaderProps) {
  const name = <span className="truncate text-[15px] font-semibold">{title}</span>

  return (
    // Lifted above the page body so the cards that hang off the pill are not painted
    // over by whatever the view lists underneath. The bar itself never covers
    // anything: a sheet is modal and sits above it at z-30, and Main's file browser
    // sits below at z-10, which is what keeps this bar reachable while it is open.
    <div className="relative z-20 flex shrink-0 items-start pt-[15px]">
      {/* Sized rather than flexed, so it takes the history's width alongside the
          columns below it. */}
      <span
        className={`flex w-full min-w-0 shrink-0 items-start justify-between gap-[16px] pr-[17px] pl-[22px] transition-[width] duration-300 ease-cp motion-reduce:transition-none ${
          split ? '@min-[860px]:w-[420px]' : ''
        }`}
      >
        {/* The heading is the page's either way. On a teammate's pane it is their
            profile, so the face and the name are one control rather than a picture
            beside a title — pressing either is pressing the person. */}
        <h1 className="flex items-center gap-[10px] text-[15px] font-semibold text-cp-text-primary">
          {leading === undefined ? (
            name
          ) : (
            <button
              type="button"
              onClick={onSelectProfile}
              // `outline-none` keeps the browser's own focus ring off the face — it
              // is drawn two-tone, and its outer band is a white line around the
              // photo. That utility also nulls the style our ring is drawn in, so
              // the focus-visible set restates it: solid, 2px, accent.
              className="flex cursor-pointer items-center gap-[10px] border-none bg-transparent p-0 text-left font-semibold text-cp-text-primary outline-none transition-opacity duration-150 ease-out motion-reduce:transition-none active:opacity-[0.55] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-4 focus-visible:outline-cp-accent"
            >
              {leading}
              {name}
            </button>
          )}
        </h1>
        {/* Two spans rather than one, and the split matters: the pill is drawn at 93%
            and `opacity` applies to a whole subtree, so a menu rendered inside it was
            93% too -- which is why the face behind it showed through. The opacity now
            belongs to the pill alone, and the menu is its sibling. */}
        <span className={`relative shrink-0 ${split ? '@max-[860px]:hidden' : ''}`}>
          <span className="inline-flex h-[26px] items-center gap-[12px] rounded-cp-pill bg-cp-pill-wide px-[11px] opacity-93">
            {actions.map((action) => (
              <IconButton
                key={action}
                icon={action}
                label={ACTION_LABEL[action] ?? action}
                iconClassName={`${ACTION_SIZE[action] ?? 'size-[12px]'} ${
                  action === 'close' && closeAsPlus ? CLOSE_AS_PLUS : ''
                } text-cp-text-primary`}
                onClick={
                  onAction === undefined
                    ? undefined
                    : () => {
                        onAction(action)
                      }
                }
              />
            ))}
          </span>

          {/* Below the pill and flush with its right edge, so it reads as having
              come out of the glyph that opened it. */}
          {menu !== undefined && (
            // It grows out of the glyph that opened it and shrinks back into it,
            // which is the branch popover's movement and its origin.
            <span
              inert={!menuOpen}
              className={`absolute top-[32px] right-0 z-20 origin-top-right motion-reduce:animate-none ${
                menuOpen ? 'animate-cp-popover-in' : 'animate-cp-popover-out'
              }`}
            >
              {menu}
            </span>
          )}
        </span>
      </span>
    </div>
  )
}
