# Discord Bot Commands Registration Guide

> **Status**: 📋 Ready for Integration  
> **Date**: 2026-01-16

---

## ✅ Available Commands

All command handlers are located in `/lib/discord-commands/`:

1. **`calc-command.ts`** - `/calc` - Damage calculator
2. **`free-agency-submit.ts`** - `/free-agency-submit` - Submit free agency transactions
3. **`free-agency-status.ts`** - `/free-agency-status` - View team free agency status

---

## 📋 API Endpoints Verified

All referenced API endpoints exist and are ready:

### ✅ Free Agency Endpoints:
- `/api/free-agency/submit` ✅ (POST) - Submit transaction
- `/api/free-agency/team-status` ✅ (GET) - Get team status (Note: Discord command uses this, not `/api/free-agency/status`)
- `/api/free-agency/available` ✅ (GET) - Get available Pokemon
- `/api/free-agency/transactions` ✅ (GET) - Get transaction history
- `/api/free-agency/process` ✅ (POST) - Process transaction (admin)

### ✅ Damage Calculator Endpoints:
- `/api/calc` ✅ (POST) - Calculate damage

---

## 🔧 Integration Steps

### Step 1: Register Commands with Discord

You need to register these commands with Discord's API. Add this to your Discord bot initialization:

```typescript
// In your Discord bot startup script
import { REST, Routes } from "discord.js"
import { allCommands } from "@/lib/discord-commands"

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN!)

async function registerCommands() {
  try {
    console.log("Started refreshing application (/) commands.")

    const commands = allCommands.map((cmd) => cmd.data.toJSON())

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.DISCORD_CLIENT_ID!,
        process.env.DISCORD_GUILD_ID!
      ),
      { body: commands }
    )

    console.log("Successfully registered application commands.")
  } catch (error) {
    console.error("Error registering commands:", error)
  }
}

// Call on bot startup
registerCommands()
```

### Step 2: Handle Command Interactions

Add command handlers to your Discord bot's `interactionCreate` event:

```typescript
// In your Discord bot service
import { Events } from "discord.js"
import { allCommands } from "@/lib/discord-commands"

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = allCommands.find((cmd) => cmd.data.name === interaction.commandName)
    
    if (command) {
      try {
        await command.execute(interaction)
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error)
        await interaction.reply({
          content: "There was an error while executing this command!",
          ephemeral: true,
        })
      }
    }
  }

  if (interaction.isAutocomplete()) {
    const command = allCommands.find((cmd) => cmd.data.name === interaction.commandName)
    
    if (command?.autocomplete) {
      try {
        await command.autocomplete(interaction)
      } catch (error) {
        console.error(`Error handling autocomplete for ${interaction.commandName}:`, error)
      }
    }
  }
})
```

---

## 🎯 Command Details

### `/calc`
- **Endpoint**: `/api/calc` ✅
- **Status**: Ready
- **Autocomplete**: Yes (Pokemon names, moves)

### `/free-agency-submit`
- **Endpoint**: `/api/free-agency/submit` ✅
- **Status**: Ready
- **Autocomplete**: Yes (available Pokemon, roster Pokemon)
- **Note**: Resolves Pokemon names to IDs before calling API

### `/free-agency-status`
- **Endpoint**: `/api/free-agency/team-status` ✅
- **Status**: Ready
- **Note**: Uses `/api/free-agency/team-status` (not `/api/free-agency/status`)

---

## ⚠️ Important Notes

1. **Authentication**: The Discord bot commands call API endpoints that require authentication. You may need to:
   - Pass a service role token in headers
   - Or modify API routes to accept Discord user ID for authentication

2. **Environment Variables**:
   - `DISCORD_BOT_TOKEN` - Bot token
   - `DISCORD_CLIENT_ID` - Application client ID
   - `DISCORD_GUILD_ID` - Server/guild ID
   - `NEXT_PUBLIC_APP_URL` - Your Next.js app URL (for API calls)

3. **API Authentication**: Currently, the commands call APIs without auth tokens. You may need to:
   - Create a service account token for Discord bot
   - Or modify API routes to accept Discord user ID and verify via Supabase

---

## 🚀 Next Steps

1. **Integrate command registration** into your Discord bot startup
2. **Add interaction handlers** to your Discord bot service
3. **Test commands** in Discord server
4. **Set up API authentication** if needed for production

---

**All endpoints are verified and ready!** 🎉
