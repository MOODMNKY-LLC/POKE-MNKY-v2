/**
 * Admin Trigger Notion Sync
 *
 * POST /api/admin/trigger-notion-sync
 *
 * Signed-in league admin only. Starts a draft_board sync directly (no internal fetch),
 * recording the admin as actor_user_id with source "admin_ui".
 *
 * Body:
 *  - scope: must be exactly ["draft_board"] (default) - anything else is 400
 *  - incremental: default true. false (full sync) requires confirm: "full" - otherwise 400
 *  - allowLargePrune: honoured only for a confirmed full sync (confirm: "full", incremental: false)
 *  - since: optional ISO timestamp
 */

import { leagueAdminDeniedResponse } from "@/lib/admin-api-auth"
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { notionPullSyncDeniedResponse } from "@/lib/sync/notion-pull-sync-gate"
import { startNotionSyncJob } from "@/lib/sync/notion-sync-job"
import { getRequestIp } from "@/lib/sync/request-ip"

export const maxDuration = 120

export async function POST(request: NextRequest) {
  const pullDenied = notionPullSyncDeniedResponse()
  if (pullDenied) return pullDenied

  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const adminDenied = await leagueAdminDeniedResponse(user.id)
    if (adminDenied) return adminDenied

    let body: Record<string, unknown>
    try {
      const parsed: unknown = await request.json()
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object")
      body = parsed as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const scope = body.scope ?? ["draft_board"]
    if (!Array.isArray(scope) || scope.length !== 1 || scope[0] !== "draft_board") {
      return NextResponse.json({ error: 'Only scope ["draft_board"] is allowed' }, { status: 400 })
    }

    const incremental = body.incremental === undefined ? true : body.incremental
    if (typeof incremental !== "boolean") {
      return NextResponse.json({ error: "incremental must be a boolean" }, { status: 400 })
    }
    if (!incremental && body.confirm !== "full") {
      return NextResponse.json(
        { error: 'A full sync (incremental: false) requires confirm: "full"' },
        { status: 400 },
      )
    }

    let since: Date | undefined
    if (body.since !== undefined && body.since !== null) {
      since = new Date(String(body.since))
      if (Number.isNaN(since.getTime())) {
        return NextResponse.json({ error: "Invalid since timestamp" }, { status: 400 })
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 })
    }

    const result = await startNotionSyncJob({
      supabaseUrl,
      serviceRoleKey,
      source: "admin_ui",
      triggeredBy: "manual",
      actorUserId: user.id,
      requestIp: getRequestIp(request.headers),
      options: {
        scope: ["draft_board"],
        incremental,
        since,
        allowLargePrune: !incremental && body.confirm === "full" && body.allowLargePrune === true,
      },
      notifyDiscord: true,
    })

    switch (result.kind) {
      case "busy":
        return NextResponse.json(
          { error: "A draft_board sync is already running for this season", code: "SYNC_ALREADY_RUNNING" },
          { status: 409 },
        )
      case "duplicate":
        return NextResponse.json({ error: "Duplicate sync request" }, { status: 409 })
      case "error":
        return NextResponse.json({ error: result.message }, { status: 500 })
      case "started":
        return NextResponse.json({
          success: true,
          job_id: result.jobId,
          status: "running",
          message: "Sync job started",
        })
    }
  } catch (error: unknown) {
    console.error("Admin trigger sync error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
