import { createServerClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

/**
 * OAuth callback route handler (Server-side)
 * This handles the Discord OAuth callback and exchanges the code for a session.
 * Must be a Route Handler (route.ts) not a Page (page.tsx) for PKCE to work correctly.
 * 
 * NOTE: Showdown account sync is NOT triggered here to avoid blocking auth flow.
 * Users can sync their Showdown account via:
 * - Discord bot command: /showdown-link
 * - API endpoint: POST /api/showdown/sync-account (after login)
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") || "/"

  if (code) {
    // Create server client with cookie handling
    const supabase = await createServerClient()

    // Exchange the authorization code for a session
    // This reads the PKCE code verifier from cookies (set during OAuth initiation)
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("Auth callback error:", error)
      // Redirect to login with error
      const errorUrl = new URL("/auth/login", requestUrl.origin)
      errorUrl.searchParams.set("error", "callback_failed")
      errorUrl.searchParams.set("message", error.message)
      return NextResponse.redirect(errorUrl)
    }

    // Success - redirect immediately
    // Showdown account sync should be triggered separately via:
    // - Discord bot: /showdown-link command
    // - Manual API call: POST /api/showdown/sync-account
    // This keeps auth flow clean and non-blocking

    // Redirect to home or next page
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }

  // No code parameter - redirect to login
  return NextResponse.redirect(new URL("/auth/login?error=no_code", requestUrl.origin))
}
