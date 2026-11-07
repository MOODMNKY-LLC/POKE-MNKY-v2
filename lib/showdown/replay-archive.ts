/**
 * Archive + match-attach helpers (service-role inserts; ownership checked first).
 */

import { createHash } from "crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import { resolveCoachTeamForSeason } from "@/lib/coach-team-context"
import { fetchOfficialPublicReplayJson } from "./replay-fetch"
import {
  parseBasicReplayLog,
  REPLAY_PARSER_VERSION,
  type BasicReplayObservation,
} from "./replay-parse-basic"

export const REPLAY_FETCH_VERSION = "phase1-fetch-1"

/** Versioned integrity fingerprint: source + raw log + fetch/parser versions. */
export function hashReplayContent(
  rawLog: string,
  sourceId: string,
  parserVersion: string = REPLAY_PARSER_VERSION,
  fetchVersion: string = REPLAY_FETCH_VERSION,
): string {
  return createHash("sha256")
    .update(
      `v1\nsource=${sourceId}\nfetch=${fetchVersion}\nparser=${parserVersion}\n\n${rawLog}`,
      "utf8",
    )
    .digest("hex")
}

export type MatchOwnership = {
  matchId: string
  seasonId: string
  team1Id: string
  team2Id: string
  callerTeamId: string
}

export async function assertCallerOwnsMatchSide(
  supabase: SupabaseClient,
  userId: string,
  matchId: string,
): Promise<
  | { ok: true; ownership: MatchOwnership }
  | { ok: false; status: number; error: string; code: string }
> {
  const { data: match, error } = await supabase
    .from("matches")
    .select("id, season_id, team1_id, team2_id")
    .eq("id", matchId)
    .maybeSingle()

  if (error || !match) {
    return { ok: false, status: 404, error: "Match not found", code: "MATCH_NOT_FOUND" }
  }
  if (!match.season_id) {
    return {
      ok: false,
      status: 400,
      error: "Match missing season_id",
      code: "MATCH_SEASON_MISSING",
    }
  }

  // Season-authoritative team resolution (coaches.id path), same as validate-team.
  const { team } = await resolveCoachTeamForSeason(
    supabase,
    userId,
    match.season_id as string,
  )
  if (!team?.id) {
    return {
      ok: false,
      status: 403,
      error: "No league team for this match season",
      code: "NO_TEAM",
    }
  }

  const teamId = team.id
  if (teamId !== match.team1_id && teamId !== match.team2_id) {
    return {
      ok: false,
      status: 403,
      error: "Not a participant on this match",
      code: "FOREIGN_MATCH",
    }
  }

  return {
    ok: true,
    ownership: {
      matchId: match.id,
      seasonId: match.season_id,
      team1Id: match.team1_id,
      team2Id: match.team2_id,
      callerTeamId: teamId,
    },
  }
}

export type PreviewReplayResult =
  | {
      ok: true
      source_id: string
      source_url: string
      format: string | null
      players: string[]
      visibility: "public"
      observation: BasicReplayObservation
      content_hash: string
    }
  | { ok: false; error: string; code: string; status?: number }

export async function previewOfficialPublicReplay(
  rawUrl: string,
): Promise<PreviewReplayResult> {
  const fetched = await fetchOfficialPublicReplayJson(rawUrl)
  if (!fetched.ok) {
    return {
      ok: false,
      error: fetched.error,
      code: fetched.code,
      status: fetched.status,
    }
  }

  const observation = parseBasicReplayLog(fetched.rawLog)
  return {
    ok: true,
    source_id: fetched.sourceId,
    source_url: fetched.sourceUrl,
    format: fetched.json.format ?? null,
    players: Array.isArray(fetched.json.players) ? fetched.json.players : [],
    visibility: "public",
    observation,
    content_hash: hashReplayContent(fetched.rawLog, fetched.sourceId),
  }
}

export async function archiveOfficialPublicReplay(
  service: SupabaseClient,
  opts: {
    userId: string
    rawUrl: string
    seasonId: string
    aclOwnerTeamId: string
  },
): Promise<
  | {
      ok: true
      archiveId: string
      parseRunId: string
      deduped: boolean
      observation: BasicReplayObservation
      source_id: string
    }
  | { ok: false; error: string; code: string; status?: number }
> {
  const fetched = await fetchOfficialPublicReplayJson(opts.rawUrl)
  if (!fetched.ok) {
    return {
      ok: false,
      error: fetched.error,
      code: fetched.code,
      status: fetched.status,
    }
  }

  const contentHash = hashReplayContent(fetched.rawLog, fetched.sourceId)
  const observation = parseBasicReplayLog(fetched.rawLog)

  const { data: existing } = await service
    .from("league_replay_archives")
    .select("id, created_by, acl_owner_team_id, season_id")
    .eq("source_id", fetched.sourceId)
    .maybeSingle()

  if (existing?.id) {
    // Dedup must not expose foreign archive existence or grant ACL via attach.
    const sameCreator = existing.created_by === opts.userId
    const sameAclTeam = existing.acl_owner_team_id === opts.aclOwnerTeamId
    const sameSeason =
      !existing.season_id || existing.season_id === opts.seasonId
    if (!sameCreator && !sameAclTeam) {
      return {
        ok: false,
        error:
          "Unable to archive this replay for your team. Use a distinct public URL or contact a coordinator.",
        code: "ARCHIVE_UNAVAILABLE",
        status: 403,
      }
    }
    if (!sameSeason) {
      return {
        ok: false,
        error: "Existing archive season does not match this match",
        code: "SEASON_MISMATCH",
        status: 403,
      }
    }

    const { data: parseRun, error: parseErr } = await service
      .from("league_replay_parse_runs")
      .insert({
        archive_id: existing.id,
        parser_version: REPLAY_PARSER_VERSION,
        result: observation,
        status: observation.winner ? "ok" : "partial",
      })
      .select("id")
      .single()

    if (parseErr || !parseRun) {
      return {
        ok: false,
        error: parseErr?.message || "Failed to record parse run",
        code: "PARSE_RUN_FAILED",
        status: 500,
      }
    }

    return {
      ok: true,
      archiveId: existing.id,
      parseRunId: parseRun.id,
      deduped: true,
      observation,
      source_id: fetched.sourceId,
    }
  }

  const { data: archive, error: archErr } = await service
    .from("league_replay_archives")
    .insert({
      source_id: fetched.sourceId,
      source_url: fetched.sourceUrl,
      content_hash: contentHash,
      raw_log: fetched.rawLog,
      raw_json: fetched.json,
      inputlog:
        typeof fetched.json.inputlog === "string" ? fetched.json.inputlog : null,
      format: fetched.json.format ?? null,
      visibility: "public",
      fetched_at: new Date().toISOString(),
      source_status: "ok",
      created_by: opts.userId,
      acl_owner_team_id: opts.aclOwnerTeamId,
      season_id: opts.seasonId,
    })
    .select("id")
    .single()

  if (archErr || !archive) {
    // Unique race: only reuse when caller already has ACL; never leak foreign rows.
    if (archErr?.code === "23505") {
      const { data: raced } = await service
        .from("league_replay_archives")
        .select("id, created_by, acl_owner_team_id, season_id")
        .eq("source_id", fetched.sourceId)
        .maybeSingle()
      if (raced?.id) {
        const sameCreator = raced.created_by === opts.userId
        const sameAclTeam = raced.acl_owner_team_id === opts.aclOwnerTeamId
        if (!sameCreator && !sameAclTeam) {
          return {
            ok: false,
            error:
              "Unable to archive this replay for your team. Use a distinct public URL or contact a coordinator.",
            code: "ARCHIVE_UNAVAILABLE",
            status: 403,
          }
        }
        const { data: parseRun, error: parseErr } = await service
          .from("league_replay_parse_runs")
          .insert({
            archive_id: raced.id,
            parser_version: REPLAY_PARSER_VERSION,
            result: observation,
            status: observation.winner ? "ok" : "partial",
          })
          .select("id")
          .single()
        if (parseErr || !parseRun) {
          return {
            ok: false,
            error: parseErr?.message || "Failed to record parse run",
            code: "PARSE_RUN_FAILED",
            status: 500,
          }
        }
        return {
          ok: true,
          archiveId: raced.id,
          parseRunId: parseRun.id,
          deduped: true,
          observation,
          source_id: fetched.sourceId,
        }
      }
    }
    return {
      ok: false,
      error: archErr?.message || "Failed to archive replay",
      code: "ARCHIVE_INSERT_FAILED",
      status: 500,
    }
  }

  const { data: parseRun, error: parseErr } = await service
    .from("league_replay_parse_runs")
    .insert({
      archive_id: archive.id,
      parser_version: REPLAY_PARSER_VERSION,
      result: observation,
      status: observation.winner ? "ok" : "partial",
    })
    .select("id")
    .single()

  if (parseErr || !parseRun) {
    return {
      ok: false,
      error: parseErr?.message || "Failed to record parse run",
      code: "PARSE_RUN_FAILED",
      status: 500,
    }
  }

  return {
    ok: true,
    archiveId: archive.id,
    parseRunId: parseRun.id,
    deduped: false,
    observation,
    source_id: fetched.sourceId,
  }
}

export async function linkArchiveToMatch(
  service: SupabaseClient,
  opts: {
    userId: string
    matchId: string
    archiveId: string
    ownership: MatchOwnership
  },
): Promise<
  | { ok: true; linkId: string }
  | { ok: false; error: string; code: string; status: number }
> {
  const { data: archive, error } = await service
    .from("league_replay_archives")
    .select("id, season_id, acl_owner_team_id, created_by, visibility")
    .eq("id", opts.archiveId)
    .maybeSingle()

  if (error || !archive) {
    // Do not leak whether a foreign archive exists vs not found when possible;
    // still 404 for unknown id.
    return { ok: false, status: 404, error: "Archive not found", code: "ARCHIVE_NOT_FOUND" }
  }

  if (archive.visibility !== "public") {
    return {
      ok: false,
      status: 400,
      error: "Only public archives can be attached in Phase 1",
      code: "ARCHIVE_NOT_PUBLIC",
    }
  }

  if (archive.season_id && archive.season_id !== opts.ownership.seasonId) {
    return {
      ok: false,
      status: 403,
      error: "Archive season does not match match season",
      code: "SEASON_MISMATCH",
    }
  }

  // Attach ACL: creator or caller's own team as ACL owner. Do not grant ACL
  // merely because the foreign archive owner is the opponent on this match.
  const allowedCreator = archive.created_by === opts.userId
  const allowedTeam = archive.acl_owner_team_id === opts.ownership.callerTeamId

  if (!allowedCreator && !allowedTeam) {
    return {
      ok: false,
      status: 403,
      error: "Not allowed to attach this archive to the match",
      code: "ARCHIVE_ACL_DENIED",
    }
  }

  const { data: link, error: linkErr } = await service
    .from("league_match_replay_links")
    .upsert(
      {
        match_id: opts.matchId,
        archive_id: opts.archiveId,
        linked_by: opts.userId,
        link_method: "paste",
        confirmed_at: new Date().toISOString(),
      },
      { onConflict: "match_id,archive_id" },
    )
    .select("id")
    .single()

  if (linkErr || !link) {
    return {
      ok: false,
      status: 500,
      error: linkErr?.message || "Failed to link archive",
      code: "LINK_FAILED",
    }
  }

  // Soft-fill matches.replay_url only when empty — never touches scores/standings.
  const { data: archFull } = await service
    .from("league_replay_archives")
    .select("source_url")
    .eq("id", opts.archiveId)
    .maybeSingle()

  if (archFull?.source_url) {
    await service
      .from("matches")
      .update({ replay_url: archFull.source_url })
      .eq("id", opts.matchId)
      .is("replay_url", null)
  }

  return { ok: true, linkId: link.id }
}
