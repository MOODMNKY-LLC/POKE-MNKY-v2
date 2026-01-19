# Ingest Showdown Pokedex Edge Function

Fetches and ingests Pokémon Showdown's `pokedex.json` into Supabase tables.

## Usage

### Manual Trigger (via API route)

```bash
POST /api/admin/showdown-pokedex/ingest
```

### Cron Job (automatic)

Configured via `supabase/migrations/20260120000001_setup_showdown_pokedex_cron.sql`

Runs weekly on Sundays at 2 AM UTC.

## Tables Updated

- `showdown_pokedex_raw` - Raw JSON storage
- `pokemon_showdown` - Relational Pokémon data
- `pokemon_showdown_types` - Type relationships
- `pokemon_showdown_abilities` - Ability relationships

## Response Format

```json
{
  "success": true,
  "summary": {
    "processed": 1515,
    "errors": 0,
    "duration": "78.04s",
    "counts": {
      "raw": 1515,
      "pokemon": 1515,
      "types": 2305,
      "abilities": 3250
    }
  },
  "errors": []
}
```

## Local Development

### 1. Start Supabase (if not already running)

```bash
supabase start
```

### 2. Serve Edge Function Locally

The Edge Function will automatically load environment variables from `supabase/functions/.env`:

```bash
supabase functions serve ingest-showdown-pokedex --no-verify-jwt
```

**Important**: The `--no-verify-jwt` flag is required for local testing. Without it, requests will be rejected.

### 3. Test Locally

The Edge Function will be available at:
```
http://127.0.0.1:65432/functions/v1/ingest-showdown-pokedex
```

**Test via curl (PowerShell)**:
```powershell
$serviceKey = "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"
Invoke-RestMethod -Uri "http://127.0.0.1:65432/functions/v1/ingest-showdown-pokedex" `
    -Method POST `
    -Headers @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $serviceKey"
    } `
    -Body '{}'
```

**Or test via Admin Panel**:
- Make sure your `.env.local` has `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:65432`
- The server action will automatically use the local Edge Function URL

### Troubleshooting

If you get "NOT_FOUND" error:
1. Make sure `supabase functions serve` is running
2. Check that the function name matches: `ingest-showdown-pokedex`
3. Verify Supabase is running: `supabase status`
4. Check the Edge Function logs in the terminal where you ran `supabase functions serve`

If environment variables aren't loading:
- The Edge Function automatically loads `supabase/functions/.env`
- Or use `--env-file` flag: `supabase functions serve ingest-showdown-pokedex --no-verify-jwt --env-file .env`

## Deployment

```bash
supabase functions deploy ingest-showdown-pokedex
```
