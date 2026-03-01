/**
 * Standard API response helpers (POKE MNKY v3)
 * Delegates to lib/api-error.ts for consistent shape: { error: { code, message, details? } }
 */

import {
  apiError as apiErrorBase,
  internalError,
  API_ERROR_CODES,
} from "@/lib/api-error"
import type { ApiErrorBody, ApiErrorCode } from "@/lib/api-error"
import { logger } from "@/lib/logger"

export type { ApiErrorBody }

/**
 * Return a standard JSON error response (legacy signature for backward compatibility).
 * Prefer using helpers from lib/api-error.ts directly (unauthorized(), badRequest(), etc.).
 */
export function apiError(
  message: string,
  statusCode: number = 500,
  options?: { code?: string; details?: unknown }
) {
  const code = options?.code ?? "INTERNAL_ERROR"
  const codeKey = Object.values(API_ERROR_CODES).includes(code as ApiErrorCode)
    ? (code as ApiErrorCode)
    : API_ERROR_CODES.INTERNAL_ERROR
  return apiErrorBase(codeKey, message, {
    status: statusCode,
    details: options?.details,
  })
}

/**
 * Log and return a standard 500 error (for catch blocks).
 */
export function apiErrorInternal(error: unknown, logContext?: string) {
  const message = error instanceof Error ? error.message : "Internal server error"
  logger.error(message, { route: logContext, error: String(error) })
  return internalError(message, process.env.NODE_ENV === "development" ? error : undefined)
}
