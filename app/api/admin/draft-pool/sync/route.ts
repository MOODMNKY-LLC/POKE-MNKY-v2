import { createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import {
  syncStagingToProduction,
  type SyncResult,
} from "@/lib/draft-pool/sync-service"
import { canManageDraftPool } from "@/lib/draft-pool/admin-utils"

/**
 * POST /api/admin/draft-pool/sync
 * 
 * Sync draft pool data from staging table (sheets_draft_pool) to production table (draft_pool).
 * 
 * Body: { seasonId: string, sheetName?: string, dryRun?: boolean }
 * 
 * This endpoint:
 * 1. Validates authentication (admin only)
 * 2. Requires season_id
 * 3. Syncs staging → production with status mapping
 * 4. Handles conflicts (preserves drafted Pokemon)
 * 5. Returns sync statistics
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check admin permissions
    const hasPermission = await canManageDraftPool()
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { seasonId, sheetName, dryRun } = body

    if (!seasonId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing seasonId in request body",
        },
        { status: 400 }
      )
    }

    // Validate season exists
    const serviceSupabase = await import("@/lib/supabase/service").then(
      m => m.createServiceRoleClient()
    )
    const { data: season, error: seasonError } = await serviceSupabase
      .from("seasons")
      .select("id")
      .eq("id", seasonId)
      .maybeSingle()

    if (seasonError || !season) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid seasonId - season not found",
        },
        { status: 400 }
      )
    }

    // Perform sync
    const result = await syncStagingToProduction(
      seasonId,
      sheetName || "Draft Board",
      dryRun || false
    )

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Sync completed with errors",
          result,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: dryRun
        ? "Dry run completed - no changes made"
        : "Draft pool synced successfully from staging to production",
      result,
    })
  } catch (error: any) {
    console.error("[API /admin/draft-pool/sync] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    )
  }
}
