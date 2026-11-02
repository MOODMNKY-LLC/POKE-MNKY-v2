"use client"

import * as React from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export type InstallState = "unknown" | "installed" | "promptable" | "ios-manual" | "unsupported"

interface InstallAppContextValue {
  state: InstallState
  /** Opens the native install dialog. Resolves to the user's choice, or null when unavailable. */
  promptInstall: () => Promise<"accepted" | "dismissed" | null>
}

const InstallAppContext = React.createContext<InstallAppContextValue | null>(null)

function isStandalone() {
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true
}

function isIosDevice() {
  const ua = window.navigator.userAgent
  const iPadOs = /Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1
  return /iPhone|iPad|iPod/.test(ua) || iPadOs
}

/**
 * Captures `beforeinstallprompt` as early as possible (it only fires once per page load) and
 * exposes it to the Account settings card. It renders nothing, so no install UI appears on load.
 */
export function InstallAppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<InstallState>("unknown")
  const deferredPrompt = React.useRef<BeforeInstallPromptEvent | null>(null)

  React.useEffect(() => {
    if (isStandalone()) {
      setState("installed")
      return
    }
    setState(isIosDevice() ? "ios-manual" : "unsupported")

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      deferredPrompt.current = event as BeforeInstallPromptEvent
      setState("promptable")
    }
    const onInstalled = () => {
      deferredPrompt.current = null
      setState("installed")
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const promptInstall = React.useCallback(async () => {
    const promptEvent = deferredPrompt.current
    if (!promptEvent) return null
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    deferredPrompt.current = null
    setState(outcome === "accepted" ? "installed" : "unsupported")
    return outcome
  }, [])

  const value = React.useMemo(() => ({ state, promptInstall }), [state, promptInstall])

  return <InstallAppContext.Provider value={value}>{children}</InstallAppContext.Provider>
}

export function useInstallApp() {
  const context = React.useContext(InstallAppContext)
  if (!context) throw new Error("useInstallApp must be used within InstallAppProvider")
  return context
}
