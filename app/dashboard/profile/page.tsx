"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { openProfileSheet } from "@/components/profile/profile-sheet-trigger"

/**
 * /dashboard/profile redirects to dashboard and opens the ProfileSheet.
 * ProfileSheet is the single place for profile/coach editing.
 */
export default function ProfilePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/dashboard")
    openProfileSheet()
  }, [router])

  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <p className="text-muted-foreground">Opening profile...</p>
    </div>
  )
}
