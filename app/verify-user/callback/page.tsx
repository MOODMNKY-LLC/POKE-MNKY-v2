"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function VerifyUserCallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState<string>("")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")
    const errorParam = params.get("error")

    if (errorParam) {
      setStatus("error")
      setMessage(params.get("error_description") || errorParam || "Authorization was denied or failed.")
      return
    }

    if (!code) {
      setStatus("error")
      setMessage("No authorization code received from Discord.")
      return
    }

    // Exchange code for token and update role connection server-side
    fetch("/api/discord/verify-role-connection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setStatus("error")
          setMessage(data.error || data.message || `Request failed (${res.status})`)
          return
        }
        setStatus("success")
        setMessage(data.message || "Your Discord account is now connected for role verification.")
      })
      .catch(() => {
        setStatus("error")
        setMessage("Failed to complete verification.")
      })
  }, [])

  return (
    <div className="container mx-auto max-w-md px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>
            {status === "loading" && "Verifying…"}
            {status === "success" && "Connected"}
            {status === "error" && "Verification failed"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Completing Discord verification…"}
            {status === "success" && "You can close this tab and return to Discord."}
            {status === "error" && message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "success" && <p className="text-sm text-muted-foreground">{message}</p>}
          <Link href="/verify-user" className="block text-center text-primary text-sm underline underline-offset-4">
            Verify again
          </Link>
          <Link href="/" className="block text-center text-primary text-sm underline underline-offset-4">
            Back to home
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
