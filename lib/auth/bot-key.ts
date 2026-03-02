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

/**
 * Validate bot key is present and, when DISCORD_BOT_API_KEY is set, matches it.
 * Use this for Discord app API routes so only the configured bot can call them.
 * Accepts Authorization: Bearer <key> or X-Discord-Bot-Key: <key> (Vercel may strip Authorization).
 */
export function validateBotKeyPresent(request: NextRequest): {
  valid: boolean
  botKey: string | null
  error?: string
} {
  const botKey = extractBotKey(request)
  const hasAuth = !!request.headers.get("authorization")
  const hasXKey = !!request.headers.get(DISCORD_BOT_KEY_HEADER)
  const hasApiKey = !!request.headers.get(API_KEY_HEADER)

  if (!botKey) {
    console.warn(
      "[bot-key] Auth failed: has Authorization:",
      hasAuth,
      "has X-Discord-Bot-Key:",
      hasXKey,
      "has X-API-Key:",
      hasApiKey
    )
    return {
      valid: false,
      botKey: null,
      error: "Missing bot key (send Authorization: Bearer <key> or X-Discord-Bot-Key)",
    }
  }

  const expectedKey = process.env.DISCORD_BOT_API_KEY
  if (expectedKey != null && expectedKey.trim() !== "" && botKey !== expectedKey.trim()) {
    return {
      valid: false,
      botKey: null,
      error: "Invalid bot key",
    }
  }

  return {
    valid: true,
    botKey,
  }
}
