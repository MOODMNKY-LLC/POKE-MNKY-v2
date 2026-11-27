"use client"

import { usePathname } from "next/navigation"
import { SiteFooter } from "@/components/site-footer"
import { shouldHidePublicChrome } from "@/lib/nav/public-shell"

/**
 * Public footer on league pages. Hidden on dashboard and admin shells.
 */
export function ConditionalFooter() {
  const pathname = usePathname()

  if (shouldHidePublicChrome(pathname)) {
    return null
  }

  return <SiteFooter />
}
