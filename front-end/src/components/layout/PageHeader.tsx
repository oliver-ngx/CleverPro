import type { ReactNode } from 'react'
import type { IconName } from '../ui/Icon'
import { IconButton } from '../ui/IconButton'

/** Glyph sizes are per-symbol in this design; none of them share one. */
const ACTION_SIZE: Partial<Record<IconName, string>> = {
  'at-sign': 'size-[12px]',
  'archive-in': 'size-[13px]',
  // Drawn as a plus: the source file has no plus glyph, so the designer made one
  // by rotating the close cross.
  close: 'size-[9px] rotate-45',
  filter: 'h-[8px] w-[14px]',
  ellipsis: 'h-[4px] w-[11px]',
}

const ACTION_LABEL: Partial<Record<IconName, string>> = {
  'at-sign': 'Mentions',
  // The archive glyph is the Action window's switch on a Self pane, and that is
  // the only place the header draws it — so it is named for what it does.
  'archive-in': 'Action',
  close: 'Close Action',
  filter: 'Filter',
  ellipsis: 'More actions',
}

interface PageHeaderProps {
  /** A node rather than a string: the Self pane sets "(You)" in a lighter weight. */
  title: ReactNode
  /** Shown before the title on a teammate's pane. */
  leading?: ReactNode
  /** The pill's contents. Each screen in the source carries a different set. */
  actions?: IconName[]
  /** Called with the glyph that was pressed. Only some screens act on it. */
  onAction?: (icon: IconName) => void
  /**
   * True when a view has split the pane, which confines the title and its pill to the
   * list half. The detail's own controls are not passed through here — they belong to
   * the panel, so that the whole right side is one layer.
   */
  split?: boolean
  /** The header's toggle is the only one left once the rail collapses. */
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

/**
 * The bar every screen opens with: the rail's toggle, the view's title, and a pill of
 * glyph actions whose contents change with the view.
 *
 * It is the page's header rather than the window's, so it sits inside the content
 * pane and narrows to the history's width when a version splits the pane — the detail
 * half brings its own toolbar.
 */
export function PageHeader({
  title,
  leading,
  actions = ['at-sign', 'ellipsis'],
  onAction,
  split = false,
  sidebarOpen,
  onToggleSidebar,
}: PageHeaderProps) {
  return (
    <div className="flex shrink-0 items-start pt-[15px]">
      {/* Sized rather than flexed, so it takes the history's width alongside the
          columns below it. */}
      <span
        className={`flex w-full min-w-0 shrink-0 items-start justify-between gap-[16px] pr-[17px] pl-[22px] transition-[width] duration-300 ease-cp motion-reduce:transition-none ${
          split ? '@min-[860px]:w-[420px]' : ''
        }`}
      >
        <span className="flex items-center gap-[10px]">
          {/* The rail's own toggle goes with the rail. Small screens always need one
              here; larger ones need it the moment the rail collapses, or there is
              nothing left to click to bring it back. */}
          <IconButton
            icon="sidebar-toggle"
            label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            iconClassName="size-[14px] text-cp-text-primary"
            className={sidebarOpen ? 'md:hidden' : undefined}
            onClick={onToggleSidebar}
          />
          {leading}
          <h1 className="truncate text-[15px] font-semibold text-cp-text-primary">{title}</h1>
        </span>
        <span
          className={`inline-flex h-[26px] shrink-0 items-center gap-[12px] rounded-cp-pill bg-cp-pill-wide px-[11px] opacity-93 ${
            split ? '@max-[860px]:hidden' : ''
          }`}
        >
          {actions.map((action) => (
            <IconButton
              key={action}
              icon={action}
              label={ACTION_LABEL[action] ?? action}
              iconClassName={`${ACTION_SIZE[action] ?? 'size-[12px]'} text-cp-text-primary`}
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
      </span>
    </div>
  )
}
