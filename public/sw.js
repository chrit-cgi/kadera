/**
 * Kadera Service Worker
 * - Pre-caches shell assets on install
 * - Serves cached shell on navigation requests (offline support)
 * - Bypasses cache for all /api/* requests (always network)
 */

const CACHE_NAME = 'kadera-shell-v1'

const SHELL_ASSETS = [
  '/',
  '/manifest.json',
]

// Install: pre-cache shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)),
  )
  self.skipWaiting()
})

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  )
  self.clients.claim()
})

// Fetch: network-first for API, cache-first shell for navigation
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Always bypass cache for API requests
  if (url.pathname.startsWith('/api/')) {
    return // Let browser handle normally
  }

  // For navigation requests (HTML), serve the cached shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/').then((cached) => cached ?? fetch(request)),
      ),
    )
    return
  }

  // For JS/CSS/image assets: try cache first, then network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        // Cache successful responses for static assets
        if (response.ok && !url.pathname.startsWith('/api/')) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
    }),
  )
})
