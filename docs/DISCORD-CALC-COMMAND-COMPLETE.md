# Discord `/calc` Command - Implementation Complete

> **Status**: ✅ Complete  
> **Date**: 2026-01-16

---

## ✅ What's Been Implemented

### **1. Discord Bot Command Handler** ✅

**Location**: `/lib/discord-commands/calc-command.ts`

**Features**:
- ✅ `/calc` slash command with autocomplete
- ✅ Calls `/api/calc` endpoint for calculations
- ✅ Rich embed with color-coded effectiveness
- ✅ OHKO detection and warnings
- ✅ Link to full calculator in embed footer
- ✅ Database-powered autocomplete for Pokemon names
- ✅ Fallback autocomplete for common moves

**Command Options**:
- `attacker` (required, autocomplete) - Attacking Pokemon name
- `defender` (required, autocomplete) - Defending Pokemon name
- `move` (required, autocomplete) - Move name
- `generation` (optional) - Gen 9 (SV), Gen 8 (SwSh), Gen 7 (SM/USUM)

---

### **2. Command Registration** ✅

**Location**: `/lib/discord-bot-service.ts`

**Features**:
- ✅ Automatic command registration on bot startup
- ✅ Registers all commands from `allCommands` array
- ✅ Uses Discord REST API to register guild commands
- ✅ Logs registration status

---

### **3. Interaction Handling** ✅

**Location**: `/lib/discord-bot-service.ts`

**Features**:
- ✅ Handles `InteractionCreate` events
- ✅ Routes commands to appropriate handlers
- ✅ Handles autocomplete interactions
- ✅ Error handling with user-friendly messages

---

### **4. API Endpoint** ✅

**Location**: `/app/api/calc/route.ts`

**Features**:
- ✅ POST endpoint for damage calculations
- ✅ Uses `@smogon/calc` npm package
- ✅ Supports all Pokemon options (EVs, IVs, items, abilities, tera types)
- ✅ Returns damage range and percentage

---

## 🎯 How It Works

### **User Flow:**

1. **User types `/calc` in Discord**
   - Discord shows command options
   - Autocomplete suggests Pokemon names as user types

2. **User fills in options**
   - Selects attacker Pokemon (autocomplete from database)
   - Selects defender Pokemon (autocomplete from database)
   - Selects move (autocomplete from common moves)
   - Optionally selects generation (defaults to Gen 9)

3. **Command executes**
   - Bot defers reply (shows "thinking...")
   - Calls `/api/calc` endpoint with parameters
   - Calculates damage using `@smogon/calc`

4. **Results displayed**
   - Rich embed with color-coded effectiveness:
     - 🔴 Red: OHKO possible (100%+)
     - 🟠 Orange: Very effective (75-99%)
     - 🟡 Yellow: Effective (50-74%)
     - 🔵 Blue: Moderate (25-49%)
     - ⚪ Gray: Weak (<25%)
   - Shows damage range and HP percentage
   - Includes link to full calculator

---

## 🔧 Technical Details

### **Autocomplete Implementation:**

**Pokemon Names**:
- Queries `pokemon` table in Supabase
- Filters by name (case-insensitive)
- Returns up to 25 results
- Falls back to common Pokemon list if database query fails

**Moves**:
- Uses predefined list of common moves
- Filters by name (case-insensitive)
- Returns up to 25 results
- Can be enhanced with moves database in future

### **API Call:**

```typescript
POST /api/calc
Body: {
  gen: 9,
  attackingPokemon: "Pikachu",
  defendingPokemon: "Charizard",
  moveName: "Thunderbolt",
  attackingPokemonOptions: {},
  defendingPokemonOptions: {}
}
```

### **Response Format:**

```typescript
{
  success: true,
  damage: [120, 142, 164, ...],
  percent: [39.5, 46.8, 54.1, ...],
  desc: "39.5 - 148.3%"
}
```

---

## 📋 Command Registration

Commands are automatically registered when the bot starts:

1. Bot initializes (`initializeDiscordBot()`)
2. Bot logs in and becomes ready
3. `ClientReady` event fires
4. `registerCommands()` function runs
5. Commands registered with Discord API
6. Commands available in Discord server

**Registration happens automatically** - no manual steps needed!

---

## 🚀 Usage Example

### **In Discord:**

```
/calc attacker:Pikachu defender:Charizard move:Thunderbolt generation:9
```

### **Response:**

```
⚡ Damage Calculation
Pikachu using Thunderbolt vs Charizard

Damage Range: 120 - 450
HP Percentage: 39.5% - 148.3%
Summary: 39.5 - 148.3%

⚠️ OHKO Possible
This move can OHKO the defender!

Generation 9 | Full calculator: https://your-app.com/calc
```

---

## ⚠️ Requirements

### **Environment Variables:**

- ✅ `DISCORD_BOT_TOKEN` - Bot token
- ✅ `DISCORD_CLIENT_ID` - Application client ID
- ✅ `DISCORD_GUILD_ID` - Server/guild ID
- ✅ `NEXT_PUBLIC_APP_URL` - Your Next.js app URL (for API calls)

### **Bot Permissions:**

- ✅ **Send Messages** - To reply with results
- ✅ **Use Slash Commands** - To register commands
- ✅ **Embed Links** - To show rich embeds

### **Prerequisites:**

1. **Bot must be initialized**:
   - Go to `/admin/discord/bot`
   - Click "Initialize Bot"
   - Verify bot is ready

2. **API endpoint must be accessible**:
   - `/api/calc` endpoint must be running
   - `@smogon/calc` package must be installed

---

## 🧪 Testing

### **Test Steps:**

1. **Initialize bot**:
   - Go to `/admin/discord/bot`
   - Click "Initialize Bot"
   - Wait for "Successfully registered X application commands" message

2. **Test command in Discord**:
   - Type `/calc` in Discord
   - Fill in options:
     - Attacker: `Pikachu`
     - Defender: `Charizard`
     - Move: `Thunderbolt`
   - Submit command
   - Verify:
     - ✅ Bot responds with damage calculation
     - ✅ Embed shows correct colors
     - ✅ Link to full calculator appears

3. **Test autocomplete**:
   - Type `/calc attacker:` and start typing
   - Verify Pokemon names appear in autocomplete
   - Select a Pokemon
   - Repeat for defender and move

---

## 📊 Visual Indicators

### **Embed Colors:**

- 🔴 **Red** (`0xff0000`): OHKO possible (100%+)
- 🟠 **Orange** (`0xff8800`): Very effective (75-99%)
- 🟡 **Yellow** (`0xffaa00`): Effective (50-74%)
- 🔵 **Blue** (`0x4488ff`): Moderate (25-49%)
- ⚪ **Gray** (`0x808080`): Weak (<25%)

### **OHKO Warning:**

If max damage is 100%+, embed includes:
```
⚠️ OHKO Possible
This move can OHKO the defender!
```

---

## 🔄 Integration with Full Calculator

The command includes a link to the full calculator:

- **Footer**: Shows "Full calculator: [URL]/calc"
- **Embed URL**: Clicking embed title opens calculator
- **Error messages**: Include link to calculator

**Best of both worlds**:
- ✅ Quick calculations in Discord (API approach)
- ✅ Detailed analysis via full calculator (iframe approach)

---

## 📚 Related Files

- **Command Handler**: `lib/discord-commands/calc-command.ts`
- **Bot Service**: `lib/discord-bot-service.ts`
- **Command Index**: `lib/discord-commands/index.ts`
- **API Endpoint**: `app/api/calc/route.ts`
- **Full Calculator**: `app/calc/page.tsx`

---

## 🎯 Summary

**What You Can Do Now:**

1. ✅ Initialize Discord bot (`/admin/discord/bot`)
2. ✅ Use `/calc` command in Discord
3. ✅ Get instant damage calculations
4. ✅ Click link to open full calculator for detailed analysis

**The `/calc` command is fully implemented and ready to use!** 🎉

---

## 🚀 Next Steps (Optional Enhancements)

1. **Enhanced Autocomplete**: Connect moves autocomplete to moves database
2. **Advanced Options**: Add EV/IV/item/ability options to command
3. **Batch Calculations**: Calculate multiple matchups at once
4. **Team Analysis**: Compare entire teams against each other
5. **Tera Type Support**: Add tera type options to command

---

**Discord `/calc` command is complete and integrated!** 🎉
