import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// index.html always carries this, so its absence means the document was swapped for
// something else entirely — better to say so than to mount nothing and look broken.
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)