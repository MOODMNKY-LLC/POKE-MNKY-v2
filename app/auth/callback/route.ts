import { createServerClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"
import { syncDiscordRoleToApp } from "@/lib/discord-role-sync"

/**
 * OAuth callback route handler (Server-side)
 * Exchanges PKCE code for session. Discord role sync runs in background.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const errorParam = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")
  const next = requestUrl.searchParams.get("next") || "/dashboard"

  if (errorParam) {
    const errorUrl = new URL("/auth/login", requestUrl.origin)
    errorUrl.searchParams.set("error", "oauth_failed")
    errorUrl.searchParams.set("message", errorDescription || errorParam)
    return NextResponse.redirect(errorUrl)
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/auth/login?error=no_code", requestUrl.origin)
    )
  }

  const supabase = await createServerClient()
  const { error, data } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    const errorUrl = new URL("/auth/login", requestUrl.origin)
    errorUrl.searchParams.set("error", "callback_failed")
    errorUrl.searchParams.set("message", error.message)
    return NextResponse.redirect(errorUrl)
  }

  if (data.user?.app_metadata?.provider === "discord" && data.user.id) {
    await new Promise((resolve) => setTimeout(resolve, 500))

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("discord_id")
        .eq("id", data.user.id)
        .single()

      const discordId =
        profile?.discord_id ||
        data.user.user_metadata?.provider_id ||
        data.user.user_metadata?.sub ||
        data.user.app_metadata?.provider_id

      if (discordId) {
        syncDiscordRoleToApp(discordId, data.user.id).catch((err) => {
          console.error("[OAuth Callback] Role sync failed:", err)
        })
      }
    } catch (err) {
      console.error("[OAuth Callback] Auto-sync setup error:", err)
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
