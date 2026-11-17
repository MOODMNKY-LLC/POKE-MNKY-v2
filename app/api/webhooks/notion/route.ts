/**
 * Notion Webhook Receiver
 *
 * POST /api/webhooks/notion
 *
 * Order of checks:
 *  1. NOTION_PULL_SYNC_ENABLED off -> 410 (nothing else runs)
 *  2. NOTION_WEBHOOK_SETUP_MODE on and body is { verification_token } -> 200 { ok: true }, never syncs
 *  3. x-notion-signature (sha256=<64 hex>, HMAC-SHA256 of the RAW body) is ALWAYS required.
 *     Missing / malformed / invalid / NOTION_WEBHOOK_SECRET unset -> 401
 *  4. Replay window: `timestamp` missing or more than 5 minutes old/in the future -> 401
 *  5. Source allowlist (Draft Board database / data source) -> 200 { ignored: "source" }
 *  6. Event allowlist -> 200 { ignored: "event" }
 *  7. Dedupe on event id (sync_jobs.notion_event_id) -> 200 { duplicate: true }
 *  8. A draft_board sync is already running for the season -> 409
 *
 * The sync is always incremental over the draft_board scope; body-supplied options are ignored.
 */

import { NextRequest, NextResponse } from "next/server"
import { unauthorized, badRequest, internalError } from "@/lib/api-error"
import { notionWebhookPayloadSchema } from "@/lib/validation/notion-webhook"
import { logger } from "@/lib/logger"
import {
  isNotionWebhookSetupMode,
  notionPullSyncDeniedResponse,
} from "@/lib/sync/notion-pull-sync-gate"
import {
  parseNotionVerificationToken,
  verifyNotionWebhookSignature,
} from "@/lib/notion/verify-webhook-signature"
import {
  checkWebhookTimestamp,
  isAllowedNotionEventType,
  isAllowedNotionSource,
  resolveNotionEventSourceId,
} from "@/lib/notion/webhook-event"
import { startNotionSyncJob } from "@/lib/sync/notion-sync-job"
import { getRequestIp } from "@/lib/sync/request-ip"

// Allow webhook-triggered sync to complete
export const maxDuration = 120

const INCREMENTAL_WINDOW_MS = 5 * 60 * 1000

export async function POST(request: NextRequest) {
  // 1. Flag off: fail closed before reading the body, auth, or any DB work.
  const pullDenied = notionPullSyncDeniedResponse()
  if (pullDenied) return pullDenied

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`

  try {
    const rawBody = await request.text()

    // 2. One-time subscription handshake, only while setup mode is on. Never logs or echoes the token.
    if (isNotionWebhookSetupMode() && parseNotionVerificationToken(rawBody) !== null) {
      logger.info("Notion webhook verification token received (setup mode)", { requestId })
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    // 3. Signature is always required.
    const webhookSecret = process.env.NOTION_WEBHOOK_SECRET
    if (!webhookSecret) {
      logger.error("Notion webhook rejected: NOTION_WEBHOOK_SECRET not configured", { requestId })
      return unauthorized("Invalid or missing signature")
    }
    if (!verifyNotionWebhookSignature(rawBody, request.headers.get("x-notion-signature"), webhookSecret)) {
      return unauthorized("Invalid or missing signature")
    }

    let rawJson: unknown
    try {
      rawJson = JSON.parse(rawBody)
    } catch {
      return badRequest("Invalid JSON payload")
    }
    const parsed = notionWebhookPayloadSchema.safeParse(rawJson)
    if (!parsed.success) {
      return badRequest("Invalid webhook payload structure", parsed.error.issues)
    }
    const payload = parsed.data

    // 4. Replay protection (401: the request is not a fresh, authentic Notion delivery).
    const timestampCheck = checkWebhookTimestamp(payload.timestamp)
    if (!timestampCheck.ok) {
      logger.warn("Notion webhook rejected: timestamp", { requestId, reason: timestampCheck.reason })
      return unauthorized(`Webhook timestamp rejected (${timestampCheck.reason})`)
    }

    // 5. Source allowlist
    const sourceId = resolveNotionEventSourceId(payload)
    if (!isAllowedNotionSource(sourceId)) {
      logger.debug("Notion webhook ignored: source", { requestId })
      return NextResponse.json({ ignored: "source" }, { status: 200 })
    }

    // 6. Event allowlist
    if (!isAllowedNotionEventType(payload.type)) {
      logger.debug("Notion webhook ignored: event type", { requestId, eventType: payload.type })
      return NextResponse.json({ ignored: "event" }, { status: 200 })
    }

    const eventId = payload.id?.trim()
    if (!eventId) {
      return badRequest("Webhook event id is required")
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return internalError("Supabase configuration missing")
    }

    // 7/8. Forced incremental draft_board sync; no body-supplied overrides are read.
    const result = await startNotionSyncJob({
      supabaseUrl,
      serviceRoleKey,
      source: "webhook",
      triggeredBy: "notion_webhook",
      requestIp: getRequestIp(request.headers),
      notionEventId: eventId,
      options: {
        scope: ["draft_board"],
        incremental: true,
        since: new Date(Date.now() - INCREMENTAL_WINDOW_MS),
        dryRun: false,
        allowLargePrune: false,
      },
      extraConfig: { event_type: payload.type, source_id: sourceId },
    })

    switch (result.kind) {
      case "duplicate":
        return NextResponse.json({ duplicate: true }, { status: 200 })
      case "busy":
        return NextResponse.json(
          { error: "A draft_board sync is already running for this season", code: "SYNC_ALREADY_RUNNING" },
          { status: 409 },
        )
      case "error":
        logger.error("Notion webhook failed to start sync", { requestId, message: result.message })
        return internalError(result.message)
      case "started":
        logger.info("Notion webhook sync started", { requestId, eventType: payload.type })
        return NextResponse.json({ success: true }, { status: 200 })
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    logger.error("Notion webhook error", { requestId, message: error.message })
    return internalError(error.message, process.env.NODE_ENV === "development" ? err : undefined)
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Notion webhook endpoint",
    status: "active",
  })
}
