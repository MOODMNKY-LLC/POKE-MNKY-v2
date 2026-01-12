"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createBrowserClient } from "@/lib/supabase/client"
import { Loader2, Plus, Trash2, TestTube, ExternalLink, Webhook } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export default function DiscordWebhooksPage() {
  const [webhooks, setWebhooks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newWebhook, setNewWebhook] = useState({ name: "", webhook_url: "", enabled: true })
  const supabase = createBrowserClient()

  useEffect(() => {
    loadWebhooks()
  }, [])

  async function loadWebhooks() {
    setLoading(true)
    try {
      const { data, error } = await supabase.from("discord_webhooks").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setWebhooks(data || [])
    } catch (error: any) {
      toast.error("Failed to load webhooks: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function createWebhook() {
    if (!newWebhook.name || !newWebhook.webhook_url) {
      toast.error("Name and URL are required")
      return
    }

    try {
      const { error } = await supabase.from("discord_webhooks").insert(newWebhook)

      if (error) throw error
      toast.success("Webhook created")
      setNewWebhook({ name: "", webhook_url: "", enabled: true })
      setDialogOpen(false)
      loadWebhooks()
    } catch (error: any) {
      toast.error("Failed to create webhook: " + error.message)
    }
  }

  async function deleteWebhook(id: string) {
    if (!confirm("Are you sure you want to delete this webhook?")) return

    try {
      const { error } = await supabase.from("discord_webhooks").delete().eq("id", id)

      if (error) throw error
      toast.success("Webhook deleted")
      loadWebhooks()
    } catch (error: any) {
      toast.error("Failed to delete webhook: " + error.message)
    }
  }

  async function toggleWebhook(id: string, currentEnabled: boolean) {
    try {
      const { error } = await supabase.from("discord_webhooks").update({ enabled: !currentEnabled }).eq("id", id)

      if (error) throw error
      toast.success(`Webhook ${!currentEnabled ? "enabled" : "disabled"}`)
      loadWebhooks()
    } catch (error: any) {
      toast.error("Failed to update webhook: " + error.message)
    }
  }

  async function testWebhook(webhookUrl: string, id: string) {
    setTesting(id)
    try {
      const response = await fetch("/api/discord/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhook_url: webhookUrl }),
      })

      if (!response.ok) throw new Error("Webhook test failed")
      const data = await response.json()
      toast.success(data.message || "Webhook test successful")
    } catch (error: any) {
      toast.error("Webhook test failed: " + error.message)
    } finally {
      setTesting(null)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Discord Webhooks</h1>
          <p className="text-muted-foreground">Manage Discord webhook notifications</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Webhook</DialogTitle>
              <DialogDescription>Add a new Discord webhook for notifications</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook Name</Label>
                <Input
                  placeholder="e.g., Match Results"
                  value={newWebhook.name}
                  onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input
                  placeholder="https://discord.com/api/webhooks/..."
                  value={newWebhook.webhook_url}
                  onChange={(e) => setNewWebhook({ ...newWebhook, webhook_url: e.target.value })}
                  type="url"
                />
                <p className="text-xs text-muted-foreground">
                  Get webhook URL from Discord Server Settings → Integrations → Webhooks
                </p>
              </div>
              <Button onClick={createWebhook} className="w-full">
                Create Webhook
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhooks ({webhooks.length})
          </CardTitle>
          <CardDescription>Configure webhooks for match results, trades, and announcements</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No webhooks configured</p>
              <p className="text-sm mt-2">Add a webhook to send notifications to Discord channels</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.map((webhook) => (
                    <TableRow key={webhook.id}>
                      <TableCell className="font-medium">{webhook.name}</TableCell>
                      <TableCell>
                        <code className="text-xs text-muted-foreground truncate max-w-xs block">
                          {webhook.webhook_url.slice(0, 50)}...
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={webhook.enabled ? "default" : "secondary"}>
                          {webhook.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {webhook.created_at ? new Date(webhook.created_at).toLocaleDateString() : "Unknown"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => testWebhook(webhook.webhook_url, webhook.id)}
                            disabled={testing === webhook.id}
                          >
                            {testing === webhook.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <TestTube className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleWebhook(webhook.id, webhook.enabled)}
                          >
                            {webhook.enabled ? "Disable" : "Enable"}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteWebhook(webhook.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook Events</CardTitle>
          <CardDescription>Webhooks are triggered for these events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between p-2 border rounded">
              <span>Match Results</span>
              <Badge variant="outline">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-2 border rounded">
              <span>Trade Proposals</span>
              <Badge variant="outline">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-2 border rounded">
              <span>League Announcements</span>
              <Badge variant="outline">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-2 border rounded">
              <span>Weekly Recaps</span>
              <Badge variant="outline">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href="/admin/discord/config">Back to Config</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin">Back to Admin</Link>
        </Button>
      </div>
    </div>
  )
}
