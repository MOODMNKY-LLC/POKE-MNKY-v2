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
  // Ensure we're on the client side
  if (typeof window === 'undefined') {
    throw new Error('Supabase client can only be created on the client side. Use createServerClient for server-side operations.')
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase configuration. NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.'
    )
  }

  if (!clientInstance) {
    clientInstance = createSupabaseBrowserClient(
      supabaseUrl,
      supabaseAnonKey,
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
