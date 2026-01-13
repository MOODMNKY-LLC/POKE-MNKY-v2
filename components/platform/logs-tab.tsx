"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Loader2, RefreshCw, Search, AlertCircle, CheckCircle2, Info } from "lucide-react"
import { toast } from "sonner"

type LogService = "api" | "postgres" | "auth" | "storage" | "realtime" | "edge-function"

export function LogsTab({ projectRef }: { projectRef: string }) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [service, setService] = useState<LogService>("api")
  const [searchQuery, setSearchQuery] = useState("")
  const [autoRefresh, setAutoRefresh] = useState(false)

  useEffect(() => {
    loadLogs()
  }, [service])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadLogs()
    }, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, service])

  async function loadLogs() {
    setLoading(true)
    try {
      // Ensure we have a valid projectRef
      let ref = projectRef
      if (!ref || ref === "default") {
        // Extract from URL if not provided
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
        ref = supabaseUrl.split("//")[1]?.split(".")[0] || ""
      }

      if (!ref) {
        throw new Error("Project reference not found. Check NEXT_PUBLIC_SUPABASE_URL.")
      }

      const response = await fetch(`/api/supabase-proxy/v1/projects/${ref}/logs?service=${service}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `Failed to fetch logs: ${response.status}`)
      }

      const data = await response.json()
      // Logs come in reverse chronological order
      setLogs((data.result || []).slice(0, 100)) // Limit to 100 most recent
    } catch (error: any) {
      console.error("Failed to load logs:", error)
      toast.error("Failed to load logs: " + (error.message || "Unknown error"))
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    } else if (statusCode >= 400 && statusCode < 500) {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />
    } else if (statusCode >= 500) {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    }
    return <Info className="h-4 w-4 text-muted-foreground" />
  }

  const getStatusBadge = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) {
      return <Badge variant="default" className="bg-green-500/10 text-green-400 border-green-500/20">{statusCode}</Badge>
    } else if (statusCode >= 400 && statusCode < 500) {
      return <Badge variant="destructive">{statusCode}</Badge>
    } else if (statusCode >= 500) {
      return <Badge variant="destructive">{statusCode}</Badge>
    }
    return <Badge variant="outline">{statusCode}</Badge>
  }

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      log.event_message?.toLowerCase().includes(query) ||
      log.path?.toLowerCase().includes(query) ||
      log.method?.toLowerCase().includes(query) ||
      log.status_code?.toString().includes(query)
    )
  })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>Monitor API requests, database queries, and system activity</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
                Auto-refresh
              </Button>
              <Button onClick={loadLogs} variant="outline" size="sm" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={service} onValueChange={(v: LogService) => setService(v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="postgres">PostgreSQL</SelectItem>
                <SelectItem value="auth">Authentication</SelectItem>
                <SelectItem value="storage">Storage</SelectItem>
                <SelectItem value="realtime">Realtime</SelectItem>
                <SelectItem value="edge-function">Edge Functions</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchQuery ? "No logs found matching your search" : "No logs available"}</p>
            </div>
          ) : (
            <div className="rounded-md border max-h-[600px] overflow-y-auto">
              <div className="divide-y">
                {filteredLogs.map((log, idx) => (
                  <div key={log.id || idx} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {log.status_code && getStatusIcon(log.status_code)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {log.method && (
                              <Badge variant="outline" className="font-mono text-xs">
                                {log.method}
                              </Badge>
                            )}
                            {log.status_code && getStatusBadge(log.status_code)}
                            {log.path && (
                              <code className="text-xs text-muted-foreground truncate max-w-md">{log.path}</code>
                            )}
                          </div>
                          {log.event_message && (
                            <p className="text-sm text-muted-foreground break-words">{log.event_message}</p>
                          )}
                          {log.timestamp && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(log.timestamp / 1000).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log Management</CardTitle>
          <CardDescription>Advanced log viewing and export</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            For detailed log analysis, filtering, and export, use the Supabase Dashboard.
          </p>
          <Button variant="outline" asChild>
            <a
              href={`https://supabase.com/dashboard/project/${projectRef}/logs/explorer`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Logs Explorer
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
