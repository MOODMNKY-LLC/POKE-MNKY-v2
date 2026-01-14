import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"

// Singleton pattern to prevent multiple client instances
let clientInstance: ReturnType<typeof createSupabaseBrowserClient> | null = null

/**
 * Create a Supabase client for browser/client-side operations
 * Uses @supabase/ssr which automatically handles PKCE code verifier storage in cookies
 * This ensures the code verifier persists across OAuth redirects
 * 
 * Uses singleton pattern to prevent multiple GoTrueClient instances
 */
export function createClient() {
  if (!clientInstance) {
    clientInstance = createSupabaseBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        // @supabase/ssr automatically handles cookies for PKCE
        // The code verifier is stored in cookies, not localStorage
        // This ensures it persists across redirects (Discord → Supabase → App)
      },
    )
  }
  return clientInstance
}

export const createBrowserClient = createClient
