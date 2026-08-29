import { useState } from 'react'
import { Shell } from './Shell'
import { Join } from './pages/Join'

/**
 * The whole of this app's routing, which is one question: did somebody arrive
 * through a project's link?
 *
 * `/join/<token>` is the only URL the product mints — Settings' "Copy link"
 * writes exactly that — and every other path is the app itself. A router would
 * be a dependency and a set of concepts for one branch, so this reads the path
 * once and answers it.
 *
 * The token is taken at mount and the URL is cleaned up the moment it has been
 * used. Leaving it in the address bar would mean a reload re-asks somebody who
 * is already a member to join, and would leave what is effectively a shared
 * password sitting in browser history and in the tab's title long after it was
 * spent.
 */
function tokenFromPath(): string | undefined {
  const match = /^\/join\/(.+)$/.exec(window.location.pathname)
  if (match === null) return undefined
  const token = decodeURIComponent(match[1]).trim()
  return token === '' ? undefined : token
}

export function Entry() {
  const [token, setToken] = useState(tokenFromPath)

  const done = () => {
    window.history.replaceState(null, '', '/')
    setToken(undefined)
  }

  // Everything that is not a join link is Cseudocode itself, which now opens on
  // its own Home rather than straight into a project — `Shell` is what decides
  // which, and hands off to the project app once one is opened.
  if (token === undefined) return <Shell />
  return <Join token={token} onJoined={done} />
}
