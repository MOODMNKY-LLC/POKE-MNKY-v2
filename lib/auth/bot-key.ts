/**
 * Phase 5.5: Bot Key Authentication Utility
 * Helper functions for Discord bot API key validation
 */

import { NextRequest } from "next/server"

/** Custom header for internal bot auth (Vercel may strip Authorization on same-origin requests) */
export const DISCORD_BOT_KEY_HEADER = "x-discord-bot-key"

/**
 * Extract bot key from Authorization header or X-Discord-Bot-Key (for internal calls).
 * Prefer the custom header so self-calls from the interactions route work on Vercel.
 */
export function extractBotKey(request: NextRequest): string | null {
  const customKey = request.headers.get(DISCORD_BOT_KEY_HEADER)?.trim()
  if (customKey) return customKey

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
 */
export function validateBotKeyPresent(request: NextRequest): {
  valid: boolean
  botKey: string | null
  error?: string
} {
  const botKey = extractBotKey(request)

  if (!botKey) {
    return {
      valid: false,
      botKey: null,
      error: "Missing Authorization header with bot key",
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
