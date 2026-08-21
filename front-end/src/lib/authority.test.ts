/**
 * The client's copy of the server's permission rules.
 *
 * Worth testing precisely because it is a copy: a rule that drifts from
 * `core/project.py` produces a control that is offered and then refused, which
 * is a worse experience than one that was never drawn. Each case here has a
 * counterpart in `back-end/tests/`.
 */
import { describe, expect, it } from 'vitest'
import type { SettingsDto } from '../api/types'
import { atLeast, canCreateBranch, canGovern, canRelease } from './authority'

const settings = (overrides: Partial<SettingsDto> = {}): SettingsDto => ({
  anyone_with_link: true,
  invite_token: 'tok-x',
  default_invite_role: 'contributor',
  branches_feature_enabled: true,
  branch_creation_open_to_contributors: false,
  production_visibility: 'private',
  custom_domain: null,
  ...overrides,
})

describe('atLeast', () => {
  it('ranks the three tiers in order', () => {
    expect(atLeast('owner', 'maintainer')).toBe(true)
    expect(atLeast('maintainer', 'maintainer')).toBe(true)
    expect(atLeast('contributor', 'maintainer')).toBe(false)
  })

  it('treats an unknown role as no authority at all', () => {
    // The role is undefined until the team request lands. Hiding a control
    // until then is the safe way round for something the server would refuse.
    expect(atLeast(undefined, 'contributor')).toBe(false)
  })
})

describe('canRelease', () => {
  it('is Maintainer and above — deploy, undo, invite, production settings', () => {
    expect(canRelease('owner')).toBe(true)
    expect(canRelease('maintainer')).toBe(true)
    expect(canRelease('contributor')).toBe(false)
  })
})

describe('canGovern', () => {
  it('is the Owner alone — roles, ownership, deletion, the Branches toggle', () => {
    expect(canGovern('owner')).toBe(true)
    expect(canGovern('maintainer')).toBe(false)
  })
})

describe('canCreateBranch', () => {
  it('needs the feature on, whatever the role', () => {
    const off = settings({ branches_feature_enabled: false })
    expect(canCreateBranch('owner', off)).toBe(false)
    expect(canCreateBranch('contributor', off)).toBe(false)
  })

  it('is open to Maintainer and above by default', () => {
    expect(canCreateBranch('maintainer', settings())).toBe(true)
    expect(canCreateBranch('contributor', settings())).toBe(false)
  })

  it('reaches a Contributor only once the project has opened it to them', () => {
    // The one capability an Owner can move between tiers, which is why this
    // takes two facts rather than one.
    const opened = settings({ branch_creation_open_to_contributors: true })
    expect(canCreateBranch('contributor', opened)).toBe(true)
  })
})
