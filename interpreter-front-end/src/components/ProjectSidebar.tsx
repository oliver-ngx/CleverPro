import { Icon } from '@cs/components/ui/Icon'
import type { InterpreterProject } from '../data/types'

interface ProjectSidebarProps {
  projects: InterpreterProject[]
  /** `undefined` while the Latest stream is showing, which is every project at once. */
  selected: string | undefined
  onSelect: (project: InterpreterProject) => void
  /** The wordmark. Up and out, to Cseudocode. */
  onExit: () => void
}

/**
 * Interpreter's own rail: the wordmark, then the projects it has been pointed at.
 *
 * The wordmark is the way home, exactly as the project name is inside a Compiler
 * project and the word Configs was inside Configs. One gesture, top-left,
 * everywhere in Cseudocode.
 *
 * The rows are the shell's own `file-blank` document with an initial struck
 * across it — the same furniture the Compiler and Configs lists draw, at the
 * smaller size the frame uses here. Reusing it rather than drawing a second
 * project mark is what stops two ideas of "a project" appearing in one product.
 *
 * A project that has not been read yet runs setup when pressed, and the rows are
 * otherwise identical. The prototype puts a blue *Set up* link on those rows;
 * neither frame draws one, so it is not here. The behaviour is the same either
 * way and the frame decides what is on screen.
 */
export function ProjectSidebar({ projects, selected, onSelect, onExit }: ProjectSidebarProps) {
  return (
    <div className="hidden w-[299px] shrink-0 flex-col overflow-hidden bg-cs-sidebar md:flex">
      <div className="flex h-[44px] shrink-0 items-center px-[24px] pt-[14px]">
        <button
          type="button"
          onClick={onExit}
          className="cursor-pointer border-none bg-transparent p-0 text-[15px] font-semibold text-cs-text-primary"
        >
          Interpreter
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-[14px] pt-[18px] pb-[12px]">
        {projects.map((project) => (
          <button
            key={project.id}
            type="button"
            onClick={() => {
              onSelect(project)
            }}
            className={`flex h-[56px] w-full shrink-0 cursor-pointer items-center gap-[14px] rounded-[12px] border-none px-[10px] text-left transition-colors duration-150 ease-out motion-reduce:transition-none ${
              selected === project.id ? 'bg-cs-row-active' : 'bg-transparent hover:bg-cs-row-hover'
            }`}
          >
            <div className="relative h-[43px] w-[32px] shrink-0">
              <Icon name="file-blank" className="h-[43px] w-[32px]" />
              <span
                style={{ fontFamily: 'var(--font-rounded)' }}
                className={`absolute inset-0 flex items-center justify-center text-[15px] font-bold ${project.colorClass}`}
              >
                {project.initial}
              </span>
            </div>

            <span className="min-w-0 flex-1 truncate text-[13px] text-cs-text-primary">{project.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
