/**
 * Phase 4.3: Notion Sync Status Endpoint
 *
 * GET /api/sync/notion/status?job_id=<uuid>
 *
 * Returns status of sync jobs. sync_jobs is no longer publicly readable, so this route reads it
 * with the service-role client and strips attribution fields (actor_user_id, request_ip,
 * notion_event_id) before responding.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { isNotionPullSyncEnabled } from "@/lib/sync/notion-pull-sync-gate"

const PRIVATE_COLUMNS = ["actor_user_id", "request_ip", "notion_event_id"] as const

export function sanitizeSyncJob<T extends Record<string, unknown>>(job: T): Omit<T, (typeof PRIVATE_COLUMNS)[number]> {
  const copy: Record<string, unknown> = { ...job }
  for (const column of PRIVATE_COLUMNS) delete copy[column]
  return copy as Omit<T, (typeof PRIVATE_COLUMNS)[number]>
}

export async function GET(request: NextRequest) {
  const pull_sync_enabled = isNotionPullSyncEnabled()
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get("job_id")
    const parsedLimit = parseInt(searchParams.get("limit") || "10", 10)
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 10

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Supabase configuration missing", pull_sync_enabled }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    if (jobId) {
      const { data: job, error } = await supabase.from("sync_jobs").select("*").eq("job_id", jobId).single()

      if (error || !job) {
        return NextResponse.json({ error: "Job not found", pull_sync_enabled }, { status: 404 })
      }

      return NextResponse.json({ job: sanitizeSyncJob(job as Record<string, unknown>), pull_sync_enabled })
    }

    const { data: jobs, error } = await supabase
      .from("sync_jobs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch jobs: ${error.message}`, pull_sync_enabled },
        { status: 500 },
      )
    }

    return NextResponse.json({
      jobs: ((jobs as Record<string, unknown>[] | null) ?? []).map(sanitizeSyncJob),
      pull_sync_enabled,
    })
  } catch (error: unknown) {
    console.error("Notion sync status error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error", pull_sync_enabled },
      { status: 500 },
    )
  }
}
