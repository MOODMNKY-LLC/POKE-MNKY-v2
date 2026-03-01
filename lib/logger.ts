/**
 * POKE MNKY v3: Structured logging for API and server code.
 * In production, only warn/error are emitted unless LOG_LEVEL=debug.
 */

const LOG_LEVEL = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "warn" : "debug")
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const
const currentLevel = LEVELS[LOG_LEVEL as keyof typeof LEVELS] ?? LEVELS.warn

function shouldLog(level: keyof typeof LEVELS): boolean {
  return currentLevel <= LEVELS[level]
}

export interface LogContext {
  route?: string
  requestId?: string
  [key: string]: unknown
}

function formatMessage(level: string, message: string, context?: LogContext): string {
  const parts = [new Date().toISOString(), level.toUpperCase(), message]
  if (context && Object.keys(context).length > 0) {
    parts.push(JSON.stringify(context))
  }
  return parts.join(" ")
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (shouldLog("debug")) {
      console.debug(formatMessage("debug", message, context))
    }
  },
  info(message: string, context?: LogContext) {
    if (shouldLog("info")) {
      console.info(formatMessage("info", message, context))
    }
  },
  warn(message: string, context?: LogContext) {
    if (shouldLog("warn")) {
      console.warn(formatMessage("warn", message, context))
    }
  },
  error(message: string, context?: LogContext) {
    if (shouldLog("error")) {
      console.error(formatMessage("error", message, context))
    }
  },
}
