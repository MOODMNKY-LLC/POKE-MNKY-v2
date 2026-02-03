# Discord Node Embed Setup - Step by Step

## Your Node Structure

Your Discord node has:
- **Webhook URL**: Already configured ✅
- **Content**: Leave empty (we'll use embeds)
- **Additional Fields**: This is where we add embeds

## Step-by-Step Configuration

### 1. Open Discord Notification Node

Click on the "Discord Notification" node in your workflow.

### 2. Configure Basic Settings

- **Webhook URL**: Keep your existing URL
- **Content**: Leave **empty** (we're using embeds, not text)

### 3. Configure Additional Fields

1. **Enable Additional Fields**: Toggle "Additional Fields" to `Yes` or `On`

2. **Add Embeds**: 
   - Look for **"Embeds"** section in Additional Fields
   - Click **"Add Embed"** or **"Add Value"**

3. **Configure Embed**:

   **Option A: If you see "Input Method" dropdown:**
   - Select **"Raw JSON"**
   - Paste the JSON below

   **Option B: If you see individual fields:**
   - Fill in each field manually (see field list below)

   **Option C: If you see a JSON editor:**
   - Paste the JSON below directly

---

## Embed JSON (Copy This)

```json
{
  "title": "✅ Draft Board Updated",
  "description": "A Pokémon has been added or updated in the draft pool",
  "color": 5763719,
  "fields": [
    {
      "name": "� Pokémon",
      "value": "{{ $json.pokemon_name }}",
      "inline": true
    },
    {
      "name": "💰 Points",
      "value": "{{ $json.point_value }}",
      "inline": true
    },
    {
      "name": "📊 Status",
      "value": "{{ $json.status }}",
      "inline": true
    },
    {
      "name": "⭐ Tera Captain",
      "value": "{{ $json.tera_captain_eligible ? '✅ Yes' : '❌ No' }}",
      "inline": true
    },
    {
      "name": "🆔 Pokémon ID",
      "value": "{{ $json.pokemon_id || 'N/A' }}",
      "inline": true
    },
    {
      "name": "📅 Season ID",
      "value": "{{ $json.season_id }}",
      "inline": false
    }
  ],
  "footer": {
    "text": "POKE MNKY Draft Board Sync"
  },
  "timestamp": "{{ $now.toISO() }}"
}
```

---

## Manual Field Configuration (If No JSON Option)

If you need to fill fields manually, here's what to enter:

### Embed 1:
- **Title**: `✅ Draft Board Updated`
- **Description**: `A Pokémon has been added or updated in the draft pool`
- **Color**: `5763719` (green hex: #57F287)
- **Timestamp**: `{{ $now.toISO() }}`

### Fields (Add 6 fields):

**Field 1**:
- **Name**: `� Pokémon`
- **Value**: `{{ $json.pokemon_name }}`
- **Inline**: ✅ Yes

**Field 2**:
- **Name**: `💰 Points`
- **Value**: `{{ $json.point_value }}`
- **Inline**: ✅ Yes

**Field 3**:
- **Name**: `📊 Status`
- **Value**: `{{ $json.status }}`
- **Inline**: ✅ Yes

**Field 4**:
- **Name**: `⭐ Tera Captain`
- **Value**: `{{ $json.tera_captain_eligible ? '✅ Yes' : '❌ No' }}`
- **Inline**: ✅ Yes

**Field 5**:
- **Name**: `🆔 Pokémon ID`
- **Value**: `{{ $json.pokemon_id || 'N/A' }}`
- **Inline**: ✅ Yes

**Field 6**:
- **Name**: `📅 Season ID`
- **Value**: `{{ $json.season_id }}`
- **Inline**: ❌ No

### Footer:
- **Text**: `POKE MNKY Draft Board Sync`

---

## Visual Guide

```
┌─────────────────────────────────────────┐
│ Discord Notification                     │
├─────────────────────────────────────────┤
│ Webhook URL: [your-url]                 │
│ Content: [leave empty]                  │
│                                         │
│ Additional Fields: [Yes/On]             │
│   ┌─────────────────────────────────┐   │
│   │ Embeds                          │   │
│   │   [Add Embed] or [Add Value]    │   │
│   │                                 │   │
│   │   Input Method: Raw JSON        │   │
│   │   [Paste JSON here]             │   │
│   └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## Testing

After configuration:

1. **Save** the node
2. **Test** the workflow manually
3. **Check Discord** channel for the embed
4. **Adjust** colors/formatting as needed

---

## Troubleshooting

### If expressions don't work:
- Make sure you're using `{{ }}` syntax
- Check that the previous node outputs `pokemon_name`, `point_value`, etc.
- Test with static values first: `"value": "Test"` to verify embed works

### If embed doesn't appear:
- Make sure **Content** field is empty (embeds won't show if content is set)
- Check webhook URL is correct
- Verify JSON syntax is valid (no trailing commas)

### If you see "Invalid JSON":
- Remove any comments from JSON
- Ensure all quotes are double quotes `"`
- Check that expressions use `{{ }}` not `{}`

---

## Alternative: Function Node + HTTP Request

If the Discord node's embed configuration is too limited, you can:

1. **Add Function Node** before Discord node
2. **Format embed** in Function node (see `docs/DISCORD-NOTIFICATION-EMBED.md`)
3. **Use HTTP Request** node instead of Discord node
4. **Send formatted JSON** to webhook URL

This gives you full control but requires replacing the Discord node.
