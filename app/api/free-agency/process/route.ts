import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { FreeAgencySystem } from "@/lib/free-agency"
import { getCurrentUserProfile } from "@/lib/rbac"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const profile = await getCurrentUserProfile(supabase)
    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { transaction_id } = body

    if (!transaction_id) {
      return NextResponse.json(
        { success: false, error: "transaction_id is required" },
        { status: 400 }
      )
    }

    const freeAgency = new FreeAgencySystem()
    const result = await freeAgency.processTransaction(transaction_id)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Transaction processed successfully",
    })
  } catch (error: any) {
    console.error("Free agency process error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
