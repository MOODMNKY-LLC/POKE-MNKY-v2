# Poképedia Sprite Worker Edge Function

Downloads sprites from PokéAPI and uploads them to Supabase Storage bucket `pokedex-sprites`.

## Usage

\`\`\`bash
# Manual trigger
curl -X POST https://<project-ref>.supabase.co/functions/v1/pokepedia-sprite-worker \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "batchSize": 10,
    "visibilityTimeout": 600,
    "concurrency": 3
  }'
\`\`\`

## Parameters

- `batchSize` (optional): Number of messages to process per invocation. Default: 10
- `visibilityTimeout` (optional): Seconds before message becomes visible again. Default: 600
- `concurrency` (optional): Number of concurrent downloads. Default: 3

## What It Does

1. Reads messages from `pokepedia_sprites` queue
2. Checks if sprite already exists (by source_url)
3. Downloads sprite from PokéAPI
4. Uploads to Supabase Storage bucket `pokedex-sprites`
5. Records metadata in `pokepedia_assets` table
6. Updates `pokepedia_pokemon` sprite paths (if applicable)
7. Deletes processed messages

## Storage Path Structure

Sprites are stored under: `pokemon/{id}/{subpath}`

Example: `pokemon/25/sprites/pokemon/other/official-artwork/25.png`

## Response

\`\`\`json
{
  "ok": true,
  "processed": [
    {
      "messageId": 456,
      "source_url": "https://raw.githubusercontent.com/PokeAPI/sprites/...",
      "bucket": "pokedex-sprites",
      "path": "pokemon/25/sprites/front_default.png"
    }
  ],
  "failed": []
}
\`\`\`
