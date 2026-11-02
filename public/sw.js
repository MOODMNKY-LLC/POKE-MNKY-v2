// Service Worker for Average at Best Battle League PWA
//
// Caching rules:
//  - /offline (and the assets it needs to hydrate) is precached at install, and the
//    install fails if it cannot be cached, so the first failed navigation always has a fallback.
//  - Only same-origin GET requests are handled. API routes, auth routes, Next.js RSC/data
//    requests and every cross-origin request (Supabase, Discord, CDNs) go straight to the network.
//  - Pages that can contain signed-in content (/dashboard, /admin) are never stored.
//  - Responses marked Cache-Control: no-store/private are never stored.
const CACHE_VERSION = 'aab-battle-league-v3'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`
const CACHE_PREFIX = 'aab-battle-league-'
const OFFLINE_URL = '/offline'

// In local development, caching HTML can cause hydration mismatches because
// stale cached pages may be served while the client bundle is updated.
// Disable SW caching behaviors on localhost/127.0.0.1.
const IS_LOCAL_DEV = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1'

// Best-effort precache: a missing file here must not block installation.
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

// Same-origin paths that are never handled by the service worker.
const NETWORK_ONLY_PREFIXES = ['/api/', '/auth/', '/_next/data/']

// Same-origin HTML that may contain signed-in content: network only, never stored.
const PRIVATE_PAGE_PREFIXES = ['/dashboard', '/admin']

function matchesPrefix(pathname, prefixes) {
  return prefixes.some((prefix) => pathname === prefix.replace(/\/$/, '') || pathname.startsWith(prefix))
}

function isStorable(response) {
  if (!response || !response.ok || response.type !== 'basic' || response.redirected) return false
  const cacheControl = response.headers.get('Cache-Control') || ''
  return !/\b(no-store|private)\b/i.test(cacheControl)
}

async function precacheOfflinePage(cache) {
  const response = await fetch(new Request(OFFLINE_URL, { cache: 'reload' }))
  if (!response.ok || response.redirected) {
    throw new Error(`[SW] ${OFFLINE_URL} could not be precached (status ${response.status})`)
  }
  const html = await response.clone().text()
  await cache.put(OFFLINE_URL, response)

  // The offline page is a client component; precache its scripts and styles so that
  // "Try Again" works even when the very first visit to /offline happens without a network.
  const assetUrls = new Set()
  const assetPattern = /\/_next\/static\/[^"'\\\s)<>]+/g
  let match
  while ((match = assetPattern.exec(html)) !== null) {
    assetUrls.add(match[0])
  }
  await Promise.all(
    Array.from(assetUrls).map(async (assetUrl) => {
      try {
        const assetResponse = await fetch(assetUrl)
        if (assetResponse.ok) await cache.put(assetUrl, assetResponse)
      } catch (error) {
        console.log('[SW] Skipping offline asset:', assetUrl)
      }
    })
  )
}

self.addEventListener('install', (event) => {
  self.skipWaiting()
  if (IS_LOCAL_DEV) return

  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      await precacheOfflinePage(cache)
      await Promise.all(
        STATIC_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {
            console.log('[SW] Skipping precache for', url)
          })
        )
      )
    })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => {
              if (IS_LOCAL_DEV) return name.startsWith(CACHE_PREFIX)
              return name.startsWith(CACHE_PREFIX) && name !== STATIC_CACHE && name !== DYNAMIC_CACHE
            })
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (IS_LOCAL_DEV) return

  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (!url.protocol.startsWith('http')) return
  if (url.origin !== self.location.origin) return
  if (matchesPrefix(url.pathname, NETWORK_ONLY_PREFIXES)) return
  if (url.searchParams.has('_rsc') || request.headers.has('RSC')) return

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request, url))
    return
  }

  if (url.pathname.startsWith('/_next/static/') || STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  if (['image', 'font', 'style', 'script'].includes(request.destination)) {
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE))
  }
})

async function handleNavigation(request, url) {
  const isPrivate = matchesPrefix(url.pathname, PRIVATE_PAGE_PREFIXES)
  try {
    const response = await fetch(request)
    if (!isPrivate && isStorable(response)) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    if (!isPrivate) {
      const cached = await caches.match(request)
      if (cached) return cached
    }
    const offline = await caches.match(OFFLINE_URL)
    if (offline) return offline
    return new Response('You are offline.', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' },
    })
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (isStorable(response)) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    return new Response('Offline - Content not available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' },
    })
  }
}
