# Poképedia Seed Edge Function

Discovers all PokéAPI REST v2 resource URLs and enqueues them into the `pokepedia_ingest` queue.

## Usage

\`\`\`bash
# Manual trigger
curl -X POST https://<project-ref>.supabase.co/functions/v1/pokepedia-seed \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"limit": 200}'
\`\`\`

## Parameters

- `resourceTypes` (optional): Array of resource types to seed. Defaults to all types.
- `limit` (optional): Number of resources per page. Default: 200
- `maxPagesPerType` (optional): Maximum pages to process per type. Default: 500

## Resource Phases

Resources are processed in dependency order:

1. **Master**: types, stats, egg-groups, growth-rates, abilities, moves
2. **Reference**: generations, colors, habitats, items, locations, etc.
3. **Species**: pokemon-species
4. **Pokemon**: pokemon
5. **Relationships**: evolution-chain

## Response

\`\`\`json
{
  "ok": true,
  "totalEnqueued": 15000,
  "perType": {
    "pokemon": 1025,
    "move": 1000,
    ...
  }
}
\`\`\`
