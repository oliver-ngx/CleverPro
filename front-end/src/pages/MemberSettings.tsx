import { useState } from 'react'
import { api } from '../api/client'
import type { MemberDto } from '../api/types'
import { PageBody } from '../components/layout/PageBody'
import { Button } from '../components/ui/Button'
import { ConfirmAction } from '../components/ui/ConfirmAction'
import { OptionSelect } from '../components/ui/OptionSelect'
import { POPOVER_SURFACE } from '../components/ui/Popover'
import { ResourceState } from '../components/ui/ResourceState'
import { SettingsGroup } from '../components/ui/SettingsGroup'
import { SettingsRow } from '../components/ui/SettingsRow'
import { Swap } from '../components/ui/Swap'
import { useAction } from '../hooks/useAction'
import { useResource } from '../hooks/useResource'
import { canGovern, canRelease } from '../lib/authority'
import { shortDate, titleCase } from '../lib/format'
import { useCurrentUser } from '../session'

interface MemberSettingsProps {
  /** The person this page is about, by their bare name — no "(You)" suffix. */
  member: string
  /** Everyone on the project, which is where the viewer's own role is read from. */
  members: MemberDto[]
  /** Their pane goes with them, so a removal has to send the app somewhere else. */
  onRemoved: () => void
}

/**
 * One person's settings, reached by pressing their face and name in the header.
 *
 * The product has no roster screen and is not getting one: authority moves with
 * the person, so to change what somebody can do you go to them. That is what the
 * profile button in `PageHeader` was built for and left waiting on — this is what
 * it opens.
 *
 * Built out of the Settings screen's own parts, because it is the same kind of
 * surface and should read as one: labelled groups of rows, a value that unfolds
 * into a card rather than cycling, and one destructive act on its own card at the
 * foot. Nothing here is invented that Settings had not already settled.
 *
 * **Each viewer gets a different page, not the same page greyed out.** A
 * Contributor looking at a teammate sees their role and their branches and
 * nothing else, because everything else would refuse. The Owner sees the role as
 * a control, the transfer, and the removal. The server enforces every one of
 * these independently; what is missing here is a courtesy, not the lock.
 *
 * Two things are deliberately read-only. **Branches** are a list because the API
 * can set a branch's members when it is created and has no endpoint to change
 * them afterwards — a row that led nowhere would be a promise the page could not
 * keep. And the **role notice** is a reading by definition: it is what happened,
 * not a setting. It is also the one row whose absence is meaningful — the server
 * shows it to the member it is about and to the Owner and refuses everybody else,
 * so a viewer with no business reading it gets no row rather than an error.
 */
export default function MemberSettings({ member, members, onRemoved }: MemberSettingsProps) {
  const actor = useCurrentUser()
  const profile = useResource((signal) => api.member(member, signal), [member])
  // Refused for anybody who is neither this member nor the Owner, which is not a
  // failure -- it is the answer, and the row simply does not appear.
  const notice = useResource((signal) => api.roleNotice(member, actor, signal), [member, actor])
  const action = useAction()

  // Which irreversible row is armed, if either. One at a time, so a stray press
  // is never one click from something final.
  const [armed, setArmed] = useState<'transfer' | 'remove' | undefined>(undefined)

  const viewerRole = members.find((entry) => entry.name === actor)?.role
  const role = profile.data?.role
  // Read out here rather than off `profile.data` in the list below: a callback
  // does not keep the narrowing the surrounding guard gives it.
  const branches = profile.data?.branches ?? []
  const self = member === actor

  // Only the Owner moves anybody between the two lower tiers, and nobody is moved
  // *out* of Owner: ownership transfers rather than being revoked.
  const mayChangeRole = canGovern(viewerRole) && !self && role !== undefined && role !== 'owner'
  const mayTransfer = canGovern(viewerRole) && !self
  // A Maintainer may remove a Contributor and nobody else.
  const mayRemove = canRelease(viewerRole) && !self && role === 'contributor'
  // Waited for rather than assumed: an unanswered read is not yet a refusal, and
  // drawing "Never changed" only to take the row away again would be worse than
  // the half-second of nothing.
  const showNotice = !notice.loading && notice.error === undefined

  return (
    <PageBody className="gap-[35px] px-[16px] pt-[20px] pb-[35px] md:pt-[27px] md:pr-[29px] md:pl-[22px]">
      <ResourceState loading={profile.loading} error={profile.error ?? action.error} />

      {profile.data !== undefined && role !== undefined && (
        <>
          <SettingsGroup label="Authority">
            <SettingsRow
              label="Role"
              grows={mayChangeRole}
              value={mayChangeRole ? undefined : titleCase(role)}
              action={
                !mayChangeRole ? undefined : (
                  <OptionSelect
                    label="Role"
                    value={titleCase(role)}
                    // Owner is absent on purpose: it is not a rank to be handed
                    // out, it is the row below.
                    options={['Contributor', 'Maintainer']}
                    disabled={action.pending}
                    onSelect={(next) => {
                      action.run(() =>
                        next === 'Maintainer'
                          ? api.grantMaintainer(member)
                          : api.revokeMaintainer(member),
                      )
                    }}
                  />
                )
              }
              divider={showNotice || mayTransfer}
            />

            {showNotice && (
              <SettingsRow
                // For the person it happened to this is news, and for everyone
                // else it is a record. The label says which one you are reading.
                label={self ? 'Your role changed' : 'Role last changed'}
                value={
                  notice.data === undefined || notice.data === null
                    ? 'Never changed'
                    : `${titleCase(notice.data.old_role)} → ${titleCase(notice.data.new_role)}` +
                      ` by ${notice.data.changed_by}, ${shortDate(notice.data.timestamp)}`
                }
                divider={mayTransfer}
              />
            )}

            {mayTransfer && (
              <SettingsRow
                label="Move ownership here"
                divider={false}
                grows
                action={
                  <Swap
                    className="flex min-w-0 flex-col items-end"
                    swapped={armed === 'transfer'}
                    front={
                      <button
                        type="button"
                        disabled={action.pending}
                        onClick={() => {
                          setArmed('transfer')
                        }}
                        className="flex h-[35px] cursor-pointer items-center border-none bg-transparent p-0 text-[13px] font-medium text-cp-text-tertiary outline-none transition-colors duration-150 ease-out hover:text-cp-text-primary motion-reduce:transition-none disabled:cursor-default disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-cp-accent"
                      >
                        Hand over the project
                      </button>
                    }
                    back={
                      <div className="pt-[3px] pb-[10px]">
                        <div className={POPOVER_SURFACE}>
                          <ConfirmAction
                            question={`Hand this project to ${member}?`}
                            note={`You become a Maintainer, which cannot take it back. Only ${member} could return it.`}
                            confirmLabel={`Make ${member} the owner`}
                            disabled={action.pending}
                            onConfirm={() => {
                              setArmed(undefined)
                              action.run(() => api.transferOwner(member))
                            }}
                            onCancel={() => {
                              setArmed(undefined)
                            }}
                          />
                        </div>
                      </div>
                    }
                  />
                }
              />
            )}
          </SettingsGroup>

          <SettingsGroup label="Branches">
            {branches.length === 0 ? (
              <SettingsRow label="Not on any branch" divider={false} />
            ) : (
              branches.map((branch, index) => (
                <SettingsRow
                  key={branch}
                  label={branch}
                  // Main holds everybody by definition, which is worth saying on
                  // the one row where being listed means nothing in particular.
                  value={branch === 'main' ? 'Everyone' : undefined}
                  divider={index < branches.length - 1}
                />
              ))
            )}
          </SettingsGroup>

          {/* Its own card with no group label, the way Settings draws the one act
              it cannot take back. Two presses rather than a typed name: removing
              a Contributor is undone by inviting them again, which deleting a
              project is not. */}
          {mayRemove && (
            <div className="flex flex-col gap-[10px]">
              {armed === 'remove' && (
                <div className={POPOVER_SURFACE}>
                  <ConfirmAction
                    question={`Remove ${member} from this project?`}
                    note="Their working copies go with them. Their commits and versions stay — history is not theirs to take."
                    confirmLabel={`Remove ${member}`}
                    disabled={action.pending}
                    onConfirm={() => {
                      setArmed(undefined)
                      action.run(() => api.removeMember(member), onRemoved)
                    }}
                    onCancel={() => {
                      setArmed(undefined)
                    }}
                  />
                </div>
              )}
              <Button
                variant="destructive"
                disabled={action.pending || armed === 'remove'}
                onClick={() => {
                  setArmed('remove')
                }}
              >
                Remove from project
              </Button>
            </div>
          )}
        </>
      )}
    </PageBody>
  )
}
