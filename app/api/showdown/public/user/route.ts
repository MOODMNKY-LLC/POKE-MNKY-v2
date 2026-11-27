import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { fetchPublicShowdownUser, toShowdownUserid } from "@/lib/showdown/public-web-api"

/**
 * Read-only proxy for pokemonshowdown.com/users/:id.json.
 * Does NOT prove ownership — for discovery / display only.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const username = request.nextUrl.searchParams.get("username")?.trim()
  if (!username) {
    return NextResponse.json({ error: "username is required" }, { status: 400 })
  }

  try {
    const profile = await fetchPublicShowdownUser(username)
    return NextResponse.json({
      userid: profile.userid,
      username: profile.username,
      ratings: profile.ratings ?? {},
      lookup: toShowdownUserid(username),
      ownership_proof: false,
      note: "Public profile lookup is not verified account linking.",
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load public profile",
      },
      { status: 502 },
    )
  }
}
