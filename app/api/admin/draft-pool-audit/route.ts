import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { hasAnyRole } from "@/lib/rbac"
import { UserRole } from "@/lib/rbac"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const ok = await hasAnyRole(supabase, user.id, [UserRole.ADMIN, UserRole.COMMISSIONER])
    if (!ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const poolId = request.nextUrl.searchParams.get("pool_id")
    let q = supabase.from("draft_pool_edit_audit").select("*").order("created_at", { ascending: false }).limit(100)
    if (poolId) {
      q = q.eq("draft_pool_id", poolId)
    }

    const { data, error } = await q
    if (error) {
      if (error.code === "42P01" || error.message.includes("does not exist")) {
        return NextResponse.json({ entries: [], note: "Audit table not migrated yet." })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ entries: data ?? [] })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    )
  }
}
