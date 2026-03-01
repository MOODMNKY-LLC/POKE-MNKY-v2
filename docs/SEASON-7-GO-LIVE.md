# Season 7 Go-Live

## Summary

Season 7 is created via migration and set as the **current** season so the app and Notion Draft Board sync target it.

## Migration

Run Supabase migrations so that `20260301180000_season_7_and_matchweeks.sql` is applied:

- **Local**: `npx supabase migration up` (with Supabase running) or `npx supabase db reset` for a fresh DB.
- **Hosted**: Migrations run on deploy or via Supabase Dashboard → SQL / migration workflow.

The migration:

1. Sets `is_current = false` for all existing seasons.
2. Inserts or updates **Season 7** (`name`, `season_id`: `AABPBL-Season-7-2027`, dates, budget 120, roster 8–10) and sets it as current.
3. Inserts 10 regular-season **matchweeks** for Season 7 (idempotent).

## After Migration

- **Notion Draft Board sync**: The sync uses the season with `is_current = true`. Trigger sync from **Admin → Draft Board Management** or run the n8n “Draft Pool Seed (Notion → Supabase)” workflow; `draft_pool` will fill for Season 7.
- **App fallback**: `lib/seasons.ts` falls back to Season 7 by name/`season_id` when no row has `is_current = true`.

## Changing the Current Season

- **Admin → League → Seasons**: Use “Set as current” for the desired season. Only one season can be current.
- **Admin → Pokémon Catalog**: Use the season selector and “Set as current” next to it.

## Notion

See **POKE MNKY v4** in Notion for the note on Draft Board → Supabase sync and Season 7 go-live.
