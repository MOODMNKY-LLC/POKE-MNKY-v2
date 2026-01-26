import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const syncType = searchParams.get("sync_type")
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "100")
    const offset = parseInt(searchParams.get("offset") || "0")
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")

    // Build query
    let query = supabase
      .from("sync_log")
      .select("*", { count: "exact" })
      .order("synced_at", { ascending: false })

    // Apply filters
    if (syncType) {
      query = query.eq("sync_type", syncType)
    }

    if (status) {
      query = query.eq("status", status)
    }

    if (startDate) {
      query = query.gte("synced_at", startDate)
    }

    if (endDate) {
      query = query.lte("synced_at", endDate)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: logs, error, count } = await query

    if (error) throw error

    // Get statistics
    const { data: statsData, error: statsError } = await supabase
      .from("sync_log")
      .select("status, sync_type")

    if (!statsError && statsData) {
      const totalSyncs = statsData.length
      const successCount = statsData.filter((s) => s.status === "success").length
      const errorCount = statsData.filter((s) => s.status === "error").length
      const successRate = totalSyncs > 0 ? (successCount / totalSyncs) * 100 : 0

      // Get last sync time
      const { data: lastSync, error: lastSyncError } = await supabase
        .from("sync_log")
        .select("synced_at")
        .order("synced_at", { ascending: false })
        .limit(1)
        .single()

      // Group by sync type
      const syncTypeCounts: Record<string, number> = {}
      statsData.forEach((log) => {
        syncTypeCounts[log.sync_type] = (syncTypeCounts[log.sync_type] || 0) + 1
      })

      return NextResponse.json({
        logs: logs || [],
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore: (count || 0) > offset + limit,
        },
        statistics: {
          totalSyncs,
          successCount,
          errorCount,
          successRate: Math.round(successRate * 100) / 100,
          lastSyncAt: lastSync?.synced_at || null,
          syncTypeCounts,
        },
      })
    }

    return NextResponse.json({
      logs: logs || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
      statistics: {
        totalSyncs: 0,
        successCount: 0,
        errorCount: 0,
        successRate: 0,
        lastSyncAt: null,
        syncTypeCounts: {},
      },
    })
  } catch (error: any) {
    console.error("Error fetching sync logs:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch sync logs" },
      { status: 500 }
    )
  }
}
