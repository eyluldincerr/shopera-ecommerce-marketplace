import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './i18n.js'
import App from './App.jsx'
import CartContextProvider from './context/CartContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'
import { WishlistProvider } from './context/WishlistContext.jsx'
import { synchronizeCurrentUser } from './services/authService.js'

// If a deployment replaces old lazy-loaded chunks while a Buyer/Seller still has
// an older page open, Vite emits vite:preloadError. Reload once so the browser
// receives the newest index/chunk references instead of leaving a broken screen.
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    const storageKey = 'shopera:last-preload-reload'
    const now = Date.now()
    let lastReload = 0

    try {
      lastReload = Number(sessionStorage.getItem(storageKey)) || 0
    } catch {
      // Storage may be unavailable in a restricted browser context. A reload is
      // still the safest recovery for a stale production chunk.
    }

    if (now - lastReload < 10_000) {
      return
    }

    event.preventDefault()

    try {
      sessionStorage.setItem(storageKey, String(now))
    } catch {
      // Ignore storage failures; the reload itself is the recovery action.
    }

    window.location.reload()
  })
}

// Restore the server-backed identity after a reload. Network failures leave the
// unexpired local session intact; a backend 401 clears it through axiosClient.
void synchronizeCurrentUser().catch(() => {})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <CartContextProvider>
        <NotificationProvider>
          <WishlistProvider>
            <App />
          </WishlistProvider>
        </NotificationProvider>
      </CartContextProvider>
    </BrowserRouter>
  </StrictMode>,
)
