# Create Draft Session Guide

## Overview

This guide explains how to create and configure a draft session for your league using the Admin Create Draft wizard. The wizard walks you through five steps: Draft Basics, Rules & Season, Playoffs & Teams, Draft Order & Pool, and Review.

**When to use**: Before starting a new season draft. Ensure you have a current season, teams, and (optionally) a draft pool prepared.

**Access**: Admin Dashboard → Draft Management → Manage Draft Sessions → Create Session

---

## Step 1: Draft Basics

### Draft Type

- **Snake Draft** (default): Pick order reverses on even rounds. Pick 1 in round 1, last in round 2.
- **Linear Draft**: Same order every round.
- **Auction Draft**: Point-based bidding for each Pokémon.

### Pick Time Limit

- Seconds per pick (10–300). Default: 45.
- If a coach exceeds the limit, they are skipped that round (per league rules).

---

## Step 2: Rules & Season

### Rule Set

- **Use current season rules** (default): Applies existing `season_rules` and `league_config` for the current season.
- **Select a section**: Choose a rules or draft_settings section from `league_config` (parsed from Google Sheets). Useful when you have multiple rule presets.

### Season Length

- Regular-season weeks (8–14). Default: 10.
- Playoff weeks are added automatically based on the playoff format (3 or 4 weeks).

---

## Step 3: Playoffs & Teams

### Playoff Format

- **3 Week Playoff**: 3 playoff matchweeks.
- **4 Week Playoff** (default): 4 playoff matchweeks.
- **Single Elimination**: Standard bracket; losers are out.
- **Double Elimination**: Losers bracket; teams must lose twice to be eliminated.

### Playoff Teams (Top N)

- Number of teams advancing to playoffs (2–16). Default: 4.
- Stored in `canonical_league_config` and used by the playoff bracket generator.

---

## Step 4: Draft Order & Pool

### Draft Position

- **Randomizer** (default): Draft order is randomized when the session is created.
- **Commissioner sets order**: You assign pick 1, 2, 3, etc. for each team. All teams must be assigned.

### Draft Pool Source

- **Use existing season pool** (default): Uses the current `season_draft_pool` or `draft_pool` for the season. Generate a pool first via **Draft Pool & Season Rules** if empty.
- **By Generation**: Generate a pool from `pokemon_master` filtered by generation (1–9). Optionally include legendary, mythical, or paradox Pokémon.
- **By Game**: Generate a pool filtered by game code (e.g. SV, FRLG, SwSh). Uses `pokemon_games` table.
- **Archived Pool**: Load a previously saved pool. Save pools from **Draft Pool & Season Rules** → Draft Pool Archive.

---

## Step 5: Review

Review all choices and click **Create Session**. The system will:

1. Prepare the draft pool (if generation, game, or archived was selected).
2. Create or update matchweeks for the season.
3. Upsert `canonical_league_config` with playoff settings.
4. Create the draft session and initialize budgets for all teams.

---

## Draft Pool Archive

### Saving a Pool

1. Go to **Admin → Draft Pool & Season Rules**.
2. Generate or ensure a draft pool exists for the current season.
3. In the **Draft Pool Archive** card, enter a name (e.g. "S7 Gen 9 SV Pool").
4. Click **Save as Archive**.

The pool is stored in `draft_pools` and `draft_pool_pokemon_master` for reuse.

### Loading an Archived Pool

1. When creating a draft session, in Step 4 select **Draft Pool Source** = **Archived Pool**.
2. Choose the archived pool from the dropdown.
3. On create, the pool is copied into `season_draft_pool` for the target season.

---

## Rule Set Options

Rule sets come from:

- **league_config**: Parsed from Google Sheets (Rules tab). Sections with `config_type` = `rules` or `draft_settings`.
- **season_rules**: Per-season toggles (draft_budget, tera_mode, transaction_cap, etc.).

Selecting a rule set section applies that configuration when the draft session is created. "Use current season rules" keeps existing `season_rules` as-is.

---

## Troubleshooting

### No teams found

- Create teams for the current season first. Use **Admin → League** or the simulation seed for mock teams.

### No draft pool / empty pool

- Go to **Draft Pool & Season Rules** and click **Generate draft pool** with your desired filters (generation, game, legendary/mythical/paradox).
- Or select **By Generation** or **By Game** in the Create Draft wizard to generate on the fly.

### No archived pools

- Save at least one pool from **Draft Pool & Season Rules** → Draft Pool Archive before selecting **Archived Pool** in the wizard.

### Commissioner order not saving

- Ensure you assign a team to every pick (Pick 1, Pick 2, …). All teams must be in the order exactly once.

### Active session already exists

- Only one active draft session per season is allowed. Cancel the existing session or complete it before creating a new one.

---

## References

- **Admin Draft Sessions**: `/admin/draft/sessions`
- **Draft Pool & Season Rules**: `/admin/draft-pool-rules`
- **League Simulation Guide**: `/dashboard/guides/league-simulation`
- **Settings → Guides**: `/dashboard/settings?tab=guides`
