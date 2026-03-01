import { NextResponse } from "next/server"

/**
 * POKE MNKY v3: Shared API error response shape and helpers.
 * Use for consistent error format: { error: { code, message, details? } }
 */

export const API_ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  BAD_REQUEST: "BAD_REQUEST",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES]

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode
    message: string
    details?: unknown
  }
}

const DEFAULT_HTTP_STATUS: Record<ApiErrorCode, number> = {
  [API_ERROR_CODES.UNAUTHORIZED]: 401,
  [API_ERROR_CODES.FORBIDDEN]: 403,
  [API_ERROR_CODES.NOT_FOUND]: 404,
  [API_ERROR_CODES.BAD_REQUEST]: 400,
  [API_ERROR_CODES.VALIDATION_ERROR]: 422,
  [API_ERROR_CODES.CONFLICT]: 409,
  [API_ERROR_CODES.INTERNAL_ERROR]: 500,
}

/**
 * Build a JSON response for an API error with consistent shape.
 */
export function apiError(
  code: ApiErrorCode,
  message: string,
  options?: { status?: number; details?: unknown }
): NextResponse<ApiErrorBody> {
  const status = options?.status ?? DEFAULT_HTTP_STATUS[code]
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(options?.details != null && { details: options.details }),
      },
    },
    { status }
  )
}

/** 401 Unauthorized - missing or invalid auth */
export function unauthorized(message = "Unauthorized") {
  return apiError(API_ERROR_CODES.UNAUTHORIZED, message)
}

/** 403 Forbidden - authenticated but not allowed */
export function forbidden(message = "Forbidden") {
  return apiError(API_ERROR_CODES.FORBIDDEN, message)
}

/** 404 Not Found */
export function notFound(message = "Not found") {
  return apiError(API_ERROR_CODES.NOT_FOUND, message)
}

/** 400 Bad Request - malformed or invalid input */
export function badRequest(message: string, details?: unknown) {
  return apiError(API_ERROR_CODES.BAD_REQUEST, message, { details })
}

/** 422 Validation Error - Zod or schema validation failed */
export function validationError(message: string, details?: unknown) {
  return apiError(API_ERROR_CODES.VALIDATION_ERROR, message, { details })
}

/** 409 Conflict - e.g. duplicate, state conflict */
export function conflict(message: string, details?: unknown) {
  return apiError(API_ERROR_CODES.CONFLICT, message, { details })
}

/** 500 Internal Server Error - avoid leaking details in production */
export function internalError(
  message = "An unexpected error occurred",
  details?: unknown
) {
  return apiError(API_ERROR_CODES.INTERNAL_ERROR, message, {
    details: process.env.NODE_ENV === "development" ? details : undefined,
  })
}
