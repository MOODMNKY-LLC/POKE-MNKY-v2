/**
 * Paths that use their own shell (sidebar/header) and must not show the public site chrome.
 */
export function shouldHidePublicChrome(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  return pathname.startsWith("/dashboard") || pathname.startsWith("/admin")
}
