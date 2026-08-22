/**
 * The shapes the API actually returns, transcribed from back-end/main.py.
 *
 * These are deliberately snake_case and deliberately un-prettified: they
 * describe the wire, not the screens. Turning them into the shapes the
 * components want is adapters.ts, and keeping the two apart is what stops a
 * rename on the server from rippling into twenty components.
 */

/** GET /projects/{id}/overview */
export interface OverviewDto {
  preview_image: string | null
  project_name: string
  /** null until something has been pushed to Main. */
  current_version: string | null
  /** null until something has been deployed -- a push alone never sets it. */
  deploy_url: string | null
  branches: BranchSummaryDto[]
}

export interface BranchSummaryDto {
  name: string
  is_main: boolean
  latest_version: string | null
}

/** GET /projects/{id}/branches */
export interface BranchDto extends BranchSummaryDto {
  deploy_subdomain: string | null
  members: string[]
}

/** GET /projects/{id}/team */
export interface MemberDto {
  name: string
  role: 'contributor' | 'maintainer' | 'owner'
}

/** A node in any of the file-tree endpoints. Folders nest; files are leaves. */
export interface FileNodeDto {
  name: string
  type: 'file' | 'folder'
  path: string
  /** "included in this version" -- not a permanent flag. */
  checked: boolean
  children?: FileNodeDto[]
}

export interface DiffDto {
  added: number
  removed: number
}

/** GET /projects/{id}/activity/{viewer}. Returned oldest-first. */
export interface ActivityEventDto {
  event_id: string
  actor: string
  /**
   * Not every ledger type reaches this feed -- merge, retract and deploy
   * change a row that already exists rather than drawing one of their own.
   * `role_changed` does appear, and only to the person it happened to: the
   * product has no notification surface, so a role change arrives the way
   * everything else does, as an addressed row.
   */
  type: 'commit' | 'push' | 'undo' | 'role_changed'
  description: string
  branch: string | null
  commit_id: string | null
  /** Epoch seconds, as a float. */
  timestamp: number
  /** Asymmetric: the same commit reads "Merge" to a recipient, "View" to its author. */
  action: 'View' | 'Merge' | 'Undo'
  /** Commit rows only. */
  diff?: DiffDto
  flagged?: boolean
  comment_count?: number
}

/** GET /projects/{id}/team/{member}/activity. Returned oldest-first. */
export interface MemberActivityDto {
  event_id: string
  type: 'commit' | 'push'
  /** The fused log line, "Committed {comment}" / "Pushed {comment} to {branch}". */
  description: string
  /** The same comment on its own, which is what the pane actually reads. */
  comment: string
  branch: string | null
  commit_id: string | null
  timestamp: number
  /** Commit rows only: the paths the commit changed. */
  files?: string[]
  /**
   * Commit rows only. Retract is valid on a pending proposal and on nothing
   * else, so the toolbar has to know which one it is looking at.
   */
  status?: 'pending' | 'merged' | 'pushed' | 'retracted'
  /** Commit rows only: whether its author or a reader has flagged it. */
  flagged?: boolean
  /** Push rows only: the version the push produced, "V3" or a branch date-stamp. */
  version_label?: string
  diff?: DiffDto
}

/** GET /projects/{id}/archive. Returned newest-first. */
export interface ArchiveRowDto {
  version_label: string
  pushed_by: string
  /** Named `time`, not `timestamp`, unlike every other endpoint. Epoch seconds. */
  time: number
  /** "Applied" on the live version, "Undo" on every other. */
  action: 'Applied' | 'Undo'
}

/** GET /projects/{id}/branches/{branch}/versions/{label}/files/content */
export interface FileContentDto {
  path: string
  version_label: string
  content: string
}

/** GET /projects/{id}/settings */
export interface SettingsDto {
  anyone_with_link: boolean
  invite_token: string
  default_invite_role: 'contributor' | 'maintainer' | 'owner'
  branches_feature_enabled: boolean
  branch_creation_open_to_contributors: boolean
  production_visibility: string
  custom_domain: string | null
}

/** POST /projects/{id}/branches */
export interface CreatedBranchDto {
  /** The name the server settled on -- generated, if the sheet sent none. */
  branch: string
  members: string[]
  deploy_subdomain: string | null
  seeded_from_main: boolean
}

/** GET /projects/{id}/commits/{commit_id}/comments */
export interface CommentDto {
  comment_id: string
  author: string
  text: string
  timestamp: number
}
