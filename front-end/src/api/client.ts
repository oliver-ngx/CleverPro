/**
 * Every endpoint the app can reach, and nothing else.
 *
 * This is a list rather than a layer: the transport lives in `http.ts`, the
 * wire shapes in `types.ts`, and turning those shapes into the ones the
 * screens want is `adapters.ts`. What is here is the API's surface, so that
 * adding a call means adding a line and finding one means reading a list.
 */
import { PROJECT_ID } from '../config'
import { currentUser } from '../session'
import { get, post as rawPost, seg } from './http'
import { bumpRevision } from './revision'
import type {
  ActivityEventDto,
  ArchiveRowDto,
  BranchDto,
  CommentDto,
  CreatedBranchDto,
  FileContentDto,
  FileNodeDto,
  JoinRequestDto,
  JoinResultDto,
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
  /** Individual files, by full path. */
  paths?: string[]
  /**
   * Loose files read off the user's machine: paths that arrive with their own
   * content rather than naming content the server already holds.
   */
  fileContents?: Record<string, string>
}

/**
 * The two kinds, on the wire.
 *
 * A **version** is the whole of a branch at a label. The client sends the label
 * and the server assembles the bytes, which it is the only side holding; it is
 * the one attachment that replaces a tree rather than editing it.
 *
 * **Files** are loose paths, and whether they carry content depends on where the
 * path came from. One picked out of the branch's own tree has no bytes attached
 * to it — that tree arrived over JSON as paths — so it goes into `loose_files`
 * alone and the backend carries its existing content forward. One read off the
 * user's machine travels with its text in `file_contents`, and the backend writes
 * that over whatever the path held.
 *
 * A folder picked off disk is the second kind, not a third: its files arrive as
 * paths under the folder's own name, so attaching `scripts/` adds `scripts/` to
 * the project. Only the named paths change and everything else on the branch is
 * left alone, which is why nothing this client sends can delete a file.
 *
 * `folder_ref` and `tree_snapshot` are therefore never sent from here. They stay
 * in the API because the server sets them itself when it resolves a `version_ref`,
 * and because undo and the demo seed build attachments that genuinely are whole
 * trees.
 */
function attachmentBody(attachment: AttachmentInput) {
  const contents = attachment.fileContents ?? {}
  // A path picked off disk may name a file the branch already has, in which case
  // it is one entry carrying content, not two entries disagreeing about whether
  // it has any.
  const loose = [...new Set([...(attachment.paths ?? []), ...Object.keys(contents)])]

  return {
    ...(attachment.versionRef === undefined ? {} : { version_ref: attachment.versionRef }),
    loose_files: loose,
    file_contents: contents,
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
  // Read per request rather than captured at import: the acting member can
  // change while the app is running, and a request must go out as whoever is
  // acting when it is sent.
  const result = await rawPost<T>(path, currentUser(), body)
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

  /** One version's whole file tree, which is what a push row opens onto. */
  versionFiles: (branch: string, versionLabel: string, signal?: AbortSignal) =>
    get<FileNodeDto[]>(
      `${project}/branches/${seg(branch)}/versions/${seg(versionLabel)}/files`,
      signal,
    ),

  /**
   * One file's text, at one version of one branch.
   *
   * The path is a query parameter because it contains slashes -- as a path segment
   * it could not be told apart from the route around it. Every version stays
   * retrievable, so this is addressed by label rather than by "latest": the browser
   * asks for the version it is currently showing.
   */
  fileContent: (branch: string, versionLabel: string, path: string, signal?: AbortSignal) =>
    get<FileContentDto>(
      `${project}/branches/${seg(branch)}/versions/${seg(versionLabel)}/files/content` +
        `?path=${encodeURIComponent(path)}`,
      signal,
    ),

  /** Who is waiting at the door. The Owner's list, so the reader names themselves. */
  joinRequests: (actor: string, signal?: AbortSignal) =>
    get<JoinRequestDto[]>(`${project}/access/requests?actor=${encodeURIComponent(actor)}`, signal),

  activity: (viewer: string, signal?: AbortSignal) =>
    get<ActivityEventDto[]>(`${project}/activity/${seg(viewer)}`, signal),

  memberActivity: (member: string, signal?: AbortSignal) =>
    get<MemberActivityDto[]>(`${project}/team/${seg(member)}/activity`, signal),

  archive: (signal?: AbortSignal) => get<ArchiveRowDto[]>(`${project}/archive`, signal),

  settings: (signal?: AbortSignal) => get<SettingsDto>(`${project}/settings`, signal),

  comments: (commitId: string, signal?: AbortSignal) =>
    get<CommentDto[]>(`${project}/commits/${seg(commitId)}/comments`, signal),

  // ---- writes -------------------------------------------------------

  /**
   * Ask to join, holding the project's link.
   *
   * The one call in this file that does not go through `post` -- it carries a
   * token and a name instead of an actor, because whoever is making it is not a
   * member yet and so has no actor to name. It bumps the revision by hand for
   * the same reason every other write does: the roster it just changed is on
   * screen behind the join card.
   */
  join: async (token: string, name: string) => {
    const result = await rawPost<JoinResultDto>(`${project}/access/join`, name, { token, name })
    bumpRevision()
    return result
  },

  /** The Owner's answer to one pending request. No role means the project default. */
  approveJoin: (name: string, role?: string) =>
    post(`${project}/access/requests/approve`, { name, role: role ?? null }),

  /** Turn one down. Deliberately silent -- the server records nothing. */
  rejectJoin: (name: string) => post(`${project}/access/requests/reject`, { name }),

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

  /**
   * A proposal, routed to `viewBy` -- empty meaning the whole team.
   *
   * `name` is what its author calls it, and is required: there is no automatic
   * one, and a blank one is refused with a 422. It is only ever displayed --
   * the row in a member's pane titles itself with it instead of with the files
   * the commit changed.
   */
  commit: (
    branch: string,
    comment: string,
    attachment: AttachmentInput,
    viewBy: string[],
    name: string,
  ) =>
    post(`${project}/commit`, {
      branch,
      comment,
      ...attachmentBody(attachment),
      view_by: viewBy,
      name,
    }),

  /**
   * Promotes the attachment onto the branch as a new version.
   *
   * `name` becomes that version's label -- the string Archive lists, undo
   * names and the file browser reads by -- and like a commit's it is required.
   * Two versions cannot answer to one name, so a name the branch already holds
   * is refused with a 400 rather than adjusted into something the sender did
   * not choose.
   */
  push: (branch: string, comment: string, attachment: AttachmentInput, name: string) =>
    post(`${project}/push`, {
      branch,
      comment,
      ...attachmentBody(attachment),
      name,
    }),

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
