import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.js'

// ── Firebase init (skip in bypass mode) ──────────────────────────────────────
// Imported statically so Vite can tree-shake unused Firebase modules.

if (import.meta.env.VITE_DEV_BYPASS_AUTH !== 'true') {
  const { initializeApp } = await import('firebase/app')

  initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  })
}

// ── Mount ─────────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
