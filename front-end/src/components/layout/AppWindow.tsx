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
 */
export function AppWindow({ children }: AppWindowProps) {
  return (
    <div className="flex min-h-dvh justify-center bg-cp-desktop font-ui sm:items-center sm:p-[24px] xl:p-[40px]">
      <div className="relative flex h-dvh w-full max-w-[1400px] flex-col overflow-hidden bg-cp-window sm:h-[min(805px,100dvh_-_48px)] sm:rounded-cp-window sm:shadow-cp-window md:flex-row xl:h-[min(805px,100dvh_-_80px)]">
        {children}
      </div>
    </div>
  )
}
