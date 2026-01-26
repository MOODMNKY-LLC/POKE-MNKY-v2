import { createServerClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"
import { syncDiscordRoleToApp } from "@/lib/discord-role-sync"

/**
 * OAuth callback route handler (Server-side)
 * This handles the Discord OAuth callback and exchanges the code for a session.
 * Must be a Route Handler (route.ts) not a Page (page.tsx) for PKCE to work correctly.
 * 
 * Automatically syncs Discord roles on first authentication so users with existing
 * Discord roles get proper app access immediately.
 * 
 * NOTE: Showdown account sync is NOT triggered here to avoid blocking auth flow.
 * Users can sync their Showdown account via:
 * - Discord bot command: /showdown-link
 * - API endpoint: POST /api/showdown/sync-account (after login)
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") || "/dashboard"

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

    // Automatically sync Discord roles on first authentication
    // This ensures users with existing Discord roles get proper app access immediately
    if (data.user?.app_metadata?.provider === "discord" && data.user.id) {
      // Wait a brief moment for profile trigger to complete
      // Profile is created by handle_new_user() trigger which extracts it from raw_user_meta_data
      await new Promise(resolve => setTimeout(resolve, 500))
      
      try {
        // Get Discord ID from profile (more reliable than metadata)
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("discord_id")
          .eq("id", data.user.id)
          .single()

        // Fallback to metadata if profile not found yet
        const discordId = profile?.discord_id || 
                          data.user.user_metadata?.provider_id || 
                          data.user.user_metadata?.sub ||
                          data.user.app_metadata?.provider_id

        if (discordId) {
          console.log(`[OAuth Callback] Auto-syncing Discord roles for user ${data.user.id} (Discord: ${discordId})`)
          
          // Sync roles asynchronously (don't block redirect)
          // This will update app role and save Discord roles to database
          syncDiscordRoleToApp(discordId, data.user.id)
            .then((result) => {
              console.log(`[OAuth Callback] Role sync completed:`, result.message)
            })
            .catch((error) => {
              // Log error but don't block auth flow
              console.error(`[OAuth Callback] Failed to auto-sync Discord roles:`, error.message)
              console.error(`[OAuth Callback] Error stack:`, error.stack)
            })
        } else {
          console.warn(`[OAuth Callback] No Discord ID found for user ${data.user.id}. Profile error:`, profileError?.message)
          console.warn(`[OAuth Callback] User metadata:`, {
            provider: data.user.app_metadata?.provider,
            user_metadata: data.user.user_metadata,
            app_metadata: data.user.app_metadata,
          })
        }
      } catch (error: any) {
        // Log error but don't block auth flow
        console.error(`[OAuth Callback] Error during auto-sync setup:`, error.message)
        console.error(`[OAuth Callback] Error stack:`, error.stack)
      }
    } else {
      console.log(`[OAuth Callback] Skipping role sync - provider: ${data.user?.app_metadata?.provider}, user id: ${data.user?.id}`)
    }

    // Success - redirect immediately
    // Role sync happens asynchronously in background
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
