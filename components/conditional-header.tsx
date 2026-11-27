"use client"

import { usePathname } from "next/navigation"
import { HomepageCountdown } from "@/components/homepage-countdown"
import { SiteHeaderWrapper } from "@/components/site-header-wrapper"
import { shouldHidePublicChrome } from "@/lib/nav/public-shell"

/**
 * Conditionally renders the site header based on the current route.
 * Hides the header on dashboard and admin (each has its own chrome).
 */
export function ConditionalHeader() {
  const pathname = usePathname()

  if (shouldHidePublicChrome(pathname)) {
    return null
  }

  const isHome = pathname === "/"

  return (
    <>
      <SiteHeaderWrapper />
      {isHome ? <HomepageCountdown variant="banner" /> : null}
    </>
  )
}
