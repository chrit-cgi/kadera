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

  // Only handle same-origin requests — let cross-origin requests (CDNs, Google APIs) pass through unmodified
  if (url.origin !== self.location.origin) return

  // Always bypass cache for API requests and non-GET requests
  if (url.pathname.startsWith('/api/') || request.method !== 'GET') return

  // For navigation requests serve cached shell, fall back to network
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/').then((cached) => cached ?? fetch(request))
    )
    return
  }

  // For same-origin JS/CSS/image assets: try cache first, then network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
    }),
  )
})
