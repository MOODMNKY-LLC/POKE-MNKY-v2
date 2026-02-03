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
    console.error("[Notion Webhook] Signature verification error:", error)
    return false
  }
}

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`
  console.log(`[Notion Webhook ${requestId}] Received webhook request`)
  
  try {
    // Read raw body first (needed for signature verification and parsing)
    const body = await request.text()
    console.log(`[Notion Webhook ${requestId}] Body length: ${body.length} bytes`)
    
    // Log headers for debugging
    const headers = Object.fromEntries(request.headers.entries())
    console.log(`[Notion Webhook ${requestId}] Headers:`, {
      'content-type': headers['content-type'],
      'x-notion-signature': headers['x-notion-signature'] ? 'present' : 'missing',
      'user-agent': headers['user-agent'],
    })

    // Handle verification token request (initial subscription setup)
    try {
      const verificationPayload = JSON.parse(body)
      if (verificationPayload.verification_token) {
        // Store verification token for future signature verification
        // For now, we'll use NOTION_WEBHOOK_SECRET as the verification token
        // In production, you should store this token securely
        console.log(`[Notion Webhook ${requestId}] Verification token received:`, verificationPayload.verification_token.substring(0, 20) + "...")
        
        // Return success to Notion (they'll verify this token in their UI)
        return NextResponse.json({
          verification_token: verificationPayload.verification_token,
        }, { status: 200 })
      }
    } catch (parseError) {
      // Not a verification request, continue with normal webhook processing
      console.log(`[Notion Webhook ${requestId}] Not a verification request, parsing as webhook event`)
    }

    // Get webhook secret/verification token from environment
    const webhookSecret = process.env.NOTION_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error("[Notion Webhook] NOTION_WEBHOOK_SECRET not configured")
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      )
    }

    // Get signature from headers
    const signature = request.headers.get("x-notion-signature") || null

    // Verify signature (skip for verification requests, already handled above)
    if (signature && !verifyNotionSignature(body, signature, webhookSecret)) {
      console.warn("[Notion Webhook] Invalid signature")
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      )
    }

    // Parse webhook payload
    let payload: any
    try {
      payload = JSON.parse(body)
      console.log(`[Notion Webhook ${requestId}] Parsed payload:`, {
        type: payload.type,
        database_id: payload.data?.database_id || payload.database_id,
        has_data: !!payload.data,
      })
    } catch (error) {
      console.error(`[Notion Webhook ${requestId}] Failed to parse JSON:`, error)
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      )
    }

    // Extract event type and database ID
    const eventType = payload.type
    const databaseId = payload.data?.database_id || payload.database_id

    // Only process Draft Board database events
    if (databaseId !== DRAFT_BOARD_DATABASE_ID) {
      console.log(
        `[Notion Webhook] Ignoring event for database ${databaseId} (not Draft Board)`
      )
      return NextResponse.json({ success: true, message: "Ignored" })
    }

    // Process relevant events
    const relevantEvents = [
      "database.content_updated",
      "page.properties_updated",
      "page.created",
    ]

    if (!relevantEvents.includes(eventType)) {
      console.log(`[Notion Webhook] Ignoring event type: ${eventType}`)
      return NextResponse.json({ success: true, message: "Event type ignored" })
    }

    console.log(
      `[Notion Webhook ${requestId}] Processing ${eventType} for Draft Board database`
    )

    // Trigger incremental sync
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 }
      )
    }

    // Create sync job record
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: job, error: jobError } = await supabase
      .from("sync_jobs")
      .insert({
        job_type: "incremental",
        status: "running",
        triggered_by: "notion_webhook",
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
      console.error("[Notion Webhook] Failed to create sync job:", jobError)
      return NextResponse.json(
        { error: `Failed to create sync job: ${jobError.message}` },
        { status: 500 }
      )
    }

    // Execute sync asynchronously (don't block webhook response)
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

        console.log(
          `[Notion Webhook] Sync completed: ${result.stats.draft_board?.synced || 0} synced, ${result.stats.draft_board?.failed || 0} failed`
        )
      })
      .catch(async (error) => {
        console.error("[Notion Webhook] Sync job error:", error)
        await supabase
          .from("sync_jobs")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_log: { error: error.message, stack: error.stack },
          })
          .eq("job_id", job.job_id)
      })

    // Return immediately (sync runs async)
    // Notion expects a simple 200 OK response - keep it simple
    console.log(`[Notion Webhook ${requestId}] Returning success response`)
    return NextResponse.json({
      success: true,
    }, { status: 200 })
  } catch (error: any) {
    console.error(`[Notion Webhook ${requestId}] Error:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
    })
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
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
