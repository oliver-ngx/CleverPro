/**
 * Every endpoint the app can reach, and nothing else.
 *
 * This is a list rather than a layer: the transport lives in `http.ts`, the
 * wire shapes in `types.ts`, and turning those shapes into the ones the
 * screens want is `adapters.ts`. What is here is the API's surface, so that
 * adding a call means adding a line and finding one means reading a list.
 */
import { CURRENT_USER, PROJECT_ID } from '../config'
import { get, post as rawPost, seg } from './http'
import { bumpRevision } from './revision'
import type {
  ActivityEventDto,
  ArchiveRowDto,
  BranchDto,
  CommentDto,
  CreatedBranchDto,
  FileNodeDto,
  MemberActivityDto,
  MemberDto,
  OverviewDto,
  SettingsDto,
} from './types'

export { ApiError } from './http'

/**
 * What a Commit or Push carries. The two halves are the attachment model the
 * product is specified against: a set of individual files, or one whole
 * version of the branch named by its label -- never a silent mixture.
 *
 * Both may be set at once, and that is not an oversight. A commit is a
 * proposal and may be heterogeneous; a push must resolve to one unambiguous
 * next state, so the server refuses a mixed bundle with a 422. The composer
 * disables Push before it gets that far, but the rule is enforced at both
 * ends rather than trusted at one.
 */
export interface AttachmentInput {
  /** A whole version of the target branch, by its label ("V3", "Aug10"). */
  versionRef?: string
  /** A folder read off the user's machine: real paths carrying real content. */
  folder?: { name: string; files: Record<string, string> }
  /** Individual files, by full path. */
  paths?: string[]
}

/**
 * The three kinds, on the wire.
 *
 * A **folder** is the only one that carries content from this side: it was read
 * off the user's machine, so the snapshot travels with the request and replaces
 * the branch's tree wholesale.
 *
 * A **version** carries content too, but the server assembles it — the client
 * sends a label and the backend resolves it to that version's stored files.
 *
 * **Files** carry none, and cannot. A path that came from a tree the browser was
 * handed over JSON has no bytes attached to it, so `file_contents` goes empty
 * and the backend carries each named path's existing content forward. That is
 * why attaching a folder is how you get new content into the project, and
 * attaching files is how you move what is already there.
 */
function attachmentBody(attachment: AttachmentInput) {
  const folder = attachment.folder
  return {
    ...(folder === undefined
      ? {}
      : { folder_ref: folder.name, tree_snapshot: folder.files }),
    ...(attachment.versionRef === undefined ? {} : { version_ref: attachment.versionRef }),
    loose_files: attachment.paths ?? [],
    file_contents: {},
  }
}

/**
 * A write, as the rest of the app sees it.
 *
 * Two things are added on top of the raw POST. The acting member, because the
 * API has no session and identity travels in each body. And a bump of the
 * revision counter on success, which is what makes every live read refetch —
 * a failed write deliberately does not bump, because nothing changed and so
 * nothing is stale.
 */
async function post<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const result = await rawPost<T>(path, CURRENT_USER, body)
  bumpRevision()
  return result
}

const project = `/projects/${seg(PROJECT_ID)}`

export const api = {
  // ---- reads --------------------------------------------------------

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

  /**
   * Archive's row action: make a published version the live one, immediately.
   * Any version on Main's shelf qualifies, whether or not it has been live
   * before -- "Undo" is named for the direction it is usually travelled.
   */
  rollback: (versionLabel: string) =>
    post(`${project}/undo`, { version_label: versionLabel }),

  /** Release a Main version. Defaults to Main's head. */
  deploy: (versionLabel?: string) =>
    post(`${project}/deploy`, { version_label: versionLabel ?? null }),

  /**
   * `name` may be empty: the sheet does not require one and the server
   * generates "{project}-experiment-{date}" in its place. Which is why the
   * created branch's real name comes back in the response rather than being
   * assumed by the caller. `team` omitted means every member, the "All from
   * Main" default the sheet opens on.
   */
  createBranch: (name: string, deploySubdomain?: string, team?: string[]) =>
    post<CreatedBranchDto>(`${project}/branches`, {
      name,
      deploy_subdomain: deploySubdomain === undefined || deploySubdomain === ''
        ? null
        : deploySubdomain,
      team: team ?? null,
    }),

  /** A proposal, routed to `viewBy` -- empty meaning the whole team. */
  commit: (
    branch: string,
    comment: string,
    attachment: AttachmentInput,
    viewBy: string[],
  ) =>
    post(`${project}/commit`, {
      branch,
      comment,
      ...attachmentBody(attachment),
      view_by: viewBy,
    }),

  /** Promotes the attachment onto the branch as a new version. */
  push: (branch: string, comment: string, attachment: AttachmentInput) =>
    post(`${project}/push`, { branch, comment, ...attachmentBody(attachment) }),

  /**
   * Withdraw your own proposal. Valid only while it is still pending -- once
   * anyone has merged it, or it has been pushed, it is history and the server
   * refuses, which is the whole point of the rule.
   */
  retract: (commitId: string) => post(`${project}/retract/${seg(commitId)}`),

  /** Promote one commit's attachment straight onto its branch. */
  pushCommit: (commitId: string, comment?: string) =>
    post<{ push_id: string; version_label: string; branch: string }>(
      `${project}/push_commit/${seg(commitId)}`,
      { comment: comment ?? null },
    ),

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

  /**
   * Role administration, which the product puts on a member's own profile
   * rather than on a roster screen. Owner-only, both of them.
   */
  grantMaintainer: (member: string) =>
    post(`${project}/team/${seg(member)}/grant-maintainer`),

  revokeMaintainer: (member: string) =>
    post(`${project}/team/${seg(member)}/revoke-maintainer`),

  /** Maintainer and above, and only ever a Contributor. */
  removeMember: (member: string) => post(`${project}/team/${seg(member)}/remove`),

  deleteProject: () => post<{ deleted: boolean }>(`${project}/settings/delete`),
}
