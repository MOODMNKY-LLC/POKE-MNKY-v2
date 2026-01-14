/**
 * Hook to check if current user is an admin
 */

"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { isAdmin } from "@/lib/rbac"

export function useAdmin() {
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    async function checkAdmin() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const admin = await isAdmin(supabase, user.id)
          setIsUserAdmin(admin)
        } else {
          setIsUserAdmin(false)
        }
      } catch (error) {
        console.error("Error checking admin status:", error)
        setIsUserAdmin(false)
      } finally {
        setLoading(false)
      }
    }

    checkAdmin()
  }, [supabase])

  return { isAdmin: isUserAdmin, loading }
}
