"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Upload,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  Database,
  AlertTriangle,
  FileJson,
  ArrowRight,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type {
  ImportResult,
  ServerAgentDraftPool,
  SyncResult,
} from "@/lib/draft-pool/types"

interface Season {
  id: string
  name: string
  is_current: boolean
}

interface StagingStats {
  total: number
  available: number
  banned: number
  teraBanned: number
  drafted: number
}

export function DraftPoolImport() {
  const [importLoading, setImportLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("")
  const [dryRun, setDryRun] = useState(false)
  const [stagingStats, setStagingStats] = useState<StagingStats | null>(null)
  const [showSyncConfirm, setShowSyncConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Fetch seasons list
  useEffect(() => {
    async function fetchSeasons() {
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from("seasons")
        .select("id, name, is_current")
        .order("created_at", { ascending: false })

      if (!error && data) {
        setSeasons(data)
        // Auto-select current season if available
        const currentSeason = data.find((s) => s.is_current)
        if (currentSeason) {
          setSelectedSeasonId(currentSeason.id)
        } else if (data.length > 0) {
          setSelectedSeasonId(data[0].id)
        }
      }
    }

    fetchSeasons()
    fetchStagingStats()
  }, [])

  // Fetch staging table statistics
  async function fetchStagingStats() {
    try {
      const response = await fetch("/api/admin/draft-pool/stats", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok && data.success && data.stats) {
        setStagingStats(data.stats as StagingStats)
      } else {
        console.error("Error fetching staging stats:", data.error)
      }
    } catch (error) {
      console.error("Error fetching staging stats:", error)
    }
  }

  // Handle file selection
  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== "application/json" && !file.name.endsWith(".json")) {
        toast({
          title: "Invalid File Type",
          description: "Please select a JSON file.",
          variant: "destructive",
        })
        return
      }
      setSelectedFile(file)
      setImportResult(null) // Clear previous results
    }
  }

  // Handle file drop
  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file && (file.type === "application/json" || file.name.endsWith(".json"))) {
      setSelectedFile(file)
      setImportResult(null)
    } else {
      toast({
        title: "Invalid File Type",
        description: "Please drop a JSON file.",
        variant: "destructive",
      })
    }
  }

  // Handle import
  async function handleImport() {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a JSON file to import.",
        variant: "destructive",
      })
      return
    }

    setImportLoading(true)
    setImportResult(null)

    try {
      const text = await selectedFile.text()
      const draftPoolData: ServerAgentDraftPool = JSON.parse(text)

      const response = await fetch("/api/admin/draft-pool/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          draftPool: draftPoolData,
          sheetName: "Draft Board",
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setImportResult(data.result)
        toast({
          title: "Import Successful",
          description: `Imported ${data.result.imported} Pokemon to staging table.`,
        })
        // Refresh staging stats
        await fetchStagingStats()
      } else {
        const errorMessage = data.error || "Failed to import draft pool data."
        const errorDetails = data.details ? `\n\nDetails: ${data.details}` : ""
        const resultInfo = data.result 
          ? `\n\nImported: ${data.result.imported || 0}, Errors: ${data.result.errors?.length || 0}, Total Processed: ${data.result.totalProcessed || 0}`
          : ""
        
        console.error("[Draft Pool Import] Error:", errorMessage, errorDetails)
        console.error("[Draft Pool Import] Full response:", data)
        if (data.result?.errors && data.result.errors.length > 0) {
          console.error("[Draft Pool Import] Import errors:", data.result.errors.slice(0, 10))
        }
        
        toast({
          title: "Import Failed",
          description: errorMessage + resultInfo + (data.details ? `\n\nCheck console for details.` : ""),
          variant: "destructive",
        })
        if (data.result) {
          setImportResult(data.result)
        }
      }
    } catch (error: any) {
      toast({
        title: "Import Error",
        description: error.message || "Failed to parse or import JSON file.",
        variant: "destructive",
      })
    } finally {
      setImportLoading(false)
    }
  }

  // Handle sync
  async function handleSync() {
    if (!selectedSeasonId) {
      toast({
        title: "No Season Selected",
        description: "Please select a season to sync to.",
        variant: "destructive",
      })
      return
    }

    setShowSyncConfirm(false)
    setSyncLoading(true)
    setSyncResult(null)

    try {
      const response = await fetch("/api/admin/draft-pool/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seasonId: selectedSeasonId,
          sheetName: "Draft Board",
          dryRun: dryRun,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSyncResult(data.result)
        toast({
          title: dryRun ? "Dry Run Completed" : "Sync Successful",
          description: dryRun
            ? `Would sync ${data.result.synced} Pokemon (${data.result.skipped} skipped)`
            : `Synced ${data.result.synced} Pokemon to production.`,
        })
      } else {
        toast({
          title: "Sync Failed",
          description: data.error || "Failed to sync draft pool data.",
          variant: "destructive",
        })
        if (data.result) {
          setSyncResult(data.result)
        }
      }
    } catch (error: any) {
      toast({
        title: "Sync Error",
        description: error.message || "Failed to sync draft pool data.",
        variant: "destructive",
      })
    } finally {
      setSyncLoading(false)
    }
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Draft Pool Import & Sync
        </CardTitle>
        <CardDescription>
          Import draft pool data from server agent JSON and sync to production database.
          Supports periodic imports with manual sync control.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="import" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="staging">Staging Preview</TabsTrigger>
            <TabsTrigger value="sync">Sync to Production</TabsTrigger>
          </TabsList>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-3 mt-4">
            <div className="space-y-3">
              {/* File Upload */}
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <FileJson className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                {selectedFile ? (
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-muted-foreground">
                      JSON file from server agent (draft-pool-generated.json)
                    </p>
                  </div>
                )}
              </div>

              {/* Import Button */}
              <Button
                onClick={handleImport}
                disabled={!selectedFile || importLoading}
                className="w-full"
                size="lg"
              >
                {importLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import to Staging
                  </>
                )}
              </Button>

              {/* Import Results */}
              {importResult && (
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    {importResult.success ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="font-medium text-green-700 dark:text-green-400">
                          Import Completed Successfully
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="font-medium text-red-700 dark:text-red-400">
                          Import Completed with Errors
                        </span>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Imported</div>
                      <div className="font-semibold">{importResult.imported}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Total Processed</div>
                      <div className="font-semibold">{importResult.totalProcessed}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Tera Banned</div>
                      <div className="font-semibold">{importResult.teraBannedCount}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Errors</div>
                      <div className="font-semibold text-red-500">
                        {importResult.errors.length}
                      </div>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="rounded bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400 max-h-32 overflow-y-auto">
                      <strong>Errors:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {importResult.errors.slice(0, 5).map((err, idx) => (
                          <li key={idx}>
                            {err.pokemon}: {err.error}
                          </li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li>...and {importResult.errors.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Staging Preview Tab */}
          <TabsContent value="staging" className="space-y-3 mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Staging Table Statistics</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchStagingStats}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </div>

              {stagingStats ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="rounded-lg border p-3">
                    <div className="text-sm text-muted-foreground">Total</div>
                    <div className="text-2xl font-bold">{stagingStats.total}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-sm text-muted-foreground">Available</div>
                    <div className="text-2xl font-bold text-green-600">
                      {stagingStats.available}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-sm text-muted-foreground">Banned</div>
                    <div className="text-2xl font-bold text-red-600">
                      {stagingStats.banned}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-sm text-muted-foreground">Tera Banned</div>
                    <div className="text-2xl font-bold text-orange-600">
                      {stagingStats.teraBanned}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-sm text-muted-foreground">Drafted</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {stagingStats.drafted}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No data in staging table. Import a JSON file first.
                </div>
              )}

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Staging table is a temporary holding area. Data must be synced to
                  production before it's available for drafting.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>

          {/* Sync Tab */}
          <TabsContent value="sync" className="space-y-3 mt-4">
            <div className="space-y-3">
              {/* Season Selector */}
              <div className="space-y-2">
                <Label htmlFor="season-select">Target Season</Label>
                <Select
                  value={selectedSeasonId}
                  onValueChange={setSelectedSeasonId}
                  disabled={syncLoading}
                >
                  <SelectTrigger id="season-select">
                    <SelectValue placeholder="Select a season" />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.map((season) => (
                      <SelectItem key={season.id} value={season.id}>
                        <span className="flex items-center gap-2">
                          {season.name}
                          {season.is_current && (
                            <Badge variant="secondary" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dry Run Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dry-run"
                  checked={dryRun}
                  onCheckedChange={(checked) => setDryRun(checked === true)}
                  disabled={syncLoading}
                />
                <Label
                  htmlFor="dry-run"
                  className="text-sm font-normal cursor-pointer"
                >
                  Dry run (preview changes without applying)
                </Label>
              </div>

              {/* Sync Button */}
              <Button
                onClick={() => setShowSyncConfirm(true)}
                disabled={!selectedSeasonId || syncLoading || !stagingStats || stagingStats.total === 0}
                className="w-full"
                size="lg"
              >
                {syncLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Sync to Production
                  </>
                )}
              </Button>

              {/* Sync Results */}
              {syncResult && (
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    {syncResult.success ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="font-medium text-green-700 dark:text-green-400">
                          {dryRun ? "Dry Run Completed" : "Sync Completed Successfully"}
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="font-medium text-red-700 dark:text-red-400">
                          Sync Failed
                        </span>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Synced</div>
                      <div className="font-semibold text-green-600">
                        {syncResult.synced}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Skipped</div>
                      <div className="font-semibold text-blue-600">
                        {syncResult.skipped}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Conflicts</div>
                      <div className="font-semibold text-orange-600">
                        {syncResult.conflicts.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Unmatched</div>
                      <div className="font-semibold text-yellow-600">
                        {syncResult.unmatchedNames.length}
                      </div>
                    </div>
                  </div>

                  {syncResult.conflicts.length > 0 && (
                    <div className="rounded bg-orange-50 dark:bg-orange-900/20 p-3 text-sm text-orange-700 dark:text-orange-400 max-h-32 overflow-y-auto">
                      <strong>Conflicts:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {syncResult.conflicts.slice(0, 5).map((conflict, idx) => (
                          <li key={idx}>
                            {conflict.pokemon}: {conflict.reason}
                          </li>
                        ))}
                        {syncResult.conflicts.length > 5 && (
                          <li>...and {syncResult.conflicts.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {syncResult.unmatchedNames.length > 0 && (
                    <div className="rounded bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm text-yellow-700 dark:text-yellow-400 max-h-32 overflow-y-auto">
                      <strong>Unmatched Pokemon Names ({syncResult.unmatchedNames.length}):</strong>
                      <ul className="list-disc list-inside mt-1">
                        {syncResult.unmatchedNames.slice(0, 10).map((name, idx) => (
                          <li key={idx}>{name}</li>
                        ))}
                        {syncResult.unmatchedNames.length > 10 && (
                          <li>...and {syncResult.unmatchedNames.length - 10} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Sync Confirmation Dialog */}
        <Dialog open={showSyncConfirm} onOpenChange={setShowSyncConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sync Draft Pool to Production</DialogTitle>
              <DialogDescription>
                {dryRun
                  ? "This is a dry run - no changes will be made. You'll see what would be synced."
                  : "This will sync staging data to the production draft_pool table. Drafted Pokemon will be preserved."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <div className="text-sm">
                <strong>Season:</strong>{" "}
                {seasons.find((s) => s.id === selectedSeasonId)?.name || "Unknown"}
              </div>
              {stagingStats && (
                <div className="text-sm text-muted-foreground">
                  {stagingStats.total} Pokemon in staging table
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSyncConfirm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSync}>
                {dryRun ? "Run Preview" : "Sync Now"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
