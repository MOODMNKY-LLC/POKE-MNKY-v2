"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const DISCORD_OAUTH_URL = "https://discord.com/api/oauth2/authorize"
const SCOPES = ["identify", "role_connections.write"]

export default function VerifyUserPage() {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
  const redirectUri =
    typeof window !== "undefined"
      ? `${window.location.origin}/verify-user/callback`
      : ""

  useEffect(() => {
    if (!clientId || !redirectUri) return
    // Optional: auto-redirect if coming from Discord server role link
    const params = new URLSearchParams(window.location.search)
    if (params.get("redirect") === "discord") {
      const url = `${DISCORD_OAUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(SCOPES.join(" "))}`
      window.location.href = url
    }
  }, [clientId, redirectUri])

  const handleConnect = () => {
    if (!clientId || !redirectUri) {
      alert("Discord app is not configured. Set NEXT_PUBLIC_DISCORD_CLIENT_ID.")
      return
    }
    const url = `${DISCORD_OAUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(SCOPES.join(" "))}`
    window.location.href = url
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Verify with Discord</CardTitle>
          <CardDescription>
            Connect your Discord account to verify your identity for server roles (Linked Roles).
            You will be redirected to Discord to authorize, then returned here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {clientId ? (
            <Button onClick={handleConnect} className="w-full">
              Connect with Discord
            </Button>
          ) : (
            <p className="text-muted-foreground text-sm">
              Discord Client ID is not configured. Add NEXT_PUBLIC_DISCORD_CLIENT_ID to enable
              Linked Roles verification.
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            This uses Discord OAuth2 with the identify and role_connections.write scopes. Your
            verification status is stored by Discord and can be used by server admins for role
            requirements.
          </p>
          <Link href="/" className="block text-center text-primary text-sm underline underline-offset-4">
            Back to home
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
