/**
 * Phase 4.3: Notion Sync Status Endpoint
 * 
 * GET /api/sync/notion/status?job_id=<uuid>
 * 
 * Returns status of sync jobs
 * 
 * Authentication: NOTION_SYNC_SECRET bearer token (optional for public read)
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get("job_id")
    const limit = parseInt(searchParams.get("limit") || "10")

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 }
      )
    }

    // Optional: Check auth for protected access (for now, allow public read)
    // const authHeader = request.headers.get("authorization")
    // const token = authHeader?.replace("Bearer ", "")
    // const syncSecret = process.env.NOTION_SYNC_SECRET
    // if (syncSecret && token !== syncSecret) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    const supabase = createClient(supabaseUrl, anonKey)

    if (jobId) {
      // Get specific job
      const { data: job, error } = await supabase
        .from("sync_jobs")
        .select("*")
        .eq("job_id", jobId)
        .single()

      if (error) {
        return NextResponse.json(
          { error: `Job not found: ${error.message}` },
          { status: 404 }
        )
      }

      return NextResponse.json({ job })
    } else {
      // Get recent jobs
      const { data: jobs, error } = await supabase
        .from("sync_jobs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(limit)

      if (error) {
        return NextResponse.json(
          { error: `Failed to fetch jobs: ${error.message}` },
          { status: 500 }
        )
      }

      return NextResponse.json({ jobs: jobs || [] })
    }
  } catch (error: any) {
    console.error("Notion sync status error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
