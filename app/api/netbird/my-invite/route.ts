import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"

export const dynamic = "force-dynamic"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const HEADERS = { "Cache-Control": "no-store" }

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: HEADERS })
}

/**
 * Returns the signed-in member's own invite link. The link table has no client access at all, so this route is the
 * only way to read one. Anything that is not the caller's own, still-valid invite is a plain 404.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return json({ error: "Sign in to see your invite." }, 401)

  const requestId = request.nextUrl.searchParams.get("request_id")
  if (requestId !== null && !UUID_PATTERN.test(requestId)) return json({ error: "Not found" }, 404)

  try {
    const db = createServiceRoleClient()

    let query = db
      .from("netbird_access_requests")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "invited")
    if (requestId) query = query.eq("id", requestId)
    const { data: owned, error: ownedError } = await query
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (ownedError || !owned) return json({ error: "Not found" }, 404)

    const { data: link, error: linkError } = await db
      .from("netbird_invite_links")
      .select("invite_url, expires_at")
      .eq("request_id", (owned as { id: string }).id)
      .maybeSingle()
    if (linkError || !link) return json({ error: "Not found" }, 404)

    const { invite_url: inviteUrl, expires_at: expiresAt } = link as { invite_url: string; expires_at: string }
    if (Date.parse(expiresAt) <= Date.now()) return json({ error: "Not found" }, 404)

    return json({ invite_url: inviteUrl, expires_at: expiresAt }, 200)
  } catch (error) {
    console.error("[netbird] my-invite failed:", error instanceof Error ? error.message : "unknown error")
    return json({ error: "Something went wrong. Please try again." }, 500)
  }
}
