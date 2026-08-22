/**
 * The two facts the front-end has to assume because neither the design nor
 * the backend supplies them yet.
 *
 * PROJECT_ID: the API is multi-project, but the design opens straight into
 * one project with no picker and no create flow. This is the id the backend
 * seeds on startup (DEMO_PROJECT_ID in back-end/main.py) -- the two must
 * agree or every screen 404s.
 *
 * DEFAULT_USER: there is no auth. Every mutating endpoint takes an `actor`
 * string in its body and the backend matches members by display name, so a
 * name stands in for a session until real identity exists. It is what makes
 * the Activity table's Action column asymmetric -- the same commit reads
 * "Merge" to a recipient and "View" to its author -- so it is already
 * load-bearing on read paths, not just on writes.
 *
 * This is only where the app *starts*. Who it is currently acting as lives in
 * `session.ts` and can be switched at runtime; read it from there rather than
 * importing this, or you will be reading the answer from before the switch.
 */
export const PROJECT_ID = 'proj_1'

export const DEFAULT_USER = 'Oliver'
