import { CURRENT_USER, PROJECT_ID } from '../config'
import { bumpRevision } from './revision'
import type {
  ActivityEventDto,
  ArchiveRowDto,
  BranchDto,
  CommentDto,
  FileNodeDto,
  MemberActivityDto,
  MemberDto,
  OverviewDto,
  SettingsDto,
} from './types'

/**
 * Everything goes through /api, which Vite proxies to the backend (see
 * vite.config.ts). Nothing here knows the API's real host, which is what
 * lets the same build run behind a single origin in production.
 */
const BASE = '/api'

/**
 * A failed request that still reached the server. `status` is kept because
 * the API distinguishes meaningfully: 403 is a role the actor does not have,
 * 422 an attachment that does not resolve, 404 a project that is not there.
 */
export class ApiError extends Error {
  // Declared and assigned rather than a constructor parameter property:
  // tsconfig sets erasableSyntaxOnly, so no TypeScript-only syntax that
  // emits runtime code is allowed.
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    signal,
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    // FastAPI puts the human-readable reason in `detail`; fall back to the
    // status line for anything that failed before a handler ran.
    let detail = response.statusText
    try {
      const body: unknown = await response.json()
      if (body !== null && typeof body === 'object' && 'detail' in body) {
        detail = String(body.detail)
      }
    } catch {
      // A non-JSON error body (a proxy 502, say) leaves statusText in place.
    }
    throw new ApiError(response.status, detail)
  }

  return response.json() as Promise<T>
}

/**
 * Every mutating route takes the acting member in its body -- the API has no
 * session, so identity travels with each call. Injecting it here rather than
 * at each call site means no component has to know that.
 *
 * A successful write bumps the revision counter, which is what makes the
 * screens behind the action refresh. A failed one deliberately does not:
 * nothing changed, so nothing is stale.
 */
async function post<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ actor: CURRENT_USER, ...body }),
  })

  if (!response.ok) {
    let detail = response.statusText
    try {
      const parsed: unknown = await response.json()
      if (parsed !== null && typeof parsed === 'object' && 'detail' in parsed) {
        detail = String(parsed.detail)
      }
    } catch {
      // Non-JSON error body; statusText stands.
    }
    throw new ApiError(response.status, detail)
  }

  const result = (await response.json()) as T
  bumpRevision()
  return result
}

/** Path-safe encoding for the display names and branch names used as ids. */
const seg = (value: string) => encodeURIComponent(value)

const project = `/projects/${seg(PROJECT_ID)}`

export const api = {
  overview: (signal?: AbortSignal) => get<OverviewDto>(`${project}/overview`, signal),

  team: (signal?: AbortSignal) => get<MemberDto[]>(`${project}/team`, signal),

  branches: (signal?: AbortSignal) => get<BranchDto[]>(`${project}/branches`, signal),

  branchFiles: (branch: string, signal?: AbortSignal) =>
    get<FileNodeDto[]>(`${project}/branches/${seg(branch)}/files`, signal),

  activity: (viewer: string, signal?: AbortSignal) =>
    get<ActivityEventDto[]>(`${project}/activity/${seg(viewer)}`, signal),

  memberActivity: (member: string, signal?: AbortSignal) =>
    get<MemberActivityDto[]>(`${project}/team/${seg(member)}/activity`, signal),

  archive: (signal?: AbortSignal) => get<ArchiveRowDto[]>(`${project}/archive`, signal),

  settings: (signal?: AbortSignal) => get<SettingsDto>(`${project}/settings`, signal),

  comments: (commitId: string, signal?: AbortSignal) =>
    get<CommentDto[]>(`${project}/commits/${seg(commitId)}/comments`, signal),

  // ---- writes -------------------------------------------------------

  /** Adopt a commit addressed to you. Flips its Activity row to "Undo". */
  merge: (commitId: string) => post(`${project}/merge/${seg(commitId)}`),

  /** Reverse your own merge. Flips the same row back to "Merge". */
  unmerge: (commitId: string) => post(`${project}/unmerge/${seg(commitId)}`),

  /** Roll production back to a version that was deployed at some point. */
  rollback: (versionLabel: string) =>
    post(`${project}/undo`, { version_label: versionLabel }),

  /** Release a Main version. Defaults to Main's head. */
  deploy: (versionLabel?: string) =>
    post(`${project}/deploy`, { version_label: versionLabel ?? null }),

  createBranch: (name: string, deploySubdomain?: string) =>
    post(`${project}/branches`, {
      name,
      deploy_subdomain: deploySubdomain === undefined || deploySubdomain === ''
        ? null
        : deploySubdomain,
    }),

  /**
   * A proposal against the named files. `file_contents` is left empty
   * because the browser has no way to read a file yet -- see the note in
   * ActionComposer -- so the backend diffs the paths against the branch
   * head and records a zero-line change.
   */
  commit: (branch: string, comment: string, paths: string[], viewBy: string[]) =>
    post(`${project}/commit`, {
      branch,
      comment,
      loose_files: paths,
      file_contents: {},
      view_by: viewBy,
    }),

  /** Promotes the named files onto the branch as a new version. */
  push: (branch: string, comment: string, paths: string[]) =>
    post(`${project}/push`, {
      branch,
      comment,
      loose_files: paths,
      file_contents: {},
    }),

  addComment: (commitId: string, text: string) =>
    post(`${project}/commits/${seg(commitId)}/comments`, { text }),

  flagCommit: (commitId: string, flagged: boolean) =>
    post(`${project}/commits/${seg(commitId)}/flag`, { flagged }),

  setLinkAccess: (enabled: boolean) => post<SettingsDto>(`${project}/settings/link`, { enabled }),

  setDefaultInviteRole: (role: string) =>
    post<SettingsDto>(`${project}/settings/default-invite-role`, { role }),

  setBranchesEnabled: (enabled: boolean) =>
    post<SettingsDto>(`${project}/settings/branches`, { enabled }),

  setVisibility: (value: string) =>
    post<SettingsDto>(`${project}/settings/visibility`, { value }),

  setCustomDomain: (value: string | null) =>
    post<SettingsDto>(`${project}/settings/custom-domain`, { value }),

  regenerateInvite: () =>
    post<{ invite_token: string }>(`${project}/settings/regenerate-invite`),

  transferOwner: (target: string) =>
    post<SettingsDto>(`${project}/settings/transfer-owner`, { target }),

  deleteProject: () => post<{ deleted: boolean }>(`${project}/settings/delete`),
}
