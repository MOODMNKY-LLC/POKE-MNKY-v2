"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatabaseTab } from "./database-tab"
import { AuthTab } from "./auth-tab"
import { StorageTab } from "./storage-tab"
import { SecretsTab } from "./secrets-tab"
import { LogsTab } from "./logs-tab"
import { UsersTab } from "./users-tab"

interface SupabaseManagerProps {
  projectRef: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SupabaseManager({ projectRef, open, onOpenChange }: SupabaseManagerProps) {
  const [activeTab, setActiveTab] = useState("database")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Supabase Manager - {projectRef}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="database">Database</TabsTrigger>
            <TabsTrigger value="auth">Auth</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="secrets">Secrets</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <div className="mt-4 max-h-[calc(90vh-200px)] overflow-y-auto">
            <TabsContent value="database">
              <DatabaseTab projectRef={projectRef} />
            </TabsContent>

            <TabsContent value="auth">
              <AuthTab projectRef={projectRef} />
            </TabsContent>

            <TabsContent value="storage">
              <StorageTab projectRef={projectRef} />
            </TabsContent>

            <TabsContent value="users">
              <UsersTab projectRef={projectRef} />
            </TabsContent>

            <TabsContent value="secrets">
              <SecretsTab projectRef={projectRef} />
            </TabsContent>

            <TabsContent value="logs">
              <LogsTab projectRef={projectRef} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
