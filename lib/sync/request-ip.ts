import { isIP } from "net"

/**
 * Client IP for audit attribution: first hop of x-forwarded-for, else x-real-ip.
 * Returns null unless the value is a valid IP (the column is inet).
 */
export function getRequestIp(headers: Pick<Headers, "get">): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const candidate = forwarded || headers.get("x-real-ip")?.trim() || ""
  return candidate && isIP(candidate) !== 0 ? candidate : null
}
