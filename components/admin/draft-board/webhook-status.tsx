"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Webhook, CheckCircle2, XCircle, ExternalLink, Loader2 } from "lucide-react"

interface WebhookSubscription {
  id: string
  subscription_id: string
  database_id: string
  webhook_url: string
  events: string[]
  created_at: string
  active: boolean
}

export function WebhookStatus() {
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createBrowserClient()

  useEffect(() => {
    loadSubscriptions()
  }, [])

  async function loadSubscriptions() {
    try {
      const response = await fetch("/api/admin/notion/webhook-subscription")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to load webhook subscriptions")
      }

      setSubscriptions(data.subscriptions || [])
    } catch (error: any) {
      console.error("Error loading webhook subscriptions:", error)
      toast({
        title: "Error",
        description: "Failed to load webhook status",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function createSubscription() {
    try {
      const response = await fetch("/api/admin/notion/webhook-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          use_n8n: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.alternative) {
          // Notion API not available - show instructions
          toast({
            title: "Manual Setup Required",
            description: "Notion webhooks must be created via integration settings. See documentation.",
            variant: "default",
          })
          return
        }
        throw new Error(data.error || "Failed to create subscription")
      }

      toast({
        title: "Success",
        description: "Webhook subscription created",
      })

      loadSubscriptions()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create subscription",
        variant: "destructive",
      })
    }
  }

  async function deleteSubscription(subscriptionId: string) {
    try {
      const response = await fetch(
        `/api/admin/notion/webhook-subscription?subscription_id=${subscriptionId}`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete subscription")
      }

      toast({
        title: "Success",
        description: "Webhook subscription deleted",
      })

      loadSubscriptions()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete subscription",
        variant: "destructive",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          Webhook Status
        </CardTitle>
        <CardDescription>
          Notion webhook subscriptions for Draft Board
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <>
            {subscriptions.length === 0 ? (
              <Alert>
                <AlertDescription className="text-xs">
                  No webhook subscriptions found. Create one to enable real-time sync.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={sub.active ? "default" : "secondary"}>
                          {sub.active ? (
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                          ) : (
                            <XCircle className="mr-1 h-3 w-3" />
                          )}
                          {sub.active ? "Active" : "Inactive"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(sub.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSubscription(sub.subscription_id)}
                      >
                        Delete
                      </Button>
                    </div>
                    <div className="text-xs space-y-1">
                      <div>
                        <span className="font-medium">URL:</span>{" "}
                        <code className="text-xs bg-muted px-1 rounded">
                          {sub.webhook_url.substring(0, 50)}...
                        </code>
                      </div>
                      <div>
                        <span className="font-medium">Events:</span>{" "}
                        {sub.events.join(", ")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={createSubscription}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Create Subscription
              </Button>
              <Button
                onClick={loadSubscriptions}
                variant="ghost"
                size="sm"
              >
                Refresh
              </Button>
            </div>

            <div className="pt-2 border-t text-xs text-muted-foreground">
              <div className="flex items-center gap-2 mb-1">
                <ExternalLink className="h-3 w-3" />
                <span>Setup Instructions:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Go to{" "}
                  <a
                    href="https://www.notion.so/profile/integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Notion Integration Settings
                  </a>
                </li>
                <li>Select your integration → Webhooks tab</li>
                <li>Create subscription with webhook URL above</li>
                <li>Verify subscription with verification token</li>
              </ol>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
