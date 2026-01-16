"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Save,
  AlertCircle,
  Loader2,
  Sparkles,
  FileSpreadsheet,
  ChevronRight,
  ChevronDown,
  Settings,
  Image,
  MessageSquare,
  Info,
  Play,
  Search,
  BarChart3,
  Download,
  Upload
} from "lucide-react"
import { extractSpreadsheetId } from "@/lib/utils/google-sheets"
import { Progress } from "@/components/ui/progress"

interface GoogleSheetsConfig {
  id?: string
  spreadsheet_id: string
  enabled: boolean
  sync_schedule: "manual" | "hourly" | "daily" | "weekly"
  last_sync_at?: string
  last_sync_status?: "success" | "error" | "partial"
}

interface DetectedSheet {
  sheet_name: string
  sheet_index: number
  headers: string[]
  row_count: number
  suggested_table: string
  confidence: number
  column_mapping: Record<string, string>
  range: string
  warning?: string | null
  has_headers?: boolean
  images_count?: number
  comments_count?: number
}

interface SheetMapping {
  id?: string
  sheet_name: string
  table_name: string
  range: string
  enabled: boolean
  sync_order: number
  column_mapping?: Record<string, string>
}

export default function GoogleSheetsConfigPage() {
  const [config, setConfig] = useState<GoogleSheetsConfig>({
    spreadsheet_id: "",
    enabled: true,
    sync_schedule: "manual",
  })
  const [spreadsheetInput, setSpreadsheetInput] = useState("")
  const [parsedSpreadsheetId, setParsedSpreadsheetId] = useState<string | null>(null)
  const [credentialsConfigured, setCredentialsConfigured] = useState<boolean | null>(null)
  const [detectedSheets, setDetectedSheets] = useState<DetectedSheet[]>([])
  const [detecting, setDetecting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [mappings, setMappings] = useState<SheetMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<{
    current: number
    total: number
    currentSheet?: string
    percentage: number
  } | null>(null)
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; recordsProcessed?: number; imagesExtracted?: number } | null>(null)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedSheet, setExpandedSheet] = useState<string | null>(null) // For manual configuration

  useEffect(() => {
    loadConfig()
  }, [])

  // Note: Auto-detection is now manual only - no automatic triggering on page refresh

  async function loadConfig() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/admin/google-sheets/config")
      
      if (!response.ok) {
        if (response.status === 401) {
          setError("You must be logged in to view configuration")
          return
        }
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to load configuration")
      }

      const result = await response.json()

      if (result.config) {
        setConfig(result.config)
        setSpreadsheetInput(result.config.spreadsheet_id || "")
        setParsedSpreadsheetId(result.config.spreadsheet_id || null)

        if (result.mappings && result.mappings.length > 0) {
          setMappings(result.mappings)
        }
      }

      if (result.credentials_configured !== undefined) {
        setCredentialsConfigured(result.credentials_configured)
      }
    } catch (err) {
      console.error("Failed to load config:", err)
      setError(err instanceof Error ? err.message : "Failed to load configuration")
    } finally {
      setLoading(false)
    }
  }

  // Parse spreadsheet ID when input changes
  useEffect(() => {
    if (spreadsheetInput) {
      const parsed = extractSpreadsheetId(spreadsheetInput)
      setParsedSpreadsheetId(parsed)
      if (parsed) {
        setConfig((prev) => ({ ...prev, spreadsheet_id: parsed }))
      } else {
        setConfig((prev) => ({ ...prev, spreadsheet_id: "" }))
      }
    } else {
      setParsedSpreadsheetId(null)
      setConfig((prev) => ({ ...prev, spreadsheet_id: "" }))
    }
  }, [spreadsheetInput])

  async function detectSheets() {
    if (!parsedSpreadsheetId) return

    try {
      setDetecting(true)
      setError(null)
      setAnalysisResult(null)

      const response = await fetch("/api/admin/google-sheets/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheet_id: parsedSpreadsheetId }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to detect sheets")
      }

      setDetectedSheets(result.sheets || [])

      // Don't auto-create mappings - let user manually enable what they want
      // This gives them control and allows configuration of sheets without headers
    } catch (err) {
      console.error("Failed to detect sheets:", err)
      setError(err instanceof Error ? err.message : "Failed to detect sheets")
    } finally {
      setDetecting(false)
    }
  }

  async function analyzeSpreadsheet() {
    if (!parsedSpreadsheetId) return

    try {
      setAnalyzing(true)
      setError(null)
      setAnalysisResult(null)

      const response = await fetch("/api/admin/google-sheets/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheet_id: parsedSpreadsheetId }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to analyze spreadsheet")
      }

      setAnalysisResult(result)
      
      // Also update detected sheets with analysis data
      if (result.analysis && result.analysis.length > 0) {
        setDetectedSheets(result.analysis.map((a: any) => ({
          sheet_name: a.sheet_name,
          sheet_index: a.sheet_index,
          headers: a.headers || [],
          row_count: a.row_count || 0,
          suggested_table: a.parsing_suggestions?.table_mapping || "",
          confidence: a.parsing_suggestions?.confidence || 0,
          column_mapping: a.parsing_suggestions?.column_mapping || {},
          range: a.parsing_suggestions?.range || "A1:Z1000",
          warning: a.structure?.patterns?.includes("no_headers") ? "No headers found" : null,
          has_headers: a.has_headers !== false,
          images_count: a.images_count || 0,
          comments_count: a.comments_count || 0,
        })))
      }
    } catch (err) {
      console.error("Failed to analyze spreadsheet:", err)
      setError(err instanceof Error ? err.message : "Failed to analyze spreadsheet")
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSave() {
    try {
      setSaving(true)
      setError(null)
      setSyncResult(null)

      if (!parsedSpreadsheetId) {
        setError("Please enter a valid Google Sheets URL or Spreadsheet ID")
        return
      }

      const supabase = createBrowserClient()
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        setError("You must be logged in to save configuration")
        return
      }

      // If schedule is "manual", disable automatic sync
      const configToSave = {
        ...config,
        spreadsheet_id: parsedSpreadsheetId,
        enabled: config.sync_schedule === "manual" ? false : config.enabled,
      }

      const response = await fetch("/api/admin/google-sheets/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            ...configToSave,
            created_by: user.user.id,
          },
          mappings,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to save configuration")
      }

      await loadConfig()
      setTestResult({ success: true, message: "Configuration saved successfully!" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save configuration")
    } finally {
      setSaving(false)
    }
  }

  async function handleManualSync() {
    try {
      setSyncing(true)
      setError(null)
      setSyncResult(null)
      setSyncProgress({ current: 0, total: mappings.filter(m => m.enabled).length, percentage: 0 })

      if (!parsedSpreadsheetId) {
        setError("Please configure and save spreadsheet ID first")
        return
      }

      // Ensure config is saved before syncing
      if (!config.id) {
        setError("Please save configuration before syncing")
        return
      }

      const enabledMappings = mappings.filter(m => m.enabled)
      if (enabledMappings.length === 0) {
        setError("Please enable at least one sheet mapping before syncing")
        return
      }

      // Update progress as we sync each sheet
      let currentSheetIndex = 0
      const totalSheets = enabledMappings.length

      // Simulate progress updates (in real implementation, this would come from server-side events)
      const progressInterval = setInterval(() => {
        if (currentSheetIndex < totalSheets) {
          const percentage = Math.min((currentSheetIndex / totalSheets) * 100, 95)
          setSyncProgress({
            current: currentSheetIndex,
            total: totalSheets,
            currentSheet: enabledMappings[currentSheetIndex]?.sheet_name,
            percentage,
          })
        }
      }, 500)

      const response = await fetch("/api/sync/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      clearInterval(progressInterval)

      const result = await response.json()

      if (!response.ok) {
        // Extract detailed error information
        const errorMessage = result.error || result.message || "Sync failed"
        const errorDetails = result.errors && result.errors.length > 0 
          ? `\n\nErrors:\n${result.errors.slice(0, 5).map((e: string, i: number) => `${i + 1}. ${e}`).join("\n")}`
          : ""
        
        throw new Error(`${errorMessage}${errorDetails}`)
      }

      setSyncProgress({
        current: totalSheets,
        total: totalSheets,
        percentage: 100,
      })

      setSyncResult({
        success: result.success !== false, // Default to true if not specified
        message: result.message || `Synced ${result.recordsProcessed || 0} records`,
        recordsProcessed: result.recordsProcessed || 0,
        imagesExtracted: result.imagesExtracted || 0,
      })

      // Show errors if any
      if (result.errors && result.errors.length > 0) {
        console.warn("[Sync] Sync completed with errors:", result.errors)
      }

      // Reload config to get updated sync status
      await loadConfig()

      // Clear progress after a delay
      setTimeout(() => {
        setSyncProgress(null)
      }, 2000)
    } catch (err) {
      setSyncResult({
        success: false,
        message: err instanceof Error ? err.message : "Sync failed",
      })
      setError(err instanceof Error ? err.message : "Failed to sync")
      setSyncProgress(null)
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Google Sheets Configuration">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout 
      title="Google Sheets Configuration"
      description="Connect your Google Sheets to automatically sync league data"
    >
      <div className="space-y-6">
        {/* Status Cards */}
        {config.id && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`rounded-full p-3 ${config.enabled ? "bg-green-500/10" : "bg-gray-500/10"}`}>
                    {config.enabled ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                      <XCircle className="h-6 w-6 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold">
                      {config.enabled ? "Sync Enabled" : "Sync Disabled"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {config.last_sync_at
                        ? `Last sync: ${new Date(config.last_sync_at).toLocaleString()}`
                        : "Never synced"}
                    </div>
                  </div>
                </div>
                {config.last_sync_status && (
                  <Badge
                    variant={
                      config.last_sync_status === "success"
                        ? "default"
                        : config.last_sync_status === "partial"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {config.last_sync_status}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Credentials Status */}
        {credentialsConfigured !== null && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {credentialsConfigured ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <div className="font-semibold text-sm">Service Account Credentials Configured</div>
                      <div className="text-xs text-muted-foreground">
                        Credentials are set via environment variables (server-side)
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <div>
                      <div className="font-semibold text-sm">Service Account Credentials Not Configured</div>
                      <div className="text-xs text-muted-foreground">
                        Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY environment variables
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Connect Your League Spreadsheet</CardTitle>
            <CardDescription>
              Connect your Google Sheets to automatically sync team standings, draft results, match data, and team assets (logos, banners, avatars) into your Pokémon league database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Spreadsheet Input */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="spreadsheet_input">
                  Google Sheets URL or Spreadsheet ID <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="spreadsheet_input"
                    placeholder="https://docs.google.com/spreadsheets/d/1abc123/edit"
                    value={spreadsheetInput}
                    onChange={(e) => setSpreadsheetInput(e.target.value)}
                    className={parsedSpreadsheetId ? "border-green-500" : parsedSpreadsheetId === null && spreadsheetInput ? "border-destructive" : ""}
                  />
                </div>
              </div>

              {/* Action Buttons with Explanations */}
              {parsedSpreadsheetId && credentialsConfigured && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-start gap-2 mb-3">
                    <Info className="h-4 w-4 mt-0.5 text-primary" />
                    <div className="flex-1">
                      <div className="font-semibold text-sm mb-1">Quick Actions</div>
                      <div className="text-xs text-muted-foreground">
                        Use these tools to understand your spreadsheet structure and configure syncing for your league data.
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Quick Detect Button */}
                    <div className="space-y-2">
                      <Button 
                        onClick={detectSheets} 
                        disabled={detecting || analyzing} 
                        variant="outline" 
                        className="w-full"
                      >
                        {detecting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Detecting...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Quick Detect
                          </>
                        )}
                      </Button>
                      <div className="text-xs text-muted-foreground px-1">
                        Quickly identifies sheets and suggests table mappings. Best for simple spreadsheets with clear headers.
                      </div>
                    </div>

                    {/* Comprehensive Analyze Button */}
                    <div className="space-y-2">
                      <Button 
                        onClick={analyzeSpreadsheet} 
                        disabled={detecting || analyzing} 
                        variant="default"
                        className="w-full"
                      >
                        {analyzing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Comprehensive Analysis
                          </>
                        )}
                      </Button>
                      <div className="text-xs text-muted-foreground px-1">
                        Deep analysis of all sheets, data types, and structures. Recommends parsing strategies including AI-powered parsing for complex data.
                      </div>
                    </div>

                    {/* Sync Button */}
                    {config.id && mappings.some(m => m.enabled) && (
                      <div className="space-y-2">
                        <Button 
                          onClick={handleManualSync} 
                          disabled={syncing || !config.id} 
                          variant="default"
                          className="w-full bg-primary"
                        >
                          {syncing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-2" />
                              Sync Now
                            </>
                          )}
                        </Button>
                        <div className="text-xs text-muted-foreground px-1">
                          Syncs enabled sheets to your database, including team data, matches, rosters, and images.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {parsedSpreadsheetId && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Spreadsheet ID: </span>
                  <code className="bg-muted px-2 py-1 rounded font-mono text-xs">{parsedSpreadsheetId}</code>
                </div>
              )}
              {spreadsheetInput && !parsedSpreadsheetId && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="h-4 w-4" />
                  <span>Invalid URL or Spreadsheet ID format</span>
                </div>
              )}
            </div>

            {/* Analysis Results */}
            {analysisResult && (
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Analysis Summary
                  </CardTitle>
                  <CardDescription>
                    Comprehensive analysis of your spreadsheet structure
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analysisResult.summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-2xl font-bold">{analysisResult.summary.total_sheets}</div>
                        <div className="text-xs text-muted-foreground">Total Sheets</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{analysisResult.summary.ai_required_count}</div>
                        <div className="text-xs text-muted-foreground">AI Parsing Needed</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{analysisResult.summary.no_headers_count}</div>
                        <div className="text-xs text-muted-foreground">No Headers</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {Object.keys(analysisResult.summary.sheet_types || {}).length}
                        </div>
                        <div className="text-xs text-muted-foreground">Sheet Types</div>
                      </div>
                    </div>
                  )}
                  {analysisResult.summary?.sheet_types && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(analysisResult.summary.sheet_types).map(([type, count]) => (
                        <Badge key={type} variant="secondary">
                          {type}: {count}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Sync Progress */}
            {syncProgress && (
              <Card className="border-primary/20">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Syncing League Data</span>
                      <span className="text-muted-foreground">
                        {syncProgress.current} / {syncProgress.total} sheets
                      </span>
                    </div>
                    {syncProgress.currentSheet && (
                      <div className="text-xs text-muted-foreground">
                        Processing: <span className="font-medium">{syncProgress.currentSheet}</span>
                      </div>
                    )}
                    <Progress value={syncProgress.percentage} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {syncProgress.percentage < 100 
                        ? "Extracting team data, match results, rosters, and images..." 
                        : "Sync complete! Team logos, banners, and avatars have been extracted."}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detected Sheets */}
            {detectedSheets.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Detected Sheets</Label>
                    <div className="text-xs text-muted-foreground mt-1">
                      Configure which sheets to sync. Enable sheets containing team standings, draft results, match data, or team pages.
                    </div>
                  </div>
                  <Badge variant="secondary">{detectedSheets.length} sheets found</Badge>
                </div>
                <div className="space-y-3">
                  {detectedSheets.map((sheet, index) => {
                    const mapping = mappings.find((m) => m.sheet_name === sheet.sheet_name)
                    return (
                      <Card key={index} className="border-2">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <FileSpreadsheet className="h-4 w-4 text-primary" />
                                <span className="font-semibold">{sheet.sheet_name}</span>
                                {sheet.suggested_table && (
                                  <>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    <Badge variant={sheet.confidence > 0.7 ? "default" : "secondary"}>
                                      {sheet.suggested_table}
                                    </Badge>
                                    <Badge variant="outline" className="ml-2">
                                      {Math.round(sheet.confidence * 100)}% match
                                    </Badge>
                                  </>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span>{sheet.row_count} rows</span>
                                  <span>•</span>
                                  <span>{sheet.headers.length > 0 ? `${sheet.headers.length} columns` : "No headers"}</span>
                                  {sheet.images_count && sheet.images_count > 0 && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center gap-1 text-primary">
                                        <Image className="h-3 w-3" />
                                        {sheet.images_count} image{sheet.images_count !== 1 ? "s" : ""} (logos/banners)
                                      </span>
                                    </>
                                  )}
                                  {sheet.comments_count && sheet.comments_count > 0 && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center gap-1">
                                        <MessageSquare className="h-3 w-3" />
                                        {sheet.comments_count} comment{sheet.comments_count !== 1 ? "s" : ""}
                                      </span>
                                    </>
                                  )}
                                </div>
                                {sheet.warning && (
                                  <div className={`flex items-center gap-1 mt-1 ${
                                    sheet.has_headers === false 
                                      ? "text-orange-600 dark:text-orange-400" 
                                      : "text-yellow-600 dark:text-yellow-400"
                                  }`}>
                                    <AlertCircle className="h-3 w-3" />
                                    <span>
                                      {sheet.has_headers === false 
                                        ? "No headers found - AI parsing will be used to extract team data"
                                        : sheet.warning.includes("Duplicate") 
                                          ? "Duplicate headers detected - renamed automatically"
                                          : sheet.warning}
                                    </span>
                                  </div>
                                )}
                                {sheet.headers.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {sheet.headers.slice(0, 5).map((header, i) => (
                                      <code key={i} className="bg-muted px-1.5 py-0.5 rounded text-xs">
                                        {header}
                                      </code>
                                    ))}
                                    {sheet.headers.length > 5 && (
                                      <span className="text-muted-foreground">+{sheet.headers.length - 5} more</span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-muted-foreground mt-1">
                                    <span className="italic">No headers detected</span>
                                    <span className="text-xs block mt-1">
                                      You can still sync this sheet by configuring it manually below
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`enable-${sheet.sheet_name}`}
                                  checked={mapping?.enabled ?? false}
                                  onCheckedChange={(checked) => {
                                    const newMappings = [...mappings]
                                    const existingIndex = newMappings.findIndex((m) => m.sheet_name === sheet.sheet_name)
                                    
                                    if (existingIndex >= 0) {
                                      newMappings[existingIndex].enabled = checked === true
                                    } else if (checked === true) {
                                      // Allow manual configuration even without headers
                                      newMappings.push({
                                        sheet_name: sheet.sheet_name,
                                        table_name: sheet.suggested_table || "", // Can be set manually
                                        range: sheet.range,
                                        enabled: true,
                                        sync_order: newMappings.length + 1,
                                        column_mapping: sheet.column_mapping || {},
                                      })
                                    }
                                    setMappings(newMappings)
                                  }}
                                />
                                <Label htmlFor={`enable-${sheet.sheet_name}`} className="text-sm cursor-pointer">
                                  Enable Sync
                                </Label>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedSheet(expandedSheet === sheet.sheet_name ? null : sheet.sheet_name)}
                              >
                                {expandedSheet === sheet.sheet_name ? (
                                  <>
                                    <ChevronDown className="h-4 w-4 mr-1" />
                                    Hide Config
                                  </>
                                ) : (
                                  <>
                                    <Settings className="h-4 w-4 mr-1" />
                                    Configure
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                          
                          {/* Expanded Configuration Panel */}
                          {expandedSheet === sheet.sheet_name && (
                            <div className="mt-4 pt-4 border-t space-y-4">
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                  <Label>Target Table</Label>
                                  <Select
                                    value={mapping?.table_name || sheet.suggested_table || ""}
                                    onValueChange={(value) => {
                                      const newMappings = [...mappings]
                                      const existingIndex = newMappings.findIndex((m) => m.sheet_name === sheet.sheet_name)
                                      
                                      if (existingIndex >= 0) {
                                        newMappings[existingIndex].table_name = value
                                      } else {
                                        newMappings.push({
                                          sheet_name: sheet.sheet_name,
                                          table_name: value,
                                          range: sheet.range,
                                          enabled: false,
                                          sync_order: newMappings.length + 1,
                                          column_mapping: {},
                                        })
                                      }
                                      setMappings(newMappings)
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select table..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="teams">teams</SelectItem>
                                      <SelectItem value="team_rosters">team_rosters</SelectItem>
                                      <SelectItem value="matches">matches</SelectItem>
                                      <SelectItem value="pokemon">pokemon</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Range</Label>
                                  <Input
                                    value={mapping?.range || sheet.range}
                                    onChange={(e) => {
                                      const newMappings = [...mappings]
                                      const existingIndex = newMappings.findIndex((m) => m.sheet_name === sheet.sheet_name)
                                      
                                      if (existingIndex >= 0) {
                                        newMappings[existingIndex].range = e.target.value
                                      } else {
                                        newMappings.push({
                                          sheet_name: sheet.sheet_name,
                                          table_name: sheet.suggested_table || "",
                                          range: e.target.value,
                                          enabled: false,
                                          sync_order: newMappings.length + 1,
                                          column_mapping: {},
                                        })
                                      }
                                      setMappings(newMappings)
                                    }}
                                    placeholder="A1:Z1000"
                                  />
                                </div>
                              </div>
                              
                              {sheet.has_headers === false && (
                                <div className="rounded-md bg-orange-500/10 p-3 text-sm text-orange-600 dark:text-orange-400 border border-orange-500/20">
                                  <div className="flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 mt-0.5" />
                                    <div>
                                      <div className="font-semibold mb-1">No Headers Detected</div>
                                      <div className="text-xs">
                                        This sheet doesn't have headers in the first row. You can still sync it by:
                                        <ul className="list-disc list-inside mt-1 space-y-1">
                                          <li>Manually mapping columns by position (A, B, C, etc.)</li>
                                          <li>Adding headers to the first row in Google Sheets</li>
                                          <li>Using a custom range that starts from row 2</li>
                                        </ul>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {(sheet.images_count !== undefined && sheet.images_count > 0) && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Image className="h-4 w-4" />
                                  <span>{sheet.images_count} image(s) detected - will be synced as URLs</span>
                                </div>
                              )}
                              
                              {(sheet.comments_count !== undefined && sheet.comments_count > 0) && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <MessageSquare className="h-4 w-4" />
                                  <span>{sheet.comments_count} comment(s) detected - will be synced as metadata</span>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Sync Settings */}
            <div className="space-y-4 pt-4 border-t">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sync_schedule">Sync Schedule</Label>
                  <Select
                    value={config.sync_schedule}
                    onValueChange={(value: "manual" | "hourly" | "daily" | "weekly") => {
                      // If changing to "manual", disable automatic sync
                      const newConfig = {
                        ...config,
                        sync_schedule: value,
                        enabled: value === "manual" ? false : config.enabled,
                      }
                      setConfig(newConfig)
                    }}
                  >
                    <SelectTrigger id="sync_schedule">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Only</SelectItem>
                      <SelectItem value="hourly">Every Hour</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {config.sync_schedule === "manual"
                      ? "Sync will only run when you click 'Sync Now'"
                      : `Automatic sync will run ${config.sync_schedule === "hourly" ? "every hour" : config.sync_schedule === "daily" ? "once per day" : "once per week"}`}
                  </p>
                </div>
                {config.sync_schedule !== "manual" && (
                  <div className="flex items-center gap-2 pt-8">
                    <Checkbox
                      id="enabled"
                      checked={config.enabled}
                      onCheckedChange={(checked) => setConfig({ ...config, enabled: checked === true })}
                    />
                    <Label htmlFor="enabled" className="cursor-pointer">
                      Enable automatic sync
                    </Label>
                  </div>
                )}
              </div>
              {config.sync_schedule === "manual" && (
                <div className="rounded-md bg-blue-500/10 p-3 text-sm text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 mt-0.5" />
                    <div>
                      <div className="font-semibold mb-1">Manual Sync Mode</div>
                      <div className="text-xs">
                        Automatic sync is disabled. Use the "Sync Now" button to manually trigger synchronization.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {testResult && (
              <div
                className={`rounded-md p-3 text-sm flex items-center gap-2 ${
                  testResult.success
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {testResult.message}
              </div>
            )}

            {syncResult && (
              <div
                className={`rounded-md p-4 text-sm flex items-start gap-3 ${
                  syncResult.success
                    ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                }`}
              >
                {syncResult.success ? (
                  <CheckCircle2 className="h-5 w-5 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-semibold mb-2">
                    {syncResult.success ? "League Data Sync Completed!" : "Sync Failed"}
                  </div>
                  <div className="text-xs mt-1 whitespace-pre-wrap mb-2">{syncResult.message}</div>
                  {syncResult.success && (
                    <div className="flex flex-wrap gap-4 mt-2 pt-2 border-t border-current/20">
                      {syncResult.recordsProcessed !== undefined && syncResult.recordsProcessed > 0 && (
                        <div className="text-xs">
                          <span className="font-semibold">{syncResult.recordsProcessed}</span> record(s) synced
                        </div>
                      )}
                      {syncResult.imagesExtracted !== undefined && syncResult.imagesExtracted > 0 && (
                        <div className="text-xs flex items-center gap-1">
                          <Image className="h-3 w-3" />
                          <span className="font-semibold">{syncResult.imagesExtracted}</span> team image(s) extracted
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <Info className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400" />
                <div className="flex-1 text-sm">
                  <div className="font-semibold mb-1 text-blue-900 dark:text-blue-100">How It Works</div>
                  <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-200 text-xs">
                    <li><strong>Detect or Analyze:</strong> Use "Quick Detect" for simple sheets or "Comprehensive Analysis" for complex structures with multiple data types.</li>
                    <li><strong>Configure Mappings:</strong> Enable sheets you want to sync and verify the suggested table mappings (teams, matches, rosters).</li>
                    <li><strong>Save Configuration:</strong> Save your settings to enable syncing.</li>
                    <li><strong>Sync Data:</strong> Click "Sync Now" to extract team standings, match results, draft picks, and team images (logos, banners, avatars) into your league database.</li>
                  </ol>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={handleSave} disabled={saving || !parsedSpreadsheetId}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Configuration
                    </>
                  )}
                </Button>
                {config.id && mappings.some(m => m.enabled) && (
                  <Button 
                    onClick={handleManualSync} 
                    disabled={syncing || !config.id || !parsedSpreadsheetId}
                    variant="default"
                    className="bg-primary"
                  >
                    {syncing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Syncing League Data...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Sync Now
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
