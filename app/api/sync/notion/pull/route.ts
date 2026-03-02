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
 *   "scope": ["pokemon", "role_tags", "moves", "draft_board"], // optional; include "draft_board" to sync Notion Draft Board → Supabase draft_pool
 *   "dryRun": false, // optional
 *   "incremental": false, // optional
 *   "since": "2026-01-01T00:00:00Z" // optional, for incremental sync
 * }
 */

import { NextRequest, NextResponse, after } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Allow sync to complete (draft_board sync typically 30-90s)
export const maxDuration = 120
import { syncNotionToSupabase } from "@/lib/sync/notion-sync-worker"
import { notifyDraftBoardSync, notifyDraftBoardError } from "@/lib/discord-notifications"

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

    // Execute sync (async - job status will be updated). Include "draft_board" in scope to sync Notion Draft Board → draft_pool.
    const syncOptions = {
      scope: scope || ["pokemon", "role_tags", "moves"],
      dryRun,
      incremental,
      since: since ? new Date(since) : undefined,
    }

    // Use after() so the sync completion callback runs even after the response is sent.
    // Without this, serverless functions terminate immediately and the job status never updates.
    after(async () => {
      try {
        const result = await syncNotionToSupabase(supabaseUrl, serviceRoleKey, syncOptions)
        const scopeArr = syncOptions.scope || []
        const isDraftBoardOnly = scopeArr.includes("draft_board") && (scopeArr.length === 1 || scopeArr.every((s) => s === "draft_board"))
        const pokemonSynced = isDraftBoardOnly && result.stats.draft_board
          ? (result.stats.draft_board.synced ?? 0)
          : result.stats.pokemon.created + result.stats.pokemon.updated
        const pokemonFailed = isDraftBoardOnly && result.stats.draft_board
          ? (result.stats.draft_board.failed ?? 0)
          : result.stats.pokemon.failed
        const errorMessage = result.errors?.length
          ? result.errors.map((e: { entity?: string; error?: string }) => e.error).filter(Boolean).join("; ") || undefined
          : undefined
        const updatePayload: Record<string, unknown> = {
          status: result.success ? "completed" : "failed",
          completed_at: new Date().toISOString(),
          pokemon_synced: pokemonSynced,
          pokemon_failed: pokemonFailed,
          config: {
            ...syncOptions,
            result,
          },
        }
        if (errorMessage) {
          updatePayload.error_log = { error: errorMessage, details: result.errors }
        } else if (!result.success) {
          updatePayload.error_log = { error: "Sync failed", details: result.errors }
        } else {
          updatePayload.error_log = null
        }
        await supabase
          .from("sync_jobs")
          .update(updatePayload)
          .eq("job_id", job.job_id)

        const scopeIncludesDraftBoard = scopeArr && (scopeArr as string[]).includes("draft_board")
        if (scopeIncludesDraftBoard) {
          const synced = isDraftBoardOnly && result.stats.draft_board ? (result.stats.draft_board.synced ?? 0) : pokemonSynced
          const failed = isDraftBoardOnly && result.stats.draft_board ? (result.stats.draft_board.failed ?? 0) : pokemonFailed
          if (result.success) {
            await notifyDraftBoardSync({ synced, failed }, []).catch((err) => console.error("[Discord] Draft board sync notify:", err))
          } else {
            await notifyDraftBoardError(errorMessage ?? "Sync failed", { details: result.errors }).catch((err) => console.error("[Discord] Draft board error notify:", err))
          }
        }
      } catch (error: any) {
        console.error("Sync job error:", error)
        await supabase
          .from("sync_jobs")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_log: { error: error.message, stack: error.stack },
          })
          .eq("job_id", job.job_id)
        const scopeIncludesDraftBoard = syncOptions.scope && syncOptions.scope.includes("draft_board")
        if (scopeIncludesDraftBoard) {
          await notifyDraftBoardError(error.message, { stack: error.stack }).catch((err) => console.error("[Discord] Draft board error notify:", err))
        }
      }
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
