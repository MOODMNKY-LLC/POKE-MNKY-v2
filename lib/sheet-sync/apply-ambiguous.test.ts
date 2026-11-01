import { readFileSync } from "node:fs"
import { join } from "node:path"
import { Client } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { buildDesired } from "@/lib/sheet-sync/desired"
import { diffLeague } from "@/lib/sheet-sync/diff"
import { loadSnapshotDir, parseSnapshot } from "@/lib/sheet-sync/parse"

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20261102010000_sheet_sync_apply_variable_prefix.sql",
)
const originalPath = join(process.cwd(), "supabase/migrations/20261101190000_sheet_sync_apply.sql")
const snapshotDir = join(process.cwd(), "fixtures/league-sheet/s7-2026-11-01")

const pgUrl =
  process.env.SHEET_SYNC_APPLY_PG_URL ??
  process.env.POSTGRES_URL ??
  "postgresql://ubuntu:sheet_sync_test@127.0.0.1:5432/sheet_sync_apply_test"

function extractFunctionBody(sql: string, name: string): string {
  // require the opening paren so sheet_sync_apply does not match sheet_sync_apply_one
  const marker = `create or replace function public.${name}(`
  const start = sql.indexOf(marker)
  if (start < 0) throw new Error(`missing ${name} in migration`)
  const rest = sql.slice(start)
  const end = rest.search(/\n\$\$;\n/)
  if (end < 0) throw new Error(`unterminated ${name}`)
  return rest.slice(0, end + "\n$$;".length)
}

const SETUP_SQL = `
create extension if not exists pgcrypto;

drop schema if exists public cascade;
create schema public;
grant all on schema public to public;

create table public.seasons (id uuid primary key default gen_random_uuid());
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id),
  name text not null,
  coach_name text,
  division text,
  conference text,
  is_bye boolean default false,
  is_active boolean default true,
  regular_wins int default 0,
  regular_losses int default 0,
  regular_differential int default 0,
  wins int default 0,
  losses int default 0,
  differential int default 0,
  playoff_wins int default 0,
  playoff_losses int default 0,
  playoff_differential int default 0,
  strength_of_schedule numeric,
  streak_type text,
  current_streak int,
  updated_at timestamptz
);
create table public.pokemon (id uuid primary key default gen_random_uuid(), name text not null unique);
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id),
  week int not null,
  team1_id uuid not null references public.teams(id),
  team2_id uuid not null references public.teams(id),
  team1_score int default 0,
  team2_score int default 0,
  differential int default 0,
  status text,
  winner_id uuid,
  is_playoff boolean default false,
  playoff_round text,
  outcome_type text,
  notes text,
  source text not null default 'app'
);
create table public.pokemon_stats (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id),
  team_id uuid not null references public.teams(id),
  pokemon_id uuid not null references public.pokemon(id),
  kills int not null default 0,
  appeared boolean not null default true,
  source text not null default 'app'
);
create unique index uq_pokemon_stats_match_team_pokemon
  on public.pokemon_stats (match_id, team_id, pokemon_id);

create table public.draft_picks (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id),
  team_id uuid not null references public.teams(id),
  pokemon_id uuid not null references public.pokemon(id),
  acquisition text,
  draft_round int,
  pick_number int,
  status text,
  start_date date,
  end_date date,
  points_snapshot int default 0,
  is_tera_captain boolean default false,
  notes text,
  source text not null default 'app',
  updated_at timestamptz,
  unique (season_id, pokemon_id)
);

create table public.transaction_audit (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id),
  team_id uuid references public.teams(id),
  actor_type text,
  action text,
  payload jsonb,
  source_key text
);

create table public.playoff_seeds (
  season_id uuid not null references public.seasons(id),
  team_id uuid not null references public.teams(id),
  seed int,
  round1_bye boolean,
  is_division_winner boolean,
  team_name text,
  primary key (season_id, team_id)
);

create or replace function public.sheet_sync_team_id(p_season uuid, p_name text)
returns uuid language sql stable as $$
  select id from public.teams where season_id = p_season and name = p_name limit 1
$$;

create or replace function public.sheet_sync_pokemon_id(p_name text)
returns uuid language sql stable as $$
  select id from public.pokemon where name = p_name limit 1
$$;

create or replace function public.sheet_sync_rankings_match(p_season uuid, p_expected jsonb)
returns boolean language sql stable as $$
  select true
$$;
`

const BUGGY_APPLY_ONE = `
create or replace function public.sheet_sync_apply_one(p_season uuid, change jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  op text := change->>'op';
  tbl text := change->>'table';
  after jsonb := change->'after';
  before jsonb := change->'before';
  team_id uuid;
  pokemon_id uuid;
  match_id uuid;
begin
  if tbl = 'pokemon_stats' and op in ('insert', 'update') then
    select matches.id, side.id, pokemon.id
      into match_id, team_id, pokemon_id
    from public.matches matches
    join public.teams home on home.id = matches.team1_id
    join public.teams away on away.id = matches.team2_id
    join public.teams side on side.season_id = p_season and side.name = after->>'team'
    join public.pokemon pokemon on pokemon.name = after->>'pokemon'
    where matches.season_id = p_season
      and matches.week = (after->>'week')::int
      and home.name = after->>'team1'
      and away.name = after->>'team2';
    if match_id is null or team_id is null or pokemon_id is null then
      raise exception 'sheet sync could not resolve pokemon_stats % week %', after->>'pokemon', after->>'week';
    end if;
    insert into public.pokemon_stats (match_id, team_id, pokemon_id, kills, appeared, source)
    values (match_id, team_id, pokemon_id, (after->>'kills')::int, true, 'sheet')
    on conflict (match_id, team_id, pokemon_id)
    do update set kills = excluded.kills, source = 'sheet'
    where public.pokemon_stats.kills is distinct from excluded.kills
      or public.pokemon_stats.source is distinct from 'sheet';
  elsif tbl = 'draft_picks' and op in ('insert', 'update') then
    insert into public.draft_picks (
      season_id, team_id, pokemon_id, acquisition, draft_round, pick_number, status,
      start_date, end_date, points_snapshot, is_tera_captain, notes, source
    ) values (
      p_season,
      public.sheet_sync_team_id(p_season, after->>'team'),
      public.sheet_sync_pokemon_id(after->>'pokemon'),
      after->>'acquisition',
      nullif(after->>'round', '')::int,
      nullif(after->>'pick', '')::int,
      after->>'status',
      nullif(after->>'start', '')::date,
      nullif(after->>'end', '')::date,
      coalesce((after->>'points')::int, 0),
      coalesce((after->>'tera')::boolean, false),
      after->>'notes',
      'sheet'
    )
    on conflict (season_id, pokemon_id) do update set
      team_id = excluded.team_id,
      acquisition = excluded.acquisition,
      draft_round = excluded.draft_round,
      pick_number = excluded.pick_number,
      status = excluded.status,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      points_snapshot = excluded.points_snapshot,
      is_tera_captain = excluded.is_tera_captain,
      notes = excluded.notes,
      source = 'sheet',
      updated_at = now();
  elsif tbl = 'draft_picks' and op = 'delete' then
    delete from public.draft_picks
    where season_id = p_season
      and source = 'sheet'
      and team_id = public.sheet_sync_team_id(p_season, before->>'team')
      and pokemon_id = public.sheet_sync_pokemon_id(before->>'pokemon');
  else
    raise exception 'sheet sync does not apply %.%', tbl, op;
  end if;
end;
$$;
`

describe("sheet_sync_apply ambiguous column fix", () => {
  it("migration prefixes every local and sets variable_conflict use_column", () => {
    const sql = readFileSync(migrationPath, "utf8")
    expect(sql).toMatch(/#variable_conflict use_column/)
    expect(sql).toMatch(/v_match_id uuid/)
    expect(sql).toMatch(/v_team_id uuid/)
    expect(sql).toMatch(/v_pokemon_id uuid/)
    expect(sql).toMatch(/into v_match_id, v_team_id, v_pokemon_id/)
    expect(sql).toMatch(/values \(v_match_id, v_team_id, v_pokemon_id/)
    expect(sql).not.toMatch(/^\s+(team_id|pokemon_id|match_id) uuid;/m)
    expect(sql).not.toMatch(/into match_id, team_id, pokemon_id/)
    expect(sql).not.toMatch(/values \(match_id, team_id, pokemon_id/)
    // on conflict still names columns (correct); locals must not shadow them
    expect(sql).toMatch(/on conflict \(match_id, team_id, pokemon_id\)/)
    expect(sql).toMatch(/on conflict \(season_id, pokemon_id\)/)
    const original = readFileSync(originalPath, "utf8")
    expect(original).toMatch(/^\s+match_id uuid;/m)
  })

  it("a kill bump and a drop produce pokemon_stats update plus draft_picks changes", () => {
    const tabs = loadSnapshotDir(snapshotDir)
    const parsed = parseSnapshot(tabs)
    const built = buildDesired(parsed.teams, parsed.dex, parsed.week1 ?? "2026-08-24")

    const teams = structuredClone(parsed.teams)
    const host = teams.find((row) => (row.lineups[1] ?? []).some((entry) => entry.kills > 0))!
    const entry = host.lineups[1]!.find((row) => row.kills > 0)!
    entry.kills += 1

    const dropper = teams.find((row) => row.moves.length > 0)!
    const move = dropper.moves[0]!
    move.drop = move.drop ? `${move.drop}` : "Pikachu"
    move.add = move.add ? `${move.add} X` : "Eevee"

    const next = buildDesired(teams, parsed.dex, parsed.week1 ?? "2026-08-24")
    const changes = diffLeague(next, built)
    const statUpdates = changes.filter((change) => change.table === "pokemon_stats" && change.op === "update")
    const pickChanges = changes.filter((change) => change.table === "draft_picks")
    expect(statUpdates.length).toBeGreaterThanOrEqual(1)
    expect(pickChanges.length).toBeGreaterThanOrEqual(1)
    expect(changes.length).toBeGreaterThan(0)
  })
})

describe("sheet_sync_apply postgres paths", () => {
  let client: Client | null = null
  let seasonId = ""
  let available = false

  beforeAll(async () => {
    const probe = new Client({ connectionString: pgUrl })
    try {
      await probe.connect()
      await probe.query(SETUP_SQL)
      const season = await probe.query<{ id: string }>(`insert into public.seasons default values returning id`)
      seasonId = season.rows[0]!.id
      const home = await probe.query<{ id: string }>(
        `insert into public.teams (season_id, name) values ($1, 'Home Squad') returning id`,
        [seasonId],
      )
      const away = await probe.query<{ id: string }>(
        `insert into public.teams (season_id, name) values ($1, 'Away Squad') returning id`,
        [seasonId],
      )
      const mon = await probe.query<{ id: string }>(
        `insert into public.pokemon (name) values ('Pikachu'), ('Eevee') returning id`,
      )
      const match = await probe.query<{ id: string }>(
        `insert into public.matches (season_id, week, team1_id, team2_id, team1_score, team2_score, status, source)
         values ($1, 1, $2, $3, 1, 0, 'completed', 'sheet') returning id`,
        [seasonId, home.rows[0]!.id, away.rows[0]!.id],
      )
      await probe.query(
        `insert into public.pokemon_stats (match_id, team_id, pokemon_id, kills, appeared, source)
         values ($1, $2, $3, 1, true, 'sheet')`,
        [match.rows[0]!.id, home.rows[0]!.id, mon.rows[0]!.id],
      )
      await probe.query(
        `insert into public.draft_picks (season_id, team_id, pokemon_id, acquisition, status, points_snapshot, source)
         values ($1, $2, $3, 'draft', 'active', 10, 'sheet'),
                ($1, $2, $4, 'draft', 'active', 8, 'sheet')`,
        [seasonId, home.rows[0]!.id, mon.rows[0]!.id, mon.rows[1]!.id],
      )
      client = probe
      available = true
    } catch (error) {
      await probe.end().catch(() => undefined)
      if (process.env.CI && process.env.SHEET_SYNC_APPLY_PG_URL) {
        throw error
      }
      available = false
      console.warn(`skipping postgres sheet_sync_apply tests: ${(error as Error).message}`)
    }
  })

  afterAll(async () => {
    await client?.end().catch(() => undefined)
  })

  it("buggy locals fail on pokemon_stats upsert; fixed migration dry-runs kill + drop", async () => {
    if (!available || !client) return

    await client.query(BUGGY_APPLY_ONE)
    await client.query(extractFunctionBody(readFileSync(originalPath, "utf8"), "sheet_sync_apply"))

    const killChange = {
      table: "pokemon_stats",
      op: "update",
      key: { week: 1, team: "Home Squad", pokemon: "Pikachu" },
      before: { week: 1, team1: "Home Squad", team2: "Away Squad", team: "Home Squad", pokemon: "Pikachu", kills: 1 },
      after: { week: 1, team1: "Home Squad", team2: "Away Squad", team: "Home Squad", pokemon: "Pikachu", kills: 2 },
    }
    const dropChange = {
      table: "draft_picks",
      op: "update",
      key: { team: "Home Squad", pokemon: "Eevee" },
      before: { team: "Home Squad", pokemon: "Eevee", status: "active", acquisition: "draft", round: null, pick: null, points: 8, tera: false, start: null, end: null, notes: null },
      after: { team: "Home Squad", pokemon: "Eevee", status: "dropped", acquisition: "draft", round: null, pick: null, points: 8, tera: false, start: null, end: "2026-09-01", notes: null },
    }

    await expect(
      client.query(`select public.sheet_sync_apply($1::uuid, $2::jsonb, '[]'::jsonb, true)`, [
        seasonId,
        JSON.stringify([killChange]),
      ]),
    ).rejects.toThrow(/ambiguous/i)

    const fixed = readFileSync(migrationPath, "utf8")
    await client.query(extractFunctionBody(fixed, "sheet_sync_apply_one"))
    await client.query(extractFunctionBody(fixed, "sheet_sync_apply"))

    const result = await client.query<{ sheet_sync_apply: { status: string; changes: number } }>(
      `select public.sheet_sync_apply($1::uuid, $2::jsonb, '[]'::jsonb, true) as sheet_sync_apply`,
      [seasonId, JSON.stringify([killChange, dropChange])],
    )
    expect(result.rows[0]!.sheet_sync_apply).toMatchObject({ status: "dry_run", changes: 2 })

    // dry-run rolls back; apply for real and assert writes
    const applied = await client.query<{ sheet_sync_apply: { status: string } }>(
      `select public.sheet_sync_apply($1::uuid, $2::jsonb, '[]'::jsonb, false) as sheet_sync_apply`,
      [seasonId, JSON.stringify([killChange, dropChange])],
    )
    expect(applied.rows[0]!.sheet_sync_apply.status).toBe("applied")

    const kills = await client.query<{ kills: number }>(
      `select kills from public.pokemon_stats stats
       join public.pokemon p on p.id = stats.pokemon_id
       where p.name = 'Pikachu'`,
    )
    expect(kills.rows[0]!.kills).toBe(2)

    const pick = await client.query<{ status: string; end_date: string | null }>(
      `select status, end_date::text from public.draft_picks picks
       join public.pokemon p on p.id = picks.pokemon_id
       where p.name = 'Eevee'`,
    )
    expect(pick.rows[0]).toMatchObject({ status: "dropped", end_date: "2026-09-01" })
  })
})
