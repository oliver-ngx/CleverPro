import { useEffect, useRef, useState } from 'react'
import { BRANCH_ATTACHMENTS, DEPLOY_SUFFIX } from '../../data/compiler'
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
  onConfirm: (name: string) => void
  /** Called once the exit animation has finished and the sheet can be unmounted. */
  onDismiss: () => void
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
  onConfirm,
  onDismiss,
}: AddBranchSheetProps) {
  const [name, setName] = useState('')
  const [deploy, setDeploy] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)
  const { closing, close } = useOverlayDismiss(onDismiss)

  const trimmed = name.trim()
  const duplicate = branches.some((branch) => branch.toLowerCase() === trimmed.toLowerCase())
  const submittable = trimmed !== '' && !duplicate

  // The name field is the only thing anyone opens this sheet to fill in.
  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  return (
    <Sheet
      title="Add Branch"
      closing={closing}
      onExited={onDismiss}
      onSubmit={(event) => {
        event.preventDefault()
        if (!submittable) return
        onConfirm(trimmed)
        close()
      }}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={!submittable}>
            Add
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
          error={duplicate ? `A branch called “${trimmed}” already exists.` : undefined}
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
          {/* Reads as a field but behaves as a disclosure. Nothing to disclose yet,
              so it is inert rather than a button that would do nothing. */}
          <div className="flex h-[50px] w-full items-center justify-between rounded-[18px] bg-cp-field px-[19px]">
            <span className="text-[14px]/[100%] font-medium text-cp-text-primary">Team</span>
            <span className="inline-flex items-center gap-[8px] text-[11px]/[100%] font-medium text-cp-text-tertiary">
              All from {sourceBranch}
              <Icon name="chevron-right" className="h-[8px] w-[5px] opacity-50" />
            </span>
          </div>
        </div>
      </div>
    </Sheet>
  )
}
