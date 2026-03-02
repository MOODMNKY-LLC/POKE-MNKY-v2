/**
 * Post the POKE MNKY slash commands how-to embed via a Discord webhook using discord-webhook-node.
 * Use when the channel has a webhook URL (no bot token needed for this script).
 *
 * Usage:
 *   pnpm exec tsx scripts/post-slash-commands-guide-webhook.ts <webhook_url>
 *   Or set DISCORD_WEBHOOK_URL in .env.local
 *
 * Example webhook URL: https://discord.com/api/webhooks/123456789/abcdef...
 */

import { config } from "dotenv"
import { resolve } from "path"
import { Webhook, MessageBuilder } from "discord-webhook-node"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

const webhookUrl = process.argv[2] || process.env.DISCORD_WEBHOOK_URL

const BLURPLE_DECIMAL = 5793266 // #5865F2

function buildGuideMessage(): MessageBuilder {
  const embed = new MessageBuilder()
    .setTitle("📖 How to Use the POKE MNKY Bot")
    .setDescription(
      "Use these commands right here in Discord to draft, check your roster, report matches, and more. Type **/** and select **POKE MNKY** to get started."
    )
    .setColor(BLURPLE_DECIMAL)
    .setTimestamp()
    .setFooter("POKE MNKY · All moves execute at 12:00 AM Monday EST unless noted")

  // Coach-facing copy, grouped by category (aligned with lib/discord/slash-commands-guide-embed.ts)
  const appFields: Array<[string, string, boolean?]> = [
    ["How to use", "Type **/** in any channel and choose **POKE MNKY** from the list. Then pick the command you need.", false],
    ["📋 Draft", "Commands for the draft.", false],
    ["`/pick`", "Make your draft pick. Start typing a Pokémon name and pick from the list when it's your turn.", false],
    ["`/search`", "Look up Pokémon in the draft pool — who's available and point costs.", false],
    ["`/draftstatus`", "See the draft status: who's up, round, and whether the draft is live or paused.", false],
    ["🔄 Free agency", "Add or drop Pokémon between weeks.", false],
    ["`/free-agency-submit`", "Submit a FA move — drop, add, or both. Start typing to see options.", false],
    ["`/free-agency-status`", "Check your team's FA status: pending moves and transactions left.", false],
    ["📅 Match week & standings", "`/matchups` — who plays who · `/submit` — report result · `/standings` · `/recap` · `/pokemon`", false],
    ["👤 You & your roster", "Your profile and team view.", false],
    ["`/whoami`", "See who you're linked as — coach profile and team.", false],
    ["`/coverage`", "View your roster's type and role coverage.", false],
    ["⚔️ Battle & Showdown", "`/battle` — create room · `/validate-team` · `/showdown-link` · `/draft` · `/draft-status` · `/free-agency-available`", false],
    ["🧮 Tools", "Utilities.", false],
    ["`/calc`", "Run the damage calculator. Attacker, defender, move.", false],
    ["⚙️ Commissioners", "For league admins only.", false],
    ["`/getseason`", "Check which season the server is using for draft/FA.", false],
    ["`/setseason`", "Set the server's default season.", false],
  ]

  for (const [name, value, inline] of appFields) {
    embed.addField(name, value, inline ?? false)
  }

  return embed
}

async function main() {
  if (!webhookUrl) {
    console.error("Provide webhook URL as first argument or set DISCORD_WEBHOOK_URL in .env.local")
    process.exit(1)
  }

  const hook = new Webhook(webhookUrl)
  const message = buildGuideMessage()

  try {
    await hook.send(message)
    console.log("Slash commands guide posted via webhook.")
  } catch (err) {
    console.error("Webhook send failed:", err)
    process.exit(1)
  }
}

main()
