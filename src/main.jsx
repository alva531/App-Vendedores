import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

let refreshing = false
navigator.serviceWorker?.addEventListener('controllerchange', () => {
  if (refreshing) return
  refreshing = true
  window.location.reload()
})

registerSW({
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    registration.update().catch(() => {})
    setInterval(() => registration.update().catch(() => {}), 10 * 60 * 1000)
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
