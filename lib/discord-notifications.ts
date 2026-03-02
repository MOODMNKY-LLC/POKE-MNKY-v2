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

/** CHATGPT-V3: Notify receiving coach (block owner) that a new league trade offer was made. */
export async function notifyLeagueTradeOffer(offerId: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || "")
  const { data: offer } = await supabase
    .from("league_trade_offers")
    .select("offering_team:teams!offering_team_id(name), receiving_team:teams!receiving_team_id(name)")
    .eq("id", offerId)
    .single()
  if (!offer) return
  const { data: webhook } = await supabase.from("discord_webhooks").select("*").eq("name", "trades").single()
  if (!webhook) return
  const offering = (offer as any).offering_team?.name ?? "A team"
  const receiving = (offer as any).receiving_team?.name ?? "your team"
  await postWebhook(
    webhook.webhook_url,
    `🔄 **New Trade Offer**\n\n**${offering}** has made a trade offer to **${receiving}**. View on the app to accept or reject.`
  )
}

/** Notify offering coach that their offer was rejected. */
export async function notifyLeagueTradeRejected(offerId: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || "")
  const { data: offer } = await supabase
    .from("league_trade_offers")
    .select("receiving_team:teams!receiving_team_id(name)")
    .eq("id", offerId)
    .single()
  if (!offer) return
  const { data: webhook } = await supabase.from("discord_webhooks").select("*").eq("name", "trades").single()
  if (!webhook) return
  const receiving = (offer as any).receiving_team?.name ?? "the other team"
  await postWebhook(
    webhook.webhook_url,
    `❌ **Trade Rejected**\n\nYour trade offer to **${receiving}** was rejected.`
  )
}

/** Notify league/commissioner that an offer was accepted (pending approval). */
export async function notifyLeagueTradeAccepted(offerId: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || "")
  const { data: offer } = await supabase
    .from("league_trade_offers")
    .select("offering_team:teams!offering_team_id(name), receiving_team:teams!receiving_team_id(name)")
    .eq("id", offerId)
    .single()
  if (!offer) return
  const { data: webhook } = await supabase.from("discord_webhooks").select("*").eq("name", "trades").single()
  if (!webhook) return
  const offering = (offer as any).offering_team?.name ?? "Team A"
  const receiving = (offer as any).receiving_team?.name ?? "Team B"
  await postWebhook(
    webhook.webhook_url,
    `✅ **Trade Accepted – Commissioner Approval Needed**\n\n**${offering}** and **${receiving}** have agreed to a trade. League management: please approve or deny on the app.`
  )
}

/** Notify both coaches that the trade was approved (scheduled for Monday midnight). */
export async function notifyLeagueTradeApproved(offerId: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || "")
  const { data: offer } = await supabase
    .from("league_trade_offers")
    .select("offering_team:teams!offering_team_id(name), receiving_team:teams!receiving_team_id(name)")
    .eq("id", offerId)
    .single()
  if (!offer) return
  const { data: webhook } = await supabase.from("discord_webhooks").select("*").eq("name", "trades").single()
  if (!webhook) return
  const offering = (offer as any).offering_team?.name ?? "Team A"
  const receiving = (offer as any).receiving_team?.name ?? "Team B"
  await postWebhook(
    webhook.webhook_url,
    `🏆 **Trade Approved**\n\nTrade between **${offering}** and **${receiving}** has been approved and will execute at 12:00 AM Monday EST.`
  )
}

/** Notify coaches that Tera assignment window is open (48h). Posts to trades webhook with Discord mentions when possible. */
export async function notifyTeraWindowOpened(offerId: string, appBaseUrl?: string): Promise<void> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || "")
  const { data: offer } = await supabase
    .from("league_trade_offers")
    .select("offering_team_id, receiving_team_id, offering_team:teams!offering_team_id(name), receiving_team:teams!receiving_team_id(name)")
    .eq("id", offerId)
    .single()
  if (!offer) return
  const { data: webhook } = await supabase.from("discord_webhooks").select("webhook_url, enabled").eq("name", "trades").single()
  if (!webhook?.webhook_url || webhook.enabled === false) return
  const offeringTeamId = (offer as any).offering_team_id
  const receivingTeamId = (offer as any).receiving_team_id
  const { data: teamRows } = await supabase.from("teams").select("coach_id").in("id", [offeringTeamId, receivingTeamId])
  const coachIds = (teamRows ?? []).map((r: any) => r.coach_id).filter(Boolean)
  if (coachIds.length === 0) {
    const offering = (offer as any).offering_team?.name ?? "Team A"
    const receiving = (offer as any).receiving_team?.name ?? "Team B"
    await postWebhook(
      webhook.webhook_url,
      `⏰ **Tera assignment window** — Coaches for **${offering}** and **${receiving}**: you have 48 hours to assign Tera types in the app (dashboard). Promoting later costs 3 transaction points.`
    )
    return
  }
  const { data: coaches } = await supabase.from("coaches").select("user_id").in("id", coachIds)
  const userIds = (coaches ?? []).map((c: any) => c.user_id).filter(Boolean)
  if (userIds.length === 0) {
    const offering = (offer as any).offering_team?.name ?? "Team A"
    const receiving = (offer as any).receiving_team?.name ?? "Team B"
    await postWebhook(
      webhook.webhook_url,
      `⏰ **Tera assignment window** — Coaches for **${offering}** and **${receiving}**: you have 48 hours to assign Tera types in the app (dashboard). Promoting later costs 3 transaction points.`
    )
    return
  }
  const { data: profiles } = await supabase.from("profiles").select("discord_id").in("id", userIds)
  const mentions = (profiles ?? []).map((p: any) => p.discord_id).filter(Boolean).map((did: string) => `<@${did}>`)
  const offering = (offer as any).offering_team?.name ?? "Team A"
  const receiving = (offer as any).receiving_team?.name ?? "Team B"
  const mentionLine = mentions.length > 0 ? `${mentions.join(" ")} — ` : ""
  const dashboardUrl = appBaseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? ""
  const linkHint = dashboardUrl ? ` Open your dashboard: ${dashboardUrl}/dashboard` : ""
  await postWebhook(
    webhook.webhook_url,
    `⏰ **Tera assignment window** — ${mentionLine}You have **48 hours** to assign Tera types in the app (dashboard). Promoting later costs 3 transaction points.${linkHint}`
  )
}

/** Notify Discord when midnight Monday transaction execution has run (trades + FA). Uses `trades` webhook. */
export async function notifyTransactionsProcessed(results: Array<{ type: string; status: string; error?: string }>): Promise<void> {
  if (results.length === 0) return
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || "")
  const { data: webhook } = await supabase.from("discord_webhooks").select("webhook_url, enabled").eq("name", "trades").single()
  if (!webhook?.webhook_url || webhook.enabled === false) return
  const executed = results.filter((r) => r.status === "executed")
  const failed = results.filter((r) => r.status === "failed")
  const trades = executed.filter((r) => r.type === "trade").length
  const fa = executed.filter((r) => r.type === "free_agency").length
  const failedCount = failed.length
  const lines = [
    `⏰ **Midnight Monday execution completed**`,
    `• Processed: ${results.length} (${executed.length} executed, ${failedCount} failed)`,
    `• Trades executed: ${trades}`,
    `• Free agency moves executed: ${fa}`,
  ]
  if (failedCount > 0) {
    lines.push(`• Failed: ${failed.map((r) => r.error ?? r.type).slice(0, 3).join("; ")}${failedCount > 3 ? "…" : ""}`)
  }
  await postWebhook(webhook.webhook_url, lines.join("\n"))
}

/** Notify both coaches that the trade was denied. */
export async function notifyLeagueTradeDenied(offerId: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || "")
  const { data: offer } = await supabase
    .from("league_trade_offers")
    .select("offering_team:teams!offering_team_id(name), receiving_team:teams!receiving_team_id(name)")
    .eq("id", offerId)
    .single()
  if (!offer) return
  const { data: webhook } = await supabase.from("discord_webhooks").select("*").eq("name", "trades").single()
  if (!webhook) return
  const offering = (offer as any).offering_team?.name ?? "Team A"
  const receiving = (offer as any).receiving_team?.name ?? "Team B"
  await postWebhook(
    webhook.webhook_url,
    `🚫 **Trade Denied**\n\nThe trade between **${offering}** and **${receiving}** was denied by league management.`
  )
}

export async function notifyDraftBoardSync(
  stats: { synced: number; failed: number },
  changes: Array<{ pokemon_name: string; change_type: string }> = []
): Promise<void> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || "")

  const { data: webhook } = await supabase
    .from("discord_webhooks")
    .select("webhook_url, enabled")
    .eq("name", "draft_board_sync")
    .single()

  if (!webhook?.webhook_url || webhook.enabled === false) {
    return
  }

  // Create rich embed
  const embed = {
    title: "✅ Draft Board Sync Completed",
    description: `Successfully synced ${stats.synced} Pokémon from Notion to Supabase`,
    color: 0x00ff00, // Green
    fields: [
      {
        name: "Synced",
        value: stats.synced.toString(),
        inline: true,
      },
      {
        name: "Failed",
        value: stats.failed.toString(),
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
  }

  // Add changes if provided
  if (changes.length > 0 && changes.length <= 10) {
    embed.fields.push({
      name: "Changes",
      value: changes
        .map((c) => `• ${c.pokemon_name} (${c.change_type})`)
        .join("\n"),
      inline: false,
    })
  } else if (changes.length > 10) {
    embed.fields.push({
      name: "Changes",
      value: `${changes.length} Pokémon updated`,
      inline: false,
    })
  }

  await postWebhookEmbed(webhook.webhook_url, embed)
}

export async function notifyDraftBoardError(
  error: string,
  context: Record<string, any> = {}
): Promise<void> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || "")

  const { data: webhook } = await supabase
    .from("discord_webhooks")
    .select("webhook_url, enabled")
    .eq("name", "draft_board_errors")
    .single()

  if (!webhook?.webhook_url || webhook.enabled === false) {
    return
  }

  // Create error embed
  const embed = {
    title: "❌ Draft Board Sync Error",
    description: error,
    color: 0xff0000, // Red
    fields: Object.entries(context)
      .slice(0, 5) // Limit to 5 fields
      .map(([key, value]) => ({
        name: key,
        value: String(value).substring(0, 1024), // Discord field value limit
        inline: true,
      })),
    timestamp: new Date().toISOString(),
  }

  await postWebhookEmbed(webhook.webhook_url, embed)
}

async function postWebhook(url: string, content: string) {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
  } catch (error) {
    console.error("[Discord] Webhook post error:", error)
  }
}

async function postWebhookEmbed(url: string, embed: any) {
  try {
    // Log notification to database
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || "")
    
    try {
      await supabase.from("discord_notification_log").insert({
        webhook_name: embed.title?.includes("Error") ? "draft_board_errors" : "draft_board_sync",
        event_type: embed.title?.includes("Error") ? "error" : "sync_success",
        payload: embed,
        success: true,
      })
    } catch (logError) {
      // Don't fail if logging fails
      console.error("[Discord] Failed to log notification:", logError)
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Discord webhook failed: ${response.status} ${errorText}`)
    }
  } catch (error: any) {
    console.error("[Discord] Webhook embed post error:", error)
    
    // Log failure
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || "")
      await supabase.from("discord_notification_log").insert({
        webhook_name: embed.title?.includes("Error") ? "draft_board_errors" : "draft_board_sync",
        event_type: embed.title?.includes("Error") ? "error" : "sync_success",
        payload: embed,
        success: false,
        error_message: error.message,
      })
    } catch (logError) {
      // Ignore logging errors
    }
  }
}
