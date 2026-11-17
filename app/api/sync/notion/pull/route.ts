/**
 * Phase 4.1: Notion Sync Pull Endpoint
 *
 * POST /api/sync/notion/pull
 *
 * Triggers a sync job to pull data from Notion and update Supabase
 *
 * Authentication: NOTION_SYNC_SECRET bearer token (strict `Bearer <token>`, timing-safe compare)
 *
 * Body:
 * {
 *   "scope": ["pokemon", "role_tags", "moves", "draft_board"], // optional
 *   "dryRun": false, // optional
 *   "incremental": false, // optional
 *   "since": "2026-01-01T00:00:00Z" // optional, for incremental sync
 * }
 *
 * Large prunes are never allowed from this route (allowLargePrune is not read from the body).
 * Jobs are recorded with source "n8n" when `x-sync-source: n8n` is sent, otherwise "bearer".
 */

import { NextRequest, NextResponse } from "next/server"
import { notionPullSyncDeniedResponse } from "@/lib/sync/notion-pull-sync-gate"
import { verifyBearerSecret } from "@/lib/sync/bearer-auth"
import { startNotionSyncJob, type SyncJobSource } from "@/lib/sync/notion-sync-job"
import { getRequestIp } from "@/lib/sync/request-ip"
import type { SyncOptions } from "@/lib/sync/notion-sync-worker"

// Allow sync to complete (draft_board sync typically 30-90s)
export const maxDuration = 120

const VALID_SCOPES = ["pokemon", "role_tags", "moves", "coaches", "teams", "draft_board"] as const
type Scope = (typeof VALID_SCOPES)[number]

export const N8N_SOURCE_HEADER = "x-sync-source"

export async function POST(request: NextRequest) {
  const pullDenied = notionPullSyncDeniedResponse()
  if (pullDenied) return pullDenied

  try {
    if (!verifyBearerSecret(request.headers.get("authorization"), process.env.NOTION_SYNC_SECRET)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body: Record<string, unknown>
    try {
      const parsed: unknown = await request.json()
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object")
      body = parsed as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const { dryRun = false, incremental = false, since } = body
    let scope: Scope[] | undefined
    if (body.scope !== undefined) {
      if (
        !Array.isArray(body.scope) ||
        body.scope.length === 0 ||
        !body.scope.every((s) => VALID_SCOPES.includes(s as Scope))
      ) {
        return NextResponse.json({ error: "Invalid scope" }, { status: 400 })
      }
      scope = body.scope as Scope[]
    }
    let sinceDate: Date | undefined
    if (since !== undefined && since !== null) {
      sinceDate = new Date(String(since))
      if (Number.isNaN(sinceDate.getTime())) {
        return NextResponse.json({ error: "Invalid since timestamp" }, { status: 400 })
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 })
    }

    const source: SyncJobSource =
      request.headers.get(N8N_SOURCE_HEADER)?.trim().toLowerCase() === "n8n" ? "n8n" : "bearer"

    const options: SyncOptions = {
      scope: scope ?? ["pokemon", "role_tags", "moves"],
      dryRun: dryRun === true,
      incremental: incremental === true,
      since: sinceDate,
      allowLargePrune: false,
    }

    const result = await startNotionSyncJob({
      supabaseUrl,
      serviceRoleKey,
      source,
      triggeredBy: "manual",
      requestIp: getRequestIp(request.headers),
      options,
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
    console.error("Notion sync pull error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
