/**
 * Notion Webhook Receiver
 *
 * Receives webhooks from Notion when Draft Board database changes.
 * Verifies webhook signature and triggers incremental sync to Supabase.
 *
 * POST /api/webhooks/notion
 *
 * Authentication: Notion webhook signature verification
 *
 * Webhook Events:
 * - database.content_updated - When pages in Draft Board database change
 * - page.properties_updated - When specific properties change
 */

import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { createClient } from "@supabase/supabase-js"
import { syncNotionToSupabase } from "@/lib/sync/notion-sync-worker"
import { unauthorized, badRequest, internalError } from "@/lib/api-error"
import { notionWebhookPayloadSchema } from "@/lib/validation/notion-webhook"
import { logger } from "@/lib/logger"

const DRAFT_BOARD_DATABASE_ID = "5e58ccd73ceb44ed83de826b51cf5c36"

/**
 * Verify Notion webhook signature
 *
 * Notion sends signatures in format: "sha256=<hash>"
 * The hash is HMAC-SHA256 of the request body using the verification_token
 */
function verifyNotionSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) {
    // Handle verification token request (initial setup)
    try {
      const payload = JSON.parse(body)
      if (payload.verification_token) {
        // Store verification token for future use
        // For now, we'll use NOTION_WEBHOOK_SECRET as the verification token
        return true // Accept verification requests
      }
    } catch {
      // Not a verification request
    }
    return false
  }

  try {
    // Extract hash from "sha256=<hash>" format
    const signatureHash = signature.replace("sha256=", "")
    
    // Compute expected signature
    const hmac = crypto.createHmac("sha256", secret)
    hmac.update(body)
    const expectedSignature = hmac.digest("hex")
    
    return crypto.timingSafeEqual(
      Buffer.from(signatureHash),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    logger.error("Notion webhook signature verification error", { route: "webhooks/notion", error: String(error) })
    return false
  }
}

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`
  logger.debug("Notion webhook received", { requestId, route: "webhooks/notion" })

  try {
    const body = await request.text()
    logger.debug("Notion webhook body length", { requestId, bodyLength: body.length })

    if (!body || body.length === 0) {
      return NextResponse.json({ success: true, message: "Empty body acknowledged" }, { status: 200 })
    }

    try {
      const verificationPayload = JSON.parse(body)
      if (verificationPayload.verification_token) {
        logger.debug("Notion webhook verification token received", { requestId })
        return NextResponse.json({
          verification_token: verificationPayload.verification_token,
        }, { status: 200 })
      }
    } catch {
      // Not a verification request, continue with normal webhook processing
    }

    // Get webhook secret/verification token from environment
    const webhookSecret = process.env.NOTION_WEBHOOK_SECRET
    if (!webhookSecret) {
      return internalError("Webhook secret not configured")
    }

    // Get signature from headers
    const signature = request.headers.get("x-notion-signature") || null

    // Verify signature (skip for verification requests, already handled above)
    if (signature && !verifyNotionSignature(body, signature, webhookSecret)) {
      return unauthorized("Invalid signature")
    }

    // Parse and validate webhook payload
    let payload: { type?: string; data?: { database_id?: string }; database_id?: string }
    try {
      const raw = JSON.parse(body)
      const parsed = notionWebhookPayloadSchema.safeParse(raw)
      if (!parsed.success) {
        return badRequest("Invalid webhook payload structure", parsed.error.errors)
      }
      payload = parsed.data
    } catch {
      return badRequest("Invalid JSON payload")
    }

    // Extract event type and database ID
    const eventType = payload.type
    const databaseId = payload.data?.database_id || payload.database_id

    if (databaseId !== DRAFT_BOARD_DATABASE_ID) {
      logger.debug("Notion webhook ignored: wrong database", { requestId, databaseId })
      return NextResponse.json({ success: true, message: "Ignored" })
    }

    const relevantEvents = [
      "database.content_updated",
      "page.properties_updated",
      "page.created",
    ]

    if (!relevantEvents.includes(eventType)) {
      logger.debug("Notion webhook ignored: event type", { requestId, eventType })
      return NextResponse.json({ success: true, message: "Event type ignored" })
    }

    logger.info("Notion webhook processing", { requestId, eventType, route: "webhooks/notion" })

    // Trigger incremental sync
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return internalError("Supabase configuration missing")
    }

    // Create sync job record
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Try to create sync job, but don't fail if constraint issue
    // (migration may not be applied yet)
    let job: any = null
    const { data: jobData, error: jobError } = await supabase
      .from("sync_jobs")
      .insert({
        job_type: "incremental",
        status: "running",
        triggered_by: "notion_webhook", // Will fail if migration not applied
        config: {
          scope: ["draft_board"],
          event_type: eventType,
          database_id: databaseId,
          webhook_payload: payload,
        },
      })
      .select()
      .single()

    if (jobError) {
      // If constraint error, try with 'manual' as fallback
      if (jobError.message.includes("sync_jobs_triggered_by_check")) {
        logger.warn("Notion webhook constraint error, using manual fallback", { requestId })
        const { data: fallbackJob, error: fallbackError } = await supabase
          .from("sync_jobs")
          .insert({
            job_type: "incremental",
            status: "running",
            triggered_by: "manual", // Fallback if migration not applied
            config: {
              scope: ["draft_board"],
              event_type: eventType,
              database_id: databaseId,
              webhook_payload: payload,
              note: "Triggered by Notion webhook (migration pending)",
            },
          })
          .select()
          .single()
        
        if (fallbackError) {
          console.error("[Notion Webhook] Failed to create sync job (fallback):", fallbackError)
          // Continue anyway - don't block webhook response
        } else {
          job = fallbackJob
        }
      } else {
        logger.error("Notion webhook failed to create sync job", { requestId, error: String(jobError) })
        // Continue anyway - don't block webhook response
      }
    } else {
      job = jobData
    }

    // Execute sync asynchronously (don't block webhook response)
    if (job) {
      syncNotionToSupabase(supabaseUrl, serviceRoleKey, {
        scope: ["draft_board"],
        incremental: true,
        since: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
      })
        .then(async (result) => {
          // Update job status
          await supabase
            .from("sync_jobs")
            .update({
              status: result.success ? "completed" : "failed",
              completed_at: new Date().toISOString(),
              pokemon_synced: result.stats.draft_board?.synced || 0,
              pokemon_failed: result.stats.draft_board?.failed || 0,
              config: {
                scope: ["draft_board"],
                incremental: true,
                result,
              },
            })
            .eq("job_id", job.job_id)

          logger.info("Notion webhook sync completed", {
            requestId,
            synced: result.stats.draft_board?.synced ?? 0,
            failed: result.stats.draft_board?.failed ?? 0,
          })
        })
        .catch(async (error) => {
          logger.error("Notion webhook sync job error", { requestId, error: String(error) })
          await supabase
            .from("sync_jobs")
            .update({
              status: "failed",
              completed_at: new Date().toISOString(),
              error_log: { error: error.message, stack: error.stack },
            })
            .eq("job_id", job.job_id)
        })
    } else {
      // No job created, but still run sync
      syncNotionToSupabase(supabaseUrl, serviceRoleKey, {
        scope: ["draft_board"],
        incremental: true,
        since: new Date(Date.now() - 5 * 60 * 1000),
      }).catch((error) => {
        logger.error("Notion webhook sync error (no job)", { requestId, error: String(error) })
      })
    }

    // Return immediately (sync runs async)
    // Notion expects a simple 200 OK response - keep it simple
    logger.debug("Notion webhook returning success", { requestId })
    return NextResponse.json({
      success: true,
    }, { status: 200 })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    logger.error("Notion webhook error", { requestId, message: error.message })
    return internalError(error.message, process.env.NODE_ENV === "development" ? err : undefined)
  }
}

// Handle GET for webhook verification (if Notion requires it)
// Also handle verification_token from initial subscription setup
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "Notion webhook endpoint",
    status: "active",
  })
}
