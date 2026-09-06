import { useEffect, useState } from 'react'
import { Icon } from '@cs/components/ui/Icon'
import type { InterpreterProject } from '../data/types'

/**
 * What Interpreter does before it can say anything, and how long each part takes.
 *
 * The third line is the one that matters. Reading files and reading history are
 * things any tool does; **running the app and watching it** is the one nobody
 * else does, and it is why this product can say `watched` instead of `guessed`
 * later. It gets a longer beat for that reason — the pause is the argument.
 */
const STAGES: { label: string; value: string; beat: number }[] = [
  { label: 'Reading your project', value: '412 files', beat: 950 },
  { label: 'Working out what connects to what', value: '903 connections', beat: 950 },
  { label: 'Running your app and watching it', value: '47 things watched', beat: 1600 },
  { label: 'Reading your history', value: '218 changes', beat: 950 },
  { label: 'Looking for problems', value: '4 found', beat: 950 },
]

interface SetupProps {
  project: InterpreterProject
  onDone: () => void
}

/**
 * The screen a project runs the first time it is opened.
 *
 * Deliberately not instant. A progress bar that finished immediately would say
 * the work was trivial; this says what was done and what it found, and by the
 * end the user has been told the system watched their application run. That is
 * the claim the rest of the product rests on, and this is the only place it is
 * ever stated outright.
 */
export function Setup({ project, onDone }: SetupProps) {
  const [stage, setStage] = useState(-1)

  useEffect(() => {
    let index = 0
    const timers: ReturnType<typeof setTimeout>[] = []

    const step = () => {
      setStage(index)
      index += 1
      if (index < STAGES.length) timers.push(setTimeout(step, STAGES[index - 1].beat))
      else timers.push(setTimeout(onDone, 900))
    }

    timers.push(setTimeout(step, 400))
    return () => {
      for (const timer of timers) clearTimeout(timer)
    }
  }, [onDone])

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-cs-window px-[26px] animate-cs-page-in motion-reduce:animate-none">
      <div className="relative h-[70px] w-[53px]">
        <Icon name="file-blank" className="h-[70px] w-[53px]" />
        <span
          style={{ fontFamily: 'var(--font-rounded)' }}
          className={`absolute inset-0 flex items-center justify-center text-[30px] font-bold ${project.colorClass}`}
        >
          {project.initial}
        </span>
      </div>

      <div className="mt-[18px] text-[21px] font-semibold text-cs-text-primary">{project.name}</div>
      <div className="text-[15px] text-cs-text-muted">Setting Up</div>

      <div className="mt-[120px] flex w-[300px] flex-col items-center">
        {/* One line at a time rather than a checklist. The frame shows what is
            happening now, not a tally of what is done.

            The spinner is drawn here rather than added to the shell's icon set:
            it belongs to this screen, and the shared registry is for glyphs more
            than one module draws. Twelve spokes fading round, the way macOS
            draws one. */}
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-[16px] w-[16px] animate-spin text-cs-text-tertiary motion-reduce:animate-none"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <line
              key={i}
              x1="12"
              y1="3.5"
              x2="12"
              y2="7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              opacity={0.15 + (i / 11) * 0.85}
              transform={`rotate(${String(i * 30)} 12 12)`}
            />
          ))}
        </svg>
        <div className="mt-[6px] h-[16px] text-[12px] text-cs-text-muted">
          {stage >= 0 ? STAGES[Math.min(stage, STAGES.length - 1)].label : ''}
        </div>
      </div>
    </div>
  )
}
