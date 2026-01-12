"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Lock, CheckCircle2, AlertCircle } from "lucide-react"

export function SecretsTab({ projectRef }: { projectRef: string }) {
  // List of expected environment variables (read-only display)
  const expectedSecrets = [
    {
      name: "NEXT_PUBLIC_SUPABASE_URL",
      description: "Supabase project URL",
      required: true,
      status: !!process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "missing",
    },
    {
      name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      description: "Supabase anonymous key",
      required: true,
      status: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "missing",
    },
    {
      name: "SUPABASE_SERVICE_ROLE_KEY",
      description: "Supabase service role key (server-only)",
      required: true,
      status: "hidden", // Never show actual value
    },
    {
      name: "DISCORD_BOT_TOKEN",
      description: "Discord bot token",
      required: true,
      status: !!process.env.DISCORD_BOT_TOKEN ? "set" : "missing",
    },
    {
      name: "DISCORD_CLIENT_ID",
      description: "Discord OAuth client ID",
      required: true,
      status: !!process.env.DISCORD_CLIENT_ID ? "set" : "missing",
    },
    {
      name: "DISCORD_CLIENT_SECRET",
      description: "Discord OAuth client secret",
      required: true,
      status: !!process.env.DISCORD_CLIENT_SECRET ? "set" : "missing",
    },
    {
      name: "OPENAI_API_KEY",
      description: "OpenAI API key for AI features",
      required: true,
      status: !!process.env.OPENAI_API_KEY ? "set" : "missing",
    },
    {
      name: "GOOGLE_SHEETS_ID",
      description: "Google Sheets ID for sync",
      required: false,
      status: !!process.env.GOOGLE_SHEETS_ID ? "set" : "optional",
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
                  {getStatusBadge(secret.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
          <CardDescription>Check if integrations are properly configured</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
              <span className="text-sm font-medium">Supabase</span>
            </div>
            <Badge variant={process.env.NEXT_PUBLIC_SUPABASE_URL ? "default" : "destructive"}>
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? "Connected" : "Not Configured"}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {process.env.DISCORD_BOT_TOKEN ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
              <span className="text-sm font-medium">Discord Bot</span>
            </div>
            <Badge variant={process.env.DISCORD_BOT_TOKEN ? "default" : "destructive"}>
              {process.env.DISCORD_BOT_TOKEN ? "Configured" : "Not Configured"}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {process.env.OPENAI_API_KEY ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
              <span className="text-sm font-medium">OpenAI</span>
            </div>
            <Badge variant={process.env.OPENAI_API_KEY ? "default" : "destructive"}>
              {process.env.OPENAI_API_KEY ? "Configured" : "Not Configured"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Secrets</CardTitle>
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
