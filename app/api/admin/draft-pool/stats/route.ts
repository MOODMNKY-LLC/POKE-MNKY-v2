import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { NextRequest, NextResponse } from "next/server"
import { canManageDraftPool } from "@/lib/draft-pool/admin-utils"

/**
 * GET /api/admin/draft-pool/stats
 * 
 * Get staging table statistics for draft pool import/sync system.
 * 
 * Returns:
 * - total: Total number of records
 * - available: Number of available Pokemon
 * - banned: Number of banned Pokemon
 * - teraBanned: Number of Tera banned Pokemon
 * - drafted: Always 0 (not tracked in staging)
 */
export async function GET(request: NextRequest) {
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

    // Use service role client to bypass RLS and get accurate stats
    const adminSupabase = createServiceRoleClient()

    // Try to get all records with is_tera_banned column
    // If schema cache is stale, fall back to query without it
    let data: any[] | null = null
    let hasTeraBannedColumn = true

    try {
      const { data: fullData, error } = await adminSupabase
        .from("sheets_draft_pool")
        .select("*")

      if (error) {
        // If error is about missing column, try without is_tera_banned
        if (error.message?.includes('is_tera_banned') || error.message?.includes('does not exist')) {
          console.warn("[API /admin/draft-pool/stats] is_tera_banned column not found, using fallback query")
          hasTeraBannedColumn = false
          
          const { data: fallbackData, error: fallbackError } = await adminSupabase
            .from("sheets_draft_pool")
            .select("is_available")
          
          if (fallbackError) {
            throw fallbackError
          }
          
          data = fallbackData
        } else {
          throw error
        }
      } else {
        data = fullData
      }
    } catch (error: any) {
      console.error("[API /admin/draft-pool/stats] Error:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to fetch staging statistics",
        },
        { status: 500 }
      )
    }

    // Calculate statistics
    // Handle is_tera_banned safely - it may not exist if schema cache is stale
    const stats = {
      total: data?.length || 0,
      available: data?.filter((p) => p.is_available).length || 0,
      banned: data?.filter((p) => !p.is_available).length || 0,
      teraBanned: hasTeraBannedColumn 
        ? (data?.filter((p) => p.is_tera_banned === true).length || 0)
        : 0, // Return 0 if column not available
      drafted: 0, // Drafted status not tracked in staging
    }

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error: any) {
    console.error("[API /admin/draft-pool/stats] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    )
  }
}
