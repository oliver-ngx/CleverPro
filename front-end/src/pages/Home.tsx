import { Icon } from '../components/ui/Icon'

/**
 * What Cseudocode opens on: a greeting, and one link under it.
 *
 * "Start One" is drawn in the toolbar blue and does nothing. Where it leads is
 * a real question — the projects list, or straight into creating something —
 * and the frame does not answer it, so it is a control without a destination
 * rather than a guess at one.
 *
 * The three glyphs top right are the same: they are on the Home frame, absent
 * from both Compiler frames, and unlabelled. They are drawn as marks rather
 * than as buttons so nothing about them promises a press will do something.
 */
export default function Home() {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col animate-cs-page-in motion-reduce:animate-none">
      <div
        aria-hidden
        className="absolute top-[28px] right-[40px] flex items-center gap-[14px] text-cs-text-primary"
      >
        <Icon name="archive-in" className="h-[12px] w-[16px]" />
        <Icon name="filter" className="h-[8px] w-[14px]" />
        <Icon name="ellipsis" className="h-[4px] w-[16px]" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-[40px]">
        <p className="max-w-[387px] text-center text-[20px] font-semibold text-cs-text-primary">
          Hello! Cseudocode here - An Integrated Software Editor, edit your software together.
          What should we forge together today?
        </p>

        <button
          type="button"
          aria-disabled
          className="mt-[31px] cursor-pointer border-none bg-transparent p-0 text-[13px] text-cs-action"
        >
          Start One
        </button>
      </div>
    </div>
  )
}
