/**
 * The two facts the front-end has to assume because neither the design nor
 * the backend supplies them yet.
 *
 * PROJECT_ID: the API is multi-project, but the design opens straight into
 * one project with no picker and no create flow. This is the id the backend
 * seeds on startup (DEMO_PROJECT_ID in back-end/main.py) -- the two must
 * agree or every screen 404s.
 *
 * CURRENT_USER: there is no auth. Every mutating endpoint takes an `actor`
 * string in its body and the backend matches members by display name, so
 * this stands in for a session until real identity exists. It is what makes
 * the Activity table's Action column asymmetric -- the same commit reads
 * "Merge" to a recipient and "View" to its author -- so it is already
 * load-bearing on read paths, not just on writes.
 */
export const PROJECT_ID = 'proj_1'

export const CURRENT_USER = 'Oliver'
