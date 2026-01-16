import { createClient } from "@/lib/supabase/server"
import { getCurrentUserProfile, type UserProfile } from "@/lib/rbac"
import { SiteHeader } from "@/components/site-header"
import type { User } from "@supabase/supabase-js"

export async function SiteHeaderWrapper() {
  let initialUser: User | null = null
  let initialProfile: UserProfile | null = null

  try {
    const supabase = await createClient()
    
    // Use a timeout to prevent hanging if Supabase is unavailable
    const getUserPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("getUser timeout")), 2000)
    )
    
    const {
      data: { user },
    } = await Promise.race([getUserPromise, timeoutPromise]) as { data: { user: User | null } }

    if (user) {
      initialUser = user
      try {
        initialProfile = await getCurrentUserProfile(supabase)
      } catch (profileError) {
        // Profile fetch failed, but we have user - continue with user only
        console.warn("[SiteHeaderWrapper] Error fetching profile:", profileError)
      }
    }
  } catch (error) {
    // Silently fail - header will handle client-side fetch
    // Don't log network errors as they're expected when Supabase is unavailable
    if (error instanceof Error && !error.message.includes("timeout") && !error.message.includes("fetch failed")) {
      console.warn("[SiteHeaderWrapper] Error fetching initial user:", error)
    }
  }

  return <SiteHeader initialUser={initialUser} initialProfile={initialProfile} />
}
