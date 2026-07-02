"use client"

import { useCallback, useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { QuickLinksCard } from "@/components/admin/quick-links-card"
import { BracketMatch } from "@/components/bracket-match"
import {
  Loader2,
  Network,
  Trophy,
  ArrowRight,
  Users,
  Crown,
  RefreshCw,
} from "lucide-react"
import { getPlayoffRoundLabel, PLAYOFF_ROUND_KEYS } from "@/lib/playoff-rounds"

type SeasonOption = { id: string; name: string; is_current: boolean }

type PlayoffStatus = {
  season: { id: string; name: string }
  seeds: { teamId: string; teamName: string; seed: number; round1Bye: boolean }[]
  hasRound1Byes: boolean
  activeRounds: {
    key: string
    label: string
    matches: Array<{
      id: string
      status: string
      team1?: { name: string }
      team2?: { name: string }
      winner_id?: string
      team1_score?: number
      team2_score?: number
      team1_id: string
      team2_id: string
    }>
    complete: boolean
  }[]
  readiness: { warnings: string[]; errors: string[]; completedRegular: number; scheduledRegular: number }
}

type AdvancementPreview = {
  announcement: {
    fromRoundLabel: string
    toRoundLabel: string
    advancingTeams: { teamId: string; teamName: string }[]
    eliminatedTeams: { teamId: string; teamName: string }[]
  }
}

export function AdminPlayoffsPanel() {
  const [seasons, setSeasons] = useState<SeasonOption[]>([])
  const [seasonId, setSeasonId] = useState<string>("")
  const [status, setStatus] = useState<PlayoffStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [advancePreview, setAdvancePreview] = useState<AdvancementPreview | null>(null)
  const [generatePreview, setGeneratePreview] = useState<{ seeding: { seeds: unknown[]; eliminated: unknown[] } } | null>(null)
  const [supabase, setSupabase] = useState<ReturnType<typeof createBrowserClient> | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (typeof window === "undefined") return
    setSupabase(createBrowserClient())
  }, [])

  const loadSeasons = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase
      .from("seasons")
      .select("id, name, is_current")
      .order("start_date", { ascending: false })
    const rows = (data as SeasonOption[]) ?? []
    setSeasons(rows)
    const current = rows.find((s) => s.is_current) ?? rows[0]
    if (current && !seasonId) setSeasonId(current.id)
  }, [supabase, seasonId])

  const loadStatus = useCallback(async () => {
    if (!seasonId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/seasons/${seasonId}/playoffs`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load playoff status")
      setStatus(data)
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load playoffs",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [seasonId, toast])

  useEffect(() => {
    loadSeasons()
  }, [loadSeasons])

  useEffect(() => {
    if (seasonId) loadStatus()
  }, [seasonId, loadStatus])

  async function handlePreviewGenerate() {
    if (!seasonId) return
    setGenerating(true)
    try {
      const res = await fetch(`/api/admin/seasons/${seasonId}/generate-playoffs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dry_run: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Preview failed")
      setGeneratePreview(data)
      setPreviewOpen(true)
    } catch (err) {
      toast({
        title: "Preview failed",
        description: err instanceof Error ? err.message : "Could not preview seeding",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  async function handleConfirmGenerate() {
    if (!seasonId) return
    setGenerating(true)
    try {
      const res = await fetch(`/api/admin/seasons/${seasonId}/generate-playoffs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replace_existing: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate playoffs")
      toast({
        title: "Playoffs seeded",
        description: `${data.matchesCreated} ${data.firstPlayoffRoundLabel ?? "Round 1"} matches created`,
      })
      setPreviewOpen(false)
      setGeneratePreview(null)
      await loadStatus()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to generate playoffs",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  async function handlePreviewAdvance() {
    if (!seasonId) return
    setAdvancing(true)
    try {
      const res = await fetch(`/api/admin/seasons/${seasonId}/advance-playoffs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dry_run: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Advance preview failed")
      setAdvancePreview(data)
    } catch (err) {
      toast({
        title: "Cannot advance",
        description: err instanceof Error ? err.message : "Advance preview failed",
        variant: "destructive",
      })
    } finally {
      setAdvancing(false)
    }
  }

  async function handleConfirmAdvance() {
    if (!seasonId) return
    setAdvancing(true)
    try {
      const res = await fetch(`/api/admin/seasons/${seasonId}/advance-playoffs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replace_existing: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to advance playoffs")

      const advancing = data.announcement?.advancingTeams ?? []
      const eliminated = data.announcement?.eliminatedTeams ?? []
      toast({
        title: `Advanced to ${data.announcement?.toRoundLabel ?? "next round"}`,
        description: `${advancing.length} team(s) moving on${eliminated.length ? ` · ${eliminated.length} eliminated` : ""}`,
      })
      setAdvancePreview(null)
      await loadStatus()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to advance playoffs",
        variant: "destructive",
      })
    } finally {
      setAdvancing(false)
    }
  }

  const nextRoundReady = status?.activeRounds.some(
    (r) => r.complete && r.key !== PLAYOFF_ROUND_KEYS.FINALS
  )

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-8">
      <AdminPageHeader
        title="Playoff Management"
        description="Seed teams, manage bracket rounds, and advance winners"
      />

      <div className="flex flex-wrap items-center gap-4">
        <Select value={seasonId} onValueChange={setSeasonId}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select season" />
          </SelectTrigger>
          <SelectContent>
            {seasons.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
                {s.is_current ? " (current)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={loadStatus} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
        <Button size="sm" onClick={handlePreviewGenerate} disabled={generating || !seasonId}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Generate playoffs
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handlePreviewAdvance}
          disabled={advancing || !seasonId || !status?.seeds?.length}
        >
          {advancing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
          Advance round
        </Button>
      </div>

      {status?.readiness?.warnings?.length ? (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="pt-4 text-sm text-muted-foreground">
            {status.readiness.warnings.join(" · ")}
          </CardContent>
        </Card>
      ) : null}

      {loading && !status ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {status?.seeds?.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5" />
                  Playoff seeds
                </CardTitle>
                <CardDescription>
                  {status.seeds.length} teams · {status.hasRound1Byes ? "Division winners receive Round 1 byes" : "No Round 1 byes"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seed</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Round 1</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {status.seeds.map((s) => (
                      <TableRow key={s.teamId}>
                        <TableCell className="font-mono">#{s.seed}</TableCell>
                        <TableCell>{s.teamName}</TableCell>
                        <TableCell>
                          {s.round1Bye ? (
                            <Badge variant="secondary">Bye</Badge>
                          ) : (
                            <Badge variant="outline">Plays Round 1</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          {status?.activeRounds?.map((round) =>
            round.matches.length > 0 || status.activeRounds.some((r) => r.key === round.key) ? (
              <Card key={round.key}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{round.label}</CardTitle>
                    {round.complete ? (
                      <Badge className="gap-1">
                        <Crown className="h-3 w-3" />
                        Complete
                      </Badge>
                    ) : (
                      <Badge variant="outline">In progress</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {round.matches.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No matches scheduled yet.</p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {round.matches.map((m) => (
                        <BracketMatch key={m.id} match={m} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null
          )}

          {advancePreview?.announcement ? (
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="text-lg">
                  Advance to {advancePreview.announcement.toRoundLabel}
                </CardTitle>
                <CardDescription>
                  From {advancePreview.announcement.fromRoundLabel} — review teams moving on
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Moving on</p>
                  <ul className="text-sm space-y-1">
                    {advancePreview.announcement.advancingTeams.map((t) => (
                      <li key={t.teamId} className="flex items-center gap-2">
                        <ArrowRight className="h-3 w-3 text-primary" />
                        {t.teamName}
                      </li>
                    ))}
                  </ul>
                </div>
                {advancePreview.announcement.eliminatedTeams.length > 0 ? (
                  <div>
                    <p className="text-sm font-medium mb-2 text-muted-foreground">Eliminated</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {advancePreview.announcement.eliminatedTeams.map((t) => (
                        <li key={t.teamId}>{t.teamName}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <Button onClick={handleConfirmAdvance} disabled={advancing}>
                    {advancing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Confirm advancement
                  </Button>
                  <Button variant="outline" onClick={() => setAdvancePreview(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : nextRoundReady && !advancePreview ? (
            <p className="text-sm text-muted-foreground">
              A round is complete. Click &quot;Advance round&quot; to preview the next bracket.
            </p>
          ) : null}
        </>
      )}

      <QuickLinksCard
        links={[
          { href: "/playoffs", label: "Public bracket", icon: Network },
          { href: "/standings", label: "Standings", icon: Trophy },
          { href: "/admin/league#matches", label: "Manage matches", icon: Trophy },
        ]}
      />

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirm playoff seeding</DialogTitle>
            <DialogDescription>
              Review seeds before creating {getPlayoffRoundLabel(PLAYOFF_ROUND_KEYS.ROUND_1)} matches.
              This replaces existing playoff matches for this season.
            </DialogDescription>
          </DialogHeader>
          {generatePreview?.seeding ? (
            <div className="text-sm space-y-2 py-2">
              <p className="font-medium">
                {(generatePreview.seeding.seeds as { length: number }).length} teams seeded
              </p>
              {(generatePreview.seeding.eliminated as { teamName: string }[])?.length > 0 ? (
                <p className="text-muted-foreground">
                  Eliminated:{" "}
                  {(generatePreview.seeding.eliminated as { teamName: string }[])
                    .map((t) => t.teamName)
                    .join(", ")}
                </p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmGenerate} disabled={generating}>
              Generate matches
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
