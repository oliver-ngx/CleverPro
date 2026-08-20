import { useState } from 'react'
import { avatarFor } from '../api/adapters'
import { api } from '../api/client'
import { PageBody } from '../components/layout/PageBody'
import { AvatarStack } from '../components/ui/AvatarStack'
import { Button } from '../components/ui/Button'
import { ResourceState } from '../components/ui/ResourceState'
import { SettingsGroup } from '../components/ui/SettingsGroup'
import { SettingsRow } from '../components/ui/SettingsRow'
import { CURRENT_USER } from '../config'
import { useAction } from '../hooks/useAction'
import { useResource } from '../hooks/useResource'

/** The API stores lowercase enums; the rows print them capitalised. */
const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

const onOff = (enabled: boolean) => (enabled ? 'On' : 'Off')

/**
 * Project settings: three labelled groups of disclosure rows over one
 * destructive card.
 *
 * Every row that changes something is a toggle or a cycle rather than a
 * screen, because the source draws chevrons but defines no screens behind
 * them. Inventing those screens would be inventing product; making the row
 * itself the control is the smallest thing that makes the setting real.
 *
 * The two irreversible actions — handing the project to someone else, and
 * deleting it — take two presses, and the row says so in between. Nothing
 * else here needs confirming: every other setting can simply be set back.
 */
export default function Settings() {
  const settings = useResource((signal) => api.settings(signal), [])
  const team = useResource((signal) => api.team(signal), [])
  const action = useAction()

  // Which destructive row is currently armed, if either. Cleared whenever the
  // other one arms, so only one dangerous press is ever a single click away.
  const [armed, setArmed] = useState<'transfer' | 'delete' | undefined>(undefined)

  const data = settings.data
  const members = team.data ?? []
  const me = members.find((member) => member.name === CURRENT_USER)
  // Ownership can only move to somebody already on the project. The first
  // other member is as good a default as any; the design draws no picker.
  const heir = members.find((member) => member.name !== CURRENT_USER)
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
            <SettingsRow label="Role" value={me === undefined ? '' : titleCase(me.role)} />
            <SettingsRow
              label="Move owner to"
              value={
                heir === undefined
                  ? 'No one else on the project'
                  : armed === 'transfer'
                    ? `Press again to hand it to ${heir.name}`
                    : heir.name
              }
              chevron={heir !== undefined}
              divider={false}
              disabled={action.pending}
              onClick={
                heir === undefined
                  ? undefined
                  : () => {
                      if (armed !== 'transfer') {
                        setArmed('transfer')
                        return
                      }
                      setArmed(undefined)
                      // Transferring demotes you to Maintainer, which is a
                      // rank too low to transfer it back.
                      action.run(() => api.transferOwner(heir.name))
                    }
              }
            />
          </SettingsGroup>

          <SettingsGroup label="Accessibility">
            <SettingsRow
              label="Anyone with the link"
              value={onOff(data.anyone_with_link)}
              chevron
              disabled={action.pending}
              onClick={() => {
                action.run(() => api.setLinkAccess(!data.anyone_with_link))
              }}
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
              value={titleCase(data.default_invite_role)}
              chevron
              disabled={action.pending}
              onClick={() => {
                // Two of the three roles can be handed out by invitation;
                // Owner is transferred, never granted, so the cycle is a pair.
                const next =
                  data.default_invite_role === 'contributor' ? 'maintainer' : 'contributor'
                action.run(() => api.setDefaultInviteRole(next))
              }}
            />
            <SettingsRow
              label="Branches"
              value={onOff(data.branches_feature_enabled)}
              chevron
              divider={false}
              disabled={action.pending}
              onClick={() => {
                // Turning this off does not delete existing branches; it
                // refuses the creation of new ones. Owner-only, so this is
                // one of the rows that 403s for anybody else.
                action.run(() => api.setBranchesEnabled(!data.branches_feature_enabled))
              }}
            />
          </SettingsGroup>

          <SettingsGroup label="Production">
            <SettingsRow
              label="Visibility"
              value={titleCase(data.production_visibility)}
              chevron
              disabled={action.pending}
              onClick={() => {
                const next = data.production_visibility === 'public' ? 'private' : 'public'
                action.run(() => api.setVisibility(next))
              }}
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

          {/* Its own card, no group label — the only destructive action in the product. */}
          <Button
            variant="destructive"
            disabled={action.pending}
            onClick={() => {
              if (armed !== 'delete') {
                setArmed('delete')
                return
              }
              setArmed(undefined)
              action.run(() => api.deleteProject())
            }}
          >
            {armed === 'delete' ? 'Press again to delete' : 'Delete this Project'}
          </Button>
        </>
      )}
    </PageBody>
  )
}
