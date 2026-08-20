/**
 * Row shapes for the two log tables, Activity and Archive.
 *
 * Types only. The rows themselves come from the API now -- see
 * api/adapters.ts, which maps the activity feed and the archive surface onto
 * these -- but the shapes stay declared here because both tables and both
 * adapters have to agree on them.
 */

/** View, Merge and Undo are the only words the Action column ever holds. */
export type ActivityAction = 'View' | 'Merge' | 'Undo'

/**
 * A type alias rather than an interface on purpose: only an alias carries the
 * implicit index signature that lets a row be handed to DataTable as a record.
 */
export type ActivityEntry = {
  who: string
  /**
   * The log line exactly as the server composed it. The backend renders a row
   * as "Committed {comment}" or "Pushed {comment} to {branch}", so whatever
   * inconsistency the author typed -- mixed version casing, a stray double
   * space -- travels through untouched. DataTable sets `whitespace-pre` to
   * preserve that rather than collapse it, which is also why it scrolls
   * sideways instead of wrapping.
   */
  activity: string
  action: ActivityAction
  /**
   * The commit this row is about, or empty on a push or undo row. Carried on
   * the row rather than looked up, because the Action button needs it and
   * DataTable hands its handler the whole row. It is never rendered -- the
   * table only draws the three columns it is given.
   */
  commitId: string
}

/**
 * The archive's action column, and the whole of it. "Applied" marks the live
 * version and is a status rather than a control; "Undo" is on every other row
 * and applies that version immediately.
 */
export type ArchiveAction = 'Undo' | 'Applied'

export type ArchiveEntry = {
  version: string
  /** Terse in the archive table, unlike the activity log's long-form stamps. */
  time: string
  action: ArchiveAction
  /**
   * The bare version label the API knows this row by -- "V6", where `version`
   * above reads "Orchid Lab V6". Carried for the Undo button, never rendered.
   */
  versionLabel: string
}
