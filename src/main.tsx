import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initSentry } from './lib/sentry'

initSentry()

// Stale chunk after a deploy: old HTML requests a hashed chunk that no longer
// exists. Reload once to fetch fresh HTML; the flag prevents a reload loop.
// Deliberately NOT calling event.preventDefault(): that makes Vite's preload
// helper resolve the import() with undefined, so React.lazy crashes on
// module.default before the reload lands. Letting it rethrow is harmless —
// Sentry ignores these messages and the reload recovers.
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem('chunk-reload')) return
  sessionStorage.setItem('chunk-reload', '1')
  window.location.reload()
})
window.addEventListener('load', () => sessionStorage.removeItem('chunk-reload'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
