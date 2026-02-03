# Configure Discord “Send a message” (Bot) Node – Draft Board Embed

Your workflow uses the **bot** “Send a message” node (resource: Message, operation: Send). The node currently has an empty embed. Use this to get a structured, readable embed for draft board updates.

---

## 1. Open the node

1. Open workflow: **Notion Draft Board → Supabase Sync** (ID: `AeazX7cYBLeNmRBJ`).
2. Click the **Send a message** node (Discord bot, channel: bot-command-testing).

---

## 2. Message content (optional)

In **Content** you can add a short line above the embed, e.g.:

```text
{{ '**Draft Board Updated** — ' + ($json.pokemon_name || 'Pokémon') + ' synced to draft pool.' }}
```

Or leave Content empty and use only the embed.

---

## 3. Embeds – use Raw JSON

1. In **Embeds**, you should have one embed. Click it.
2. Set **Input Method** to **Raw JSON** (not “Enter Fields”).
3. In **Value** (the JSON box), paste the following.  
   `$json` here is the output of **Transform to Supabase1** (pokemon_name, point_value, status, etc.).

```json
{
  "title": "Draft Board Updated",
  "description": "Notion → Supabase sync: one Pokémon added or updated in the draft pool.",
  "color": 5763719,
  "fields": [
    {
      "name": "Pokémon",
      "value": "{{ $json.pokemon_name || '—' }}",
      "inline": true
    },
    {
      "name": "Points",
      "value": "{{ $json.point_value ?? '—' }}",
      "inline": true
    },
    {
      "name": "Status",
      "value": "{{ $json.status || '—' }}",
      "inline": true
    },
    {
      "name": "Tera Captain",
      "value": "{{ $json.tera_captain_eligible ? 'Yes' : 'No' }}",
      "inline": true
    },
    {
      "name": "Pokémon ID",
      "value": "{{ $json.pokemon_id ?? 'N/A' }}",
      "inline": true
    },
    {
      "name": "Season ID",
      "value": "{{ $json.season_id ? $json.season_id.substring(0,8) + '…' : '—' }}",
      "inline": false
    }
  ],
  "footer": {
    "text": "POKE MNKY · Draft Board Sync"
  },
  "timestamp": "{{ $now.toISO() }}"
}
```

4. **Save** the node, then **Save** the workflow and **re-activate** (Off → On) so the active version uses this config.

---

## 4. If Raw JSON doesn’t evaluate `{{ }}`

Some n8n versions don’t evaluate expressions inside the embed JSON. If the message shows literal `{{ $json.pokemon_name }}` or empty values:

**Option A – Use “Enter Fields” (no fields array)**  
Use a single-embed layout with only title/description:

- **Title**: `Draft Board Updated`
- **Description**: `{{ $json.pokemon_name }} · {{ $json.point_value }} pts · {{ $json.status }} · Tera Captain: {{ $json.tera_captain_eligible ? 'Yes' : 'No' }}`
- **Color**: `5763719` (green)
- **Timestamp**: enable and use `{{ $now.toISO() }}` if the field supports expressions.

You won’t get separate embed “fields”, but the info will still be in the description.

**Option B – Build embed in a Code node**  
Add a **Code** node before the Discord node that builds the embed object and passes it along; then in the Discord node use **Raw JSON** with something like `{{ $json.embed }}` (if you put the built embed on `embed`). That way all logic and expressions live in the Code node.

---

## 5. Color reference

| Status    | Color  | Decimal   |
|----------|--------|-----------|
| Available | Green | `5763719` |
| Banned   | Red   | `15158332` |
| Drafted  | Yellow | `9807270` |
| Other    | Gray  | `10070709` |

For a single neutral “updated” look, `5763719` (green) is used above.

---

## Summary

- **Send a message** node: set **Embeds** → first embed → **Input Method** = **Raw JSON**, then paste the JSON from section 3.
- Optional: set **Content** as in section 2.
- Save the node and workflow, then re-activate the workflow.

After that, draft board updates will post to Discord with a structured, readable embed (title, description, fields, footer, timestamp).
