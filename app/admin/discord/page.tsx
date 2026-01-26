"use client"

import { useState, useEffect, Suspense } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { RefreshCw, Bot, Settings, Webhook } from "lucide-react"
import Link from "next/link"
import { DiscordRolesTab } from "@/components/admin/discord/discord-roles-tab"
import { DiscordBotStatusTab } from "@/components/admin/discord/discord-bot-status-tab"
import { DiscordConfigTab } from "@/components/admin/discord/discord-config-tab"
import { DiscordWebhooksTab } from "@/components/admin/discord/discord-webhooks-tab"

function DiscordManagementContent() {
  const [mounted, setMounted] = useState(false)
  
  // Get initial tab from URL hash or default to "roles"
  const getInitialTab = () => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.slice(1)
      if (hash && ["roles", "bot", "config", "webhooks"].includes(hash)) {
        return hash
      }
    }
    return "roles"
  }

  const [activeTab, setActiveTab] = useState("roles")

  useEffect(() => {
    setMounted(true)
    setActiveTab(getInitialTab())
  }, [])

  // Handle hash changes for navigation
  useEffect(() => {
    if (!mounted) return
    
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      if (hash && ["roles", "bot", "config", "webhooks"].includes(hash)) {
        setActiveTab(hash)
      }
    }

    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [mounted])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    // Update URL hash without scrolling
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${value}`)
    }
  }

  if (!mounted) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discord Management</h1>
          <p className="text-muted-foreground">
            Manage Discord roles, bot settings, configuration, and webhooks
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin">Back to Dashboard</Link>
        </Button>
      </div>

      {/* Unified Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="roles" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            <span>Roles & Sync</span>
          </TabsTrigger>
          <TabsTrigger value="bot" className="gap-2">
            <Bot className="h-4 w-4" />
            <span>Bot Status</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            <span>Configuration</span>
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2">
            <Webhook className="h-4 w-4" />
            <span>Webhooks</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-6">
          <DiscordRolesTab />
        </TabsContent>

        <TabsContent value="bot" className="mt-6">
          <DiscordBotStatusTab />
        </TabsContent>

        <TabsContent value="config" className="mt-6">
          <DiscordConfigTab />
        </TabsContent>

        <TabsContent value="webhooks" className="mt-6">
          <DiscordWebhooksTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function DiscordManagementPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    }>
      <DiscordManagementContent />
    </Suspense>
  )
}
