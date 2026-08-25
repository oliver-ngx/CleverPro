import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  /**
   * True for the boundary wrapping the whole document, which has no laid-out
   * parent to fill and must paint the desktop behind itself. The nested one
   * fills the pane it stands in.
   */
  standalone?: boolean
}

interface ErrorBoundaryState {
  /** Present only once something has thrown, which is what switches the render. */
  message?: string
}

/**
 * The last thing between one component throwing and a blank white page.
 *
 * React unmounts the entire tree when an error escapes a render, so without one
 * of these anywhere, a single bad read in a single row takes the whole app with
 * it — and the result looks exactly like a failure to load, which is the least
 * useful thing it could look like.
 *
 * Two are mounted, and the pair is deliberate. The nested one wraps the open
 * view, so a page that breaks leaves the rail and the nav alive and you can walk
 * away from it; it is keyed on the open view in `App`, so walking away also
 * clears the error, since React never resets a boundary by itself. The
 * standalone one wraps the document, and catches the cases the first cannot —
 * the rail itself, the join screen, and anything thrown before a view exists.
 *
 * The design system draws no error state at all, so this borrows `ResourceState`'s
 * treatment rather than inventing a second visual language for failure: the same
 * muted label type, no illustration, nothing dramatic. It is a placeholder for a
 * designed state and should be replaced by one rather than elaborated here.
 *
 * A class because this is the one thing hooks cannot do — `getDerivedStateFromError`
 * and `componentDidCatch` have no function-component equivalent.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {}

  static getDerivedStateFromError(cause: unknown): ErrorBoundaryState {
    // Anything can be thrown, and only an Error carries something worth reading.
    // The rest is reported to the console below rather than shown as "[object Object]".
    return {
      message: cause instanceof Error ? cause.message : 'Something went wrong on this screen.',
    }
  }

  componentDidCatch(cause: unknown, info: ErrorInfo) {
    // The screen shows one line; this is where the stack and the component path
    // go, because that is what actually locates the bug.
    console.error('Caught by an error boundary:', cause, info.componentStack)
  }

  render() {
    const { message } = this.state
    // Rendered untouched in the ordinary case: no wrapper element, so nothing
    // about the layout changes for having a boundary in it.
    if (message === undefined) return this.props.children

    return (
      <div
        role="alert"
        className={
          this.props.standalone === true
            ? 'flex min-h-[var(--cs-viewport-h)] items-center justify-center bg-cs-desktop p-[24px] font-ui'
            : 'flex min-h-0 flex-1 items-center justify-center p-[24px]'
        }
      >
        <div className="flex max-w-[320px] flex-col items-center gap-[10px] text-center">
          <p className="m-0 text-[13px] font-semibold text-cs-text-primary">
            This screen stopped working.
          </p>
          <p className="m-0 text-[11px]/[150%] font-medium text-cs-text-tertiary">{message}</p>
          <button
            type="button"
            onClick={() => {
              window.location.reload()
            }}
            className="mt-[4px] h-[27px] cursor-pointer rounded-[8px] border-none bg-cs-button px-[14px] text-[11px] font-medium text-cs-text-primary outline-none transition-opacity duration-150 ease-out active:opacity-60 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-cs-accent"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
