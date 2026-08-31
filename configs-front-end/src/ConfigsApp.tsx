import { AppWindow } from '@cs/components/layout/AppWindow'
import { Icon } from '@cs/components/ui/Icon'

interface ConfigsAppProps {
  /**
   * Up and out, to Cseudocode. Configs invokes it and does not know where it
   * leads — the same arrangement Compiler has with `App`, and the only thing
   * that crosses between a module and the shell.
   *
   * Required here where Compiler's is optional. Compiler's is optional because
   * it used to be the root of the application and still runs without a shell
   * above it; Configs never has been, so an absent callback would be a branch
   * nothing reaches.
   */
  onExit: () => void
}

/**
 * Configs, inside one project.
 *
 * Blank, deliberately and temporarily — the frame this is built from is called
 * "Configs blank (temporarily)" and draws a window, a title and a panel toggle
 * and nothing else. This is the connection between Cseudocode and Configs, not
 * Configs: opening a project from the Configs list has to land somewhere, and
 * this is that somewhere until there is an editor to put here.
 *
 * It draws its own window rather than being wrapped in the shell's, exactly as
 * `App` does, because the frame has no rail: the moment Configs opens, the
 * product rail is gone and this is the whole screen.
 *
 * Two departures from the frame, both following what the rest of the client
 * already does:
 *
 * - **No traffic lights.** Every frame in this design is drawn as a macOS
 *   window and not one of them is transcribed with its dots — `ProductRail`
 *   drops the three above the wordmark and starts at the title. They are the
 *   mockup's chrome, not the product's.
 * - **The title moves left.** It sits at 133 in the source only because the
 *   dots occupy the 109 before it. With them gone it takes the window's own
 *   left inset, which is `ProductRail`'s 18, in a header box identical to the
 *   rail's — so the word lands exactly where the wordmark lands, at the same
 *   size and weight, which is where the eye already expects the way back to be.
 *   That is why the title is 14 and not the 13 that scaling 20 by 0.635 gives:
 *   these two headers swap places as you enter and leave Configs, and a word
 *   that changes size across that swap reads as a glitch.
 *
 * The title is that way back, and the toggle is drawn and does nothing: what it
 * would reveal has not been designed yet, so it is pressable and inert in the
 * same way the list's Open Folder and New Folder are.
 */
export default function ConfigsApp({ onExit }: ConfigsAppProps) {
  return (
    <AppWindow>
      <div className="flex min-h-0 w-full flex-1 flex-col bg-cs-window pt-[10px]">
        <div className="flex h-[44px] shrink-0 items-center gap-[19px] pr-[18px] pl-[24px]">
          <button
            type="button"
            onClick={onExit}
            className="cursor-pointer border-none bg-transparent p-0 text-[14px] font-semibold text-cs-text-primary"
          >
            Configs
          </button>

          <button
            type="button"
            aria-disabled
            aria-label="Toggle sidebar"
            className="flex cursor-pointer items-center border-none bg-transparent p-0"
          >
            <Icon name="sidebar" className="h-[13px] w-[17px] text-cs-text-primary" />
          </button>
        </div>

        {/* The rest of the frame. Empty is what it draws. */}
        <div className="min-h-0 flex-1" />
      </div>
    </AppWindow>
  )
}
