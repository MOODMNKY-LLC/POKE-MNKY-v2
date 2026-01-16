"use client"

import { useEffect } from "react"

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          })
          
          console.log('[SW] Service Worker registered:', registration.scope)
          
          // Check for updates immediately and periodically
          registration.update()
          
          // Check for updates every hour
          setInterval(() => {
            registration.update()
          }, 60 * 60 * 1000)
          
          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available, prompt user to refresh
                  console.log('[SW] New service worker available')
                  // Optionally show a toast notification here
                }
              })
            }
          })
          
          // Handle controller change (page refresh after update)
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload()
          })
        } catch (error) {
          console.error('[SW] Service Worker registration failed:', error)
        }
      }
      
      // Register immediately if page is already loaded
      if (document.readyState === 'complete') {
        registerSW()
      } else {
        // Otherwise wait for page load
        window.addEventListener('load', registerSW)
      }
    }
  }, [])

  return null
}
