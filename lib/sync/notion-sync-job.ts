/**
 * Shared "create attributed sync_jobs row, then run the Notion pull in after()" runner.
 *
 * Used by the webhook, the bearer pull route and the admin trigger so that attribution
 * (source, actor, IP, event id, season) and the dedupe / one-running-per-season indexes
 * behave identically everywhere. Callers must have passed the pull-sync gate and their own
 * authentication before calling this.
 */

import { after } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { syncNotionToSupabase, type SyncOptions, type SyncResult } from "@/lib/sync/notion-sync-worker"
import { notifyDraftBoardSync, notifyDraftBoardError } from "@/lib/discord-notifications"

export type SyncJobSource = "webhook" | "admin_ui" | "n8n" | "bearer"

export const NOTION_EVENT_ID_INDEX = "sync_jobs_notion_event_id_uidx"
export const RUNNING_DRAFT_BOARD_INDEX = "sync_jobs_running_draft_board_season_uidx"

/** A running draft_board job older than this is considered dead and is failed before a new one starts. */
export const STALE_RUNNING_JOB_MS = 15 * 60 * 1000

export interface StartNotionSyncJobInput {
  supabaseUrl: string
  serviceRoleKey: string
  source: SyncJobSource
  triggeredBy: "manual" | "cron" | "notion_webhook"
  actorUserId?: string | null
  requestIp?: string | null
  notionEventId?: string | null
  options: SyncOptions
  /** Extra non-sensitive metadata stored in sync_jobs.config. */
  extraConfig?: Record<string, unknown>
  notifyDiscord?: boolean
}

export type StartNotionSyncJobResult =
  | { kind: "started"; jobId: string; seasonId: string | null }
  | { kind: "duplicate" }
  | { kind: "busy" }
  | { kind: "error"; message: string }

type AnySyncResult = SyncResult

export function summarizeSyncResult(result: AnySyncResult, scope: string[]) {
  const isDraftBoardOnly =
    scope.includes("draft_board") && scope.every((s) => s === "draft_board")
  const useDraftBoard = isDraftBoardOnly && result.stats.draft_board
  const pokemonSynced = useDraftBoard
    ? (result.stats.draft_board!.synced ?? 0)
    : result.stats.pokemon.created + result.stats.pokemon.updated
  const pokemonFailed = useDraftBoard
    ? (result.stats.draft_board!.failed ?? 0)
    : result.stats.pokemon.failed
  return { pokemonSynced, pokemonFailed }
}

/** Row update applied when a job finishes; records prune decisions (ids + names) in error_log/config. */
export function buildSyncJobCompletionPayload(result: AnySyncResult, options: SyncOptions) {
  const scope = options.scope ?? []
  const { pokemonSynced, pokemonFailed } = summarizeSyncResult(result, scope)
  const errorMessage = result.errors?.length
    ? result.errors
        .map((e: { error?: string }) => e.error)
        .filter(Boolean)
        .join("; ") || undefined
    : undefined
  const prune = result.stats.draft_board?.prune

  let errorLog: Record<string, unknown> | null = null
  if (errorMessage) errorLog = { error: errorMessage, details: result.errors }
  else if (!result.success) errorLog = { error: "Sync failed", details: result.errors }
  if (prune && (prune.refused || prune.pruned.length > 0)) {
    errorLog = { ...(errorLog ?? {}), prune }
  }

  return {
    errorMessage,
    pokemonSynced,
    pokemonFailed,
    payload: {
      status: result.success ? "completed" : "failed",
      completed_at: new Date().toISOString(),
      pokemon_synced: pokemonSynced,
      pokemon_failed: pokemonFailed,
      config: { ...options, result },
      error_log: errorLog,
    },
  }
}

export async function startNotionSyncJob(
  input: StartNotionSyncJobInput,
): Promise<StartNotionSyncJobResult> {
  const { supabaseUrl, serviceRoleKey, options } = input

  if (!process.env.NOTION_API_KEY) {
    return { kind: "error", message: "NOTION_API_KEY environment variable is required for Notion sync" }
  }

  const scope = options.scope ?? ["pokemon", "role_tags", "moves"]
  const incremental = options.incremental === true
  const includesDraftBoard = scope.includes("draft_board")

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let seasonId: string | null = null
  if (includesDraftBoard) {
    const { data: season } = await supabase
      .from("seasons")
      .select("id")
      .eq("is_current", true)
      .maybeSingle()
    seasonId = (season as { id?: string } | null)?.id ?? null

    if (seasonId) {
      await supabase
        .from("sync_jobs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_log: { error: "Marked failed: running draft_board job exceeded the stale timeout" },
        })
        .eq("season_id", seasonId)
        .eq("sync_scope", "draft_board")
        .eq("status", "running")
        .lt("started_at", new Date(Date.now() - STALE_RUNNING_JOB_MS).toISOString())
    }
  }

  const { data: job, error: jobError } = await supabase
    .from("sync_jobs")
    .insert({
      job_type: incremental ? "incremental" : "full",
      status: "running",
      triggered_by: input.triggeredBy,
      source: input.source,
      actor_user_id: input.actorUserId ?? null,
      request_ip: input.requestIp ?? null,
      notion_event_id: input.notionEventId ?? null,
      season_id: seasonId,
      sync_scope: includesDraftBoard ? "draft_board" : null,
      config: {
        scope,
        dryRun: options.dryRun ?? false,
        incremental,
        since: options.since ?? null,
        allowLargePrune: options.allowLargePrune === true,
        ...(input.extraConfig ?? {}),
      },
    })
    .select("job_id")
    .single()

  if (jobError || !job) {
    const text = `${jobError?.message ?? ""} ${(jobError as { details?: string } | null)?.details ?? ""}`
    if (jobError?.code === "23505" || text.includes("duplicate key")) {
      if (text.includes(NOTION_EVENT_ID_INDEX)) return { kind: "duplicate" }
      if (text.includes(RUNNING_DRAFT_BOARD_INDEX)) return { kind: "busy" }
    }
    return { kind: "error", message: `Failed to create sync job: ${jobError?.message ?? "unknown error"}` }
  }

  const jobId = (job as { job_id: string }).job_id
  const syncOptions: SyncOptions = { ...options, scope }

  // after() keeps the function alive so the completion update runs after the response is sent.
  after(async () => {
    try {
      const result = await syncNotionToSupabase(supabaseUrl, serviceRoleKey, syncOptions)
      const { payload, errorMessage, pokemonSynced, pokemonFailed } = buildSyncJobCompletionPayload(
        result,
        syncOptions,
      )
      await supabase.from("sync_jobs").update(payload).eq("job_id", jobId)

      if (input.notifyDiscord && includesDraftBoard) {
        if (result.success) {
          await notifyDraftBoardSync({ synced: pokemonSynced, failed: pokemonFailed }, []).catch((err) =>
            console.error("[Discord] Draft board sync notify:", err),
          )
        } else {
          await notifyDraftBoardError(errorMessage ?? "Sync failed", { details: result.errors }).catch((err) =>
            console.error("[Discord] Draft board error notify:", err),
          )
        }
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error))
      console.error("Sync job error:", err.message)
      await supabase
        .from("sync_jobs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_log: { error: err.message, stack: err.stack },
        })
        .eq("job_id", jobId)
      if (input.notifyDiscord && includesDraftBoard) {
        await notifyDraftBoardError(err.message, { stack: err.stack }).catch((e) =>
          console.error("[Discord] Draft board error notify:", e),
        )
      }
    }
  })

  return { kind: "started", jobId, seasonId }
}
