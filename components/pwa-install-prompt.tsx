"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Download, Smartphone } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if running as PWA
    if (window.navigator.standalone === true) {
      setIsInstalled(true)
      return
    }

    // Check if already installed via localStorage
    const installed = localStorage.getItem('pwa-installed')
    if (installed === 'true') {
      setIsInstalled(true)
      return
    }

    // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Show prompt after a delay (better UX)
      setTimeout(() => {
        setShowPrompt(true)
      }, 3000) // Show after 3 seconds
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
      localStorage.setItem('pwa-installed', 'true')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Fallback for iOS Safari
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        // Show iOS installation instructions
        alert(
          'To install this app:\n\n' +
          '1. Tap the Share button (square with arrow)\n' +
          '2. Scroll down and tap "Add to Home Screen"\n' +
          '3. Tap "Add" to confirm'
        )
      } else {
        // Show generic instructions
        alert('Please use your browser\'s install button in the address bar.')
      }
      return
    }

    // Show the install prompt
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setIsInstalled(true)
      localStorage.setItem('pwa-installed', 'true')
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Don't show again for 7 days
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  // Don't show if already installed or dismissed recently
  useEffect(() => {
    if (isInstalled) return

    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10)
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      if (Date.now() - dismissedTime < sevenDays) {
        setShowPrompt(false)
      }
    }
  }, [isInstalled])

  if (isInstalled || !showPrompt) {
    return null
  }

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>Install Battle League App</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Install our app for a faster, more app-like experience. Get quick access to standings, 
            teams, and battles right from your home screen.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={handleDismiss} 
            className="w-full sm:w-auto"
          >
            <X className="h-4 w-4 mr-2" />
            Maybe Later
          </Button>
          <Button 
            onClick={handleInstall} 
            className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent"
          >
            <Download className="h-4 w-4 mr-2" />
            Install App
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
