import { useEffect, useRef, useState } from 'react'
import { avatarFor } from '../api/adapters'
import { api } from '../api/client'
import { PageBody } from '../components/layout/PageBody'
import { AvatarStack } from '../components/ui/AvatarStack'
import { Button } from '../components/ui/Button'
import { OptionSelect } from '../components/ui/OptionSelect'
import { ResourceState } from '../components/ui/ResourceState'
import { SettingsGroup } from '../components/ui/SettingsGroup'
import { SettingsRow } from '../components/ui/SettingsRow'
import { CURRENT_USER } from '../config'
import { useAction } from '../hooks/useAction'
import { useResource } from '../hooks/useResource'
import { canGovern, canRelease } from '../lib/authority'

/** The API stores lowercase enums; the rows print them capitalised. */
const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

const onOff = (enabled: boolean) => (enabled ? 'On' : 'Off')

interface SettingsProps {
  /** Typed back to confirm deletion, which is the only thing it is used for. */
  projectName: string
}

/**
 * Project settings: labelled groups of disclosure rows over one destructive card.
 *
 * Every row that changes something opens its options in a popover rather than
 * leading to a screen, because the source draws chevrons but defines no screens
 * behind them. Inventing those screens would be inventing product; the popover
 * is the affordance the product already has — it is the branch control's, worn
 * by a settings row — so the chevron leads somewhere real without anything new
 * being invented to lead to.
 *
 * These rows used to cycle their value on each press. That is passable for two
 * states and dishonest for three: it hides what the alternatives are and writes
 * to the server before you have seen them. Now the alternatives are on screen
 * before the press that commits one.
 *
 * **What each member sees is a different page, not the same page greyed out.**
 * A Contributor has no business reading the invite link or the production
 * domain, so those groups are not rendered for them at all; ownership transfer
 * and deletion belong to the Owner alone and are absent for everyone else. A
 * row that would always refuse is worse than no row: it advertises a capability
 * and then withholds it. The server enforces every one of these independently —
 * what is missing here is a courtesy, not the lock.
 *
 * The two irreversible actions are guarded differently, and deliberately.
 * Handing the project to someone else takes two presses, because it can be
 * undone by the new Owner handing it back. Deleting cannot be undone by anyone,
 * so it asks for the project's name to be typed out — the one action in the
 * product that no misplaced click can reach.
 *
 * One thing the spec asks for and this cannot do: a transfer should need the
 * *recipient's* acceptance, so nobody wakes up owning a project. There is no
 * endpoint for an offer, and no notification to carry it, so the transfer here
 * is still unilateral. That is a gap in the API, not a decision taken here.
 */
export default function Settings({ projectName }: SettingsProps) {
  const settings = useResource((signal) => api.settings(signal), [])
  const team = useResource((signal) => api.team(signal), [])
  const action = useAction()

  // Which destructive row is currently armed, if either. Cleared whenever the
  // other one arms, so only one dangerous press is ever a single click away.
  const [armed, setArmed] = useState<'transfer' | 'delete' | undefined>(undefined)
  // Who ownership would go to, once somebody has been picked out of the menu.
  const [heir, setHeir] = useState<string | undefined>(undefined)
  const [typedName, setTypedName] = useState('')
  const confirmRef = useRef<HTMLInputElement>(null)

  // Arming the delete row puts the cursor where the next thing to do is.
  useEffect(() => {
    if (armed === 'delete') confirmRef.current?.focus()
  }, [armed])

  const data = settings.data
  const members = team.data ?? []
  const me = members.find((member) => member.name === CURRENT_USER)
  // Maintainer and above administer the project; the Owner alone governs it.
  const mayAdminister = canRelease(me?.role)
  const mayGovern = canGovern(me?.role)
  // Ownership can only move to somebody already on the project, and which one is
  // now a real choice rather than whoever happened to come first.
  const candidates = members
    .filter((member) => member.name !== CURRENT_USER)
    .map((member) => member.name)
  const faces = members.flatMap((member) => {
    const slug = avatarFor(member.name)
    return slug === undefined ? [] : [slug]
  })

  return (
    <PageBody className="gap-[35px] px-[16px] pt-[20px] pb-[35px] md:pt-[27px] md:pr-[29px] md:pl-[22px]">
      <ResourceState
        loading={settings.loading || team.loading}
        error={settings.error ?? team.error ?? action.error}
      />

      {data !== undefined && (
        <>
          <SettingsGroup label="Badge">
            <SettingsRow label="Name" value={CURRENT_USER} />
            <SettingsRow
              label="Role"
              value={me === undefined ? '' : titleCase(me.role)}
              divider={mayGovern}
            />
            {/* Two steps, because the first is only a choice and the second is
                irreversible: picking a name out of the menu arms the row, and the
                row itself is what commits. */}
            {mayGovern &&
              (armed === 'transfer' && heir !== undefined ? (
                <SettingsRow
                  label="Move owner to"
                  value={`Press again to hand it to ${heir}`}
                  chevron
                  divider={false}
                  disabled={action.pending}
                  onClick={() => {
                    setArmed(undefined)
                    // Transferring demotes you to Maintainer, which is a rank
                    // too low to transfer it back.
                    action.run(() => api.transferOwner(heir))
                  }}
                />
              ) : (
                <SettingsRow
                  label="Move owner to"
                  divider={false}
                  // Nothing to open when there is nobody to open it onto, so the
                  // row keeps its line rather than reserving room to grow.
                  grows={candidates.length > 0}
                  action={
                    candidates.length === 0 ? (
                      <span className="truncate">No one else on the project</span>
                    ) : (
                      <OptionSelect
                        label="Move owner to"
                        value={heir ?? 'Choose a member'}
                        options={candidates}
                        disabled={action.pending}
                        onSelect={(name) => {
                          setHeir(name)
                          setArmed('transfer')
                        }}
                      />
                    )
                  }
                />
              ))}
          </SettingsGroup>

          {mayAdminister && (
            <SettingsGroup label="Accessibility">
              <SettingsRow
                label="Anyone with the link"
                grows
                action={
                  <OptionSelect
                    label="Anyone with the link"
                    value={onOff(data.anyone_with_link)}
                    options={['On', 'Off']}
                    disabled={action.pending}
                    onSelect={(next) => {
                      action.run(() => api.setLinkAccess(next === 'On'))
                    }}
                  />
                }
              />
              <SettingsRow
                label="Invite"
                action={
                  <button
                    type="button"
                    onClick={() => {
                      // The API returns a token, not a URL; the link a person
                      // would actually follow is this app's own origin plus it.
                      void navigator.clipboard.writeText(
                        `${window.location.origin}/join/${data.invite_token}`,
                      )
                    }}
                    className="cursor-pointer border-none bg-transparent p-0 text-[13px] font-medium text-cp-link-alt transition-opacity duration-150 ease-out motion-reduce:transition-none active:opacity-[0.55]"
                  >
                    Copy link
                  </button>
                }
              />
              <SettingsRow label="Teams" action={<AvatarStack people={faces} />} />
              <SettingsRow
                label="Default new invites"
                grows
                action={
                  <OptionSelect
                    label="Default new invites"
                    value={titleCase(data.default_invite_role)}
                    // Two of the three roles can be handed out by invitation;
                    // Owner is transferred, never granted, so it is not offered.
                    options={['Contributor', 'Maintainer']}
                    disabled={action.pending}
                    onSelect={(next) => {
                      action.run(() => api.setDefaultInviteRole(next.toLowerCase()))
                    }}
                  />
                }
              />
              <SettingsRow
                label="Branches"
                grows
                divider={false}
                action={
                  <OptionSelect
                    label="Branches"
                    value={onOff(data.branches_feature_enabled)}
                    options={['On', 'Off']}
                    disabled={action.pending}
                    onSelect={(next) => {
                      // Turning this off does not delete existing branches; it
                      // refuses the creation of new ones. Owner-only, so this is
                      // one of the rows that 403s for anybody else.
                      action.run(() => api.setBranchesEnabled(next === 'On'))
                    }}
                  />
                }
              />
            </SettingsGroup>
          )}

          {mayAdminister && (
            <SettingsGroup label="Production">
              <SettingsRow
                label="Visibility"
                grows
                action={
                  <OptionSelect
                    label="Visibility"
                    value={titleCase(data.production_visibility)}
                    options={['Public', 'Private']}
                    disabled={action.pending}
                    onSelect={(next) => {
                      action.run(() => api.setVisibility(next.toLowerCase()))
                    }}
                  />
                }
              />
              <SettingsRow
                label="Custom Domain"
                divider={false}
                action={
                  <input
                    type="text"
                    defaultValue={data.custom_domain ?? ''}
                    placeholder={'None'}
                    disabled={action.pending}
                    // Committed on blur and on Enter rather than per keystroke:
                    // the field overrides the deploy URL the whole product
                    // links to, so it should change when you are done typing.
                    onBlur={(event) => {
                      const next = event.target.value.trim()
                      if (next === (data.custom_domain ?? '')) return
                      action.run(() => api.setCustomDomain(next === '' ? null : next))
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.currentTarget.blur()
                    }}
                    className="min-w-0 border-none bg-transparent text-right text-[13px] font-medium text-cp-text-tertiary outline-none placeholder:text-cp-text-tertiary"
                  />
                }
              />
            </SettingsGroup>
          )}

          {/* Its own card, no group label — the only destructive action in the
              product, and the only one that asks you to type something. */}
          {mayGovern && (
            <div className="flex flex-col gap-[10px]">
              {armed === 'delete' && (
                <input
                  ref={confirmRef}
                  type="text"
                  value={typedName}
                  aria-label={`Type ${projectName} to confirm deletion`}
                  placeholder={`Type ${projectName} to confirm`}
                  onChange={(event) => {
                    setTypedName(event.target.value)
                  }}
                  className="h-[37px] w-full rounded-cp-panel border-none bg-cp-card px-[19px] text-[13px] font-medium text-cp-text-primary outline-none placeholder:text-cp-text-tertiary focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-cp-accent"
                />
              )}
              <Button
                variant="destructive"
                disabled={
                  action.pending || (armed === 'delete' && typedName.trim() !== projectName)
                }
                onClick={() => {
                  if (armed !== 'delete') {
                    setArmed('delete')
                    setTypedName('')
                    return
                  }
                  setArmed(undefined)
                  action.run(() => api.deleteProject())
                }}
              >
                {armed === 'delete' ? 'Delete permanently' : 'Delete this Project'}
              </Button>
            </div>
          )}
        </>
      )}
    </PageBody>
  )
}
