# Draft pool builder — phase 1 importer

Seeds a **pending** `draft_pool_versions` revision from the league Pokédex sheet (columns L:P) plus Matt’s overrides, Tera list, and banned move/ability rules.

This does **not** change the live `draft_pool` / `season_draft_pool` board, publish APIs, or pick RPCs.

## Fixtures

Public Pokémon names/points only (from phase-0 audit):

| File | Purpose |
|------|---------|
| `fixtures/pokedex_L_P.csv` | Sheet Pokédex L:P snapshot |
| `fixtures/matt_overrides.json` | Basculin White-Striped + Oinkologne notes |
| `fixtures/tera_list.txt` | Season Tera-ban display names |
| `fixtures/alias_map.json` | Phase-0 sheet → catalog alias map (783 entries) |
| `fixtures/pokemon_master.csv` | Catalog snapshot for id resolution in dry-run |
| `fixtures/regional_catalog_only.csv` | 15 `-` regionals (catalog-only) |

## Usage

```bash
# Dry-run against fixtures (no credentials, no DB writes)
pnpm exec tsx scripts/draft-pool/import-pending.ts --fixture

# Dry-run against a local CSV
pnpm exec tsx scripts/draft-pool/import-pending.ts --csv path/to/pokedex_L_P.csv

# Dry-run against the live Google Sheet (needs sheet env vars)
pnpm exec tsx scripts/draft-pool/import-pending.ts --from-sheet

# Write a pending revision (local/dev only — blocked for prod project by default)
pnpm exec tsx scripts/draft-pool/import-pending.ts --fixture --season-id <uuid> --apply
```

Env for `--from-sheet`: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (or `GOOGLE_PRIVATE_KEY`), `GOOGLE_SHEET_ID`.

Env for `--apply`: `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## Expected dry-run buckets (fixture)

Roughly: **770** draftable, **78** banned, **~412** excluded, **15** catalog-only regionals.

Fixture dry-run uses `pokemon_master.csv` for name/slug aliasing only. That file’s `national_dex` is the **species** id (shared by Rotom forms, Alolan Raichu, etc.) and is **never** written as `pokemon_id`. So fixture dry-run leaves `pokemon_id` null for all rows (logged as unresolved). `--apply` loads form-specific ids from live `pokepedia_pokemon` before resolving.

## Mod role

RLS editors = `is_admin()` / `profiles.role` admin|commissioner **or** `is_league_mod()` (Discord role id `1190663258676396075` on guild `1190512330556063764`, stored in `profiles.discord_roles` JSONB).
