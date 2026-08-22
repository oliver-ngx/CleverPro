import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ErrorBoundary } from './components/layout/ErrorBoundary.tsx'
import { Entry } from './Entry.tsx'

// index.html always carries this, so its absence means the document was swapped for
// something else entirely — better to say so than to mount nothing and look broken.
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}
createRoot(rootElement).render(
  <StrictMode>
    {/* The outermost boundary, which catches what the one inside the window
        cannot: the rail, the join screen, and anything that throws before a
        view exists at all. */}
    <ErrorBoundary standalone>
      <Entry />
    </ErrorBoundary>
  </StrictMode>,
)