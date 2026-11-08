/**
 * Non-interference: reset + concurrent lease fencing must not mutate
 * disposable *sentinel* tables (never live-named matches/standings/settings).
 *
 * Env: SEASON_SIM_PG_URL only (loopback disposable). Never POSTGRES_URL.
 */

import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Client } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { SEASON_SIM_FIXTURE_MARKER } from "@/lib/season-sim/pg-disposable-target"
import {
  connectDisposableHarnessClient,
  resolveHarnessPgUrlOrSkip,
} from "@/lib/season-sim/pg-harness"

const resolved = resolveHarnessPgUrlOrSkip()
const pgUrl = resolved.url ?? ""
const hasPgUrl = Boolean(pgUrl)
const root = process.cwd()

const bootstrapSql = readFileSync(
  join(root, "fixtures/season-sim/bootstrap-minimal.sql"),
  "utf8",
)
const migrations = [
  "20261108150121_season_sim_sandbox_isolation.sql",
  "20261108150122_season_sim_run_foundation.sql",
  "20261108150123_season_sim_foundation_hardening.sql",
  "20261108150239_season_sim_draft_domain.sql",
  "20261108150250_season_sim_foundation_cursor_preserve.sql",
  "20261108150330_season_sim_season_path.sql",
  "20261108150450_season_sim_shared_db_rls_harden.sql",
].map((name) =>
  readFileSync(join(root, "supabase/migrations", name), "utf8"),
)

/**
 * Intentionally NOT named matches/match_results/standings/league_settings —
 * those are live prod names. Harness-only prefixed tables only.
 */
const LIVE_FIXTURE_DDL = `
drop table if exists public.season_sim_sentinel_match_results cascade;
drop table if exists public.season_sim_sentinel_matches cascade;
drop table if exists public.season_sim_sentinel_standings cascade;
drop table if exists public.season_sim_sentinel_settings cascade;
create table public.season_sim_sentinel_matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id),
  home_team_id uuid not null references public.teams(id),
  away_team_id uuid not null references public.teams(id),
  week int not null,
  status text not null default 'scheduled',
  fixture_marker text not null check (fixture_marker = '${SEASON_SIM_FIXTURE_MARKER}'),
  sentinel text not null
);
create table public.season_sim_sentinel_match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.season_sim_sentinel_matches(id),
  winner_team_id uuid references public.teams(id),
  score_home int not null,
  score_away int not null,
  fixture_marker text not null check (fixture_marker = '${SEASON_SIM_FIXTURE_MARKER}'),
  sentinel text not null
);
create table public.season_sim_sentinel_standings (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id),
  team_id uuid not null references public.teams(id),
  wins int not null,
  losses int not null,
  fixture_marker text not null check (fixture_marker = '${SEASON_SIM_FIXTURE_MARKER}'),
  sentinel text not null
);
create table public.season_sim_sentinel_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  fixture_marker text not null check (fixture_marker = '${SEASON_SIM_FIXTURE_MARKER}'),
  sentinel text not null
);
`

function fingerprint(rows: unknown[]): string {
  return createHash("sha256")
    .update(JSON.stringify(rows))
    .digest("hex")
}

describe.skipIf(!hasPgUrl)("season-sim shared-DB noninterference", () => {
  let client: Client | null = null
  let liveSeasonId = ""
  let liveTeamA = ""
  let liveTeamB = ""
  let sandboxSeasonId = ""
  let sandboxRunId = ""
  let siblingRunId = ""
  let beforeFp = ""

  beforeAll(async () => {
    const probe = await connectDisposableHarnessClient(pgUrl)
    await probe.query(bootstrapSql)
    for (const sql of migrations) {
      await probe.query(sql)
    }
    await probe.query(LIVE_FIXTURE_DDL)

    const live = await probe.query<{ id: string }>(
      `insert into public.seasons (name, is_current, is_sandbox, is_live_competitive, sheet_sync_enabled)
       values ('LIVE SENTINEL CURRENT', true, false, true, true) returning id`,
    )
    liveSeasonId = live.rows[0]!.id

    const ta = await probe.query<{ id: string }>(
      `insert into public.teams (name, coach_name, season_id)
       values ('Live Alpha', 'Real Coach A', $1) returning id`,
      [liveSeasonId],
    )
    const tb = await probe.query<{ id: string }>(
      `insert into public.teams (name, coach_name, season_id)
       values ('Live Beta', 'Real Coach B', $1) returning id`,
      [liveSeasonId],
    )
    liveTeamA = ta.rows[0]!.id
    liveTeamB = tb.rows[0]!.id

    const match = await probe.query<{ id: string }>(
      `insert into public.season_sim_sentinel_matches
         (season_id, home_team_id, away_team_id, week, status, fixture_marker, sentinel)
       values ($1, $2, $3, 1, 'final', $4, 'IMMUTABLE_MATCH_SENTINEL') returning id`,
      [liveSeasonId, liveTeamA, liveTeamB, SEASON_SIM_FIXTURE_MARKER],
    )
    await probe.query(
      `insert into public.season_sim_sentinel_match_results
         (match_id, winner_team_id, score_home, score_away, fixture_marker, sentinel)
       values ($1, $2, 2, 1, $3, 'IMMUTABLE_RESULT_SENTINEL')`,
      [match.rows[0]!.id, liveTeamA, SEASON_SIM_FIXTURE_MARKER],
    )
    await probe.query(
      `insert into public.season_sim_sentinel_standings
         (season_id, team_id, wins, losses, fixture_marker, sentinel)
       values
         ($1, $2, 7, 2, $4, 'IMMUTABLE_STANDINGS_A'),
         ($1, $3, 2, 7, $4, 'IMMUTABLE_STANDINGS_B')`,
      [liveSeasonId, liveTeamA, liveTeamB, SEASON_SIM_FIXTURE_MARKER],
    )
    await probe.query(
      `insert into public.season_sim_sentinel_settings (key, value, fixture_marker, sentinel)
       values ('current_season_pointer', jsonb_build_object('season_id', $1::text), $2, 'IMMUTABLE_SETTINGS')`,
      [liveSeasonId, SEASON_SIM_FIXTURE_MARKER],
    )

    const sandbox = await probe.query<{ id: string }>(
      `insert into public.seasons (name, is_current, is_sandbox, is_live_competitive, sheet_sync_enabled)
       values ('Sandbox Noninterfere', false, true, false, false) returning id`,
    )
    sandboxSeasonId = sandbox.rows[0]!.id

    const teamIds: string[] = []
    for (let i = 0; i < 4; i++) {
      const t = await probe.query<{ id: string }>(
        `insert into public.teams (name, season_id) values ($1, $2) returning id`,
        [`Sandbox Seat ${i + 1}`, sandboxSeasonId],
      )
      teamIds.push(t.rows[0]!.id)
    }

    const run = await probe.query<{ id: string }>(
      `insert into public.simulation_runs (
         season_id, status, phase, config, rules_snapshot, master_seed,
         rng_algorithm, rng_algorithm_version, config_frozen_at, cursor
       ) values (
         $1, 'queued', 'configured',
         '{"schema_version":1,"team_count":4}'::jsonb,
         '{"rules_version":"provisional_demo_v0"}'::jsonb,
         'noninterfere00112233445566778899', 'splitmix64', '1', now(),
         '{"step_seq":0,"domain_epoch":0}'::jsonb
       ) returning id`,
      [sandboxSeasonId],
    )
    sandboxRunId = run.rows[0]!.id

    for (let i = 0; i < teamIds.length; i++) {
      await probe.query(
        `insert into public.sim_bot_seats (run_id, season_id, team_id, seat_index, display_name)
         values ($1, $2, $3, $4, $5)`,
        [sandboxRunId, sandboxSeasonId, teamIds[i], i + 1, `Bot ${i + 1}`],
      )
    }

    const siblingSeason = await probe.query<{ id: string }>(
      `insert into public.seasons (name, is_current, is_sandbox, is_live_competitive, sheet_sync_enabled)
       values ('Sandbox Sibling', false, true, false, false) returning id`,
    )
    const siblingSeasonId = siblingSeason.rows[0]!.id
    const siblingTeam = await probe.query<{ id: string }>(
      `insert into public.teams (name, season_id) values ('Sibling Seat', $1) returning id`,
      [siblingSeasonId],
    )
    const sibling = await probe.query<{ id: string }>(
      `insert into public.simulation_runs (
         season_id, status, phase, config, rules_snapshot, master_seed,
         rng_algorithm, rng_algorithm_version, config_frozen_at, cursor
       ) values (
         $1, 'paused', 'draft', '{"schema_version":1}'::jsonb,
         '{"rules_version":"provisional_demo_v0"}'::jsonb,
         'siblingrun0011223344556677889900', 'splitmix64', '1', now(),
         '{"step_seq":3,"domain_epoch":1}'::jsonb
       ) returning id`,
      [siblingSeasonId],
    )
    siblingRunId = sibling.rows[0]!.id
    await probe.query(
      `insert into public.sim_bot_seats (run_id, season_id, team_id, seat_index, display_name)
       values ($1, $2, $3, 1, 'Sibling Bot')`,
      [siblingRunId, siblingSeasonId, siblingTeam.rows[0]!.id],
    )
    await probe.query(
      `insert into public.sim_draft_pool (run_id, season_id, pokemon_name, point_value, status)
       values ($1, $2, 'Sentinelmon', 12, 'available')`,
      [siblingRunId, siblingSeasonId],
    )

    await probe.query(
      `insert into public.sim_matches (
         run_id, season_id, week, match_index, team1_id, team2_id, status, fidelity
       ) values ($1, $2, 1, 1, $3, $4, 'completed', 'statistical_seeded')`,
      [sandboxRunId, sandboxSeasonId, teamIds[0], teamIds[1]],
    )
    await probe.query(
      `insert into public.sim_standings (run_id, season_id, team_id, wins, losses, differential)
       values ($1, $2, $3, 1, 0, 1)`,
      [sandboxRunId, sandboxSeasonId, teamIds[0]],
    )

    beforeFp = await captureLiveFingerprint(probe)
    client = probe
  }, 120_000)

  afterAll(async () => {
    await client?.end().catch(() => undefined)
  })

  async function captureLiveFingerprint(c: Client): Promise<string> {
    const seasons = await c.query(
      `select id, name, is_current, is_sandbox, is_live_competitive, sheet_sync_enabled
       from public.seasons where id = $1`,
      [liveSeasonId],
    )
    const teams = await c.query(
      `select id, name, coach_name, season_id from public.teams
       where season_id = $1 order by name`,
      [liveSeasonId],
    )
    const matches = await c.query(
      `select id, season_id, home_team_id, away_team_id, week, status, sentinel, fixture_marker
       from public.season_sim_sentinel_matches where season_id = $1 order by id`,
      [liveSeasonId],
    )
    const results = await c.query(
      `select r.id, r.match_id, r.winner_team_id, r.score_home, r.score_away, r.sentinel, r.fixture_marker
       from public.season_sim_sentinel_match_results r
       join public.season_sim_sentinel_matches m on m.id = r.match_id
       where m.season_id = $1 order by r.id`,
      [liveSeasonId],
    )
    const standings = await c.query(
      `select id, season_id, team_id, wins, losses, sentinel, fixture_marker
       from public.season_sim_sentinel_standings where season_id = $1 order by team_id`,
      [liveSeasonId],
    )
    const settings = await c.query(
      `select key, value, sentinel, fixture_marker from public.season_sim_sentinel_settings order by key`,
    )
    return fingerprint([
      seasons.rows,
      teams.rows,
      matches.rows,
      results.rows,
      standings.rows,
      settings.rows,
    ])
  }

  function requireClient(): Client {
    if (!client) throw new Error("postgres client missing")
    return client
  }

  it("reset + concurrent claim leave sentinel fixtures and sibling sandbox intact", async () => {
    const c = requireClient()

    const reset = await c.query<{ ok: boolean; reason: string }>(
      `select * from public.sim_reset_run_domain($1, true)`,
      [sandboxRunId],
    )
    expect(reset.rows[0]!.ok).toBe(true)

    const purgedMatches = await c.query(
      `select count(*)::int as n from public.sim_matches where run_id = $1`,
      [sandboxRunId],
    )
    expect(purgedMatches.rows[0]!.n).toBe(0)
    const purgedStandings = await c.query(
      `select count(*)::int as n from public.sim_standings where run_id = $1`,
      [sandboxRunId],
    )
    expect(purgedStandings.rows[0]!.n).toBe(0)

    const siblingPool = await c.query(
      `select pokemon_name from public.sim_draft_pool where run_id = $1`,
      [siblingRunId],
    )
    expect(siblingPool.rows[0]!.pokemon_name).toBe("Sentinelmon")

    const claimA = c.query(
      `select * from public.sim_claim_run_lease($1, 'fence-a', 30000)`,
      [sandboxRunId],
    )
    const claimB = c.query(
      `select * from public.sim_claim_run_lease($1, 'fence-b', 30000)`,
      [sandboxRunId],
    )
    const [a, b] = await Promise.all([claimA, claimB])
    const winners = [...a.rows, ...b.rows].filter((r) => r.claimed === true)
    expect(winners).toHaveLength(1)

    const afterFp = await captureLiveFingerprint(c)
    expect(afterFp).toBe(beforeFp)

    const current = await c.query<{ name: string; is_current: boolean }>(
      `select name, is_current from public.seasons where id = $1`,
      [liveSeasonId],
    )
    expect(current.rows[0]!.is_current).toBe(true)
    expect(current.rows[0]!.name).toBe("LIVE SENTINEL CURRENT")
  })
})
