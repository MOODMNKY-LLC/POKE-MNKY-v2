import { createServiceRoleClient } from "@/lib/supabase/service"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/admin/draft/sessions/[id]
 * Get a specific draft session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServiceRoleClient()
    const { data: session, error } = await supabase
      .from("draft_sessions")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, session })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/draft/sessions/[id]
 * Update a draft session (status, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServiceRoleClient()
    const body = await request.json()

    // Get current session
    const { data: currentSession } = await supabase
      .from("draft_sessions")
      .select("*")
      .eq("id", id)
      .single()

    if (!currentSession) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    // Handle status changes
    if (body.status) {
      updateData.status = body.status

      // Set timestamps based on status
      if (body.status === "completed" && currentSession.status !== "completed") {
        updateData.completed_at = new Date().toISOString()
      }
      if (body.status === "cancelled" && currentSession.status !== "cancelled") {
        updateData.completed_at = new Date().toISOString()
      }
    }

    // Allow updating other fields
    if (body.draft_type) updateData.draft_type = body.draft_type
    if (body.pick_time_limit_seconds !== undefined)
      updateData.pick_time_limit_seconds = body.pick_time_limit_seconds
    if (body.auto_draft_enabled !== undefined)
      updateData.auto_draft_enabled = body.auto_draft_enabled

    const { data: session, error } = await supabase
      .from("draft_sessions")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, session })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/draft/sessions/[id]
 * Delete a draft session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from("draft_sessions")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Session deleted successfully",
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
