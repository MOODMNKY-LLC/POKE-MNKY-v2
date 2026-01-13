"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Lock, CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react"

export function SecretsTab({ projectRef }: { projectRef: string }) {
  const [secrets, setSecrets] = useState<Record<string, boolean>>({})
  const [integrations, setIntegrations] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSecrets()
  }, [])

  async function loadSecrets() {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/health-check")
      if (response.ok) {
        const data = await response.json()
        setSecrets(data.secrets || {})
        setIntegrations(data.integrations || {})
      }
    } catch (error) {
      console.error("Failed to load secrets:", error)
    } finally {
      setLoading(false)
    }
  }

  // List of expected environment variables (read-only display)
  const expectedSecrets = [
    {
      name: "NEXT_PUBLIC_SUPABASE_URL",
      description: "Supabase project URL",
      required: true,
      getStatus: () => secrets.NEXT_PUBLIC_SUPABASE_URL ? "set" : "missing",
    },
    {
      name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      description: "Supabase anonymous key",
      required: true,
      getStatus: () => secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "missing",
    },
    {
      name: "SUPABASE_SERVICE_ROLE_KEY",
      description: "Supabase service role key (server-only)",
      required: true,
      getStatus: () => secrets.SUPABASE_SERVICE_ROLE_KEY ? "hidden" : "missing",
    },
    {
      name: "SUPABASE_MANAGEMENT_API_TOKEN",
      description: "Supabase Management API token",
      required: true,
      getStatus: () => secrets.SUPABASE_MANAGEMENT_API_TOKEN ? "hidden" : "missing",
    },
    {
      name: "DISCORD_BOT_TOKEN",
      description: "Discord bot token",
      required: true,
      getStatus: () => secrets.DISCORD_BOT_TOKEN ? "hidden" : "missing",
    },
    {
      name: "DISCORD_CLIENT_ID",
      description: "Discord OAuth client ID",
      required: true,
      getStatus: () => secrets.DISCORD_CLIENT_ID || secrets.NEXT_PUBLIC_DISCORD_CLIENT_ID ? "set" : "missing",
    },
    {
      name: "DISCORD_CLIENT_SECRET",
      description: "Discord OAuth client secret",
      required: true,
      getStatus: () => secrets.DISCORD_CLIENT_SECRET ? "hidden" : "missing",
    },
    {
      name: "OPENAI_API_KEY",
      description: "OpenAI API key for AI features",
      required: true,
      getStatus: () => secrets.OPENAI_API_KEY ? "hidden" : "missing",
    },
    {
      name: "GOOGLE_SHEETS_ID",
      description: "Google Sheets ID for sync",
      required: false,
      getStatus: () => secrets.GOOGLE_SHEETS_ID ? "set" : "optional",
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "set":
        return <Badge variant="default" className="bg-green-500/10 text-green-400 border-green-500/20">Set</Badge>
      case "hidden":
        return <Badge variant="secondary">Hidden</Badge>
      case "missing":
        return <Badge variant="destructive">Missing</Badge>
      default:
        return <Badge variant="outline">Optional</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Environment Variables
          </CardTitle>
          <CardDescription>
            View environment variable status. Values are hidden for security. Manage secrets in Vercel or Supabase
            Dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {expectedSecrets.map((secret) => (
                <div
                  key={secret.name}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{secret.name}</code>
                      {secret.required && (
                        <Badge variant="outline" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{secret.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(secret.getStatus())}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Integration Status</CardTitle>
              <CardDescription>Check if integrations are properly configured</CardDescription>
            </div>
            <Button onClick={loadSecrets} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {integrations.supabase ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  )}
                  <span className="text-sm font-medium">Supabase</span>
                </div>
                <Badge variant={integrations.supabase ? "default" : "destructive"}>
                  {integrations.supabase ? "Connected" : "Not Configured"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {integrations.discordBot ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  )}
                  <span className="text-sm font-medium">Discord Bot</span>
                </div>
                <Badge variant={integrations.discordBot ? "default" : "destructive"}>
                  {integrations.discordBot ? "Configured" : "Not Configured"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {integrations.discordOAuth ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  )}
                  <span className="text-sm font-medium">Discord OAuth</span>
                </div>
                <Badge variant={integrations.discordOAuth ? "default" : "destructive"}>
                  {integrations.discordOAuth ? "Configured" : "Not Configured"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {integrations.openai ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  )}
                  <span className="text-sm font-medium">OpenAI</span>
                </div>
                <Badge variant={integrations.openai ? "default" : "destructive"}>
                  {integrations.openai ? "Configured" : "Not Configured"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {integrations.managementApi ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  )}
                  <span className="text-sm font-medium">Management API</span>
                </div>
                <Badge variant={integrations.managementApi ? "default" : "destructive"}>
                  {integrations.managementApi ? "Configured" : "Not Configured"}
                </Badge>
              </div>
            </>
          )}
          <CardDescription>Secrets must be managed through your deployment platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full" asChild>
            <a
              href={`https://supabase.com/dashboard/project/${projectRef}/settings/api`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Supabase API Settings
            </a>
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            For Vercel deployments, manage environment variables in Vercel Dashboard → Project Settings → Environment
            Variables
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
