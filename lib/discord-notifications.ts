// Discord notification utilities
// Call these from API routes to post updates to Discord channels

import { createClient } from "@supabase/supabase-js"

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

  const message = `🏆 **Match Result - Week ${match.week}**\n\n**${match.team1.name}** ${match.team1_score} - ${match.team2_score} **${match.team2.name}**\n\nWinner: **${match.winner.name}**\nDifferential: ${match.differential} KOs`

  await postWebhook(webhooks.webhook_url, message)
}

export async function notifyWeeklyRecap(week: number, recap: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || "")

  const { data: webhook } = await supabase.from("discord_webhooks").select("*").eq("name", "weekly_recap").single()

  if (!webhook) return

  const message = `📰 **Week ${week} Recap**\n\n${recap}`

  await postWebhook(webhook.webhook_url, message)
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

  const message = `🔄 **New Trade Proposal**\n\n**${trade.offering_team.name}** is offering for a Pokémon from **${trade.listing.team.name}**\n\nView trade details on the website to accept or reject.`

  await postWebhook(webhook.webhook_url, message)
}

async function postWebhook(url: string, content: string) {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
  } catch (error) {
    console.error("[v0] Webhook post error:", error)
  }
}
