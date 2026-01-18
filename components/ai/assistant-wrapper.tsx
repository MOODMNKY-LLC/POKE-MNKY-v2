"use client"

/**
 * Client-side wrapper for AssistantProvider
 * Prevents SSR issues with usePathname hook
 */

import { Suspense } from "react"
import { AssistantProvider } from "./assistant-provider"

export function AssistantWrapper() {
  return (
    <Suspense fallback={null}>
      <AssistantProvider />
    </Suspense>
  )
}
