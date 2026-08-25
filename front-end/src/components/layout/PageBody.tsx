import type { ReactNode } from 'react'

interface PageBodyProps {
  /**
   * The page's own padding. Every screen in the source insets its content
   * differently — Activity sits 30px from the rail where Main sits 95 — and each
   * carries its own reduction on a small window, so nothing is defaulted here.
   */
  className: string
  children: ReactNode
}

/**
 * The scrolling body a page fills. It owns the two things every screen shares: it is
 * the only thing on the pane that scrolls, and it fades in when the rail switches to
 * it.
 *
 * Team is not built on this. Its history column scrolls as one half of a split and
 * animates its width alongside, so it carries its own box.
 */
export function PageBody({ className, children }: PageBodyProps) {
  return (
    <div
      className={`flex min-h-0 flex-1 flex-col overflow-auto animate-cs-page-in motion-reduce:animate-none ${className}`}
    >
      {children}
    </div>
  )
}
