import { buildAdminMessage, buildInviteMessage, sendDirectMessage } from "./discord"
import { NetbirdClient, NetbirdError, isPendingInvite, normalizeEmail } from "./netbird"
import type { Env } from "./types"
import { errorResponse, json, logOutcome, parsePositiveInt, utcDay } from "./util"

const REQUEST_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/
const DISCORD_ID_PATTERN = /^\d{15,25}$/
const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/
const MAX_ADMINS = 10
const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60
const CAP_COUNTER_TTL_SECONDS = 2 * 24 * 60 * 60
const MIN_INVITE_TTL_SECONDS = 3600
const MAX_INVITE_TTL_SECONDS = 7 * 24 * 60 * 60
const DEFAULT_INVITE_TTL_SECONDS = 259200
const DEFAULT_DAILY_CAP = 20

type Payload = Record<string, unknown>

const inviteKey = (requestId: string) => `invite:${requestId}`
const notifyKey = (requestId: string) => `notify:${requestId}`
const capKey = () => `cap:${utcDay()}`

function readRequestId(payload: Payload): string | null {
  const value = payload.request_id
  return typeof value === "string" && REQUEST_ID_PATTERN.test(value) ? value : null
}

function readEmail(payload: Payload): string | null {
  const value = payload.email
  if (typeof value !== "string") return null
  const email = value.trim()
  return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : null
}

/** Turns an upstream failure into a safe HTTP response. Error text is already sanitized by NetbirdClient. */
function failureResponse(route: string, requestId: string | null, error: unknown): Response {
  if (error instanceof NetbirdError) {
    logOutcome(route, requestId, `netbird_${error.status}`)
    return errorResponse(502, error.message)
  }
  logOutcome(route, requestId, "unexpected_error")
  return errorResponse(500, "The onboarding worker hit an unexpected error.")
}

// ---------------------------------------------------------------------------
// /invite
// ---------------------------------------------------------------------------

export async function handleInvite(env: Env, payload: Payload): Promise<Response> {
  const requestId = readRequestId(payload)
  const email = readEmail(payload)
  if (!requestId || !email) return errorResponse(400, "request_id and a valid email are required.")

  const rawName = typeof payload.name === "string" ? payload.name.trim() : ""
  const name = (rawName || "League member").slice(0, 100)
  const discordId = typeof payload.discord_id === "string" && DISCORD_ID_PATTERN.test(payload.discord_id) ? payload.discord_id : null

  const groupId = (env.NETBIRD_LEAGUE_GROUP_ID ?? "").trim()
  if (!groupId) {
    logOutcome("/invite", requestId, "group_not_configured")
    return errorResponse(503, "Onboarding is not fully configured yet.")
  }
  if (!env.NETBIRD_API_TOKEN || !env.NETBIRD_API_BASE) {
    logOutcome("/invite", requestId, "netbird_not_configured")
    return errorResponse(503, "Onboarding is not fully configured yet.")
  }

  const cached = await env.ONBOARD_KV.get(inviteKey(requestId))
  if (cached) {
    try {
      logOutcome("/invite", requestId, "replayed")
      return json(200, JSON.parse(cached) as Payload)
    } catch {
      await env.ONBOARD_KV.delete(inviteKey(requestId))
    }
  }

  const cap = parsePositiveInt(env.DAILY_INVITE_CAP, DEFAULT_DAILY_CAP)
  const used = Number.parseInt((await env.ONBOARD_KV.get(capKey())) ?? "0", 10) || 0
  if (used >= cap) {
    logOutcome("/invite", requestId, "cap_reached")
    return errorResponse(429, "The daily invite limit has been reached. Try again tomorrow.")
  }

  const ttl = parsePositiveInt(env.INVITE_TTL_SECONDS, DEFAULT_INVITE_TTL_SECONDS, MIN_INVITE_TTL_SECONDS, MAX_INVITE_TTL_SECONDS)
  const netbird = new NetbirdClient(env)
  const emailKey = normalizeEmail(email)

  try {
    const users = await netbird.listUsers()
    if (users.some((user) => normalizeEmail(user.email) === emailKey)) {
      logOutcome("/invite", requestId, "already_member")
      return json(200, { status: "already_member" })
    }

    const invites = await netbird.listInvites()
    const pending = invites.find((invite) => normalizeEmail(invite.email) === emailKey && isPendingInvite(invite))

    let inviteId: string
    let inviteToken: string
    let expiresAt: string
    if (pending) {
      const regenerated = await netbird.regenerateInvite(pending.id, ttl)
      inviteId = pending.id
      inviteToken = regenerated.invite_token
      expiresAt = regenerated.invite_expires_at ?? new Date(Date.now() + ttl * 1000).toISOString()
    } else {
      try {
        const created = await netbird.createInvite({ email, name, groupId, expiresIn: ttl })
        inviteId = created.id
        inviteToken = created.invite_token
        expiresAt = created.expires_at ?? new Date(Date.now() + ttl * 1000).toISOString()
      } catch (error) {
        if (error instanceof NetbirdError && error.status === 409) {
          logOutcome("/invite", requestId, "already_member")
          return json(200, { status: "already_member" })
        }
        throw error
      }
    }
    if (!inviteId || !inviteToken) {
      logOutcome("/invite", requestId, "netbird_bad_invite")
      return errorResponse(502, "NetBird sent an unreadable response.")
    }

    await env.ONBOARD_KV.put(capKey(), String(used + 1), { expirationTtl: CAP_COUNTER_TTL_SECONDS })

    const inviteUrl = `${env.NETBIRD_API_BASE.replace(/\/+$/, "")}/invite?token=${encodeURIComponent(inviteToken)}`
    const deliveredVia: string[] = []
    if (discordId) {
      const delivered = await sendDirectMessage(env, discordId, buildInviteMessage({ name, inviteUrl, expiresAt }))
      if (delivered) deliveredVia.push("discord")
    }

    const result = {
      status: "invited",
      invite_id: inviteId,
      invite_url: inviteUrl,
      expires_at: expiresAt,
      delivered_via: deliveredVia,
    }
    await env.ONBOARD_KV.put(inviteKey(requestId), JSON.stringify(result), { expirationTtl: IDEMPOTENCY_TTL_SECONDS })
    logOutcome("/invite", requestId, deliveredVia.length > 0 ? "invited_dm_sent" : "invited_no_dm")
    return json(200, result)
  } catch (error) {
    return failureResponse("/invite", requestId, error)
  }
}

// ---------------------------------------------------------------------------
// /revoke
// ---------------------------------------------------------------------------

export async function handleRevoke(env: Env, payload: Payload): Promise<Response> {
  const requestId = readRequestId(payload)
  const email = readEmail(payload)
  if (!requestId || !email) return errorResponse(400, "request_id and a valid email are required.")
  const inviteId = typeof payload.invite_id === "string" && payload.invite_id.length > 0 ? payload.invite_id : null

  if (!env.NETBIRD_API_TOKEN || !env.NETBIRD_API_BASE) {
    logOutcome("/revoke", requestId, "netbird_not_configured")
    return errorResponse(503, "Onboarding is not fully configured yet.")
  }

  const netbird = new NetbirdClient(env)
  const emailKey = normalizeEmail(email)
  try {
    // Forget the cached invite so a later "Send again" creates a fresh one instead of replaying the old link.
    await env.ONBOARD_KV.delete(inviteKey(requestId))

    const invites = await netbird.listInvites()
    const pending = invites.find((invite) => (inviteId ? invite.id === inviteId : normalizeEmail(invite.email) === emailKey))
    if (pending) {
      await netbird.deleteInvite(pending.id)
      logOutcome("/revoke", requestId, "invite_deleted")
      return json(200, { status: "revoked", method: "invite_deleted" })
    }

    const users = await netbird.listUsers()
    const user = users.find((candidate) => normalizeEmail(candidate.email) === emailKey)
    if (!user) {
      logOutcome("/revoke", requestId, "nothing_to_revoke")
      return json(200, { status: "revoked", method: "nothing_found" })
    }
    if (user.role !== "user" || user.is_service_user) {
      logOutcome("/revoke", requestId, "refused_non_member")
      return errorResponse(403, "Refusing to block an account that is not a regular league member.")
    }
    if (user.is_blocked) {
      logOutcome("/revoke", requestId, "already_blocked")
      return json(200, { status: "revoked", method: "already_blocked" })
    }

    await netbird.blockUser(user)
    logOutcome("/revoke", requestId, "user_blocked")
    return json(200, { status: "revoked", method: "user_blocked" })
  } catch (error) {
    return failureResponse("/revoke", requestId, error)
  }
}

// ---------------------------------------------------------------------------
// /notify-admins
// ---------------------------------------------------------------------------

export async function handleNotifyAdmins(env: Env, payload: Payload): Promise<Response> {
  const requestId = readRequestId(payload)
  if (!requestId) return errorResponse(400, "A valid request_id is required.")

  const rawIds = Array.isArray(payload.admin_discord_ids) ? payload.admin_discord_ids : []
  const adminIds = [
    ...new Set(rawIds.filter((id): id is string => typeof id === "string" && DISCORD_ID_PATTERN.test(id))),
  ].slice(0, MAX_ADMINS)
  if (adminIds.length === 0) return errorResponse(400, "At least one admin Discord id is required.")

  if (!env.DISCORD_BOT_TOKEN) {
    logOutcome("/notify-admins", requestId, "bot_not_configured")
    return errorResponse(503, "Discord notifications are not configured yet.")
  }

  if (await env.ONBOARD_KV.get(notifyKey(requestId))) {
    logOutcome("/notify-admins", requestId, "already_notified")
    return json(200, { status: "ok", notified: 0, failed: 0, already_sent: true })
  }

  const requesterRaw = payload.requester_name ?? payload.display_name
  const message = buildAdminMessage({
    requestId,
    requesterName: typeof requesterRaw === "string" ? requesterRaw : "",
    source: typeof payload.source === "string" ? payload.source : "app",
  })

  let notified = 0
  let failed = 0
  for (const adminId of adminIds) {
    if (await sendDirectMessage(env, adminId, message)) notified += 1
    else failed += 1
  }

  if (notified === 0) {
    logOutcome("/notify-admins", requestId, "no_dm_delivered")
    return json(200, { status: "error", error: "No admin could be reached by Discord DM.", notified, failed })
  }
  await env.ONBOARD_KV.put(notifyKey(requestId), "1", { expirationTtl: IDEMPOTENCY_TTL_SECONDS })
  logOutcome("/notify-admins", requestId, "notified")
  return json(200, { status: "ok", notified, failed })
}
