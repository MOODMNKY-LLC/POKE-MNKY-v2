import "server-only"

import { resolveLeagueAdminAccess } from "@/lib/admin-api-auth"
import type { InteractionPayload } from "@/lib/discord/interactions-handler"
import {
  ONBOARDING_PAUSED_MESSAGE,
  approveRequest,
  denyRequest,
  getAdminDiscordIds,
  isOnboardingEnabled,
  retryInvite,
  type AdminActionResult,
} from "@/lib/netbird/automation"
import { createServiceRoleClient } from "@/lib/supabase/service"

/**
 * Discord side of NetBird onboarding: the `/join-battles` slash command and the Approve / Deny buttons on the admin
 * DM. Handlers return the immediate Discord response plus an optional `followUp` the route runs with `after()`.
 * Invite links are never put in a message here: delivery happens in the Worker, by DM.
 */

const RESPONSE_CHANNEL_MESSAGE = 4
const RESPONSE_DEFERRED_CHANNEL_MESSAGE = 5
const RESPONSE_DEFERRED_UPDATE_MESSAGE = 6
const RESPONSE_UPDATE_MESSAGE = 7
const FLAG_EPHEMERAL = 64

const DISCORD_API = "https://discord.com/api/v10"
const GUIDE_PATH = "/dashboard/guides/netbird"
const COMPONENT_ID_PATTERN = /^nbreq:(approve|deny):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

export const JOIN_BATTLES_COMMAND = "join-battles"
export const COMPONENT_PREFIX = "nbreq:"

export const WRONG_GUILD_MESSAGE = "This command only works in the league server."
const NOT_ADMIN_MESSAGE = "Only league admins can approve or deny battle network requests."
const UNKNOWN_ERROR_MESSAGE = "Something went wrong on our side. Please try again later."
const ALREADY_HANDLED_MESSAGE = "This request has already been handled."

export interface InteractionResult {
  response: Record<string, unknown>
  /** Work to finish after the response is sent (run with `after()` in the route). */
  followUp?: () => Promise<void>
}

/** Public app URL for links in messages. Prefers the canonical URL over the per-deployment VERCEL_URL. */
export function getPublicAppUrl(): string {
  const explicit = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim()
  if (explicit) return explicit.replace(/\/+$/, "")
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""
}

function ephemeral(content: string): InteractionResult {
  return {
    response: {
      type: RESPONSE_CHANNEL_MESSAGE,
      data: { content, flags: FLAG_EPHEMERAL, allowed_mentions: { parse: [] } },
    },
  }
}

function isLeagueGuild(guildId: string | undefined): boolean {
  const league = process.env.DISCORD_LEAGUE_GUILD_ID?.trim()
  return Boolean(league) && guildId === league
}

function interactorId(payload: InteractionPayload): string | null {
  return payload.member?.user?.id ?? payload.user?.id ?? null
}

/** The interaction token needs no bot token, but it is only ever used against Discord's own webhook URL. */
async function editOriginalMessage(
  payload: InteractionPayload,
  body: Record<string, unknown>,
): Promise<void> {
  const applicationId = payload.application_id
  const token = payload.token
  if (!applicationId || !token || !/^\d+$/.test(applicationId) || !/^[\w-]+$/.test(token)) {
    console.error("[netbird] discord follow-up skipped: missing or malformed interaction credentials")
    return
  }
  try {
    const response = await fetch(`${DISCORD_API}/webhooks/${applicationId}/${token}/messages/@original`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ allowed_mentions: { parse: [] }, ...body }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) console.error("[netbird] discord follow-up failed with HTTP", response.status)
  } catch (error) {
    console.error("[netbird] discord follow-up failed:", error instanceof Error ? error.name : "unknown error")
  }
}

async function userIdForDiscord(discordId: string): Promise<string | null> {
  const db = createServiceRoleClient()
  const { data, error } = await db.rpc("netbird_user_id_for_discord", { p_discord_id: discordId })
  if (error) {
    console.error("[netbird] discord user lookup failed:", error.message)
    return null
  }
  return typeof data === "string" && data ? data : null
}

// ---------------------------------------------------------------------------
// /join-battles
// ---------------------------------------------------------------------------

async function joinBattlesMessage(discordId: string, appUrl: string): Promise<string> {
  if (!isOnboardingEnabled()) return ONBOARDING_PAUSED_MESSAGE

  const userId = await userIdForDiscord(discordId)
  if (!userId) {
    return `Sign in to POKE MNKY with Discord once at ${appUrl}/auth/login, then run /join-battles again.`
  }

  const guideUrl = `${appUrl}${GUIDE_PATH}`
  const result = await retryInvite({ userId, source: "discord", discordId })
  if (!result.ok) return result.message

  const { request, created } = result
  switch (request.status) {
    case "pending":
      return "Your request is with a league admin. You'll get a DM when it's approved."
    case "invited":
      return created
        ? `You're in! Check your DMs for your invite link and setup steps (it's also on the app's Battle network page: ${guideUrl}).`
        : `Your invite is ready. Check your DMs, or open the app's Battle network page: ${guideUrl}`
    case "approved":
      return "You're approved. Your invite is on its way; check your DMs shortly, or open the app's Battle network page."
    case "failed":
      return `Your request was approved, but the invite didn't go through. Please try again in a little while, or ask a league admin. ${guideUrl}`
    default:
      return `Your request is saved. Check its status on the app's Battle network page: ${guideUrl}`
  }
}

export function handleJoinBattles(payload: InteractionPayload, appUrl: string = getPublicAppUrl()): InteractionResult {
  const discordId = payload.member?.user?.id
  if (!isLeagueGuild(payload.guild_id) || !discordId) return ephemeral(WRONG_GUILD_MESSAGE)

  return {
    response: { type: RESPONSE_DEFERRED_CHANNEL_MESSAGE, data: { flags: FLAG_EPHEMERAL } },
    followUp: async () => {
      let content: string
      try {
        content = await joinBattlesMessage(discordId, appUrl)
      } catch (error) {
        console.error("[netbird] /join-battles failed:", error instanceof Error ? error.message : "unknown error")
        content = UNKNOWN_ERROR_MESSAGE
      }
      await editOriginalMessage(payload, { content: content.slice(0, 2000) })
    },
  }
}

// ---------------------------------------------------------------------------
// Approve / Deny buttons on the admin DM
// ---------------------------------------------------------------------------

function describeAdminOutcome(
  action: "approve" | "deny",
  clickerId: string,
  result: AdminActionResult,
): string | null {
  if (!result.ok) {
    if (result.code === "invalid_state") return ALREADY_HANDLED_MESSAGE
    if (result.request?.status === "failed") {
      return "Approved, but the invite didn't go through. Use Send again on the admin page."
    }
    return null
  }
  const name = result.request.display_name ?? result.request.discord_username ?? "the member"
  if (action === "deny") return `Denied the request from ${name} (by <@${clickerId}>).`
  if (result.paused) {
    return `Approved ${name} (by <@${clickerId}>). Onboarding is paused, so no invite was sent yet. Use Send again on the admin page once it is back on.`
  }
  return `Approved ${name} (by <@${clickerId}>). Their invite was created and sent.`
}

export async function handleNetbirdComponent(payload: InteractionPayload): Promise<InteractionResult | null> {
  const match = COMPONENT_ID_PATTERN.exec(payload.data?.custom_id ?? "")
  if (!match) return null
  const action = match[1].toLowerCase() as "approve" | "deny"
  const requestId = match[2].toLowerCase()

  // A DM has no guild_id and is fine for listed admins; a click from any server must be the league server.
  if (payload.guild_id && !isLeagueGuild(payload.guild_id)) return ephemeral(NOT_ADMIN_MESSAGE)

  const clickerId = interactorId(payload)
  if (!clickerId || !getAdminDiscordIds().includes(clickerId)) return ephemeral(NOT_ADMIN_MESSAGE)

  try {
    const userId = await userIdForDiscord(clickerId)
    if (!userId) return ephemeral(NOT_ADMIN_MESSAGE)
    const access = await resolveLeagueAdminAccess(userId)
    if (!access.allowed) return ephemeral(NOT_ADMIN_MESSAGE)

    if (action === "deny") {
      const result = await denyRequest(requestId, userId)
      const content = describeAdminOutcome("deny", clickerId, result)
      if (!content) return ephemeral(result.ok ? UNKNOWN_ERROR_MESSAGE : result.message)
      return {
        response: {
          type: RESPONSE_UPDATE_MESSAGE,
          data: { content, components: [], allowed_mentions: { parse: [] } },
        },
      }
    }

    // Approving can wait on the Worker for several seconds, which is past Discord's 3 second limit, so
    // acknowledge now and edit the message when it finishes.
    return {
      response: { type: RESPONSE_DEFERRED_UPDATE_MESSAGE },
      followUp: async () => {
        let content: string
        try {
          const result = await approveRequest(requestId, userId)
          content = describeAdminOutcome("approve", clickerId, result) ?? (result.ok ? UNKNOWN_ERROR_MESSAGE : result.message)
        } catch (error) {
          console.error("[netbird] discord approve failed:", error instanceof Error ? error.message : "unknown error")
          content = UNKNOWN_ERROR_MESSAGE
        }
        await editOriginalMessage(payload, { content, components: [] })
      },
    }
  } catch (error) {
    console.error("[netbird] discord component failed:", error instanceof Error ? error.message : "unknown error")
    return ephemeral(UNKNOWN_ERROR_MESSAGE)
  }
}
