import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { NextRequest, NextResponse } from "next/server"
import {
  importDraftPoolToStaging,
  validateDraftPoolJSON,
  type ServerAgentDraftPool,
} from "@/lib/draft-pool/import-service"
import { canManageDraftPool } from "@/lib/draft-pool/admin-utils"

/**
 * POST /api/admin/draft-pool/import
 * 
 * Import draft pool data from server agent's JSON format into staging table.
 * 
 * Body: { draftPool: ServerAgentDraftPool, sheetName?: string }
 * 
 * This endpoint:
 * 1. Validates authentication (admin only)
 * 2. Validates JSON structure
 * 3. Imports to sheets_draft_pool staging table
 * 4. Returns import statistics
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
    const { draftPool, sheetName } = body

    if (!draftPool) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing draftPool data in request body",
        },
        { status: 400 }
      )
    }

    // Validate JSON structure
    if (!validateDraftPoolJSON(draftPool)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid draft pool JSON structure",
          details:
            "Expected structure: { config, metadata, pokemon: { available, banned, teraBanned, drafted }, bannedList, teraBannedList }",
        },
        { status: 400 }
      )
    }

    // Import to staging table
    const result = await importDraftPoolToStaging(
      draftPool as ServerAgentDraftPool,
      sheetName || "Draft Board"
    )

    if (!result.success) {
      // Log detailed error information
      console.error("[API /admin/draft-pool/import] Import errors:", result.errors)
      console.error("[API /admin/draft-pool/import] Import warnings:", result.warnings)
      
      return NextResponse.json(
        {
          success: false,
          error: result.errors.length > 0 
            ? `Import completed with ${result.errors.length} error(s). First error: ${result.errors[0]?.error || 'Unknown error'}`
            : "Import completed with errors",
          result,
          errorCount: result.errors.length,
          firstError: result.errors[0]?.error || null,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Draft pool imported successfully to staging table",
      result,
    })
  } catch (error: any) {
    console.error("[API /admin/draft-pool/import] Error:", error)
    console.error("[API /admin/draft-pool/import] Error stack:", error.stack)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
