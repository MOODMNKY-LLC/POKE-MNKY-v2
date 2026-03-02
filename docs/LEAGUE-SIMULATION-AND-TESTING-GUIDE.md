# League Simulation & Testing Guide

## Overview

The League Simulation system enables full end-to-end testing of POKE MNKY: from seeding a mock season through draft, regular season matches, standings, and playoffs. Use it to validate the platform before a real season or to test new features.

## Prerequisites

- **Supabase** — Database must be running (local or hosted)
- **Environment** — `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- **Admin access** — Your profile must have `role = 'admin'` or `role = 'commissioner'`

## Access

- **Admin Dashboard** → **League Simulation** (or `/admin/simulation`)
- Direct link: `/admin/simulation`

## Step-by-Step Workflow

### 1. Seed

Seeds the **Mock Draft Demo** season:

- Creates or reuses the season
- Creates mock teams (Mock Draft Team A, B, C if none exist)
- Seeds draft pool (from existing pool or fallback Pokémon)
- Creates draft budgets (120 points per team)
- Creates 14 matchweeks (10 regular + 4 playoff)

**When to use**: First run, or after a reset.

### 2. Draft

Runs the mock draft using the existing `DraftSystem`:

- Creates or reuses a draft session
- Auto-picks until budgets are exhausted or pool is empty
- Records picks and updates draft pool status

**When to use**: After seed. Requires teams and draft pool.

### 3. Schedule

Generates regular-season matches:

- Uses round-robin scheduling for N teams over M weeks
- Configurable weeks (default: 10)
- Inserts matches with `status: scheduled`

**When to use**: After draft. Requires at least 2 teams.

### 4. Run Results

Simulates match outcomes for all scheduled matches:

- **Random** — 50/50 win probability
- **Favor Higher Seed** — Team 1 wins ~60%
- **Favor Lower Seed** — Team 2 wins ~60%
- Updates `winner_id`, scores, `differential`, `status: completed`
- Recomputes standings on `teams`

**When to use**: After schedule. Can run for a specific week or all pending.

### 5. Playoffs

Generates playoff bracket from standings:

- Uses top N teams (configurable, default: 4)
- Creates playoff matches with `is_playoff: true`, `playoff_round`
- Uses playoff matchweeks (weeks 11–14)

**When to use**: After run results. Requires completed regular-season matches.

## Full Run

One-shot: **Seed → Draft → Schedule → Run Results → Playoffs**

- Use the **Run Full Simulation** button
- Config: weeks, top N, result strategy
- Best for quick end-to-end validation

## Config Options

| Option | Default | Description |
|--------|---------|-------------|
| Weeks | 10 | Regular-season weeks |
| Playoff Top N | 4 | Teams advancing to playoffs |
| Result Strategy | random | `random`, `favor_higher_seed`, `favor_lower_seed` |

## Reset

**Reset Mock Season** clears:

- Draft picks
- Draft pool status
- Matches
- Standings (wins, losses, differential)

Does **not** delete teams, season, or matchweeks. Run **Seed** again to prepare for another simulation.

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/simulation/status` | GET | Current simulation state |
| `/api/admin/simulation/seed` | POST | Seed mock season |
| `/api/admin/simulation/draft` | POST | Run mock draft |
| `/api/admin/simulation/schedule` | POST | Generate regular-season matches |
| `/api/admin/simulation/playoffs` | POST | Generate playoff matches |
| `/api/admin/simulation/run-results` | POST | Simulate match results |
| `/api/admin/simulation/full-run` | POST | One-shot full simulation |
| `/api/admin/simulation/reset` | POST | Reset mock season |

All routes require admin/commissioner role.

## Troubleshooting

### "Mock season not found"

Run **Seed** first.

### "Need at least 2 teams"

Seed creates teams if none exist. If you reset and deleted teams, run Seed again.

### Draft doesn't complete

- Ensure draft pool has available Pokémon
- Check draft budgets have `remaining_points > 0`
- Verify `draft_sessions` and `draft_budgets` exist for the season

### Standings not updating

- Run **Run Results** to complete matches
- Standings are computed from completed matches; check `matches.status = 'completed'`

### Playoffs fail

- Run **Run Results** first so standings exist
- Ensure at least 2 teams have played matches

## n8n Workflow (Optional)

`lib/n8n/workflow-manager.ts` provides `createSimulationTriggerWorkflow()` to create an n8n workflow that:

1. Triggers on HTTP POST (manual or cron)
2. Calls `POST /api/admin/simulation/full-run` with `X-Simulation-API-Key`

**Required env**: `SIMULATION_API_KEY`, `N8N_API_URL`, `N8N_API_KEY`

Set `SIMULATION_API_KEY` in your app env and use the same value when calling the full-run API from n8n or cron.

## References

- [League Features Guide (v3)](/dashboard/guides/league-features-v3)
- [Discord Slash Commands Reference](/dashboard/guides/discord-slash-commands)
- Admin: [Simulation Control](/admin/simulation)
