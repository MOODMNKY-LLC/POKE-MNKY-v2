# Discord Embed JSON - Draft Board Updates

Use this in the **Notion Draft Board → Supabase** workflow's Discord step.

---

## 1. n8n Discord Node (recommended)

1. Open the workflow → **Discord Notification** node.
2. **Operation**: `Send Legacy` (so embeds work).
3. **Text**: leave empty (embed only).
4. **Embeds** → Add Embed → **Input Method**: `Raw JSON`.
5. Paste the JSON below. n8n will evaluate `{{ ... }}` when the node runs.

```json
{
  "title": "Draft Board Updated",
  "description": "Notion → Supabase sync: one Pokémon added or updated in the draft pool.",
  "color": 5763719,
  "fields": [
    {
      "name": "Pokémon",
      "value": "{{ $json.pokemon_name }}",
      "inline": true
    },
    {
      "name": "Points",
      "value": "{{ $json.point_value }}",
      "inline": true
    },
    {
      "name": "Status",
      "value": "{{ $json.status }}",
      "inline": true
    },
    {
      "name": "Tera Captain",
      "value": "{{ $json.tera_captain_eligible ? 'Yes' : 'No' }}",
      "inline": true
    },
    {
      "name": "Pokémon ID",
      "value": "{{ $json.pokemon_id || 'N/A' }}",
      "inline": true
    },
    {
      "name": "Season ID",
      "value": "{{ $json.season_id }}",
      "inline": false
    }
  ],
  "footer": {
    "text": "POKE MNKY · Draft Board Sync"
  },
  "timestamp": "{{ $now.toISO() }}"
}
```

**Color**: `5763719` = green (neutral "updated"). For status-based colors use the HTTP Request option in the full doc.

---

## 2. Shorter embed (fewer fields)

Same node setup; use this JSON for a compact message:

```json
{
  "title": "Draft Board Updated",
  "description": "**{{ $json.pokemon_name }}** · {{ $json.point_value }} pts · {{ $json.status }}",
  "color": 5763719,
  "footer": {
    "text": "POKE MNKY · Draft Board Sync"
  },
  "timestamp": "{{ $now.toISO() }}"
}
```

---

## 3. Status-based color (Function + HTTP Request)

If you want **color by status** (green=available, red=banned, etc.) or the Discord node doesn't evaluate expressions in Raw JSON:

1. Add a **Function** node before the Discord/HTTP node to build the embed object.
2. Use an **HTTP Request** node: POST to your webhook URL, body = `{{ JSON.stringify($json) }}`.
3. Full example (Function code + HTTP config): see `docs/DISCORD-NOTIFICATION-EMBED.md` → Option 1B.

---

## Color codes (for manual or Function node)

| Status   | Color  | Decimal   |
|----------|--------|-----------|
| Available | Green | `5763719` |
| Banned   | Red   | `15158332` |
| Drafted  | Yellow | `9807270` |
| Other    | Gray  | `10070709` |

---

## Preview in Discohooks

1. Go to https://discohook.app/
2. Add your webhook URL.
3. Paste the embed JSON (use sample values instead of `{{ }}` to preview).
4. Tweak, then copy back into n8n.
