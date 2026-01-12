"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createBrowserClient } from "@/lib/supabase/client"
import { Loader2, CheckCircle2, XCircle, ExternalLink, Bot, Key, Settings } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export default function DiscordConfigPage() {
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [botStatus, setBotStatus] = useState<"online" | "offline" | "unknown">("unknown")
  const supabase = createBrowserClient()

  // Read-only display of Discord config (from env vars)
  const discordConfig = {
    botToken: process.env.NEXT_PUBLIC_DISCORD_BOT_TOKEN
      ? "••••••••••••••••" + process.env.NEXT_PUBLIC_DISCORD_BOT_TOKEN.slice(-4)
      : "Not set",
    clientId: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "Not set",
    clientSecret: process.env.NEXT_PUBLIC_DISCORD_CLIENT_SECRET
      ? "••••••••••••••••"
      : "Not set",
    guildId: process.env.NEXT_PUBLIC_DISCORD_GUILD_ID || "Not set",
    publicKey: process.env.NEXT_PUBLIC_DISCORD_PUBLIC_KEY || "Not set",
  }

  const checkBotStatus = async () => {
    setTesting(true)
    try {
      // Try to ping bot via API
      const response = await fetch("/api/discord/bot-status")
      if (response.ok) {
        const data = await response.json()
        setBotStatus(data.online ? "online" : "offline")
        toast.success(data.online ? "Bot is online" : "Bot is offline")
      } else {
        setBotStatus("offline")
        toast.error("Bot is offline or not responding")
      }
    } catch (error) {
      setBotStatus("offline")
      toast.error("Failed to check bot status")
    } finally {
      setTesting(false)
    }
  }

  useEffect(() => {
    checkBotStatus()
  }, [])

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Discord Configuration</h1>
        <p className="text-muted-foreground">Manage Discord bot and OAuth settings</p>
      </div>

      <Tabs defaultValue="bot" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bot">
            <Bot className="h-4 w-4 mr-2" />
            Bot Settings
          </TabsTrigger>
          <TabsTrigger value="oauth">
            <Key className="h-4 w-4 mr-2" />
            OAuth Settings
          </TabsTrigger>
          <TabsTrigger value="test">
            <Settings className="h-4 w-4 mr-2" />
            Test Connection
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bot" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bot Configuration</CardTitle>
              <CardDescription>Discord bot token and connection settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Bot Token</Label>
                <div className="flex items-center gap-2">
                  <Input value={discordConfig.botToken} readOnly className="font-mono" />
                  <Badge variant={discordConfig.botToken !== "Not set" ? "default" : "destructive"}>
                    {discordConfig.botToken !== "Not set" ? "Set" : "Missing"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Bot token is stored securely in environment variables. Update in Vercel Dashboard.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Guild ID (Server ID)</Label>
                <div className="flex items-center gap-2">
                  <Input value={discordConfig.guildId} readOnly className="font-mono" />
                  <Badge variant={discordConfig.guildId !== "Not set" ? "default" : "destructive"}>
                    {discordConfig.guildId !== "Not set" ? "Set" : "Missing"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Public Key</Label>
                <div className="flex items-center gap-2">
                  <Input value={discordConfig.publicKey} readOnly className="font-mono" />
                  <Badge variant={discordConfig.publicKey !== "Not set" ? "default" : "destructive"}>
                    {discordConfig.publicKey !== "Not set" ? "Set" : "Missing"}
                  </Badge>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button variant="outline" asChild>
                  <a
                    href="https://discord.com/developers/applications"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Discord Developer Portal
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bot Status</CardTitle>
              <CardDescription>Current bot connection status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {botStatus === "online" ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  ) : botStatus === "offline" ? (
                    <XCircle className="h-6 w-6 text-red-500" />
                  ) : (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-semibold">
                      Bot Status: <span className="capitalize">{botStatus}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {botStatus === "online"
                        ? "Bot is connected and responding to commands"
                        : botStatus === "offline"
                          ? "Bot is offline or not responding"
                          : "Checking status..."}
                    </p>
                  </div>
                </div>
                <Button onClick={checkBotStatus} disabled={testing} variant="outline">
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="oauth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>OAuth Configuration</CardTitle>
              <CardDescription>Discord OAuth client credentials for user authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Client ID</Label>
                <div className="flex items-center gap-2">
                  <Input value={discordConfig.clientId} readOnly className="font-mono" />
                  <Badge variant={discordConfig.clientId !== "Not set" ? "default" : "destructive"}>
                    {discordConfig.clientId !== "Not set" ? "Set" : "Missing"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Client Secret</Label>
                <div className="flex items-center gap-2">
                  <Input value={discordConfig.clientSecret} readOnly className="font-mono" />
                  <Badge variant={discordConfig.clientSecret !== "••••••••••••••••" ? "default" : "destructive"}>
                    {discordConfig.clientSecret !== "••••••••••••••••" ? "Set" : "Missing"}
                  </Badge>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg space-y-2">
                <Label className="text-sm font-semibold">Required Redirect URLs</Label>
                <div className="space-y-1 text-sm">
                  <p className="font-mono break-all">
                    {process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "")?.split(".")[0] &&
                      `https://${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "")?.split(".")[0]}.supabase.co/auth/v1/callback`}
                  </p>
                  <p className="font-mono break-all">
                    {typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : "/auth/callback"}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Add these URLs to your Discord OAuth2 application redirect URIs
                </p>
              </div>

              <div className="pt-4 border-t space-y-2">
                <Button variant="outline" asChild className="w-full">
                  <a
                    href="https://discord.com/developers/applications"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Configure in Discord Developer Portal
                  </a>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <a
                    href={`https://supabase.com/dashboard/project/${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "")?.split(".")[0]}/auth/providers`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Configure in Supabase Dashboard
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connection Testing</CardTitle>
              <CardDescription>Test Discord bot and OAuth connections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">Bot Connection</p>
                    <p className="text-sm text-muted-foreground">Test if bot is online and responding</p>
                  </div>
                  <Button onClick={checkBotStatus} disabled={testing} variant="outline">
                    {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test Bot"}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">OAuth Flow</p>
                    <p className="text-sm text-muted-foreground">Test Discord OAuth login</p>
                  </div>
                  <Button asChild variant="outline">
                    <Link href="/auth/login">Test OAuth</Link>
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-semibold mb-2">Testing Checklist</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Bot appears online in Discord server</li>
                  <li>Slash commands are registered and working</li>
                  <li>OAuth redirect URLs are configured correctly</li>
                  <li>Users can log in with Discord</li>
                  <li>Role sync works after login</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href="/admin">Back to Admin</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/discord/roles">Role Sync</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/discord/webhooks">Webhooks</Link>
        </Button>
      </div>
    </div>
  )
}
