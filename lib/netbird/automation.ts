import "server-only"

import { resolveLeagueAdminAccess } from "@/lib/admin-api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service"
import {
  NETBIRD_ADMIN_REQUEST_COLUMNS,
  OPEN_REQUEST_STATUSES,
  REVIEW_TRANSITIONS,
  toMemberRequest,
  type NetbirdAccessRequest,
  type NetbirdAdminAccessRequest,
  type NetbirdRequestSource,
  type ReviewAction,
} from "@/lib/netbird/access-requests"
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, signBody } from "@/lib/netbird/worker-signing"

/**
 * Automated NetBird onboarding. Server only.
 *
 * All database writes use the service role. The NetBird API key and Discord bot token live in the
 * `aab-netbird-onboard` Cloudflare Worker and are never read here; this module only calls the Worker over HTTPS
 * with an HMAC-signed body.
 */

const REQUESTS_TABLE = "netbird_access_requests"
const LINKS_TABLE = "netbird_invite_links"
const EVENTS_TABLE = "netbird_onboarding_events"

const WORKER_TIMEOUT_MS = 15_000
const UNIQUE_VIOLATION = "23505"
const MAX_ERROR_LENGTH = 200

export const ONBOARDING_PAUSED_MESSAGE =
  "Battle network onboarding is paused right now. Please check back soon or ask Simeon."
const RATE_LIMITED_MESSAGE = "You have asked several times already. Please wait an hour and try again."
const GENERIC_ERROR_MESSAGE = "Something went wrong on our side. Please try again later."

type Db = ReturnType<typeof createServiceRoleClient>

export type FailureCode = "disabled" | "rate_limited" | "no_email" | "forbidden" | "invalid_state" | "error"

export type RequestAccessResult =
  | { ok: true; request: NetbirdAccessRequest; created: boolean }
  | { ok: false; code: FailureCode; message: string }

export type AdminActionResult =
  | { ok: true; request: NetbirdAdminAccessRequest; /** Approval saved while onboarding is paused: no invite was sent. */ paused?: boolean }
  | { ok: false; code: FailureCode; message: string; request?: NetbirdAdminAccessRequest }

export type InviteResult =
  | { ok: true; request: NetbirdAdminAccessRequest }
  | { ok: false; code: FailureCode; message: string; request?: NetbirdAdminAccessRequest }

/** Kill switch. Only the exact string "true" turns onboarding on. */
export function isOnboardingEnabled(): boolean {
  return process.env.NETBIRD_ONBOARDING_ENABLED === "true"
}

function fail(code: FailureCode, message: string): { ok: false; code: FailureCode; message: string } {
  return { ok: false, code, message }
}

// ---------------------------------------------------------------------------
// Worker transport
// ---------------------------------------------------------------------------

interface WorkerConfig {
  url: string
  secret: string
}

function getWorkerConfig(): WorkerConfig | null {
  const url = process.env.NETBIRD_ONBOARD_WORKER_URL?.trim()
  const secret = process.env.NETBIRD_ONBOARD_SIGNING_SECRET
  if (!url || !secret) return null
  const isSecure = url.startsWith("https://") || url.startsWith("http://localhost")
  if (!isSecure) return null
  return { url: url.replace(/\/+$/, ""), secret }
}

/** Short, single-line error text that is safe to store and show: no URLs, no token-like strings, no secret. */
export function sanitizeError(value: unknown, secret?: string | null): string {
  let text = value instanceof Error ? value.message : typeof value === "string" ? value : "Unknown error"
  if (secret) text = text.split(secret).join("[redacted]")
  text = text
    .replace(/https?:\/\/\S+/gi, "[link]")
    .replace(/[A-Za-z0-9_\-.+/=]{32,}/g, "[redacted]")
    .replace(/\s+/g, " ")
    .trim()
  if (text.length === 0) text = "Unknown error"
  return text.length > MAX_ERROR_LENGTH ? `${text.slice(0, MAX_ERROR_LENGTH - 1)}…` : text
}

type WorkerCallResult = { ok: true; data: Record<string, unknown> } | { ok: false; error: string }

async function callWorker(
  path: "/invite" | "/revoke" | "/notify-admins",
  payload: Record<string, unknown>,
  timeoutMs: number = WORKER_TIMEOUT_MS,
): Promise<WorkerCallResult> {
  const config = getWorkerConfig()
  if (!config) return { ok: false, error: "The onboarding worker is not configured." }

  const body = JSON.stringify(payload)
  const timestamp = Math.floor(Date.now() / 1000).toString()
  try {
    const signature = await signBody(config.secret, timestamp, body)
    const response = await fetch(`${config.url}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [TIMESTAMP_HEADER]: timestamp,
        [SIGNATURE_HEADER]: signature,
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    })

    let data: unknown = null
    try {
      data = await response.json()
    } catch {
      data = null
    }
    const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {}

    if (!response.ok) {
      const detail = typeof record.error === "string" ? `: ${record.error}` : ""
      return { ok: false, error: sanitizeError(`Worker returned HTTP ${response.status}${detail}`, config.secret) }
    }
    if (!data || typeof data !== "object") {
      return { ok: false, error: "The onboarding worker sent an unreadable response." }
    }
    return { ok: true, data: record }
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
    return {
      ok: false,
      error: timedOut
        ? "The onboarding worker took too long to answer."
        : sanitizeError(error instanceof Error ? error.message : "Could not reach the onboarding worker.", config.secret),
    }
  }
}

// ---------------------------------------------------------------------------
// Database helpers
// ---------------------------------------------------------------------------

interface EventInput {
  requestId: string | null
  actorUserId?: string | null
  actorDiscordId?: string | null
  action: string
  detail?: Record<string, unknown>
}

/** Audit logging must never break the flow it describes. */
async function logEvent(db: Db, event: EventInput): Promise<void> {
  const { error } = await db.from(EVENTS_TABLE).insert({
    request_id: event.requestId,
    actor_user_id: event.actorUserId ?? null,
    actor_discord_id: event.actorDiscordId ?? null,
    action: event.action,
    detail: event.detail ?? {},
  })
  if (error) console.error("[netbird] could not write onboarding event:", event.action, error.message)
}

async function findOpenRequest(db: Db, userId: string): Promise<NetbirdAdminAccessRequest | null> {
  const { data, error } = await db
    .from(REQUESTS_TABLE)
    .select(NETBIRD_ADMIN_REQUEST_COLUMNS)
    .eq("user_id", userId)
    .in("status", [...OPEN_REQUEST_STATUSES])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`open request lookup failed: ${error.message}`)
  return (data as unknown as NetbirdAdminAccessRequest | null) ?? null
}

async function loadRequest(db: Db, requestId: string): Promise<NetbirdAdminAccessRequest | null> {
  const { data, error } = await db
    .from(REQUESTS_TABLE)
    .select(NETBIRD_ADMIN_REQUEST_COLUMNS)
    .eq("id", requestId)
    .maybeSingle()
  if (error) throw new Error(`request lookup failed: ${error.message}`)
  return (data as unknown as NetbirdAdminAccessRequest | null) ?? null
}

async function patchRequest(
  db: Db,
  requestId: string,
  patch: Record<string, unknown>,
): Promise<NetbirdAdminAccessRequest> {
  const { data, error } = await db
    .from(REQUESTS_TABLE)
    .update(patch)
    .eq("id", requestId)
    .select(NETBIRD_ADMIN_REQUEST_COLUMNS)
    .single()
  if (error || !data) throw new Error(`request update failed: ${error?.message ?? "no row returned"}`)
  return data as unknown as NetbirdAdminAccessRequest
}

async function lookupEmail(db: Db, userId: string): Promise<string | null> {
  const { data, error } = await db.auth.admin.getUserById(userId)
  if (error) {
    console.error("[netbird] auth user lookup failed:", error.message)
    return null
  }
  const email = data?.user?.email?.trim()
  return email ? email : null
}

// ---------------------------------------------------------------------------
// Worker: invite
// ---------------------------------------------------------------------------

function parseInviteResponse(data: Record<string, unknown>) {
  const status = data.status
  const inviteId = typeof data.invite_id === "string" && data.invite_id ? data.invite_id : null
  const inviteUrl = typeof data.invite_url === "string" && data.invite_url ? data.invite_url : null
  const expiresRaw = typeof data.expires_at === "string" ? Date.parse(data.expires_at) : Number.NaN
  const expiresAt = Number.isNaN(expiresRaw) ? null : new Date(expiresRaw).toISOString()
  const deliveredVia = Array.isArray(data.delivered_via)
    ? data.delivered_via.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
    : []
  const error = typeof data.error === "string" ? data.error : null
  return { status, inviteId, inviteUrl, expiresAt, deliveredVia, error }
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:"
  } catch {
    return false
  }
}

async function markInviteFailed(
  db: Db,
  request: NetbirdAdminAccessRequest,
  attemptCount: number,
  reason: string,
  email: string | null,
): Promise<InviteResult> {
  const updated = await patchRequest(db, request.id, {
    status: "failed",
    last_error: reason,
    attempt_count: attemptCount,
    ...(email ? { invite_email: email } : {}),
  })
  await logEvent(db, { requestId: request.id, action: "invite_failed", detail: { error: reason, attempt: attemptCount } })
  return { ok: false, code: "error", message: GENERIC_ERROR_MESSAGE, request: updated }
}

/**
 * Asks the Worker to create (and deliver) a NetBird invite for an approved request. Never throws for Worker
 * problems: those mark the request `failed` and are returned as `ok: false`.
 */
export async function createInviteViaWorker(request: NetbirdAdminAccessRequest): Promise<InviteResult> {
  if (!isOnboardingEnabled()) return fail("disabled", ONBOARDING_PAUSED_MESSAGE)

  const db = createServiceRoleClient()
  const attemptCount = (request.attempt_count ?? 0) + 1
  const email = request.invite_email ?? (await lookupEmail(db, request.user_id))
  if (!email) {
    return markInviteFailed(db, request, attemptCount, "No email address on the member's account.", null)
  }

  const name = request.display_name ?? request.discord_username ?? "League member"
  const result = await callWorker("/invite", {
    request_id: request.id,
    email,
    name,
    discord_id: request.discord_id ?? null,
  })
  if (!result.ok) return markInviteFailed(db, request, attemptCount, result.error, email)

  const parsed = parseInviteResponse(result.data)

  if (parsed.status === "already_member") {
    const updated = await patchRequest(db, request.id, {
      status: "invited",
      invite_email: email,
      attempt_count: attemptCount,
      last_error: null,
    })
    await logEvent(db, { requestId: request.id, action: "already_member" })
    return { ok: true, request: updated }
  }

  if (parsed.status !== "invited") {
    const reason = sanitizeError(parsed.error ?? "The onboarding worker could not create the invite.")
    return markInviteFailed(db, request, attemptCount, reason, email)
  }

  if (!parsed.inviteUrl || !isHttpsUrl(parsed.inviteUrl) || !parsed.expiresAt) {
    return markInviteFailed(db, request, attemptCount, "The onboarding worker's reply was incomplete.", email)
  }

  const deliveredVia = parsed.deliveredVia
  const updated = await patchRequest(db, request.id, {
    status: "invited",
    invite_email: email,
    netbird_invite_id: parsed.inviteId,
    invite_expires_at: parsed.expiresAt,
    delivered_via: deliveredVia.length > 0 ? deliveredVia : null,
    delivered_at: deliveredVia.length > 0 ? new Date().toISOString() : null,
    attempt_count: attemptCount,
    last_error: null,
  })

  const { error: linkError } = await db
    .from(LINKS_TABLE)
    .upsert(
      { request_id: request.id, invite_url: parsed.inviteUrl, expires_at: parsed.expiresAt },
      { onConflict: "request_id" },
    )
  if (linkError) console.error("[netbird] could not store invite link:", linkError.message)

  await logEvent(db, {
    requestId: request.id,
    action: "invite_created",
    detail: { delivered_via: deliveredVia, expires_at: parsed.expiresAt, attempt: attemptCount },
  })
  return { ok: true, request: updated }
}

// ---------------------------------------------------------------------------
// Worker: admin DM with Approve / Deny buttons
// ---------------------------------------------------------------------------

const DISCORD_ID_PATTERN = /^\d{15,25}$/
const NOTIFY_TIMEOUT_MS = 5_000

/** Discord ids of the admins who get the approval DM and may use its buttons (env NETBIRD_ADMIN_DISCORD_IDS). */
export function getAdminDiscordIds(): string[] {
  const raw = process.env.NETBIRD_ADMIN_DISCORD_IDS ?? ""
  const ids = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => DISCORD_ID_PATTERN.test(entry))
  return [...new Set(ids)]
}

/**
 * Asks the Worker to DM the listed admins an Approve / Deny message (custom ids `nbreq:approve:<id>` and
 * `nbreq:deny:<id>`; the Worker builds the message). Best effort: it never fails the member's request, and the
 * admin page still lists everything. Does nothing while onboarding is paused or when no admin ids are configured.
 */
async function notifyAdminsOfPending(db: Db, request: NetbirdAdminAccessRequest): Promise<void> {
  if (!isOnboardingEnabled()) return
  const adminIds = getAdminDiscordIds()
  if (adminIds.length === 0) return

  const result = await callWorker(
    "/notify-admins",
    {
      request_id: request.id,
      admin_discord_ids: adminIds,
      requester_name: request.display_name ?? request.discord_username ?? "League member",
      source: request.source,
    },
    NOTIFY_TIMEOUT_MS,
  )
  if (result.ok && result.data.status !== "error") {
    await logEvent(db, { requestId: request.id, action: "admin_notified", detail: { admins: adminIds.length } })
    return
  }
  const reason = result.ok ? sanitizeError(result.data.error ?? "The worker could not notify admins.") : result.error
  await logEvent(db, { requestId: request.id, action: "admin_notify_failed", detail: { error: reason } })
}

// ---------------------------------------------------------------------------
// Member entry point (app page and Discord command)
// ---------------------------------------------------------------------------

export interface RequestAccessInput {
  userId: string
  source: NetbirdRequestSource
  discordId?: string | null
  deviceNote?: string | null
}

/**
 * Marks `invited` requests whose invite has passed its expiry as `expired` and deletes their stored links.
 * Opportunistic (no cron): called from requestAccess, retryInvite and the admin page. Never throws.
 * Does not depend on the kill switch because it never contacts the Worker.
 */
export async function expireStaleInvites(): Promise<number> {
  try {
    const db = createServiceRoleClient()
    const { data, error } = await db
      .from(REQUESTS_TABLE)
      .update({ status: "expired" })
      .eq("status", "invited")
      .lt("invite_expires_at", new Date().toISOString())
      .select("id")
    if (error) {
      console.error("[netbird] expiring stale invites failed:", error.message)
      return 0
    }
    const ids = ((data ?? []) as { id: string }[]).map((row) => row.id)
    if (ids.length === 0) return 0

    const { error: linkError } = await db.from(LINKS_TABLE).delete().in("request_id", ids)
    if (linkError) console.error("[netbird] could not delete expired invite links:", linkError.message)
    for (const id of ids) await logEvent(db, { requestId: id, action: "invite_expired" })
    return ids.length
  } catch (error) {
    console.error("[netbird] expiring stale invites failed:", sanitizeError(error))
    return 0
  }
}

const ACCESS_UNAVAILABLE_MESSAGE = "Access isn't available. Please contact a league admin."

/** Per-person limit only. Returns a failure result when the person has asked too often. */
async function checkPersonRateLimit(
  db: Db,
  userId: string,
  discordId: string | null,
): Promise<{ ok: false; code: FailureCode; message: string } | null> {
  const rate = await db.rpc("netbird_onboarding_rate_ok", { p_user_id: userId, p_discord_id: discordId })
  if (rate.error) {
    console.error("[netbird] rate limit check failed:", rate.error.message)
    return fail("error", GENERIC_ERROR_MESSAGE)
  }
  return rate.data === true ? null : fail("rate_limited", RATE_LIMITED_MESSAGE)
}

/** League-wide cap on automatic invites. Fails closed: if the check errors, the request waits for an admin. */
async function autoInviteCapAllows(db: Db): Promise<boolean> {
  const cap = await db.rpc("netbird_auto_invite_cap_ok")
  if (cap.error) {
    console.error("[netbird] auto invite cap check failed:", cap.error.message)
    return false
  }
  return cap.data === true
}

/**
 * A member who asks again after an invite failed or expired. The earlier request was already approved, so it is
 * resent in place (no second approval needed); anything else goes through requestAccess.
 */
export async function retryInvite(input: RequestAccessInput): Promise<RequestAccessResult> {
  if (!isOnboardingEnabled()) return fail("disabled", ONBOARDING_PAUSED_MESSAGE)

  const { userId } = input
  const discordId = input.discordId?.trim() || null
  const db = createServiceRoleClient()

  try {
    await expireStaleInvites()
    const { data, error } = await db
      .from(REQUESTS_TABLE)
      .select(NETBIRD_ADMIN_REQUEST_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`latest request lookup failed: ${error.message}`)
    const latest = data as unknown as NetbirdAdminAccessRequest | null

    if (!latest || (latest.status !== "failed" && latest.status !== "expired")) return requestAccess(input)

    const limited = await checkPersonRateLimit(db, userId, discordId)
    if (limited) return limited
    await logEvent(db, {
      requestId: latest.id,
      actorUserId: userId,
      actorDiscordId: discordId,
      action: "request_attempt",
      detail: { source: input.source, retry: true },
    })

    const moved = await applyTransition(db, latest.id, "resend", { last_error: null })
    if (isTransitionFailure(moved)) return fail(moved.code, moved.message)
    await logEvent(db, { requestId: latest.id, actorUserId: userId, action: "resend_requested", detail: { by: "member" } })

    const invite = await createInviteViaWorker(moved)
    return { ok: true, request: toMemberRequest(invite.request ?? moved), created: false }
  } catch (error) {
    console.error("[netbird] retryInvite failed:", sanitizeError(error))
    return fail("error", GENERIC_ERROR_MESSAGE)
  }
}

export async function requestAccess(input: RequestAccessInput): Promise<RequestAccessResult> {
  if (!isOnboardingEnabled()) return fail("disabled", ONBOARDING_PAUSED_MESSAGE)

  const { userId, source } = input
  const discordId = input.discordId?.trim() || null
  const db = createServiceRoleClient()

  try {
    await expireStaleInvites()

    const limited = await checkPersonRateLimit(db, userId, discordId)
    if (limited) return limited

    await logEvent(db, {
      requestId: null,
      actorUserId: userId,
      actorDiscordId: discordId,
      action: "request_attempt",
      detail: { source },
    })

    const existing = await findOpenRequest(db, userId)
    if (existing) return { ok: true, request: toMemberRequest(existing), created: false }

    // A request an admin denied or revoked is final until an admin acts: otherwise a coach could simply ask again.
    const { data: latestRow, error: latestError } = await db
      .from(REQUESTS_TABLE)
      .select("status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (latestError) throw new Error(`latest request lookup failed: ${latestError.message}`)
    const latestStatus = (latestRow as { status?: string } | null)?.status
    if (latestStatus === "denied" || latestStatus === "revoked") return fail("forbidden", ACCESS_UNAVAILABLE_MESSAGE)

    const email = await lookupEmail(db, userId)
    if (!email) {
      return fail("no_email", "Your account has no email address, so an invite cannot be sent. Ask Simeon for help.")
    }

    const coach = await db.rpc("netbird_current_coach", { p_user_id: userId })
    if (coach.error) {
      console.error("[netbird] coach lookup failed:", coach.error.message)
      return fail("error", GENERIC_ERROR_MESSAGE)
    }
    const coachRow = (Array.isArray(coach.data) ? coach.data[0] : coach.data) as
      | { coach_id: string | null; season_id: string | null }
      | null
      | undefined
    const isCoach = Boolean(coachRow?.coach_id)
    // The league-wide cap never turns anyone away: past it, a coach waits for an admin like everyone else.
    const capReached = isCoach && !(await autoInviteCapAllows(db))
    const autoApprove = isCoach && !capReached

    const deviceNote = input.deviceNote?.trim() || null
    const insert = await db
      .from(REQUESTS_TABLE)
      .insert({
        user_id: userId,
        source,
        device_note: deviceNote,
        invite_email: email,
        decision: autoApprove ? "auto_coach" : "admin",
        status: autoApprove ? "approved" : "pending",
        coach_id: isCoach ? coachRow?.coach_id : null,
        season_id: isCoach ? (coachRow?.season_id ?? null) : null,
        reviewed_at: autoApprove ? new Date().toISOString() : null,
      })
      .select(NETBIRD_ADMIN_REQUEST_COLUMNS)
      .single()

    if (insert.error || !insert.data) {
      if (insert.error?.code === UNIQUE_VIOLATION) {
        const raced = await findOpenRequest(db, userId)
        if (raced) return { ok: true, request: toMemberRequest(raced), created: false }
      }
      console.error("[netbird] could not create request:", insert.error?.message)
      return fail("error", GENERIC_ERROR_MESSAGE)
    }

    let request = insert.data as unknown as NetbirdAdminAccessRequest
    await logEvent(db, {
      requestId: request.id,
      actorUserId: userId,
      actorDiscordId: discordId,
      action: "request_created",
      detail: { source, decision: request.decision, status: request.status },
    })

    if (capReached) {
      await logEvent(db, {
        requestId: request.id,
        actorUserId: userId,
        actorDiscordId: discordId,
        action: "auto_cap_reached",
        detail: { coach_id: coachRow?.coach_id ?? null, season_id: coachRow?.season_id ?? null },
      })
    }

    if (autoApprove) {
      await logEvent(db, {
        requestId: request.id,
        actorUserId: userId,
        actorDiscordId: discordId,
        action: "auto_approved",
        detail: { coach_id: coachRow?.coach_id ?? null, season_id: coachRow?.season_id ?? null },
      })
      const invite = await createInviteViaWorker(request)
      if (invite.request) request = invite.request
    } else {
      try {
        await notifyAdminsOfPending(db, request)
      } catch (error) {
        console.error("[netbird] admin notification failed:", sanitizeError(error))
      }
    }

    return { ok: true, request: toMemberRequest(request), created: true }
  } catch (error) {
    console.error("[netbird] requestAccess failed:", sanitizeError(error))
    return fail("error", GENERIC_ERROR_MESSAGE)
  }
}

// ---------------------------------------------------------------------------
// Admin actions
// ---------------------------------------------------------------------------

async function authorizeAdmin(adminUserId: string): Promise<{ ok: false; code: FailureCode; message: string } | null> {
  const access = await resolveLeagueAdminAccess(adminUserId)
  return access.allowed ? null : fail("forbidden", "Only league admins can do this.")
}

const NOT_ALLOWED_MESSAGE = "This request was not found, or it is no longer in a state that allows this change."

/** Moves a request along REVIEW_TRANSITIONS atomically: the update only matches when the status is still valid. */
async function applyTransition(
  db: Db,
  requestId: string,
  action: ReviewAction,
  patch: Record<string, unknown>,
): Promise<NetbirdAdminAccessRequest | { code: FailureCode; message: string }> {
  const rule = REVIEW_TRANSITIONS[action]
  const { data, error } = await db
    .from(REQUESTS_TABLE)
    .update({ status: rule.to, ...patch })
    .eq("id", requestId)
    .in("status", rule.from)
    .select(NETBIRD_ADMIN_REQUEST_COLUMNS)
    .maybeSingle()

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { code: "invalid_state", message: "This member already has another open request." }
    }
    console.error("[netbird] status change failed:", error.message)
    return { code: "error", message: GENERIC_ERROR_MESSAGE }
  }
  if (!data) return { code: "invalid_state", message: NOT_ALLOWED_MESSAGE }
  return data as unknown as NetbirdAdminAccessRequest
}

function isTransitionFailure(
  value: NetbirdAdminAccessRequest | { code: FailureCode; message: string },
): value is { code: FailureCode; message: string } {
  return "code" in value && "message" in value && !("id" in value)
}

async function approveOrResend(
  action: "approve" | "resend",
  requestId: string,
  adminUserId: string,
): Promise<AdminActionResult> {
  const paused = !isOnboardingEnabled()
  // While paused an approval is still saved (so it can be sent later), but nothing may contact the Worker.
  if (paused && action === "resend") return fail("disabled", ONBOARDING_PAUSED_MESSAGE)

  try {
    const denied = await authorizeAdmin(adminUserId)
    if (denied) return denied

    const db = createServiceRoleClient()
    const now = new Date().toISOString()
    const moved = await applyTransition(db, requestId, action, {
      reviewed_by: adminUserId,
      reviewed_at: now,
      last_error: null,
      ...(action === "approve" ? { decision: "admin" } : {}),
    })
    if (isTransitionFailure(moved)) return fail(moved.code, moved.message)

    await logEvent(db, {
      requestId,
      actorUserId: adminUserId,
      action: action === "approve" ? "approved" : "resend_requested",
      ...(paused ? { detail: { invite_deferred: true } } : {}),
    })
    if (paused) return { ok: true, request: moved, paused: true }

    const invite = await createInviteViaWorker(moved)
    if (invite.ok) return { ok: true, request: invite.request }
    return { ok: false, code: invite.code, message: invite.message, request: invite.request ?? moved }
  } catch (error) {
    console.error(`[netbird] ${action} failed:`, sanitizeError(error))
    return fail("error", GENERIC_ERROR_MESSAGE)
  }
}

export function approveRequest(requestId: string, adminUserId: string): Promise<AdminActionResult> {
  return approveOrResend("approve", requestId, adminUserId)
}

export function resendRequest(requestId: string, adminUserId: string): Promise<AdminActionResult> {
  return approveOrResend("resend", requestId, adminUserId)
}

/** Denying never contacts the Worker, so it keeps working while onboarding is paused. */
export async function denyRequest(requestId: string, adminUserId: string): Promise<AdminActionResult> {
  try {
    const denied = await authorizeAdmin(adminUserId)
    if (denied) return denied

    const db = createServiceRoleClient()
    const moved = await applyTransition(db, requestId, "deny", {
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
    })
    if (isTransitionFailure(moved)) return fail(moved.code, moved.message)

    await logEvent(db, { requestId, actorUserId: adminUserId, action: "denied" })
    return { ok: true, request: moved }
  } catch (error) {
    console.error("[netbird] deny failed:", sanitizeError(error))
    return fail("error", GENERIC_ERROR_MESSAGE)
  }
}

export async function revokeRequest(requestId: string, adminUserId: string): Promise<AdminActionResult> {
  if (!isOnboardingEnabled()) return fail("disabled", ONBOARDING_PAUSED_MESSAGE)

  try {
    const denied = await authorizeAdmin(adminUserId)
    if (denied) return denied

    const db = createServiceRoleClient()
    const current = await loadRequest(db, requestId)
    if (!current || !REVIEW_TRANSITIONS.revoke.from.includes(current.status)) {
      return fail("invalid_state", NOT_ALLOWED_MESSAGE)
    }

    const email = current.invite_email ?? (await lookupEmail(db, current.user_id))
    const result = await callWorker("/revoke", {
      request_id: current.id,
      invite_id: current.netbird_invite_id,
      email,
    })
    if (!result.ok || result.data.status === "error") {
      const reason = result.ok ? sanitizeError(result.data.error ?? "The worker could not revoke access.") : result.error
      const updated = await patchRequest(db, requestId, { last_error: reason })
      await logEvent(db, { requestId, actorUserId: adminUserId, action: "revoke_failed", detail: { error: reason } })
      return { ok: false, code: "error", message: GENERIC_ERROR_MESSAGE, request: updated }
    }

    const moved = await applyTransition(db, requestId, "revoke", {
      revoked_at: new Date().toISOString(),
      revoked_by: adminUserId,
      last_error: null,
    })
    if (isTransitionFailure(moved)) return fail(moved.code, moved.message)

    const { error: linkError } = await db.from(LINKS_TABLE).delete().eq("request_id", requestId)
    if (linkError) console.error("[netbird] could not delete invite link:", linkError.message)

    await logEvent(db, { requestId, actorUserId: adminUserId, action: "revoked" })
    return { ok: true, request: moved }
  } catch (error) {
    console.error("[netbird] revoke failed:", sanitizeError(error))
    return fail("error", GENERIC_ERROR_MESSAGE)
  }
}
