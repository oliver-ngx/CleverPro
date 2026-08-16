import { AvatarStack } from '../components/ui/AvatarStack'
import { Button } from '../components/ui/Button'
import { SettingsGroup } from '../components/ui/SettingsGroup'
import { SettingsRow } from '../components/ui/SettingsRow'

/**
 * Project settings: three labelled groups of disclosure rows over one destructive
 * card. Nothing is behind any of the chevrons yet — the source draws the rows but
 * defines no screen for them to open, so they read rather than act.
 */
export default function Settings() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[35px] overflow-auto px-[16px] pt-[20px] pb-[35px] md:pt-[27px] md:pr-[29px] md:pl-[22px]">
      <SettingsGroup label="Badge">
        <SettingsRow label="Name" value="Oliver" chevron />
        <SettingsRow label="Role" value="Owner" />
        <SettingsRow label="Move owner to" chevron divider={false} />
      </SettingsGroup>

      <SettingsGroup label="Accessibility">
        <SettingsRow label="Anyone with the link" value="On" chevron />
        <SettingsRow
          label="Invite"
          action={
            <button
              type="button"
              className="cursor-pointer border-none bg-transparent p-0 text-[13px] font-medium text-cp-link-alt transition-opacity duration-[120ms] ease-cp active:opacity-[0.55] motion-reduce:transition-none"
            >
              Copy link
            </button>
          }
        />
        <SettingsRow
          label="Teams"
          action={<AvatarStack people={['oliver', 'eden-sears', 'juliana']} />}
          chevron
        />
        <SettingsRow label="Default new invites" value="Contributor" chevron />
        <SettingsRow label="Branches" value="On" chevron divider={false} />
      </SettingsGroup>

      <SettingsGroup label="Production">
        <SettingsRow label="Visibility" value="Public" chevron />
        <SettingsRow label="Custom Domain" chevron divider={false} />
      </SettingsGroup>

      {/* Its own card, no group label — the only destructive action in the product. */}
      <Button variant="destructive">Delete this Project</Button>
    </div>
  )
}
