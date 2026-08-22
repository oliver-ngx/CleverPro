import { useMemo, useRef, useState } from 'react'
import { avatarFor } from '../../api/adapters'
import type { MemberDto } from '../../api/types'
import { Avatar } from '../ui/Avatar'

interface MentionFieldProps {
  /** Everyone who could be named. */
  members: MemberDto[]
  /** Who is named now, in the order they were added. */
  chosen: readonly string[]
  onChange: (chosen: string[]) => void
}

/**
 * The Action window's "View by" field: a line of `@name` mentions you type into.
 *
 * Transcribed from three states of the same row — `48:13` at rest, `111:356` focused
 * on an empty query, `111:191` mid-query. The frame draws the value as running blue
 * text (`@Oliver, @Eden Sears, @Juliana` at #0088FF), and drops the matching members
 * *below* the row as a face and an `@name` apiece, with a rule under the list. It
 * pushes the rest of the window down rather than floating over it, which is this
 * product's habit for a control whose surface can grow.
 *
 * **What the frames do not draw, and what was done about it.** There is no state for
 * removing a name. The control is unusable without one, so two ways in: backspace on
 * an empty query takes the last mention off, and pressing a mention removes it. The
 * second costs nothing visually — a mention is already the blue text the frame draws,
 * and is simply a button now.
 *
 * **The `@` is optional on the way in.** The user asked to type `@name`, and `111:191`
 * shows a bare `O` matching `@Oliver`, so a leading `@` is accepted and ignored rather
 * than required. It is always drawn on the way out, because the frame draws it.
 *
 * Matching is a case-insensitive substring rather than a prefix: a project of three
 * people is searched to save a click, not to disambiguate a thousand names.
 */
export function MentionField({ members, chosen, onChange }: MentionFieldProps) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  const matches = useMemo(() => {
    const needle = query.replace(/^@/, '').trim().toLowerCase()
    return members
      .filter((member) => !chosen.includes(member.name))
      .filter((member) => needle === '' || member.name.toLowerCase().includes(needle))
  }, [members, chosen, query])

  // The list is only worth showing while the field has the caret, and only while
  // there is something left to offer.
  const open = focused && matches.length > 0
  // A stale index outlives the list it pointed into — the query narrows as it is
  // typed, so what was third a keystroke ago may not exist now.
  const index = Math.min(active, matches.length - 1)

  const add = (name: string) => {
    onChange([...chosen, name])
    setQuery('')
    setActive(0)
    input.current?.focus()
  }

  const remove = (name: string) => {
    onChange(chosen.filter((each) => each !== name))
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && query === '' && chosen.length > 0) {
      onChange(chosen.slice(0, -1))
      return
    }
    if (!open) return

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((current) => (current + step + matches.length) % matches.length)
      return
    }
    if (event.key === 'Enter') {
      // The window's buttons are elsewhere, but a form could still submit under us.
      event.preventDefault()
      add(matches[index].name)
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* The mentions and the caret are one line of text, which is what the frame
          draws: no pills, no chips, just blue names and a comma between them. */}
      <div
        onClick={() => {
          input.current?.focus()
        }}
        className="flex min-w-0 flex-wrap items-baseline justify-end gap-x-[4px] gap-y-[3px] text-[14px] font-normal text-cp-presence"
      >
        {chosen.map((name, position) => (
          <button
            key={name}
            type="button"
            aria-label={`Remove ${name}`}
            onClick={() => {
              remove(name)
            }}
            className="cursor-pointer border-none bg-transparent p-0 text-[14px] font-normal text-cp-presence outline-none transition-opacity duration-150 ease-out motion-reduce:transition-none hover:opacity-[0.65] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-cp-accent"
          >
            @{name}
            {position < chosen.length - 1 ? ',' : ''}
          </button>
        ))}

        <input
          ref={input}
          type="text"
          value={query}
          aria-label="Mention a member"
          aria-expanded={open}
          onFocus={() => {
            setFocused(true)
          }}
          // A press on a suggestion blurs this first, so the list has to outlive the
          // blur long enough for that press to land.
          onBlur={() => {
            window.setTimeout(() => {
              setFocused(false)
            }, 120)
          }}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
          placeholder={chosen.length === 0 ? 'Commit only' : ''}
          className="min-w-[70px] flex-1 border-none bg-transparent text-right text-[14px] font-normal text-cp-presence caret-cp-presence outline-none placeholder:text-cp-text-composer"
        />
      </div>

      {/* Below the row and inside the window, as the frame has it. The faces are 44
          in the source and so 28 here; the names are 22 and so 14. */}
      {open && (
        <ul className="mt-[14px] flex list-none flex-col gap-[8px] p-0">
          {matches.map((member, position) => {
            const slug = avatarFor(member.name)
            return (
              <li key={member.name}>
                <button
                  type="button"
                  // The pointer press must beat the blur above, and mousedown does.
                  onMouseDown={(event) => {
                    event.preventDefault()
                  }}
                  onClick={() => {
                    add(member.name)
                  }}
                  onMouseEnter={() => {
                    setActive(position)
                  }}
                  className={`flex h-[34px] w-full cursor-pointer items-center gap-[11px] rounded-cp-pill border-none px-[6px] text-left text-[14px] font-medium text-cp-text-primary outline-none transition-colors duration-150 ease-out motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-cp-accent ${
                    position === index ? 'bg-cp-hover' : 'bg-transparent'
                  }`}
                >
                  {slug === undefined ? (
                    <span className="size-[28px] shrink-0 rounded-cp-pill bg-cp-field" />
                  ) : (
                    <Avatar person={slug} size={28} />
                  )}
                  @{member.name}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
