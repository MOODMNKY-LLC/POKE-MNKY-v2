"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient()

      // Exchange the code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.search.substring(1))

      if (error) {
        console.error("Auth callback error:", error)
        router.push("/auth/login?error=callback_failed")
      } else {
        // Successfully authenticated, redirect to home
        router.push("/")
        router.refresh()
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Completing sign in...</h2>
        <p className="text-muted-foreground">Please wait while we verify your Discord account</p>
      </div>
    </div>
  )
}
