"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function DiscordWebhooksRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace("/admin/discord#webhooks")
  }, [router])
  
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}
