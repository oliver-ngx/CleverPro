import { useEffect, useRef, useState } from 'react'
import type { MemberDto } from '../../api/types'
import { BRANCH_ATTACHMENTS, DEPLOY_SUFFIX } from '../../data/project'
import { useOverlayDismiss } from '../../hooks/useOverlayDismiss'
import { AttachmentTile } from '../ui/AttachmentTile'
import { Button } from '../ui/Button'
import { FieldLabel } from '../ui/FieldLabel'
import { Icon } from '../ui/Icon'
import { IconButton } from '../ui/IconButton'
import { Sheet } from '../ui/Sheet'
import { TextField } from '../ui/TextField'

interface AddBranchSheetProps {
  /** The branch the new one is forked from — the sheet reports it in two places. */
  sourceBranch: string
  /** Names already taken, so the sheet can refuse a duplicate before it is made. */
  branches: string[]
  /** Subdomains already in use, checked before the submit rather than after it. */
  takenSubdomains: string[]
  /** Everyone on the project — who the new branch can be assigned to. */
  members: MemberDto[]
  /**
   * `deploySubdomain` is the prefix only; the suffix is fixed for every branch.
   * `name` may be empty, in which case the server names the branch. `team`
   * undefined means everyone, which is what the sheet opens on.
   */
  onConfirm: (name: string, deploySubdomain: string, team?: string[]) => void
  /** True while the create request is in flight. */
  pending?: boolean
  /** Whatever the server refused with, if it did. */
  error?: string
  /** Closes the sheet, which then plays its exit animation before it unmounts. */
  onDismiss: () => void
  /** True while that exit is running. */
  closing?: boolean
}

/**
 * The Add Branch sheet: `Sheet`, `TextField`, `FieldLabel`, `AttachmentTile` and
 * `Button` composed into one screen. Nothing here sets a radius, a fill, a shadow, a
 * type size or a size of its own — the chrome and the box belong to `Sheet`, which the
 * Action composer wears too, and the rest to the primitives. The source draws this
 * sheet narrower than the Action window; the user asked for one size across both, so
 * it takes `Sheet`'s default rather than a box of its own.
 *
 * Matching the box alone left the sheet's contents visibly finer than the window's, so
 * they are stepped up by 14/11 — the ratio between this sheet's caption and the Action
 * window's — and the two now read at one scale. Only the vertical rhythm is held back
 * from the full step, because the shared box fixes the height at 578 and the scaled
 * contents come within about ten pixels of filling it.
 *
 * Unlike the branch popover this does not grow out of the control that opened it.
 * It rises into the middle of the pane over a blurred page, so it scales from its
 * own centre.
 *
 * A stray click outside a part-filled form should not throw it away, so no scrim
 * dismissal is passed. Escape and Cancel both close it.
 */
export function AddBranchSheet({
  sourceBranch,
  branches,
  takenSubdomains,
  members,
  onConfirm,
  onDismiss,
  closing = false,
  pending = false,
  error,
}: AddBranchSheetProps) {
  const [name, setName] = useState('')
  const [deploy, setDeploy] = useState('')
  // Everyone, until somebody narrows it. Held as the members who are in rather
  // than the ones who are out, because that is what gets sent.
  const [team, setTeam] = useState<ReadonlySet<string>>(
    () => new Set(members.map((member) => member.name)),
  )
  const [teamOpen, setTeamOpen] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  useOverlayDismiss(onDismiss)

  const trimmed = name.trim()
  const duplicate =
    trimmed !== '' && branches.some((branch) => branch.toLowerCase() === trimmed.toLowerCase())
  const subdomain = deploy.trim()
  const subdomainTaken =
    subdomain !== '' &&
    takenSubdomains.some((taken) => taken.toLowerCase() === subdomain.toLowerCase())
  const everyone = team.size === members.length
  // A blank name is not a reason to refuse the form: naming a branch is a
  // convenience rather than a requirement, and the server generates one when the
  // field is empty. Only a collision, or a branch with nobody on it, stops the
  // submit.
  const submittable = !duplicate && !subdomainTaken && team.size > 0

  // The name field is the only thing anyone opens this sheet to fill in.
  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  return (
    <Sheet
      title="Add Branch"
      closing={closing}
      onSubmit={(event) => {
        event.preventDefault()
        if (!submittable || pending) return
        // The sheet does not close itself any more: the branch is created on
        // the server, and the request can be refused -- Branches switched off
        // in Settings, a subdomain already in use, a role too low to create
        // one. Dismissing on submit would throw that message away along with
        // the half-filled form. The page closes it once the server agrees.
        onConfirm(trimmed, subdomain, everyone ? undefined : [...team])
      }}
      footer={
        <>
          <Button variant="secondary" onClick={onDismiss}>
            Cancel
          </Button>
          <Button type="submit" disabled={!submittable || pending}>
            {pending ? 'Adding...' : 'Add'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-[18px]">
        <TextField
          ref={nameRef}
          label="Name"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
          }}
          placeholder="e.g.  OrchildLab.exp1"
          // Not in the source, but two branches sharing a name would collide in the
          // list and the switcher, so the sheet refuses one.
          error={
            duplicate ? `A branch called “${trimmed}” already exists.` : error
          }
          hint={trimmed === '' ? 'Optional — left blank, one is generated for you.' : undefined}
        />

        <TextField
          label="Deploy"
          value={deploy}
          onChange={(event) => {
            setDeploy(event.target.value)
          }}
          placeholder={DEPLOY_SUFFIX}
          height={66}
          radius="tall"
          // Two branches answering the same URL is caught here rather than coming
          // back as a 400 after the form has been filled in.
          error={
            subdomainTaken
              ? `${subdomain}${DEPLOY_SUFFIX} is already in use on this project.`
              : undefined
          }
        />

        <div>
          {/* The frame labels this action with archive-in, not the attach glyph the
              design system's FieldLabel example reaches for. */}
          <FieldLabel
            action={
              <IconButton icon="archive-in" label="Add attachment" iconClassName="size-[17px]" />
            }
          >
            Attachment
          </FieldLabel>
          <div className="flex flex-wrap gap-[29px] rounded-[20px] bg-cp-field px-[24px] py-[15px]">
            {BRANCH_ATTACHMENTS.map((attachment) => (
              <AttachmentTile
                key={attachment.name}
                icon={attachment.icon}
                name={attachment.name}
                branch={attachment.showsSourceBranch ? sourceBranch : undefined}
                iconSize={attachment.size}
              />
            ))}
          </div>
        </div>

        {/* The row carries its own "Team" label and sits under a section label of the
            same word. Both frames draw it that way; the generated mock dropped the
            section label, and this screen followed the mock until the frames were
            read directly. */}
        <div>
          <FieldLabel>Team</FieldLabel>
          {/* Reads as a field and behaves as a disclosure: shut it states the
              default, open it narrows it. Who is on a branch is assigned
              deliberately rather than inherited silently — "All from Main" is the
              most common answer, not the only one. */}
          <button
            type="button"
            aria-expanded={teamOpen}
            onClick={() => {
              setTeamOpen((current) => !current)
            }}
            className="flex h-[50px] w-full cursor-pointer items-center justify-between rounded-[18px] border-none bg-cp-field px-[19px] text-left outline-none transition-colors duration-150 ease-out motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-cp-accent"
          >
            <span className="text-[14px]/[100%] font-medium text-cp-text-primary">Team</span>
            <span className="inline-flex items-center gap-[8px] text-[11px]/[100%] font-medium text-cp-text-tertiary">
              {everyone
                ? `All from ${sourceBranch}`
                : `${String(team.size)} of ${String(members.length)}`}
              <Icon
                name="chevron-right"
                className={`h-[8px] w-[5px] opacity-50 transition-transform duration-200 ease-out motion-reduce:transition-none ${
                  teamOpen ? 'rotate-90' : ''
                }`}
              />
            </span>
          </button>

          {teamOpen && (
            <div className="mt-[8px] flex flex-wrap gap-[8px] px-[4px]">
              {members.map((member) => {
                const on = team.has(member.name)
                return (
                  <button
                    key={member.name}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setTeam((current) => {
                        const next = new Set(current)
                        if (next.has(member.name)) next.delete(member.name)
                        else next.add(member.name)
                        return next
                      })
                    }}
                    className={`cursor-pointer rounded-cp-pill border-none px-[10px] py-[4px] text-[11px] font-medium transition-colors duration-150 ease-out motion-reduce:transition-none ${
                      on
                        ? 'bg-cp-row-active text-cp-text-primary'
                        : 'bg-cp-field text-cp-text-subtle hover:bg-cp-row-hover'
                    }`}
                  >
                    {member.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  )
}
