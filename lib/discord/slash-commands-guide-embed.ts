/**
 * Build the POKE MNKY slash commands how-to embed using @discordjs/builders.
 * Documents the 11 app-registered commands from lib/discord-commands/index.ts.
 * Legacy server-bot commands are called out separately so they are not confused
 * with the live app inventory.
 */

import { EmbedBuilder } from "@discordjs/builders"
import type { APIEmbed } from "discord-api-types/v10"

const BLURPLE = 0x5865f2

/** Grouped by category for league members — matches docs/DISCORD-SLASH-COMMANDS-REFERENCE.md */
const FIELDS: Array<{ name: string; value: string; inline?: boolean }> = [
  {
    name: "How to use",
    value:
      "Type **/** in any channel and choose **POKE MNKY**. Link Discord in the app (`/whoami`) before draft or free agency picks.",
    inline: false,
  },

  { name: "📋 Draft", value: "Commands for the draft.", inline: false },
  {
    name: "`/pick`",
    value: "Submit your draft pick. Autocomplete the Pokémon name when it is your turn.",
    inline: false,
  },
  {
    name: "`/search`",
    value: "Look up Pokémon in the draft pool — availability and cost.",
    inline: false,
  },
  {
    name: "`/draftstatus`",
    value: "See whose turn it is, the round, and whether the draft is live.",
    inline: false,
  },

  { name: "🔄 Free agency", value: "Add or drop between weeks.", inline: false },
  {
    name: "`/free-agency-submit`",
    value: "`type:replacement|addition|drop_only` plus optional `add` / `drop` (autocomplete).",
    inline: false,
  },
  {
    name: "`/free-agency-status`",
    value: "Pending FA moves, remaining transactions, and roster snapshot.",
    inline: false,
  },

  { name: "👤 You & coverage", value: "Profile and roster tools.", inline: false },
  {
    name: "`/whoami`",
    value: "Show your linked coach profile and team.",
    inline: false,
  },
  {
    name: "`/coverage`",
    value: "Roster role/type coverage (hazards, cleric, speed control, …).",
    inline: false,
  },

  { name: "🧮 Tools", value: "Utilities.", inline: false },
  {
    name: "`/calc`",
    value: "Damage calc — attacker, defender, move (optional generation). Same engine as the app API.",
    inline: false,
  },

  { name: "⚙️ Commissioners", value: "Guild season defaults.", inline: false },
  {
    name: "`/getseason`",
    value: "Show the guild default season.",
    inline: false,
  },
  {
    name: "`/setseason`",
    value: "Set or `clear` the guild default season (admins).",
    inline: false,
  },

  { name: "🌐 Battle network (optional)", value: "Ryujinx / NetBird — not public Showdown.", inline: false },
  {
    name: "`/join-battles`",
    value:
      "Request NetBird mesh access (league guild only, ephemeral). Requires a Discord-linked app account.",
    inline: false,
  },

  {
    name: "Legacy server-bot (not in app register)",
    value:
      "Older hosts may still document `/matchups`, `/submit`, `/standings`, `/battle`, `/validate-team`, etc. Those are **not** in the app’s 11-command set unless a separate Discord application still serves them.",
    inline: false,
  },
]

/**
 * Returns an EmbedBuilder (from @discordjs/builders) with the full slash commands guide.
 * Call .toJSON() to get APIEmbed for Discord API requests.
 */
export function buildSlashCommandsGuideEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("📖 How to Use the POKE MNKY Bot")
    .setDescription(
      "Eleven app slash commands for draft, free agency, coverage, damage calc, and optional battle-network access. Type **/** and select **POKE MNKY**.",
    )
    .setColor(BLURPLE)
    .addFields(FIELDS)
    .setFooter({
      text: "POKE MNKY · FA / trades settle Mon 12:00 AM Eastern unless your season says otherwise",
    })
    .setTimestamp()
}

/**
 * Returns the guide as APIEmbed (for fetch body or logging).
 */
export function getSlashCommandsGuideEmbedJSON(): APIEmbed {
  return buildSlashCommandsGuideEmbed().toJSON()
}
