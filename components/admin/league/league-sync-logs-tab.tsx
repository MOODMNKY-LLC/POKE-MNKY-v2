"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  FileText,
  Download,
  Filter,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { AdminStatCard } from "@/components/admin/admin-stat-card"

interface SyncLog {
  id: string
  sync_type: string
  status: string
  records_processed: number
  error_message: string | null
  synced_at: string
}

interface SyncLogsResponse {
  logs: SyncLog[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
  statistics: {
    totalSyncs: number
    successCount: number
    errorCount: number
    successRate: number
    lastSyncAt: string | null
    syncTypeCounts: Record<string, number>
  }
}

export function LeagueSyncLogsTab() {
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [statistics, setStatistics] = useState<SyncLogsResponse["statistics"] | null>(null)
  const [selectedLog, setSelectedLog] = useState<SyncLog | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Filters
  const [syncTypeFilter, setSyncTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (syncTypeFilter !== "all") params.append("sync_type", syncTypeFilter)
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (startDate) params.append("start_date", startDate)
      if (endDate) params.append("end_date", endDate)
      params.append("limit", "100")

      const response = await fetch(`/api/admin/sync-logs?${params.toString()}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to fetch sync logs")
      }

      const data: SyncLogsResponse = await response.json()
      setLogs(data.logs)
      setStatistics(data.statistics)
    } catch (error: any) {
      console.error("Error loading sync logs:", error)
      toast.error(error.message || "Failed to load sync logs")
    } finally {
      setLoading(false)
    }
  }, [syncTypeFilter, statusFilter, startDate, endDate])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Success
          </Badge>
        )
      case "error":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        )
      case "partial":
        return (
          <Badge variant="secondary">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Partial
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleViewDetails = (log: SyncLog) => {
    setSelectedLog(log)
    setIsDialogOpen(true)
  }

  const handleExport = () => {
    // Simple CSV export
    const headers = ["ID", "Sync Type", "Status", "Records Processed", "Error Message", "Synced At"]
    const rows = logs.map((log) => [
      log.id,
      log.sync_type,
      log.status,
      log.records_processed.toString(),
      log.error_message || "",
      log.synced_at,
    ])

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `sync-logs-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast.success("Sync logs exported successfully")
  }

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {statistics && (
        <div className="grid gap-4 md:grid-cols-4">
          <AdminStatCard
            icon={RefreshCw}
            value={statistics.totalSyncs}
            label="Total Syncs"
            color="primary"
          />
          <AdminStatCard
            icon={CheckCircle2}
            value={`${statistics.successRate.toFixed(1)}%`}
            label="Success Rate"
            color="chart-2"
          />
          <AdminStatCard
            icon={CheckCircle2}
            value={statistics.successCount}
            label="Successful"
            color="chart-3"
          />
          <AdminStatCard
            icon={XCircle}
            value={statistics.errorCount}
            label="Errors"
            color="accent"
          />
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="sync-type">Sync Type</Label>
              <Select value={syncTypeFilter} onValueChange={setSyncTypeFilter}>
                <SelectTrigger id="sync-type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="google_sheets">Google Sheets</SelectItem>
                  <SelectItem value="pokepedia">Poképedia</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={loadLogs} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Sync Logs
          </CardTitle>
          <CardDescription>
            {statistics && `Showing ${logs.length} of ${statistics.totalSyncs} total sync operations`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>No sync logs found matching your filters.</AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sync Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Synced At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.sync_type}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>{log.records_processed}</TableCell>
                      <TableCell>
                        {format(new Date(log.synced_at), "MMM d, yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(log)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sync Log Details</DialogTitle>
            <DialogDescription>
              Detailed information about this sync operation
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <span className="font-medium">Sync Type:</span>
                  <Badge variant="outline">{selectedLog.sync_type}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Status:</span>
                  {getStatusBadge(selectedLog.status)}
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Records Processed:</span>
                  <span>{selectedLog.records_processed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Synced At:</span>
                  <span>{format(new Date(selectedLog.synced_at), "PPpp")}</span>
                </div>
              </div>
              {selectedLog.error_message && (
                <div className="space-y-2">
                  <Label>Error Message</Label>
                  <Alert variant="destructive">
                    <AlertDescription className="whitespace-pre-wrap">
                      {selectedLog.error_message}
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
