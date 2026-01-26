/**
 * Phase 4.1: Notion Incremental Sync Pull Endpoint
 * 
 * POST /api/sync/notion/pull/incremental
 * 
 * Triggers an incremental sync job (only processes changed pages since timestamp)
 * 
 * Authentication: NOTION_SYNC_SECRET bearer token
 * 
 * Body:
 * {
 *   "since": "2026-01-01T00:00:00Z", // required
 *   "scope": ["pokemon", "role_tags", "moves"], // optional
 *   "dryRun": false // optional
 * }
 */

import { NextRequest, NextResponse } from "next/server"
import { POST as pullPost } from "../route"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { since } = body

    if (!since) {
      return NextResponse.json(
        { error: "since timestamp is required for incremental sync" },
        { status: 400 }
      )
    }

    // Create a new request with incremental flag set
    const modifiedBody = {
      ...body,
      incremental: true,
    }

    // Create new request with modified body
    const modifiedRequest = new NextRequest(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(modifiedBody),
    })

    return pullPost(modifiedRequest)
  } catch (error: any) {
    console.error("Notion incremental sync error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
