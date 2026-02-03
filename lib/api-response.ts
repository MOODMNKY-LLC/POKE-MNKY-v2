/**
 * Standard API response helpers
 * Use for consistent error shape and logging across API routes
 */

import { NextResponse } from "next/server"

export interface ApiErrorBody {
  ok: false
  error: string
  code?: string
  details?: unknown
}

/**
 * Return a standard JSON error response
 */
export function apiError(
  message: string,
  statusCode: number = 500,
  options?: { code?: string; details?: unknown }
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = {
    ok: false,
    error: message,
    ...(options?.code && { code: options.code }),
    ...(options?.details !== undefined && { details: options.details }),
  }
  return NextResponse.json(body, { status: statusCode })
}

/**
 * Log and return a standard 500 error (for catch blocks)
 */
export function apiErrorInternal(error: unknown, logContext?: string): NextResponse<ApiErrorBody> {
  const message = error instanceof Error ? error.message : "Internal server error"
  if (logContext) {
    console.error(`[API] ${logContext}:`, error)
  } else {
    console.error("[API] Error:", error)
  }
  return apiError(message, 500, { code: "INTERNAL_ERROR" })
}
