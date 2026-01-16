"use client"

import { usePathname } from "next/navigation"
import dynamic from "next/dynamic"

/**
 * Conditionally renders the site header based on the current route.
 * Hides the header on dashboard routes since the dashboard has its own sidebar navigation.
 * 
 * Uses dynamic import with ssr: false to avoid server/client boundary issues.
 * The header will still fetch user data client-side, maintaining functionality.
 */
const SiteHeaderWrapper = dynamic(
  () => import("@/components/site-header-wrapper").then((mod) => ({ default: mod.SiteHeaderWrapper })),
  { ssr: false }
)

export function ConditionalHeader() {
  const pathname = usePathname()
  
  // Hide header on dashboard routes
  if (pathname?.startsWith("/dashboard")) {
    return null
  }

  return <SiteHeaderWrapper />
}
