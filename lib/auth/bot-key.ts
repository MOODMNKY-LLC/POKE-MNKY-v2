/**
 * Phase 5.5: Bot Key Authentication Utility
 * Helper functions for Discord bot API key validation
 */

import { NextRequest } from "next/server"

/** Custom header for internal bot auth (Vercel may strip Authorization on same-origin requests) */
export const DISCORD_BOT_KEY_HEADER = "x-discord-bot-key"
/** Alternative header (some proxies allow X-API-Key when they strip others) */
const API_KEY_HEADER = "x-api-key"

/**
 * Extract bot key from (in order): X-Discord-Bot-Key, X-API-Key, Authorization.
 * Internal server-to-server calls send all three so at least one survives.
 */
export function extractBotKey(request: NextRequest): string | null {
  const customKey = request.headers.get(DISCORD_BOT_KEY_HEADER)?.trim()
  if (customKey) return customKey

  const apiKey = request.headers.get(API_KEY_HEADER)?.trim()
  if (apiKey) return apiKey

  const authHeader = request.headers.get("authorization")
  if (!authHeader) return null

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "").trim()
  }
  return authHeader.trim()
}

export type BotKeyDecision = {
  valid: boolean
  botKey: string | null
  error?: string
}

/**
 * Fail closed: a missing server key rejects every caller, including ones that send a key.
 * A configured key must match exactly.
 */
export function evaluateBotKey(
  presentedKey: string | null,
  expectedKey: string | undefined
): BotKeyDecision {
  const expected = expectedKey?.trim() ?? ""
  if (!expected) {
    return {
      valid: false,
      botKey: null,
      error: "Bot API key is not configured",
    }
  }

  const presented = presentedKey?.trim() ?? ""
  if (!presented) {
    return {
      valid: false,
      botKey: null,
      error: "Missing bot key (send Authorization: Bearer <key> or X-Discord-Bot-Key)",
    }
  }

  if (presented !== expected) {
    return {
      valid: false,
      botKey: null,
      error: "Invalid bot key",
    }
  }

  return { valid: true, botKey: presented }
}

/**
 * Validate bot key is present and matches DISCORD_BOT_API_KEY.
 * Use this for Discord app API routes so only the configured bot can call them.
 * Accepts Authorization: Bearer <key> or X-Discord-Bot-Key: <key> (Vercel may strip Authorization).
 */
export function validateBotKeyPresent(request: NextRequest): BotKeyDecision {
  const botKey = extractBotKey(request)
  const decision = evaluateBotKey(botKey, process.env.DISCORD_BOT_API_KEY)
  if (!decision.valid && !botKey) {
    console.warn(
      "[bot-key] Auth failed: has Authorization:",
      !!request.headers.get("authorization"),
      "has X-Discord-Bot-Key:",
      !!request.headers.get(DISCORD_BOT_KEY_HEADER),
      "has X-API-Key:",
      !!request.headers.get(API_KEY_HEADER),
      "server key configured:",
      Boolean(process.env.DISCORD_BOT_API_KEY?.trim())
    )
  }
  return decision
}
