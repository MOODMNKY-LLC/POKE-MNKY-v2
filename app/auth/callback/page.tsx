"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient()

      const searchParams = new URLSearchParams(window.location.search)
      const code = searchParams.get("code")

      if (!code) {
        setError("No authorization code found")
        router.push("/auth/login?error=no_code")
        return
      }

      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          console.error("Auth callback error:", error)
          setError(error.message)
          router.push("/auth/login?error=callback_failed")
          return
        }

        if (data.session) {
          // Redirect to home and refresh to update auth state
          router.push("/")
          router.refresh()
        }
      } catch (err) {
        console.error("Unexpected error during callback:", err)
        setError("An unexpected error occurred")
        router.push("/auth/login?error=unexpected")
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {error ? (
          <>
            <h2 className="text-2xl font-bold text-destructive">Authentication Error</h2>
            <p className="text-muted-foreground">{error}</p>
            <p className="text-sm">Redirecting to login...</p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <h2 className="text-2xl font-bold">Completing sign in...</h2>
            <p className="text-muted-foreground">Please wait while we verify your Discord account</p>
          </>
        )}
      </div>
    </div>
  )
}
