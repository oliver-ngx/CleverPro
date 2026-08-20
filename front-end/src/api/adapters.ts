/**
 * Turns wire shapes into the shapes the screens were built against.
 *
 * The components in this app were transcribed from Figma before any API
 * existed, so their props describe a drawing: a flat file list, a fused
 * "Orchid Lab V3" string, a bare hostname, a date that reads "Aug 10". The
 * API describes a system: nested trees, a name and a version label kept
 * apart, a full URL, epoch floats. Neither is wrong. This module is the seam
 * between them, and it exists so that seam lives in exactly one file.
 */
import type { PersonName } from '../components/ui/Avatar'
import type { IconName } from '../components/ui/Icon'
import type { ActivityEntry, ArchiveEntry } from '../data/logs'
import type { ProjectFile } from '../data/project'
import type { PaneEntry, TeamMember } from '../data/team'
import type {
  ActivityEventDto,
  ArchiveRowDto,
  FileNodeDto,
  MemberActivityDto,
  MemberDto,
  OverviewDto,
} from './types'

/**
 * Avatars are PNGs keyed by slug, and PersonName is a closed union of the
 * three that exist. The API returns arbitrary display names, so a member the
 * design never drew has no face to show. Rather than 404 an image, unknown
 * names fall through to `undefined` and callers omit the avatar entirely.
 *
 * The real fix is an avatar URL (or initials) on the member payload; until
 * then, adding a fourth teammate means adding a fourth PNG.
 */
const AVATAR_SLUGS: Record<string, PersonName> = {
  Oliver: 'oliver',
  'Eden Sears': 'eden-sears',
  Juliana: 'juliana',
}

export function avatarFor(name: string): PersonName | undefined {
  return AVATAR_SLUGS[name]
}

export function toProject(dto: OverviewDto) {
  return {
    name: dto.project_name,
    // The design prints one string where the API keeps two fields; a project
    // with nothing pushed to it yet has no version to append.
    version: dto.current_version === null
      ? dto.project_name
      : `${dto.project_name} ${dto.current_version}`,
    // Null until the first deploy. A push alone never sets it -- that is the
    // whole point of Invariant 1 -- so this genuinely can be empty.
    deployHost: dto.deploy_url,
    previewSrc: dto.preview_image,
  }
}

/**
 * The file tree arrives nested and stays nested.
 *
 * It used to be flattened to its top level, on the grounds that the source
 * draws a folder's disclosure chevron but never draws one open. That was fine
 * while the tree was a fixture ten files deep; it is not fine now that the
 * project can be a real directory off somebody's machine, where everything
 * that matters is two or three levels down and a single level shows almost
 * nothing. The chevron opens.
 *
 * Folders first, then files, each alphabetised at every level: the API returns
 * them in path order, which interleaves the two.
 */
export function toFiles(nodes: FileNodeDto[]): ProjectFile[] {
  return nodes
    .map((node) => ({
      name: node.name,
      path: node.path,
      isFolder: node.type === 'folder',
      children: node.children === undefined ? [] : toFiles(node.children),
    }))
    .sort((a, b) =>
      a.isFolder === b.isFolder ? a.name.localeCompare(b.name) : a.isFolder ? -1 : 1,
    )
}

/** Every row in the tree, folders included, in the order they are drawn. */
export function flattenFiles(files: ProjectFile[]): ProjectFile[] {
  return files.flatMap((file) => [file, ...flattenFiles(file.children)])
}

export function toTeam(members: MemberDto[], currentUser: string): TeamMember[] {
  return members.flatMap((member) => {
    const id = avatarFor(member.name)
    if (id === undefined) return []
    const self = member.name === currentUser
    return [{
      id,
      // The rail spells the signed-in user "Oliver (You)"; the API just
      // returns the name, so the suffix is presentation and belongs here.
      name: self ? `${member.name} (You)` : member.name,
      // The API has no presence concept at all -- no heartbeat, no socket,
      // no last-seen. Everyone reads as offline until one exists.
      online: false,
      ...(self ? { self: true } : {}),
    }]
  })
}

/**
 * Both log endpoints return oldest-first; both tables read newest-first.
 * (The archive endpoint is already reversed server-side, which is why only
 * the activity feed gets flipped here.)
 */
export function toActivityRows(events: ActivityEventDto[]): ActivityEntry[] {
  return events
    .map((event) => ({
      who: event.actor,
      activity: event.description,
      action: event.action,
      commitId: event.commit_id ?? '',
    }))
    .reverse()
}

/** "Jul 24, 2026 at 08:26 PM" -- the long-form stamp the detail pane draws. */
function longStamp(epochSeconds: number): string {
  const at = new Date(epochSeconds * 1000)
  const day = at.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const time = at.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return `${day} at ${time}`
}

/** "Aug 7" -- the terse stamp the archive table draws, from epoch seconds. */
function shortDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function toArchiveRows(rows: ArchiveRowDto[], projectName: string): ArchiveEntry[] {
  return rows.map((row) => ({
    // Version labels are generated by the backend (V1, V2, ...), so this
    // reads "Orchid Lab V6" where the Figma mock reads "Orchid Lab v2".
    // Same shape, different numbering -- the mock's labels were drawn by
    // hand and no endpoint can reproduce them.
    version: `${projectName} ${row.version_label}`,
    time: shortDate(row.time),
    action: row.action,
    versionLabel: row.version_label,
  }))
}

/** The glyph a row wears is chosen by what kind of file its title names. */
const ICONS: { match: RegExp; icon: IconName; size: number }[] = [
  { match: /\.swift\b/i, icon: 'swift', size: 22 },
  { match: /\.md\b/i, icon: 'book-md', size: 18 },
  { match: /\.css\b/i, icon: 'file', size: 16 },
  { match: /\.[a-z0-9]+\b/i, icon: 'file', size: 16 },
]

export function iconForFile(title: string) {
  return ICONS.find((entry) => entry.match.test(title)) ?? { icon: 'file' as IconName, size: 16 }
}

/**
 * A teammate's pane. The API returns log lines; the row wants a title, a
 * glyph and a face stack.
 *
 * The row names the artefact, not the message: a commit is titled by the
 * files it changed and a push by the project at the version it produced.
 * The comment travels alongside and is read under the file preview in the
 * detail pane, which is where a sentence has room to be one. That is why
 * the fused `description` ("Committed refined ContentView.js v2.1") is left
 * alone here -- the endpoint hands over the parts, so there is no prose to
 * unpick. A commit whose attachment named no path at all has nothing to be
 * titled by, so it falls back to its comment rather than drawing an empty row.
 *
 * The faces are the weak spot. `member_activity` returns no participant
 * list, so there is nothing to build a real stack from -- these are simply
 * the project's other members. Fixing it properly means the endpoint
 * returning a commit's `view_by` recipients.
 */
export function toPaneEntries(
  rows: MemberActivityDto[],
  member: string,
  team: MemberDto[],
  projectName: string,
): PaneEntry[] {
  const others = team
    .filter((other) => other.name !== member)
    .flatMap((other) => {
      const slug = avatarFor(other.name)
      return slug === undefined ? [] : [slug]
    })

  return rows
    .map((row) => {
      if (row.type === 'push') {
        // "Orchid Lab V3" -- the same fused string the archive table prints,
        // because both are naming one version of the whole project.
        const title = row.version_label === undefined
          ? projectName
          : `${projectName} ${row.version_label}`
        // Pushes are the taller row shape, and passing a subtitle is the
        // only thing that selects it -- see VersionRow.
        return {
          id: row.event_id,
          icon: 'eye' as IconName,
          iconSize: 18,
          title,
          comment: row.comment,
          stamp: longStamp(row.timestamp),
          subtitle: 'Preview',
          avatars: others,
        }
      }

      // Paths, because the API addresses files by their full path; the row
      // shows the leaf, which is the name anyone would say out loud.
      const files = (row.files ?? []).map((path) => path.split('/').pop() ?? path)
      const title = files.length === 0 ? row.comment.trim() : files.join(', ')
      const { icon, size } = iconForFile(files[0] ?? title)
      return {
        id: row.event_id,
        icon,
        iconSize: size,
        title,
        comment: row.comment,
        stamp: longStamp(row.timestamp),
        avatars: others,
        ...(row.commit_id === null ? {} : { commitId: row.commit_id }),
        ...(row.status === undefined ? {} : { status: row.status }),
        ...(row.flagged === undefined ? {} : { flagged: row.flagged }),
        ...(row.diff === undefined ? {} : { diff: row.diff }),
      }
    })
    .reverse()
}

/**
 * Every file path in a tree, folders flattened away.
 *
 * This is what a Commit or Push actually names: the API addresses files by
 * their full path, so a folder is only ever a grouping in the drawing. Sorted
 * so two builds of the same tree produce the same attachment.
 */
export function flattenFilePaths(nodes: FileNodeDto[]): string[] {
  const out: string[] = []
  const walk = (list: FileNodeDto[]) => {
    for (const node of list) {
      if (node.type === 'file') out.push(node.path)
      else if (node.children !== undefined) walk(node.children)
    }
  }
  walk(nodes)
  return out.sort((a, b) => a.localeCompare(b))
}
