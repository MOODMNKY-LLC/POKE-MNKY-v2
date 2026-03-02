// Discord notification utilities with rich embeds
// Call these from API routes to post updates to Discord channels

import { createClient } from "@supabase/supabase-js"
import { EmbedBuilder } from "discord.js"

export async function notifyMatchResult(matchId: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || "")

  const { data: match } = await supabase
    .from("matches")
    .select(
      `
      *,
      team1:teams!matches_team1_id_fkey(name),
      team2:teams!matches_team2_id_fkey(name),
      winner:teams!matches_winner_id_fkey(name)
    `,
    )
    .eq("id", matchId)
    .single()

  if (!match) return

  const { data: webhooks } = await supabase.from("discord_webhooks").select("*").eq("name", "match_results").single()

  if (!webhooks) return

  // Create rich embed for match result
  const embed = new EmbedBuilder()
    .setColor(0x0099ff) // Blue color for match results
    .setTitle(`🏆 Match Result - Week ${match.week}`)
    .addFields(
      { name: match.team1.name, value: `${match.team1_score}`, inline: true },
      { name: "vs", value: "—", inline: true },
      { name: match.team2.name, value: `${match.team2_score}`, inline: true },
      { name: "Winner", value: match.winner.name, inline: true },
      { name: "Differential", value: `${match.differential} KOs`, inline: true },
    )
    .setTimestamp()
    .setFooter({ text: "POKE MNKY League" })

  // Add replay URL if available
  if (match.replay_url) {
    embed.setURL(match.replay_url)
    embed.addFields({ name: "Replay", value: `[Watch Replay](${match.replay_url})`, inline: false })
  }

  await postWebhook(webhooks.webhook_url, embed)
}

export async function notifyWeeklyRecap(week: number, recap: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || "")

  const { data: webhook } = await supabase.from("discord_webhooks").select("*").eq("name", "weekly_recap").single()

  if (!webhook) return

  // Create rich embed for weekly recap
  const embed = new EmbedBuilder()
    .setColor(0xff9900) // Orange color for recaps
    .setTitle(`📰 Week ${week} Recap`)
    .setDescription(recap)
    .setTimestamp()
    .setFooter({ text: "POKE MNKY League" })

  await postWebhook(webhook.webhook_url, embed)
}

export async function notifyTradeProposal(tradeId: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || "")

  const { data: trade } = await supabase
    .from("trade_offers")
    .select(
      `
      *,
      listing:trade_listings(pokemon_id, team:teams(name)),
      offering_team:teams(name)
    `,
    )
    .eq("id", tradeId)
    .single()

  if (!trade) return

  const { data: webhook } = await supabase.from("discord_webhooks").select("*").eq("name", "trades").single()

  if (!webhook) return

  // Create rich embed for trade proposal
  const embed = new EmbedBuilder()
    .setColor(0x00ff00) // Green color for trades
    .setTitle("🔄 New Trade Proposal")
    .addFields(
      { name: "Offering Team", value: trade.offering_team.name, inline: true },
      { name: "Requesting From", value: trade.listing.team.name, inline: true },
    )
    .setDescription("View trade details on the website to accept or reject.")
    .setTimestamp()
    .setFooter({ text: "POKE MNKY League" })

  // Add trade ID for reference
  embed.addFields({ name: "Trade ID", value: tradeId, inline: false })

  await postWebhook(webhook.webhook_url, embed)
}

async function postWebhook(url: string, embed: EmbedBuilder) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed.toJSON()] }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Notifications] Webhook post failed: ${response.status} ${errorText}`)
    }
  } catch (error) {
    console.error("[Notifications] Webhook post error:", error)
  }
}
