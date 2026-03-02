/**
 * Build the POKE MNKY slash commands how-to embed using @discordjs/builders.
 * Single source of truth for the Discord how-to: includes both app-registered commands
 * (lib/discord-commands) and legacy/server-bot commands (tools/discord-bot on server).
 */

import { EmbedBuilder } from "@discordjs/builders"
import type { APIEmbed } from "discord-api-types/v10"

const BLURPLE = 0x5865f2

/** Grouped by category for league members. */
const FIELDS: Array<{ name: string; value: string; inline?: boolean }> = [
  { name: "How to use", value: "Type **/** in any channel and choose **POKE MNKY** from the list. Then pick the command you need.", inline: false },

  { name: "📋 Draft", value: "Commands for the draft.", inline: false },
  { name: "`/pick`", value: "Make your draft pick. Start typing a Pokémon name and pick from the list when it's your turn.", inline: false },
  { name: "`/search`", value: "Look up Pokémon in the draft pool — who's available and how many points they cost.", inline: false },
  { name: "`/draftstatus`", value: "See the draft status: who's up, what round you're in, and whether the draft is live or paused.", inline: false },

  { name: "🔄 Free agency", value: "Add or drop Pokémon between weeks.", inline: false },
  { name: "`/free-agency-submit`", value: "Submit a free agency move — drop a Pokémon, add one from the pool, or both. Start typing to see options.", inline: false },
  { name: "`/free-agency-status`", value: "Check your team's FA status: pending moves, how many transactions you have left, and your cap.", inline: false },

  {
    name: "📅 Match week & standings",
    value: [
      "`/matchups` — See who plays who this week",
      "`/submit` — Report your match result (e.g. \"Team A beat Team B 6-4\")",
      "`/standings` — Current league standings",
      "`/recap` — Get an AI-generated recap for a week",
      "`/pokemon` — Quick lookup for a Pokémon (info, tier, draft cost)",
    ].join("\n"),
    inline: false,
  },

  { name: "👤 You & your roster", value: "Your profile and team view.", inline: false },
  { name: "`/whoami`", value: "See who you're linked as — your coach profile and which team you're on.", inline: false },
  { name: "`/coverage`", value: "View your roster's type and role coverage. See how your drafted team stacks up.", inline: false },

  {
    name: "⚔️ Battle & Showdown",
    value: [
      "`/battle` — Create a Showdown battle room",
      "`/validate-team` — Check your team export against your roster",
      "`/showdown-link` — Link your Discord and Showdown usernames",
      "`/draft` · `/draft-status` · `/draft-available` · `/draft-my-team` · `/free-agency-available` — more options if your server has them",
    ].join("\n"),
    inline: false,
  },

  { name: "🧮 Tools", value: "Utilities.", inline: false },
  { name: "`/calc`", value: "Run the damage calculator. Enter attacker, defender, and move to see damage ranges.", inline: false },

  { name: "⚙️ Commissioners", value: "For league admins only.", inline: false },
  { name: "`/getseason`", value: "Check which season the server is using for draft and free agency.", inline: false },
  { name: "`/setseason`", value: "Set the server's default season so draft and FA use it automatically.", inline: false },
]

/**
 * Returns an EmbedBuilder (from @discordjs/builders) with the full slash commands guide.
 * Call .toJSON() to get APIEmbed for Discord API requests.
 */
export function buildSlashCommandsGuideEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("📖 How to Use the POKE MNKY Bot")
    .setDescription(
      "Use these commands right here in Discord to draft, check your roster, report matches, and more. Type **/** and select **POKE MNKY** to get started."
    )
    .setColor(BLURPLE)
    .addFields(FIELDS)
    .setFooter({
      text: "POKE MNKY · All moves execute at 12:00 AM Monday EST unless noted",
    })
    .setTimestamp()
}

/**
 * Returns the guide as APIEmbed (for fetch body or logging).
 */
export function getSlashCommandsGuideEmbedJSON(): APIEmbed {
  return buildSlashCommandsGuideEmbed().toJSON()
}
