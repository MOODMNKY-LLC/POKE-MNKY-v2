"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Plus, X } from "lucide-react"

interface DraftSession {
  id: string
  season_id: string
  status: string
  draft_type: string
  total_teams: number
  total_rounds: number
  current_round: number
  current_pick_number: number
  started_at: string | null
  completed_at: string | null
}

export default function DraftSessionsAdminPage() {
  const [sessions, setSessions] = useState<DraftSession[]>([])
  const [activeSession, setActiveSession] = useState<DraftSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  // Form state
  const [draftType, setDraftType] = useState<"snake" | "linear" | "auction">("snake")
  const [pickTimeLimit, setPickTimeLimit] = useState(45)

  useEffect(() => {
    loadSessions()
  }, [])

  async function loadSessions() {
    try {
      setLoading(true)
      setError(null)

      // Load all sessions
      const sessionsRes = await fetch("/api/admin/draft/sessions")
      const sessionsData = await sessionsRes.json()

      if (sessionsData.success) {
        setSessions(sessionsData.sessions || [])
        const active = sessionsData.sessions?.find((s: DraftSession) => s.status === "active")
        setActiveSession(active || null)
      } else {
        setError(sessionsData.error || "Failed to load sessions")
      }
    } catch (err: any) {
      setError(err.message || "Failed to load sessions")
    } finally {
      setLoading(false)
    }
  }

  async function createSession() {
    try {
      setCreating(true)
      setError(null)

      const res = await fetch("/api/draft/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft_type: draftType,
          pick_time_limit: pickTimeLimit,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setCreateDialogOpen(false)
        await loadSessions()
      } else {
        setError(data.error || "Failed to create session")
      }
    } catch (err: any) {
      setError(err.message || "Failed to create session")
    } finally {
      setCreating(false)
    }
  }

  async function cancelSession(sessionId: string) {
    if (!confirm("Are you sure you want to cancel this session?")) return

    try {
      const res = await fetch(`/api/admin/draft/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      })

      const data = await res.json()

      if (data.success) {
        await loadSessions()
      } else {
        setError(data.error || "Failed to cancel session")
      }
    } catch (err: any) {
      setError(err.message || "Failed to cancel session")
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Draft Session Management</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage draft sessions for your league
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Draft Session</DialogTitle>
              <DialogDescription>
                Create a new draft session for the current season
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Draft Type</label>
                <Select value={draftType} onValueChange={(v) => setDraftType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="snake">Snake Draft</SelectItem>
                    <SelectItem value="linear">Linear Draft</SelectItem>
                    <SelectItem value="auction">Auction Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Pick Time Limit (seconds)</label>
                <Input
                  type="number"
                  value={pickTimeLimit}
                  onChange={(e) => setPickTimeLimit(parseInt(e.target.value) || 45)}
                  min={10}
                  max={300}
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createSession} disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Session"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Active Session Card */}
      {activeSession ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Draft Session</CardTitle>
                <CardDescription>Current draft in progress</CardDescription>
              </div>
              <Badge variant="default">Active</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Round</p>
                <p className="text-2xl font-bold">{activeSession.current_round}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pick</p>
                <p className="text-2xl font-bold">{activeSession.current_pick_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Teams</p>
                <p className="text-2xl font-bold">{activeSession.total_teams}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="text-lg font-semibold capitalize">{activeSession.draft_type}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => cancelSession(activeSession.id)}
              >
                Cancel Session
              </Button>
              <Button variant="outline" asChild>
                <a href="/draft/board">View Draft Board</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No active draft session</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create a new session to start drafting
            </p>
          </CardContent>
        </Card>
      )}

      {/* All Sessions List */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Sessions</CardTitle>
            <CardDescription>View and manage all draft sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{session.draft_type} Draft</span>
                      <Badge
                        variant={
                          session.status === "active"
                            ? "default"
                            : session.status === "completed"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {session.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Round {session.current_round}, Pick {session.current_pick_number} •{" "}
                      {session.total_teams} teams
                    </p>
                    {session.started_at && (
                      <p className="text-xs text-muted-foreground">
                        Started: {new Date(session.started_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  {session.status === "active" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => cancelSession(session.id)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
