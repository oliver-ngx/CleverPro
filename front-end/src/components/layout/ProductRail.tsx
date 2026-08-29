import type { ModuleLabel } from '../../data/products'
import { MODULE_GROUPS } from '../../data/products'
import { SidebarNavItem } from './SidebarNavItem'

interface ProductRailProps {
  /** The module currently open, if any. Home opens none, and the design draws
      no selection there. */
  active?: ModuleLabel
  onSelect: (label: ModuleLabel) => void
  /** The wordmark goes home. */
  onHome: () => void
}

/**
 * The rail down the left of the Cseudocode shell: the wordmark, then the six
 * modules in two groups.
 *
 * Narrower than the project rail beside which it is never drawn — 330 in the
 * source's 2204-wide frame, which is 210 at the 1400 the window is built to,
 * where `Sidebar` is 299. They are different rails at different levels and the
 * design gives them different widths; the shared part is the row, which is
 * `SidebarNavItem` unchanged. Its 29px height, 8px gap, 15px glyph and #e1e1e1
 * selected fill are all already what these frames draw, so the only thing this
 * file adds is the grouping and the width.
 *
 * Hidden below `md` for the same reason `Sidebar` is: 210px of rail beside the
 * content leaves a phone nothing to read in. There is no tab-bar counterpart
 * yet because the design has not drawn one — see the note in Shell.
 */
export function ProductRail({ active, onSelect, onHome }: ProductRailProps) {
  return (
    <div className="hidden w-[210px] shrink-0 overflow-hidden bg-cs-sidebar md:block">
      <div className="flex h-full w-full shrink-0 flex-col pt-[14px]">
        {/* The wordmark is the way home. Deliberately not a nav row: Home is not
            a module and never takes the grey selected fill, so pressing this
            clears the selection rather than moving it. */}
        <div className="flex h-[44px] items-center px-[18px]">
          <button
            type="button"
            onClick={onHome}
            className="cursor-pointer border-none bg-transparent p-0 text-[14px] font-semibold text-cs-text-primary"
          >
            Cseudocode
          </button>
        </div>

        <div className="h-[21px]" />

        {MODULE_GROUPS.map((group, index) => (
          <div key={group[0].label}>
            {/* The gap the design puts between the two groups: 65px beyond a
                normal row's pitch in the source, which is 41 here. */}
            {index > 0 && <div className="h-[41px]" />}
            <nav className="flex flex-col gap-[2px] px-[14px]">
              {group.map((item) => (
                <SidebarNavItem
                  key={item.label}
                  label={item.label}
                  icon={item.icon}
                  selected={item.label === active}
                  onSelect={() => {
                    onSelect(item.label)
                  }}
                />
              ))}
            </nav>
          </div>
        ))}
      </div>
    </div>
  )
}
