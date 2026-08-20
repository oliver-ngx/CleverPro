import type { MemberDto, SettingsDto } from '../api/types'

export type Role = MemberDto['role']

/** The three tiers, in order. One Owner per project, always. */
const RANK: Record<Role, number> = { contributor: 0, maintainer: 1, owner: 2 }

/**
 * Who is allowed to do what.
 *
 * Every rule here is a copy of one the server already enforces, and that is the
 * point of the copy: hiding a control the API would refuse is a courtesy to the
 * person using it, never the thing that keeps the project safe. A member who
 * gets past these — a stale role in a tab left open, a request made by hand —
 * still meets a 403. So nothing in this file is allowed to be the only check on
 * anything; if a rule appears here and nowhere in `compiler_logic.py`, it is a
 * bug in the backend rather than a feature of the frontend.
 */
export function atLeast(role: Role | undefined, floor: Role): boolean {
  return role !== undefined && RANK[role] >= RANK[floor]
}

/**
 * Branch creation is the one capability the Owner can move between tiers, so it
 * takes two facts rather than one: the feature has to be on at all, and a
 * Contributor only qualifies if the project has opened it to them.
 */
export function canCreateBranch(role: Role | undefined, settings: SettingsDto): boolean {
  if (!settings.branches_feature_enabled) return false
  if (atLeast(role, 'maintainer')) return true
  return role === 'contributor' && settings.branch_creation_open_to_contributors
}

/** Deploy, undo, invite, remove a contributor, and the production settings. */
export function canRelease(role: Role | undefined): boolean {
  return atLeast(role, 'maintainer')
}

/** Grant Maintainer, transfer ownership, delete the project, toggle Branches. */
export function canGovern(role: Role | undefined): boolean {
  return atLeast(role, 'owner')
}
