import { isIP } from "net"

/**
 * Client IP for audit attribution. Precedence:
 *  1. x-vercel-forwarded-for (set by Vercel's edge, not client-controllable), first hop
 *  2. x-real-ip
 *  3. x-forwarded-for, first hop (last resort; the client can prepend entries)
 * The first non-empty header wins. Returns null unless that value is a valid IP (the column is inet).
 */
export function getRequestIp(headers: Pick<Headers, "get">): string | null {
  const firstHop = (value: string | null) => value?.split(",")[0]?.trim() ?? ""
  const candidate =
    firstHop(headers.get("x-vercel-forwarded-for")) ||
    firstHop(headers.get("x-real-ip")) ||
    firstHop(headers.get("x-forwarded-for"))
  return candidate && isIP(candidate) !== 0 ? candidate : null
}
