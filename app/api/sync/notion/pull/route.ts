/**
 * Phase 4.1: Notion Sync Pull Endpoint
 * 
 * POST /api/sync/notion/pull
 * 
 * Triggers a sync job to pull data from Notion and update Supabase
 * 
 * Authentication: NOTION_SYNC_SECRET bearer token
 * 
 * Body:
 * {
 *   "scope": ["pokemon", "role_tags", "moves"], // optional, defaults to all
 *   "dryRun": false, // optional
 *   "incremental": false, // optional
 *   "since": "2026-01-01T00:00:00Z" // optional, for incremental sync
 * }
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { syncNotionToSupabase } from "@/lib/sync/notion-sync-worker"

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    const syncSecret = process.env.NOTION_SYNC_SECRET
    if (!syncSecret || token !== syncSecret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      scope,
      dryRun = false,
      incremental = false,
      since,
    } = body

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
        job_type: incremental ? "incremental" : "full",
        status: "running",
        triggered_by: "manual",
        config: {
          scope,
          dryRun,
          incremental,
          since,
        },
      })
      .select()
      .single()

    if (jobError) {
      return NextResponse.json(
        { error: `Failed to create sync job: ${jobError.message}` },
        { status: 500 }
      )
    }

    // Check if Notion API key is configured
    if (!process.env.NOTION_API_KEY) {
      return NextResponse.json(
        { error: "NOTION_API_KEY environment variable is required for Notion sync" },
        { status: 500 }
      )
    }

    // Execute sync (async - job status will be updated)
    const syncOptions = {
      scope: scope || ["pokemon", "role_tags", "moves"],
      dryRun,
      incremental,
      since: since ? new Date(since) : undefined,
    }

    // Run sync in background (in production, use a queue system)
    // Don't await - let it run async and update job status when done
    syncNotionToSupabase(supabaseUrl, serviceRoleKey, syncOptions)
      .then(async (result) => {
        // Update job status
        await supabase
          .from("sync_jobs")
          .update({
            status: result.success ? "completed" : "failed",
            completed_at: new Date().toISOString(),
            pokemon_synced: result.stats.pokemon.created + result.stats.pokemon.updated,
            pokemon_failed: result.stats.pokemon.failed,
            config: {
              ...syncOptions,
              result,
            },
          })
          .eq("job_id", job.job_id)
      })
      .catch(async (error) => {
        // Update job status on error
        console.error("Sync job error:", error)
        await supabase
          .from("sync_jobs")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_log: { error: error.message, stack: error.stack },
          })
          .eq("job_id", job.job_id)
      })
      .catch((err) => {
        // Fallback error handler if job update fails
        console.error("Failed to update sync job status:", err)
      })

    return NextResponse.json({
      success: true,
      job_id: job.job_id,
      status: "running",
      message: "Sync job started",
    })
  } catch (error: any) {
    console.error("Notion sync pull error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
