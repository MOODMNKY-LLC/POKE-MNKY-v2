// Enhanced Service Worker for Average at Best Battle League PWA
const CACHE_VERSION = 'aab-battle-league-v2'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`
const API_CACHE = `${CACHE_VERSION}-api`

// In local development, caching HTML can cause hydration mismatches because
// stale cached pages may be served while the client bundle is updated.
// Disable SW caching behaviors on localhost/127.0.0.1.
const IS_LOCAL_DEV = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1'

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png',
  '/league-logo.svg',
  '/league-logo.png',
]

// API routes that can be cached
const CACHEABLE_API_ROUTES = [
  '/api/standings',
  '/api/teams',
  '/api/schedule',
]

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  if (IS_LOCAL_DEV) {
    // Don’t pre-cache in local dev
    self.skipWaiting()
    return
  }
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets')
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })))
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            // Delete old caches
            return cacheName.startsWith('aab-battle-league-') && 
                   cacheName !== STATIC_CACHE && 
                   cacheName !== DYNAMIC_CACHE &&
                   cacheName !== API_CACHE
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          })
      )
    })
  )
  if (IS_LOCAL_DEV) {
    // Aggressively clear caches in local dev to prevent serving stale HTML.
    event.waitUntil(
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith('aab-battle-league-'))
            .map((cacheName) => caches.delete(cacheName))
        )
      )
    )
  }
  return self.clients.claim()
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  if (IS_LOCAL_DEV) {
    // Bypass SW caching in local dev.
    return
  }
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return
  }

  // API routes - Network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE))
    return
  }

  // Static assets - Cache first, fallback to network
  if (STATIC_ASSETS.some(asset => url.pathname === asset)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE))
    return
  }

  // HTML pages - Network first with cache fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE))
    return
  }

  // Images, fonts, CSS, JS - Cache first
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style' ||
    request.destination === 'script'
  ) {
    event.respondWith(cacheFirstStrategy(request, DYNAMIC_CACHE))
    return
  }

  // Default: Network first
  event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE))
})

// Network First Strategy - Try network, fallback to cache
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request)
    
    // Clone the response because it can only be consumed once
    const responseClone = networkResponse.clone()
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, responseClone)
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url)
    
    // Try cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // If it's a navigation request and we have no cache, return offline page
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline')
      if (offlinePage) {
        return offlinePage
      }
    }
    
    // Return error response
    return new Response('Offline - Content not available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain',
      }),
    })
  }
}

// Cache First Strategy - Try cache, fallback to network
async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    // Clone the response
    const responseClone = networkResponse.clone()
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, responseClone)
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] Cache and network failed:', request.url)
    
    // Return error response
    return new Response('Offline - Content not available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain',
      }),
    })
  }
}

// Background sync for offline actions (future enhancement)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)
  // Future: Queue offline actions for sync when online
})

// Push notifications (future enhancement)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received')
  // Future: Handle push notifications
})
