/**
 * The two log tables, Activity and Archive. Both are handed straight to `DataTable`,
 * which is why their rows are type aliases rather than interfaces.
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
   * The log line, verbatim. The design system is explicit that the source's
   * inconsistent version casing (`v3` and `V3` both occur), its stray double
   * spaces and its `V1 .1` are to be reproduced rather than tidied.
   */
  activity: string
  action: ActivityAction
}

export const ACTIVITY: ActivityEntry[] = [
  { who: 'Oliver', activity: 'Pushed Orchid Lab V3 to main', action: 'View' },
  { who: 'Eden Sears', activity: 'Committed refined ContentView.js v2.1 ', action: 'Merge' },
  { who: 'Eden Sears', activity: 'Committed refined ContentView.js v2 ', action: 'Merge' },
  {
    who: 'Juliana',
    activity: 'Committed refined  TableView.js v2, TableContent.css v3  ',
    action: 'Undo',
  },
  { who: 'Juliana', activity: 'Pushed TableView.js v2 to main ', action: 'View' },
  { who: 'Eden Sears', activity: 'Committed ContentView.js v1.2 ', action: 'Merge' },
  { who: 'Oliver', activity: 'Pushed Orchid Lab V2.1 to main', action: 'View' },
  { who: 'Oliver', activity: 'Undo Orchid Lab V2 to main  ', action: 'View' },
  { who: 'Oliver', activity: 'Pushed Orchid Lab V2 to main ', action: 'View' },
  { who: 'Juliana', activity: 'Pushed TableView.js V1 .1 to main', action: 'View' },
  { who: 'Juliana', activity: 'Committed TableView.js V1 .1', action: 'Merge' },
  { who: 'Eden Sears', activity: 'Pushed ContentView.js v1.1.1 to main', action: 'View' },
  { who: 'Oliver', activity: 'Committed Orchid Lab V2 ', action: 'View' },
  { who: 'Eden Sears', activity: 'Committed ContentView.js v1.1.1', action: 'Merge' },
  { who: 'Eden Sears', activity: 'Committed ContentView.js v1.1', action: 'Merge' },
  { who: 'Juliana', activity: 'Committed TableView.js V1 ', action: 'Merge' },
  { who: 'Oliver', activity: 'Undo Orchid Lab V0.1 to main', action: 'View' },
  { who: 'Eden Sears', activity: 'Committed ContentView.js v0.1.1', action: 'Merge' },
  { who: 'Eden Sears', activity: 'Committed ContentView.js v0.1', action: 'Merge' },
  { who: 'Juliana', activity: 'Committed TableView.js V0.1 ', action: 'Merge' },
  { who: 'Oliver', activity: 'Pushed Orchid Lab V0.1 to main', action: 'View' },
]

/** The archive's action column offers one more word than the activity log's. */
export type ArchiveAction = 'Undo' | 'Applied'

export type ArchiveEntry = {
  version: string
  /** Terse in the archive table, unlike the activity log's long-form stamps. */
  time: string
  action: ArchiveAction
}

/** Verbatim again — the third row drops the `v` the others carry. */
export const ARCHIVE: ArchiveEntry[] = [
  { version: 'Orchid Lab v3', time: 'Aug 10', action: 'Undo' },
  { version: 'Orchid Lab v2', time: 'Aug 7', action: 'Applied' },
  { version: 'Orchid Lab 1.2', time: 'Aug 4', action: 'Undo' },
  { version: 'Orchid Lab v1', time: 'Aug 2', action: 'Undo' },
  { version: 'Orchid Lab v0.1.1', time: 'Aug 1', action: 'Undo' },
  { version: 'Orchid Lab v0.1', time: 'Aug 1', action: 'Undo' },
]
