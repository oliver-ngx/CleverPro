import type { ReactNode, SubmitEventHandler } from 'react'
import { useId } from 'react'

interface SheetProps {
  title: string
  /** Glyph buttons at the right of the title bar. */
  actions?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /**
   * Width and height. Both current overlays take the default, because the user asked
   * for one box across the two; the prop stays so a future overlay with genuinely
   * different contents can opt out without reopening this file.
   */
  size?: string
  /** Passed through to the root, which becomes a form so Enter submits. */
  onSubmit?: SubmitEventHandler<HTMLFormElement>
  /** True once the overlay has started to leave. */
  closing: boolean
  /**
   * A click on the scrim. Omitted where a stray click outside must not discard what
   * is inside — a part-filled form, in practice.
   */
  onScrimClick?: () => void
  /** The exit animation has finished and the caller may unmount. */
  onExited: () => void
}

/**
 * Every overlay in the product: Add Branch and the Action composer both use this, and
 * anything else that floats over a pane should too.
 *
 * The design system ships these as two components — `overlays/Sheet` at radius 70 on
 * #FAFAFA with a soft wide shadow, and `overlays/ActionWindow` at the window radius
 * on white — and the frames draw them differently again. The user asked for one style
 * across both, so they are one component, and the window treatment is what it settled
 * on: white at radius 24 under the window shadow, the same chrome the app window
 * itself wears. Do not split this back into two.
 *
 * The box is shared too. The source draws Add Branch narrow and auto-height and the
 * Action composer wide and fixed, but the user asked for the two to match, so both
 * take the Action window's 977x578 — the one the source actually fixes. That leaves
 * Add Branch's fields wider than the frame draws them and some room above its footer;
 * that is the intended trade, not drift. Below `md` the height goes back to auto so a
 * short pane is not forced to scroll. Both are centred over a blurred pane.
 *
 * The root becomes a `<form>` when given `onSubmit`, so a footer's submit button and
 * Enter both work without the fields having to leave the layout.
 */
export function Sheet({
  title,
  actions,
  children,
  footer,
  size = 'max-w-[977px] md:h-[578px]',
  onSubmit,
  closing,
  onScrimClick,
  onExited,
}: SheetProps) {
  const titleId = useId()

  const shell = `pointer-events-auto relative flex max-h-full w-full flex-col overflow-hidden rounded-cp-overlay bg-cp-window pb-[19px] shadow-cp-window ${size} ${
    closing
      ? 'pointer-events-none animate-cp-sheet-out motion-reduce:animate-cp-sheet-out-reduced'
      : 'animate-cp-sheet-in motion-reduce:animate-cp-sheet-in-reduced'
  }`

  const onAnimationEnd = (event: { target: EventTarget; currentTarget: EventTarget }) => {
    if (closing && event.target === event.currentTarget) onExited()
  }

  const inner = (
    <>
      <div className="relative flex h-[40px] shrink-0 items-center px-[25px]">
        {/* Centred on the overlay, not on what is left over beside the actions, so the
            title sits in the same place however many glyphs the bar carries. */}
        <h2
          id={titleId}
          className="pointer-events-none absolute inset-x-0 text-center text-[14px]/[100%] font-semibold text-cp-text-primary"
        >
          {title}
        </h2>
        {actions !== undefined && (
          <span className="ml-auto flex items-center gap-[17px]">{actions}</span>
        )}
      </div>

      {/* Deliberately without spacing of its own: one caller stacks fields apart, the
          other rows flush against their dividers. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-auto px-[25px]">{children}</div>

      {footer !== undefined && (
        <div className="mt-[15px] flex shrink-0 justify-end gap-[10px] px-[25px]">{footer}</div>
      )}
    </>
  )

  const shared = {
    role: 'dialog' as const,
    'aria-modal': true,
    'aria-labelledby': titleId,
    onAnimationEnd,
    className: shell,
  }

  return (
    // Scoped to the pane rather than the viewport: the source blurs the page behind an
    // overlay but leaves the rail sharp, so this resolves against App's content column,
    // which is `relative` for exactly that reason.
    <div className="absolute inset-0 z-30 overflow-auto bg-cp-scrim backdrop-blur-[14px]">
      {/* A click target and nothing more: hidden from assistive tech and not
          focusable, because Escape already closes from the keyboard and a labelled
          full-pane button would compete with the real close control — the two ended
          up sharing an accessible name. */}
      {onScrimClick !== undefined && (
        <div
          aria-hidden="true"
          onClick={onScrimClick}
          className="absolute inset-0 z-0 cursor-default"
        />
      )}

      {/* Transparent to the pointer so the layer beneath catches every click that is
          not on the overlay itself, which takes its own back. */}
      <div className="pointer-events-none relative flex min-h-full items-center justify-center p-[16px] md:p-[40px]">
        {onSubmit === undefined ? (
          <div {...shared}>{inner}</div>
        ) : (
          <form {...shared} onSubmit={onSubmit}>
            {inner}
          </form>
        )}
      </div>
    </div>
  )
}
