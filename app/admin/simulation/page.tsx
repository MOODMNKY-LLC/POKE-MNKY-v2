"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { QuickLinksCard } from "@/components/admin/quick-links-card"
import {
  Play,
  RotateCcw,
  Database,
  ClipboardList,
  Calendar,
  Trophy,
  Zap,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface SimulationStatus {
  season_id: string | null
  season_name: string | null
  has_teams: boolean
  team_count: number
  has_draft_pool: boolean
  draft_completed: boolean
  match_count: number
  completed_match_count: number
  playoff_match_count: number
  last_run: { id: string; status: string; completed_at: string } | null
}

export default function AdminSimulationPage() {
  const [status, setStatus] = useState<SimulationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [logsOpen, setLogsOpen] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [config, setConfig] = useState({ weeks: 10, top_n: 4, result_strategy: "random" })

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/simulation/status")
      if (res.ok) {
        const data = await res.json()
        setStatus(data.status)
      }
    } catch (e) {
      addLog("Failed to fetch status: " + (e instanceof Error ? e.message : String(e)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toISOString().slice(11, 19)}] ${msg}`])
  }

  const runAction = async (
    action: string,
    endpoint: string,
    method: "GET" | "POST" = "POST",
    body?: object
  ) => {
    setRunning(action)
    addLog(`Starting ${action}...`)
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json()
      if (res.ok) {
        addLog(`${action} completed: ${JSON.stringify(data).slice(0, 200)}`)
        await fetchStatus()
      } else {
        addLog(`${action} failed: ${data.error ?? res.statusText}`)
      }
    } catch (e) {
      addLog(`${action} error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setRunning(null)
    }
  }

  const handleSeed = () => runAction("Seed", "/api/admin/simulation/seed")
  const handleDraft = () => runAction("Draft", "/api/admin/simulation/draft")
  const handleSchedule = () => runAction("Schedule", "/api/admin/simulation/schedule", "POST", { weeks: config.weeks })
  const handlePlayoffs = () => runAction("Playoffs", "/api/admin/simulation/playoffs", "POST", { top_n: config.top_n })
  const handleRunResults = () =>
    runAction("Run Results", "/api/admin/simulation/run-results", "POST", {
      result_strategy: config.result_strategy,
    })
  const handleFullRun = () =>
    runAction("Full Run", "/api/admin/simulation/full-run", "POST", {
      weeks: config.weeks,
      top_n: config.top_n,
      result_strategy: config.result_strategy,
    })
  const handleReset = () => {
    setResetConfirm(true)
  }
  const confirmReset = async () => {
    try {
      setRunning("Reset")
      addLog("Starting reset...")
      const res = await fetch("/api/admin/simulation/reset", { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        addLog("Reset completed.")
        await fetchStatus()
      } else {
        addLog(`Reset failed: ${data.error ?? res.statusText}`)
      }
    } catch (e) {
      addLog(`Reset error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setRunning(null)
      setResetConfirm(false)
    }
  }

  const isRunning = !!running

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <AdminPageHeader
        title="League Simulation"
        description="Run end-to-end tests: seed mock season, draft, schedule, playoffs, and results"
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Status Overview */}
          <Card className="mb-8 bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Simulation Status
              </CardTitle>
              <CardDescription>
                Mock Draft Demo season state for testing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border bg-background p-4">
                  <div className="text-sm text-muted-foreground">Season</div>
                  <div className="text-lg font-semibold">{status?.season_name ?? "—"}</div>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <div className="text-sm text-muted-foreground">Teams</div>
                  <div className="text-lg font-semibold">{status?.team_count ?? 0}</div>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <div className="text-sm text-muted-foreground">Draft</div>
                  <div className="flex items-center gap-2">
                    {status?.draft_completed ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Complete
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <div className="text-sm text-muted-foreground">Matches</div>
                  <div className="text-lg font-semibold">
                    {status?.completed_match_count ?? 0} / {status?.match_count ?? 0}
                    {status?.playoff_match_count ? ` (${status.playoff_match_count} playoff)` : ""}
                  </div>
                </div>
              </div>
              {status?.last_run && (
                <div className="mt-4 text-sm text-muted-foreground">
                  Last run: {status.last_run.status} {status.last_run.completed_at ? `at ${new Date(status.last_run.completed_at).toLocaleString()}` : ""}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step-by-Step Controls */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Step-by-Step Controls
              </CardTitle>
              <CardDescription>
                Run each phase of the simulation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleSeed}
                  disabled={isRunning}
                  variant="outline"
                  size="sm"
                >
                  {running === "Seed" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
                  Seed
                </Button>
                <Button
                  onClick={handleDraft}
                  disabled={isRunning}
                  variant="outline"
                  size="sm"
                >
                  {running === "Draft" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ClipboardList className="h-4 w-4 mr-2" />}
                  Draft
                </Button>
                <Button
                  onClick={handleSchedule}
                  disabled={isRunning}
                  variant="outline"
                  size="sm"
                >
                  {running === "Schedule" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calendar className="h-4 w-4 mr-2" />}
                  Schedule
                </Button>
                <Button
                  onClick={handlePlayoffs}
                  disabled={isRunning}
                  variant="outline"
                  size="sm"
                >
                  {running === "Playoffs" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trophy className="h-4 w-4 mr-2" />}
                  Playoffs
                </Button>
                <Button
                  onClick={handleRunResults}
                  disabled={isRunning}
                  variant="outline"
                  size="sm"
                >
                  {running === "Run Results" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                  Run Results
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Full Run */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                Full Run
              </CardTitle>
              <CardDescription>
                One-shot: seed → draft → schedule → results → playoffs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleFullRun}
                disabled={isRunning}
                size="lg"
              >
                {running === "Full Run" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                Run Full Simulation
              </Button>
            </CardContent>
          </Card>

          {/* Config Editor */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Config</CardTitle>
              <CardDescription>
                Edit simulation parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Weeks</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={config.weeks}
                    onChange={(e) => setConfig((c) => ({ ...c, weeks: parseInt(e.target.value) || 10 }))}
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Playoff Top N</label>
                  <input
                    type="number"
                    min={2}
                    max={12}
                    value={config.top_n}
                    onChange={(e) => setConfig((c) => ({ ...c, top_n: parseInt(e.target.value) || 4 }))}
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Result Strategy</label>
                  <select
                    value={config.result_strategy}
                    onChange={(e) => setConfig((c) => ({ ...c, result_strategy: e.target.value as "random" | "favor_higher_seed" | "favor_lower_seed" }))}
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="random">Random</option>
                    <option value="favor_higher_seed">Favor Higher Seed</option>
                    <option value="favor_lower_seed">Favor Lower Seed</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reset */}
          <Card className="mb-8 border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <RotateCcw className="h-5 w-5" />
                Reset
              </CardTitle>
              <CardDescription>
                Clear draft pool, picks, matches, and standings for Mock Draft Demo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleReset}
                disabled={isRunning}
                variant="destructive"
              >
                {running === "Reset" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                Reset Mock Season
              </Button>
            </CardContent>
          </Card>

          {/* Logs */}
          <Collapsible open={logsOpen} onOpenChange={setLogsOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Logs
                    </CardTitle>
                    {logsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <pre className="max-h-64 overflow-auto rounded bg-muted p-4 text-xs font-mono">
                    {logs.length ? logs.join("\n") : "No logs yet."}
                  </pre>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <div className="mt-8">
            <QuickLinksCard
              links={[
                { href: "/admin/league", label: "League Management", icon: Database },
                { href: "/admin/playoffs", label: "Playoffs", icon: Trophy },
                { href: "/standings", label: "Standings", icon: ClipboardList },
              ]}
            />
          </div>
        </>
      )}

      <Dialog open={resetConfirm} onOpenChange={setResetConfirm}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Reset Mock Season?</DialogTitle>
            <DialogDescription>
              This will clear all draft picks, matches, and standings for the Mock Draft Demo season.
              You can run Seed again to prepare for a new simulation.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReset}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
