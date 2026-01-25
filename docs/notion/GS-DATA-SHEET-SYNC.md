# GS Data Sheet Sync

## Overview

This document defines how we mirror the Google Sheets `Data` tab (the “backend data sheet”) into Notion using a **normalized** set of databases plus deterministic **External Key** upserts.

The sheet is not a single table; it is multiple logical datasets laid out side-by-side (team identity, team season summary, week-by-week results, SOS metrics, and a grouped Pokémon stats block). For this reason, **one Notion database cannot represent it cleanly**.

## Required environment variables

- **Google Sheets**
  - `GOOGLE_SHEET_ID` (optional if passed as CLI arg)
  - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
  - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (or legacy `GOOGLE_PRIVATE_KEY`)
- **Notion**
  - `NOTION_API_KEY`
  - `NOTION_API_VERSION` (optional; defaults inside script)

## Notion databases (created under Backend Dashboard)

- `GS Data Sheet — Teams`
- `GS Data Sheet — Seasons`
- `GS Data Sheet — Matches`
- `GS Data Sheet — Team Season Stats`
- `GS Data Sheet — Team Weekly Results`
- `GS Data Sheet — Pokémon Index`
- `GS Data Sheet — Team Pokémon Season Stats`

All of the above now include an **`External Key`** property for upsert.

## External Key strategy (deterministic upsert keys)

We always generate stable keys from spreadsheet + entity identifiers:

- **Season**: `season:{spreadsheetId}:{seasonName}`
- **Team**: `team:{spreadsheetId}:{teamId}`
- **Team Season Stat**: `teamSeason:{seasonKey}:{teamKey}`
- **Team Week Result**: `teamWeek:{seasonKey}:{teamKey}:week:{week}`
- **Pokémon**: `pokemon:{spreadsheetId}:{pokemonSlug}`
- **Team Pokémon Stat**: `teamPokemon:{seasonKey}:{teamKey}:{pokemonKey}:{category}:{rank}`

## Google Sheets parsing notes

### Team rows (`Data!A2:BH`)

A single row contains multiple concepts:

- Team identity (ID/name/coach/div/conf/logo)
- Team season summary (GP/W/L/diff/record/streak/SOS)
- Week-by-week W/L markers (columns labeled 1–10)
- Derived % values (Win%, Opponents Win%, Strength of Schedule)
- Opponents faced list (comma-separated)

We split these into:

- one Team entity
- one Team Season Stat entity
- up to 10 Team Week Result entities

### Pokémon stats block (`Data!CB:CH`)

This block is **grouped by team**:

- A row that only contains a team name starts a new group
- Subsequent rows in that group contain top/bottom performer Pokémon + kills + appearances
- The leftmost cell sometimes contains a precomputed `kills/appearance` ratio for that row

The sync must:

- maintain the current team context
- produce separate records for **Top Performer** and **Bottom Performer**
- assign a `Rank` based on row order within the team group (1, 2, 3…)

## Machine-readable mapping

See `docs/notion/gs-data-sheet-sync-mapping.json` for the canonical IDs, property names, ranges, and column mapping.
