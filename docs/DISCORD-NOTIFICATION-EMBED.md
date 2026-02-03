# Discord Notification - Rich Embed Formatting

## Quick Start (Recommended)

**Easiest Option**: Keep your existing Discord node and add embeds!

1. Click **"Discord Notification"** node
2. Change **Operation** to `Send Legacy`
3. Click **"Add Embed"**
4. Select **Input Method**: `Raw JSON`
5. Paste the JSON below (or use visual form)
6. Save

**That's it!** Your webhook will now send beautiful embeds.

---

## Current Setup

The workflow currently uses a simple Discord webhook with plain text:
```
✅ **Draft Board Updated**
**Pokemon:** {{ $json.pokemon_name }}
**Points:** {{ $json.point_value }}
**Status:** {{ $json.status }}
**Tera Captain Eligible:** {{ $json.tera_captain_eligible ? 'Yes' : 'No' }}
```

## Solution Options

### Option 1: Keep Discord Node, Add Embeds (Easiest - Recommended)

**Pros**: 
- Uses existing Discord node
- Built-in embed support
- Visual form or JSON input
- No need to replace the node

**Implementation**: Configure embeds in the existing Discord node

### Option 2: HTTP Request Node with Webhook

**Pros**: 
- Full control over JSON
- Works exactly like Discohooks
- Can use Function node for complex logic

**Cons**:
- Need to replace Discord node
- Manual JSON configuration

### Option 3: Discord Bot Node

**Pros**:
- More features (editing messages, reactions, etc.)
- Better error handling

**Cons**:
- Requires bot token setup
- More complex configuration
- Need to specify channel ID

---

## Option 1: Discord Node with Embeds (Easiest)

### Step-by-Step Setup

1. **Click the existing "Discord Notification" node**

2. **Configure**:
   - **Connection Type**: `Webhook` (should already be set)
   - **Webhook URL**: `https://discord.com/api/webhooks/1461568080168751285/cpNQwbr4KeZH4WafOXYlmMAtfFt8FBHk_Rrec2RKtFaq1mDhGmy-WSjaJw_fc1YlNcCs`
   - **Operation**: `Send Legacy` (for webhooks with embeds)
   - **Text**: Leave empty (we'll use embeds only)

3. **Configure Embeds**:
   - **Embeds**: Click "Add Embed"
   - **Input Method**: Choose `Raw JSON` (for full control) OR `Enter Fields` (for visual form)
   
   **If using Raw JSON** (recommended):
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
         "name": "📅 Season",
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
   
   **If using Enter Fields** (visual form):
   - **Title**: `✅ Draft Board Updated`
   - **Description**: `A Pokémon has been added or updated in the draft pool`
   - **Color**: `5763719` (green)
   - **Fields**: Add 6 fields (use expressions like `{{ $json.pokemon_name }}`)
   - **Footer Text**: `POKE MNKY Draft Board Sync`
   - **Timestamp**: `{{ $now.toISO() }}`

4. **Save** the node

---

## Option 2: HTTP Request Node (Full Control)

### Step-by-Step Setup

1. **Delete the current "Discord Notification" node**

2. **Add HTTP Request node**
   - Name it: **"Discord Notification"**

3. **Configure HTTP Request**:
   - **Method**: `POST`
   - **URL**: `https://discord.com/api/webhooks/1461568080168751285/cpNQwbr4KeZH4WafOXYlmMAtfFt8FBHk_Rrec2RKtFaq1mDhGmy-WSjaJw_fc1YlNcCs`
   - **Authentication**: `None`
   - **Send Headers**: `Yes`
   - **Header 1**:
     - **Name**: `Content-Type`
     - **Value**: `application/json`
   - **Send Body**: `Yes`
   - **Body Content Type**: `JSON`
   - **Body**: Use the JSON below

4. **Body JSON** (copy this exactly):
```json
{
  "embeds": [
    {
      "title": "✅ Draft Board Updated",
      "description": "A Pokémon has been added or updated in the draft pool",
      "color": 5763719,
      "fields": [
        {
          "name": "Pokémon",
          "value": "{{ $json.pokemon_name }}",
          "inline": true
        },
        {
          "name": "Point Value",
          "value": "{{ $json.point_value }}",
          "inline": true
        },
        {
          "name": "Status",
          "value": "{{ $json.status }}",
          "inline": true
        },
        {
          "name": "Tera Captain Eligible",
          "value": "{{ $json.tera_captain_eligible ? '✅ Yes' : '❌ No' }}",
          "inline": true
        },
        {
          "name": "Pokémon ID",
          "value": "{{ $json.pokemon_id || 'N/A' }}",
          "inline": true
        },
        {
          "name": "Season",
          "value": "{{ $json.season_id }}",
          "inline": true
        }
      ],
      "footer": {
        "text": "POKE MNKY Draft Board Sync"
      },
      "timestamp": "{{ $now.toISO() }}"
    }
  ]
}
```

### Enhanced Version (with color coding by status)

```json
{
  "embeds": [
    {
      "title": "✅ Draft Board Updated",
      "description": "A Pokémon has been added or updated in the draft pool",
      "color": {{ $json.status === 'available' ? 5763719 : ($json.status === 'banned' ? 15158332 : 9807270) }},
      "fields": [
        {
          "name": "� Pokémon",
          "value": "**{{ $json.pokemon_name }}**",
          "inline": true
        },
        {
          "name": "💰 Points",
          "value": "{{ $json.point_value }}",
          "inline": true
        },
        {
          "name": "📊 Status",
          "value": "{{ $json.status === 'available' ? '✅ Available' : ($json.status === 'banned' ? '🚫 Banned' : ($json.status === 'drafted' ? '👤 Drafted' : '⏸️ Unavailable')) }}",
          "inline": true
        },
        {
          "name": "⭐ Tera Captain",
          "value": "{{ $json.tera_captain_eligible ? '✅ Eligible' : '❌ Not Eligible' }}",
          "inline": true
        },
        {
          "name": "🆔 Pokémon ID",
          "value": "{{ $json.pokemon_id || 'N/A' }}",
          "inline": true
        },
        {
          "name": "📅 Season",
          "value": "{{ $json.season_id }}",
          "inline": false
        }
      ],
      "footer": {
        "text": "POKE MNKY Draft Board Sync",
        "icon_url": "https://poke-mnky.moodmnky.com/poke-mnky/poke-mnky-logo.png"
      },
      "timestamp": "{{ $now.toISO() }}"
    }
  ]
}
```

**Note**: The enhanced version uses n8n expressions for dynamic colors and status formatting. If expressions don't work in JSON, use Option 1B below.

---

## Option 1B: Function Node + HTTP Request (For Complex Logic)

If you need more complex formatting logic:

1. **Add Function Node** before HTTP Request
   - Name: **"Format Discord Embed"**

2. **Function Code**:
```javascript
// Format Discord embed from transform data
const data = $input.item.json;

// Determine color based on status
const statusColors = {
  'available': 5763719,    // Green
  'banned': 15158332,      // Red
  'drafted': 9807270,      // Yellow
  'unavailable': 10070709  // Gray
};

const statusEmojis = {
  'available': '✅',
  'banned': '🚫',
  'drafted': '👤',
  'unavailable': '⏸️'
};

const embed = {
  embeds: [{
    title: "✅ Draft Board Updated",
    description: "A Pokémon has been added or updated in the draft pool",
    color: statusColors[data.status] || 10070709,
    fields: [
      {
        name: "� Pokémon",
        value: `**${data.pokemon_name}**`,
        inline: true
      },
      {
        name: "💰 Points",
        value: `${data.point_value}`,
        inline: true
      },
      {
        name: "📊 Status",
        value: `${statusEmojis[data.status] || '❓'} ${data.status?.charAt(0).toUpperCase() + data.status?.slice(1) || 'Unknown'}`,
        inline: true
      },
      {
        name: "⭐ Tera Captain",
        value: data.tera_captain_eligible ? '✅ Eligible' : '❌ Not Eligible',
        inline: true
      },
      {
        name: "🆔 Pokémon ID",
        value: data.pokemon_id ? `${data.pokemon_id}` : 'N/A',
        inline: true
      },
      {
        name: "📅 Season ID",
        value: data.season_id || 'N/A',
        inline: false
      }
    ],
    footer: {
      text: "POKE MNKY Draft Board Sync"
    },
    timestamp: new Date().toISOString()
  }]
};

return [{ json: embed }];
```

3. **HTTP Request Node**:
   - **Method**: `POST`
   - **URL**: `https://discord.com/api/webhooks/1461568080168751285/cpNQwbr4KeZH4WafOXYlmMAtfFt8FBHk_Rrec2RKtFaq1mDhGmy-WSjaJw_fc1YlNcCs`
   - **Headers**: `Content-Type: application/json`
   - **Body**: `={{ JSON.stringify($json) }}`

---

## Option 2: Discord Bot Node

If you want to use the bot token instead:

1. **Add Discord node**
   - **Connection Type**: `Bot Token`
   - **Bot Token**: `{{ $env.DISCORD_BOT_TOKEN }}`
   - **Resource**: `Message`
   - **Operation**: `Send`
   - **Server**: Select your server
   - **Channel**: Select the channel (e.g., `#draft-board-updates`)
   - **Content**: Leave empty (we'll use embeds)
   - **Additional Fields**: `Yes`
   - **Embeds**: Configure embed fields (similar to above)

**Note**: Bot node embed configuration is more limited. HTTP Request gives you full control.

---

## Recommended: Option 1B (Function + HTTP Request)

This gives you:
- ✅ Full control over formatting
- ✅ Complex logic support
- ✅ Easy to modify
- ✅ Uses existing webhook
- ✅ No bot setup needed

## Color Reference

- **Green** (`5763719`): Available
- **Red** (`15158332`): Banned
- **Yellow** (`9807270`): Drafted
- **Gray** (`10070709`): Unavailable

## Testing

After setup:
1. Test the workflow manually
2. Check Discord channel for the embed
3. Adjust colors/formatting as needed

## Discohooks Preview

You can preview the embed using Discohooks:
1. Go to https://discohook.app/
2. Paste your webhook URL
3. Copy the embed JSON from the Function node output
4. Paste into Discohooks to preview
5. Adjust and copy back to n8n
