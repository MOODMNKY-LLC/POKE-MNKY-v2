# Trigger Sync Commands

## ✅ Default Changed

**The Edge Function now defaults `continueUntilComplete` to `true`** for faster local development.

You can still override by explicitly setting `continueUntilComplete: false` in the request.

## Commands

### Option 1: Direct Edge Function Call (curl)

\`\`\`bash
curl -X POST http://127.0.0.1:54321/functions/v1/sync-pokepedia \
  -H "Content-Type: application/json" \
  -d '{"action": "start", "phase": "master", "priority": "critical", "continueUntilComplete": true}'
\`\`\`

### Option 2: PowerShell (Invoke-RestMethod)

\`\`\`powershell
$body = @{
  action = "start"
  phase = "master"
  priority = "critical"
  continueUntilComplete = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:54321/functions/v1/sync-pokepedia" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
\`\`\`

### Option 3: Via API Route (Next.js)

\`\`\`bash
curl -X POST http://localhost:3000/api/sync/pokepedia \
  -H "Content-Type: application/json" \
  -d '{"action": "start", "phase": "master", "priority": "critical", "continueUntilComplete": true}'
\`\`\`

### Option 4: Minimal (Uses Default)

Since default is now `true`, you can omit `continueUntilComplete`:

\`\`\`bash
curl -X POST http://127.0.0.1:54321/functions/v1/sync-pokepedia \
  -H "Content-Type: application/json" \
  -d '{"action": "start", "phase": "master", "priority": "critical"}'
\`\`\`

## Behavior

- **Default**: `continueUntilComplete: true` (processes multiple chunks)
- **Timeout**: 50 seconds maximum execution time
- **After Timeout**: Cron continues processing remaining chunks
- **Override**: Set `continueUntilComplete: false` to process one chunk only

## Phases Available

- `master` - Types, abilities, moves, stats, egg-groups, growth-rates
- `reference` - Generations, pokemon-colors, pokemon-habitats, pokemon-shapes
- `species` - Pokemon species data
- `pokemon` - Individual Pokemon data
- `relationships` - Pokemon types, abilities, stats relationships
