export const NETBIRD_REQUEST_STATUSES = ["pending", "approved", "denied", "invited", "cancelled"] as const

export type NetbirdRequestStatus = (typeof NETBIRD_REQUEST_STATUSES)[number]

export const DEVICE_NOTE_MAX_LENGTH = 280

export interface NetbirdAccessRequest {
  id: string
  user_id: string
  display_name: string | null
  role: string | null
  discord_id: string | null
  discord_username: string | null
  device_note: string | null
  status: NetbirdRequestStatus
  created_at: string
  reviewed_by: string | null
  reviewed_at: string | null
}

export const NETBIRD_REQUEST_COLUMNS =
  "id, user_id, display_name, role, discord_id, discord_username, device_note, status, created_at, reviewed_by, reviewed_at"

export function isNetbirdRequestStatus(value: unknown): value is NetbirdRequestStatus {
  return typeof value === "string" && (NETBIRD_REQUEST_STATUSES as readonly string[]).includes(value)
}

export const STATUS_LABELS: Record<NetbirdRequestStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
  invited: "Invited",
  denied: "Denied",
  cancelled: "Cancelled",
}

/** Review transitions admins may apply: target status -> statuses it may come from. */
export const REVIEW_TRANSITIONS: Partial<Record<NetbirdRequestStatus, NetbirdRequestStatus[]>> = {
  approved: ["pending"],
  denied: ["pending"],
  invited: ["pending", "approved"],
}
