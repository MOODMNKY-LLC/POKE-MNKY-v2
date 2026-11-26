export const NETBIRD_REQUEST_STATUSES = [
  "pending",
  "approved",
  "invited",
  "failed",
  "expired",
  "revoked",
  "denied",
  "cancelled",
] as const

export type NetbirdRequestStatus = (typeof NETBIRD_REQUEST_STATUSES)[number]

/** A member can have only one request in one of these statuses at a time. */
export const OPEN_REQUEST_STATUSES = ["pending", "approved", "invited"] as const satisfies readonly NetbirdRequestStatus[]

export const DEVICE_NOTE_MAX_LENGTH = 280

export type NetbirdRequestSource = "app" | "discord"
export type NetbirdRequestDecision = "auto_coach" | "admin"

/** Row shape visible to the member who owns the request. Never includes the invite URL. */
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
  source: NetbirdRequestSource
  decision: NetbirdRequestDecision | null
  invite_expires_at: string | null
  delivered_via: string[] | null
  delivered_at: string | null
  revoked_at: string | null
  updated_at: string
}

/** Extra bookkeeping columns for admins and server code only. */
export interface NetbirdAdminAccessRequest extends NetbirdAccessRequest {
  coach_id: string | null
  season_id: string | null
  invite_email: string | null
  netbird_invite_id: string | null
  revoked_by: string | null
  last_error: string | null
  attempt_count: number
}

export const NETBIRD_REQUEST_COLUMN_LIST = [
  "id",
  "user_id",
  "display_name",
  "role",
  "discord_id",
  "discord_username",
  "device_note",
  "status",
  "created_at",
  "reviewed_by",
  "reviewed_at",
  "source",
  "decision",
  "invite_expires_at",
  "delivered_via",
  "delivered_at",
  "revoked_at",
  "updated_at",
] as const satisfies readonly (keyof NetbirdAccessRequest)[]

export const NETBIRD_ADMIN_REQUEST_COLUMN_LIST = [
  ...NETBIRD_REQUEST_COLUMN_LIST,
  "coach_id",
  "season_id",
  "invite_email",
  "netbird_invite_id",
  "revoked_by",
  "last_error",
  "attempt_count",
] as const satisfies readonly (keyof NetbirdAdminAccessRequest)[]

export const NETBIRD_REQUEST_COLUMNS = NETBIRD_REQUEST_COLUMN_LIST.join(", ")
export const NETBIRD_ADMIN_REQUEST_COLUMNS = NETBIRD_ADMIN_REQUEST_COLUMN_LIST.join(", ")

export function isNetbirdRequestStatus(value: unknown): value is NetbirdRequestStatus {
  return typeof value === "string" && (NETBIRD_REQUEST_STATUSES as readonly string[]).includes(value)
}

/** Strips admin-only bookkeeping so a row is safe to hand to the member who owns it. */
export function toMemberRequest(row: NetbirdAccessRequest | NetbirdAdminAccessRequest): NetbirdAccessRequest {
  const member: Record<string, unknown> = {}
  for (const column of NETBIRD_REQUEST_COLUMN_LIST) member[column] = row[column]
  return member as unknown as NetbirdAccessRequest
}

export const STATUS_LABELS: Record<NetbirdRequestStatus, string> = {
  pending: "Waiting for approval",
  approved: "Approved, sending invite",
  invited: "Invite sent",
  failed: "Invite problem",
  expired: "Invite expired",
  revoked: "Access removed",
  denied: "Not approved",
  cancelled: "Cancelled",
}

export const REVIEW_ACTIONS = ["approve", "deny", "revoke", "resend"] as const

export type ReviewAction = (typeof REVIEW_ACTIONS)[number]

export function isReviewAction(value: unknown): value is ReviewAction {
  return typeof value === "string" && (REVIEW_ACTIONS as readonly string[]).includes(value)
}

/** Admin review actions: the statuses each may start from and the status it moves the request to. */
export const REVIEW_TRANSITIONS: Record<ReviewAction, { from: NetbirdRequestStatus[]; to: NetbirdRequestStatus }> = {
  approve: { from: ["pending"], to: "approved" },
  deny: { from: ["pending"], to: "denied" },
  revoke: { from: ["approved", "invited"], to: "revoked" },
  resend: { from: ["invited", "expired", "failed"], to: "approved" },
}
