"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Workflow, CheckCircle2, XCircle, ExternalLink, Loader2, Play } from "lucide-react"

interface N8nWorkflow {
  id: string
  name: string
  active: boolean
  updatedAt?: string
}

interface N8nExecution {
  id: string
  status: string
  startedAt: string
  stoppedAt?: string
}

export function N8nStatus() {
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([])
  const [executions, setExecutions] = useState<N8nExecution[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadWorkflows()
  }, [])

  async function loadWorkflows() {
    try {
      // Try to list workflows (if n8n API supports it)
      // For now, we'll show a placeholder since we need to know workflow IDs
      setWorkflows([])
    } catch (error: any) {
      console.error("Error loading n8n workflows:", error)
    } finally {
      setLoading(false)
    }
  }

  async function createWorkflow() {
    try {
      const response = await fetch("/api/admin/n8n/create-workflow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create workflow")
      }

      toast({
        title: "Success",
        description: `Workflow created: ${data.workflow_id}. Activate it in n8n dashboard.`,
      })

      loadWorkflows()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create workflow",
        variant: "destructive",
      })
    }
  }

  // n8n URL is server-side only, use hardcoded or fetch from API
  const n8nUrl = "https://aab-n8n.moodmnky.com"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Workflow className="h-5 w-5" />
          n8n Workflow Status
        </CardTitle>
        <CardDescription>
          Notion sync workflow automation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <>
            {workflows.length === 0 ? (
              <Alert>
                <AlertDescription className="text-xs">
                  No workflows found. Create one to enable automated Notion sync.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="flex items-center justify-between border rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={workflow.active ? "default" : "secondary"}>
                        {workflow.active ? (
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                        ) : (
                          <XCircle className="mr-1 h-3 w-3" />
                        )}
                        {workflow.active ? "Active" : "Inactive"}
                      </Badge>
                      <span className="text-sm font-medium">{workflow.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={createWorkflow}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Play className="mr-2 h-4 w-4" />
                Create Workflow
              </Button>
              <Button
                onClick={loadWorkflows}
                variant="ghost"
                size="sm"
              >
                Refresh
              </Button>
            </div>

            <div className="pt-2 border-t text-xs text-muted-foreground">
              <div className="flex items-center gap-2 mb-1">
                <ExternalLink className="h-3 w-3" />
                <a
                  href={n8nUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Open n8n Dashboard
                </a>
              </div>
              <p className="mt-1">
                Workflows are created programmatically but must be activated in the n8n dashboard.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
