# Poképedia Worker Edge Function

Processes queue messages from `pokepedia_ingest`, fetches resources from PokéAPI, and stores them in both the JSONB cache (`pokeapi_resources`) and normalized tables.

## Usage

```bash
# Manual trigger
curl -X POST https://<project-ref>.supabase.co/functions/v1/pokepedia-worker \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "batchSize": 10,
    "visibilityTimeout": 300,
    "concurrency": 4,
    "enqueueSprites": true
  }'
```

## Parameters

- `batchSize` (optional): Number of messages to process per invocation. Default: 10
- `visibilityTimeout` (optional): Seconds before message becomes visible again if not deleted. Default: 300
- `concurrency` (optional): Number of concurrent fetches. Default: 4
- `enqueueSprites` (optional): Whether to enqueue sprite downloads. Default: true

## What It Does

1. Reads messages from `pokepedia_ingest` queue
2. Fetches resource JSON from PokéAPI
3. Stores in `pokeapi_resources` (canonical JSONB cache)
4. Updates `pokepedia_pokemon` projection table (for Pokemon resources)
5. Extracts sprite URLs and enqueues to `pokepedia_sprites` queue
6. Deletes processed messages

## Response

```json
{
  "ok": true,
  "processed": [
    {
      "messageId": 123,
      "url": "https://pokeapi.co/api/v2/pokemon/25/",
      "resource_type": "pokemon",
      "resource_key": "25"
    }
  ],
  "failed": []
}
```
