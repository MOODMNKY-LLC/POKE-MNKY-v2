/**
 * CHATGPT-V3 League Engine: Midnight Monday EST transaction execution.
 * Processes pending_transactions (trades and free agency) scheduled for 12:00 AM Monday EST.
 *
 * Setup:
 * 1. Add to vercel.json crons:
 *    { "path": "/api/cron/execute-transactions", "schedule": "0 5 * * 1" }
 *    (5:00 UTC Monday = 00:00 EST Monday)
 * 2. Generate a random secret and set CRON_SECRET in Vercel (see docs/CRON-SECRET-SETUP.md).
 *    Vercel sends it automatically as Authorization: Bearer <CRON_SECRET> when invoking the cron.
 */

import { NextResponse } from "next/server"
import { executePendingTransactions } from "@/lib/league-engine/execute-pending-transactions"
import { notifyTransactionsProcessed } from "@/lib/discord-notifications"

export const revalidate = 0
export const maxDuration = 120

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const results = await executePendingTransactions()
    const executed = results.filter((r) => r.status === "executed").length
    const failed = results.filter((r) => r.status === "failed")
    if (results.length > 0) {
      await notifyTransactionsProcessed(results).catch((err) => console.error("[Discord] Transactions processed notify:", err))
    }
    return NextResponse.json({
      success: failed.length === 0,
      processed: results.length,
      executed,
      failed: failed.length,
      results,
    })
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Execution failed",
      },
      { status: 500 }
    )
  }
}
