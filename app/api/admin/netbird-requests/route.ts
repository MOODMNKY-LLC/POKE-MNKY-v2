import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireLeagueAdmin } from "@/lib/admin-api-auth"
import {
  NETBIRD_REQUEST_COLUMNS,
  REVIEW_TRANSITIONS,
  isNetbirdRequestStatus,
  type NetbirdAccessRequest,
} from "@/lib/netbird/access-requests"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Changes status, reviewed_by and reviewed_at only. No NetBird, Discord, or email side effects. */
export async function PATCH(request: NextRequest) {
  const gate = await requireLeagueAdmin()
  if ("response" in gate) return gate.response

  let body: { id?: unknown; status?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { id, status } = body
  if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid request id" }, { status: 400 })
  }
  if (!isNetbirdRequestStatus(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }
  const allowedFrom = REVIEW_TRANSITIONS[status]
  if (!allowedFrom) {
    return NextResponse.json({ error: "Status cannot be set from the admin queue" }, { status: 400 })
  }

  // User-scoped client: RLS (admin/commissioner UPDATE policy) is the final enforcement.
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("netbird_access_requests")
    .update({ status, reviewed_by: gate.userId, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", allowedFrom)
    .select(NETBIRD_REQUEST_COLUMNS)
    .maybeSingle()

  if (error) {
    console.error("[netbird] review update failed:", error.message)
    return NextResponse.json({ error: "Could not update request" }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json(
      { error: "Request not found, or it is no longer in a state that allows this change" },
      { status: 409 },
    )
  }

  return NextResponse.json({ request: data as NetbirdAccessRequest })
}
