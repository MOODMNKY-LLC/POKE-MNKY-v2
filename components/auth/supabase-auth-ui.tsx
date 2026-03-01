"use client"

import { useState, useEffect } from "react"
import { Auth } from "@supabase/auth-ui-react"
import { ThemeSupa } from "@supabase/auth-ui-shared"
import { createBrowserClient } from "@/lib/supabase/client"

export function SupabaseAuthUI() {
  const [supabase, setSupabase] = useState<ReturnType<typeof createBrowserClient> | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    setSupabase(createBrowserClient())
  }, [])

  if (!supabase) return null

  return (
    <Auth
      supabaseClient={supabase}
      appearance={{
        theme: ThemeSupa,
        variables: {
          default: {
            colors: {
              brand: "hsl(var(--primary))",
              brandAccent: "hsl(var(--primary))",
            },
          },
        },
      }}
      providers={["discord"]}
      redirectTo={`${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`}
    />
  )
}
