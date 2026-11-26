import type { NetbirdAccessRequest } from "@/lib/netbird/access-requests"

export type StatusCardState =
  | "paused"
  | "unavailable"
  | "none"
  | "pending"
  | "approved"
  | "invited"
  | "failed"
  | "expired"
  | "blocked"

interface DeriveInput {
  /** The NETBIRD_ONBOARDING_ENABLED kill switch. */
  enabled: boolean
  /** The member's latest request, if any. */
  request: Pick<NetbirdAccessRequest, "status" | "invite_expires_at"> | null
  /** The request lookup failed. */
  unavailable?: boolean
  now?: number
}

/** Which version of the status card to show. The kill switch always wins. */
export function deriveStatusCardState({ enabled, request, unavailable = false, now = Date.now() }: DeriveInput): StatusCardState {
  if (!enabled) return "paused"
  if (unavailable) return "unavailable"
  if (!request) return "none"

  switch (request.status) {
    case "pending":
      return "pending"
    case "approved":
      return "approved"
    case "invited": {
      const expiresAt = request.invite_expires_at ? Date.parse(request.invite_expires_at) : Number.NaN
      return !Number.isNaN(expiresAt) && expiresAt < now ? "expired" : "invited"
    }
    case "failed":
      return "failed"
    case "expired":
      return "expired"
    case "denied":
    case "revoked":
      return "blocked"
    case "cancelled":
      return "none"
  }
}
