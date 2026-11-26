import { GUIDE_URL, NETBIRD_SERVER_URL, type Env } from "./types"

const DISCORD_API = "https://discord.com/api/v10"
const REQUEST_TIMEOUT_MS = 8_000
/** SUPPRESS_EMBEDS: keeps link previews out of the DM. */
const SUPPRESS_EMBEDS = 4

export interface DiscordMessage {
  content: string
  components?: unknown[]
  flags?: number
}

async function discordPost(env: Env, path: string, body: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(`${DISCORD_API}${path}`, {
    method: "POST",
    headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN ?? ""}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`Discord returned HTTP ${response.status}`)
  return ((await response.json().catch(() => ({}))) as Record<string, unknown>) ?? {}
}

/** Sends a DM. Never throws: returns false when the bot token is missing, the user blocks DMs, or Discord errors. */
export async function sendDirectMessage(env: Env, discordUserId: string, message: DiscordMessage): Promise<boolean> {
  if (!env.DISCORD_BOT_TOKEN) return false
  try {
    const channel = await discordPost(env, "/users/@me/channels", { recipient_id: discordUserId })
    if (typeof channel.id !== "string") return false
    await discordPost(env, `/channels/${channel.id}/messages`, {
      ...message,
      // Names come from user profiles; make sure they can never ping anyone.
      allowed_mentions: { parse: [] },
    })
    return true
  } catch {
    return false
  }
}

export function buildInviteMessage(input: { name: string; inviteUrl: string; expiresAt: string }): DiscordMessage {
  const expiryUnix = Math.floor(Date.parse(input.expiresAt) / 1000)
  const expiry = Number.isFinite(expiryUnix) ? `<t:${expiryUnix}:F>` : input.expiresAt
  const content = [
    `Hi ${input.name}! Your POKE MNKY battle network invite is ready.`,
    "",
    `Your private invite link: ${input.inviteUrl}`,
    `It expires ${expiry}. Please do not share it; it only works for you.`,
    "",
    "Quick setup:",
    "1. Open the link, accept the invite, set a password, and turn on MFA (two-step sign-in).",
    "2. Install NetBird from https://netbird.io/download.",
    `3. In NetBird, set the server URL to ${NETBIRD_SERVER_URL}.`,
    '4. Sign in with "Continue with Email".',
    "5. Check that NetBird says Connected.",
    "6. In Ryujinx, set the LDN server as shown in the guide.",
    "",
    `Full step-by-step guide: ${GUIDE_URL}`,
  ].join("\n")
  return { content, flags: SUPPRESS_EMBEDS }
}

function cleanName(raw: string): string {
  return raw.replace(/[\r\n`*_~|>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "A league member"
}

export function buildAdminMessage(input: { requestId: string; requesterName: string; source: string }): DiscordMessage {
  const via = input.source === "discord" ? "Discord" : "the app"
  return {
    content: `**${cleanName(input.requesterName)}** asked for battle network access (from ${via}). Approve or deny below.`,
    flags: SUPPRESS_EMBEDS,
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 3, label: "Approve", custom_id: `nbreq:approve:${input.requestId}` },
          { type: 2, style: 4, label: "Deny", custom_id: `nbreq:deny:${input.requestId}` },
        ],
      },
    ],
  }
}
