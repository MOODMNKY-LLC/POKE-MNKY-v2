# Free Agency Discord Bot Integration

> **Status**: 📋 Design Document  
> **Last Updated**: 2026-01-16

---

## 🎯 Overview

This document outlines how to integrate Discord bot commands for free agency transactions, allowing coaches to submit and manage free agency moves directly from Discord.

---

## 🤖 Discord Bot Commands

### **1. `/free-agency-submit`**

Submit a free agency transaction via Discord.

**Command Structure:**
```
/free-agency-submit
  type: replacement | addition | drop_only
  add: [Pokemon Name] (optional, required for replacement/addition)
  drop: [Pokemon Name] (optional, required for replacement/drop_only)
```

**Example Usage:**
```
/free-agency-submit type:replacement add:Slowking drop:Pikachu
/free-agency-submit type:addition add:Charizard
/free-agency-submit type:drop_only drop:Bulbasaur
```

**Bot Response:**
- **Success**: Embed showing transaction preview, validation status, and confirmation
- **Error**: Error message with validation details

**Implementation:**
```typescript
// lib/discord-bot-service.ts or app/api/discord/commands/route.ts

import { SlashCommandBuilder, EmbedBuilder } from "discord.js"
import { FreeAgencySystem } from "@/lib/free-agency"

export const freeAgencySubmitCommand = {
  data: new SlashCommandBuilder()
    .setName("free-agency-submit")
    .setDescription("Submit a free agency transaction")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Transaction type")
        .setRequired(true)
        .addChoices(
          { name: "Replacement (Drop + Add)", value: "replacement" },
          { name: "Addition Only", value: "addition" },
          { name: "Drop Only", value: "drop_only" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("add")
        .setDescription("Pokemon to add")
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName("drop")
        .setDescription("Pokemon to drop")
        .setRequired(false)
        .setAutocomplete(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const userId = interaction.user.id
    const transactionType = interaction.options.getString("type")!
    const addPokemonName = interaction.options.getString("add")
    const dropPokemonName = interaction.options.getString("drop")

    // Get user's Discord ID and find their profile
    const supabase = createServiceRoleClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, team_id, role")
      .eq("discord_id", userId)
      .single()

    if (!profile || profile.role !== "coach" || !profile.team_id) {
      return interaction.editReply({
        content: "❌ You must be a coach with an assigned team to submit transactions.",
      })
    }

    // Get current season
    const { data: season } = await supabase
      .from("seasons")
      .select("id")
      .eq("is_current", true)
      .single()

    if (!season) {
      return interaction.editReply({
        content: "❌ No active season found.",
      })
    }

    // Resolve Pokemon names to IDs
    const freeAgency = new FreeAgencySystem()
    
    let addedPokemonId: string | null = null
    let droppedPokemonId: string | null = null

    if (addPokemonName) {
      const { data: pokemon } = await supabase
        .from("pokemon")
        .select("id")
        .ilike("name", addPokemonName.toLowerCase())
        .single()
      
      if (!pokemon) {
        return interaction.editReply({
          content: `❌ Pokemon "${addPokemonName}" not found.`,
        })
      }
      addedPokemonId = pokemon.id
    }

    if (dropPokemonName) {
      // Check if Pokemon is on user's roster
      const { data: roster } = await supabase
        .from("team_rosters")
        .select("pokemon_id, pokemon:pokemon_id(name)")
        .eq("team_id", profile.team_id)
        .ilike("pokemon.name", dropPokemonName.toLowerCase())
        .single()

      if (!roster) {
        return interaction.editReply({
          content: `❌ "${dropPokemonName}" is not on your roster.`,
        })
      }
      droppedPokemonId = roster.pokemon_id
    }

    // Submit transaction
    const result = await freeAgency.submitTransaction(
      profile.team_id,
      season.id,
      transactionType as any,
      addedPokemonId,
      droppedPokemonId,
      profile.id
    )

    if (!result.success) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("❌ Transaction Failed")
        .setDescription(result.error || "Unknown error")
        .addFields(
          result.validation?.errors.map((err: string) => ({
            name: "Validation Error",
            value: err,
          })) || []
        )

      return interaction.editReply({ embeds: [errorEmbed] })
    }

    // Success embed
    const successEmbed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle("✅ Transaction Submitted")
      .setDescription("Your free agency transaction has been submitted and is pending approval.")
      .addFields(
        {
          name: "Transaction Type",
          value: transactionType,
          inline: true,
        },
        {
          name: "Status",
          value: "Pending",
          inline: true,
        },
        {
          name: "New Roster Size",
          value: result.validation?.new_roster_size?.toString() || "N/A",
          inline: true,
        },
        {
          name: "New Point Total",
          value: `${result.validation?.new_point_total || 0}/120`,
          inline: true,
        }
      )
      .setFooter({ text: `Transaction ID: ${result.transaction?.id.slice(0, 8)}` })
      .setTimestamp()

    if (dropPokemonName) {
      successEmbed.addFields({
        name: "Dropping",
        value: `${dropPokemonName} (${result.transaction?.dropped_points}pts)`,
        inline: true,
      })
    }

    if (addPokemonName) {
      successEmbed.addFields({
        name: "Adding",
        value: `${addPokemonName} (${result.transaction?.added_points}pts)`,
        inline: true,
      })
    }

    return interaction.editReply({ embeds: [successEmbed] })
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true)
    const userId = interaction.user.id

    // Get user's team
    const supabase = createServiceRoleClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("team_id")
      .eq("discord_id", userId)
      .single()

    if (!profile?.team_id) {
      return interaction.respond([])
    }

    // Get current season
    const { data: season } = await supabase
      .from("seasons")
      .select("id")
      .eq("is_current", true)
      .single()

    if (!season) {
      return interaction.respond([])
    }

    if (focused.name === "add") {
      // Autocomplete available Pokemon
      const freeAgency = new FreeAgencySystem()
      const available = await freeAgency.getAvailablePokemon(season.id, {
        search: focused.value,
        limit: 25,
      })

      return interaction.respond(
        available.map((p) => ({
          name: `${p.pokemon_name} (${p.point_value}pts)`,
          value: p.pokemon_name,
        }))
      )
    } else if (focused.name === "drop") {
      // Autocomplete roster Pokemon
      const { data: roster } = await supabase
        .from("team_rosters")
        .select("pokemon:pokemon_id(name), draft_points")
        .eq("team_id", profile.team_id)

      const filtered = (roster || [])
        .filter((r: any) =>
          r.pokemon?.name?.toLowerCase().includes(focused.value.toLowerCase())
        )
        .slice(0, 25)

      return interaction.respond(
        filtered.map((r: any) => ({
          name: `${r.pokemon.name} (${r.draft_points}pts)`,
          value: r.pokemon.name,
        }))
      )
    }

    return interaction.respond([])
  },
}
```

---

### **2. `/free-agency-status`**

View your team's free agency status (roster, budget, transaction count).

**Command Structure:**
```
/free-agency-status
```

**Bot Response:**
Embed showing:
- Current roster size
- Budget (spent/remaining)
- Transaction count (used/remaining)
- List of current roster Pokemon

**Implementation:**
```typescript
export const freeAgencyStatusCommand = {
  data: new SlashCommandBuilder()
    .setName("free-agency-status")
    .setDescription("View your team's free agency status"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const userId = interaction.user.id
    const supabase = createServiceRoleClient()

    // Get user profile and team
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, team_id, role")
      .eq("discord_id", userId)
      .single()

    if (!profile || profile.role !== "coach" || !profile.team_id) {
      return interaction.editReply({
        content: "❌ You must be a coach with an assigned team.",
      })
    }

    // Get current season
    const { data: season } = await supabase
      .from("seasons")
      .select("id")
      .eq("is_current", true)
      .single()

    if (!season) {
      return interaction.editReply({
        content: "❌ No active season found.",
      })
    }

    // Get team status
    const freeAgency = new FreeAgencySystem()
    const status = await freeAgency.getTeamStatus(profile.team_id, season.id)

    if (!status) {
      return interaction.editReply({
        content: "❌ Failed to fetch team status.",
      })
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("📊 Free Agency Status")
      .addFields(
        {
          name: "Roster Size",
          value: `${status.rosterSize}/10`,
          inline: true,
        },
        {
          name: "Budget",
          value: `${status.budget.spent}/120 (${status.budget.remaining} remaining)`,
          inline: true,
        },
        {
          name: "Transactions",
          value: `${status.transactionCount}/10 (${status.remainingTransactions} remaining)`,
          inline: true,
        },
        {
          name: "Current Roster",
          value:
            status.roster
              .map((p) => `${p.pokemon_name} (${p.point_value}pts)`)
              .join("\n") || "No Pokemon",
        }
      )
      .setTimestamp()

    return interaction.editReply({ embeds: [embed] })
  },
}
```

---

### **3. `/free-agency-available`**

Browse available Pokemon for free agency.

**Command Structure:**
```
/free-agency-available
  search: [Pokemon Name] (optional)
  min_points: [Number] (optional)
  max_points: [Number] (optional)
```

**Bot Response:**
Embed showing list of available Pokemon matching filters.

**Implementation:**
```typescript
export const freeAgencyAvailableCommand = {
  data: new SlashCommandBuilder()
    .setName("free-agency-available")
    .setDescription("Browse available Pokemon for free agency")
    .addStringOption((option) =>
      option.setName("search").setDescription("Search Pokemon name").setRequired(false)
    )
    .addIntegerOption((option) =>
      option.setName("min_points").setDescription("Minimum points").setRequired(false)
    )
    .addIntegerOption((option) =>
      option.setName("max_points").setDescription("Maximum points").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const userId = interaction.user.id
    const search = interaction.options.getString("search")
    const minPoints = interaction.options.getInteger("min_points")
    const maxPoints = interaction.options.getInteger("max_points")

    // Get current season
    const supabase = createServiceRoleClient()
    const { data: season } = await supabase
      .from("seasons")
      .select("id")
      .eq("is_current", true)
      .single()

    if (!season) {
      return interaction.editReply({
        content: "❌ No active season found.",
      })
    }

    const freeAgency = new FreeAgencySystem()
    const available = await freeAgency.getAvailablePokemon(season.id, {
      search: search || undefined,
      minPoints: minPoints || undefined,
      maxPoints: maxPoints || undefined,
      limit: 25,
    })

    if (available.length === 0) {
      return interaction.editReply({
        content: "❌ No Pokemon available matching your filters.",
      })
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("🆓 Available Pokemon")
      .setDescription(
        available
          .map((p) => `**${p.pokemon_name}** - ${p.point_value}pts`)
          .join("\n")
      )
      .setFooter({ text: `Showing ${available.length} Pokemon` })
      .setTimestamp()

    return interaction.editReply({ embeds: [embed] })
  },
}
```

---

### **4. `/free-agency-history`** (Admin Only)

View transaction history for a team or all teams.

**Command Structure:**
```
/free-agency-history
  team: [Team Name] (optional, admin only)
  status: pending | approved | processed | rejected (optional)
```

---

## 🔔 Discord Notifications

### **Transaction Status Updates**

When a transaction is approved/rejected/processed, send a DM to the coach:

```typescript
// In transaction processing logic
async function notifyCoachOfTransactionStatus(
  transaction: FreeAgencyTransaction,
  status: "approved" | "rejected" | "processed"
) {
  const supabase = createServiceRoleClient()
  
  // Get coach's Discord ID
  const { data: coach } = await supabase
    .from("coaches")
    .select("user_id, profiles!inner(discord_id)")
    .eq("id", transaction.team_id)
    .single()

  if (!coach?.profiles?.discord_id) return

  const discordClient = await getDiscordClient()
  const user = await discordClient.users.fetch(coach.profiles.discord_id)

  const embed = new EmbedBuilder()
    .setColor(status === "processed" ? 0x00ff00 : status === "rejected" ? 0xff0000 : 0xffff00)
    .setTitle(`Transaction ${status.charAt(0).toUpperCase() + status.slice(1)}`)
    .setDescription(`Your free agency transaction has been ${status}.`)
    .addFields({
      name: "Transaction ID",
      value: transaction.id.slice(0, 8),
    })
    .setTimestamp()

  await user.send({ embeds: [embed] })
}
```

---

## 📋 Implementation Checklist

- [ ] Add command handlers to Discord bot service
- [ ] Register commands with Discord API
- [ ] Implement autocomplete for Pokemon names
- [ ] Add transaction status notification system
- [ ] Create admin commands for processing transactions
- [ ] Add error handling and user-friendly messages
- [ ] Test all commands end-to-end
- [ ] Document command usage in Discord server

---

## 🔗 Integration Points

1. **Discord Bot Service** (`lib/discord-bot-service.ts`)
   - Register commands on bot initialization
   - Handle command interactions
   - Send notifications

2. **Free Agency System** (`lib/free-agency.ts`)
   - Reuse existing validation and submission logic
   - No changes needed - already compatible

3. **API Routes** (`app/api/free-agency/*`)
   - Can be called from Discord bot or web UI
   - Same validation and processing logic

---

## 🎯 Benefits

1. **Convenience**: Coaches can submit transactions without leaving Discord
2. **Speed**: Faster than navigating to web UI
3. **Notifications**: Real-time updates via DMs
4. **Mobile-Friendly**: Discord mobile app support
5. **Integration**: Seamless with existing Discord workflows

---

**Ready for implementation!** The free agency system is fully compatible with Discord bot integration. 🚀
