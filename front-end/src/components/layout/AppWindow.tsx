import type { ReactNode } from 'react'

interface AppWindowProps {
  children: ReactNode
}

/**
 * The desktop backdrop plus the app window floating on it. The window keeps the
 * source's 1400×805 whenever there is room for it and shrinks from there; on a
 * phone it drops the backdrop entirely and fills the screen, since a rounded card
 * inset on all sides wastes space that small.
 *
 * The rail sits beside the content, so the window is a row. Below `md` there is no
 * rail — the nav is a bar under the pane instead — so it stacks the other way.
 *
 * The heights reach for `--cs-viewport-h` rather than `100dvh` because the app is
 * zoomed (see --cs-ui-scale in index.css) and viewport units are not zoomed with
 * it: a literal `100dvh` here would come out a fifth short and leave the window
 * riding high on the desktop. The 805 and the paddings are design pixels and stay
 * as drawn — the zoom is what makes them smaller.
 */
export function AppWindow({ children }: AppWindowProps) {
  return (
    <div className="flex min-h-[var(--cs-viewport-h)] justify-center bg-cs-desktop font-ui sm:items-center sm:p-[24px] xl:p-[40px]">
      <div className="relative flex h-[var(--cs-viewport-h)] w-full max-w-[1400px] flex-col overflow-hidden bg-cs-window sm:h-[min(805px,calc(var(--cs-viewport-h)_-_48px))] sm:rounded-cs-window sm:shadow-cs-window md:flex-row xl:h-[min(805px,calc(var(--cs-viewport-h)_-_80px))]">
        {children}
      </div>
    </div>
  )
}
