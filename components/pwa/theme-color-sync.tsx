"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { PWA_THEME_COLORS } from "@/lib/pwa/theme-colors"

/**
 * The viewport `theme-color` metas follow the OS color scheme via media queries. When a user picks a
 * theme in the app that differs from the OS, this keeps the browser/status bar color in step with it.
 */
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme()
  const pathname = usePathname()

  React.useEffect(() => {
    if (!resolvedTheme) return
    const color = resolvedTheme === "dark" ? PWA_THEME_COLORS.dark : PWA_THEME_COLORS.light
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
      meta.content = color
    })
  }, [resolvedTheme, pathname])

  return null
}
