/**
 * Phase 5.5: Bot Key Authentication Utility
 * Helper functions for Discord bot API key validation
 */

import { NextRequest } from "next/server"

/**
 * Extract bot key from Authorization header
 */
export function extractBotKey(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization")
  if (!authHeader) {
    return null
  }

  // Support both "Bearer <key>" and direct key
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "").trim()
  }

  return authHeader.trim()
}

/**
 * Validate bot key is present
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

  return {
    valid: true,
    botKey,
  }
}
