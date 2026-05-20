"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Sparkles, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

type TeamOption = { id: string; name: string; coach_name?: string | null }

type MatchSubmitFormProps = {
  backHref: string
  successRedirect?: string
}

export function MatchSubmitForm({
  backHref,
  successRedirect,
}: MatchSubmitFormProps) {
  const router = useRouter()
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [teamsLoading, setTeamsLoading] = useState(true)
  const [useAI, setUseAI] = useState(false)
  const [aiText, setAiText] = useState("")
  const [parsedResult, setParsedResult] = useState<Record<string, unknown> | null>(
    null
  )
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [week, setWeek] = useState("")
  const [team1Id, setTeam1Id] = useState("")
  const [team2Id, setTeam2Id] = useState("")
  const [team1Score, setTeam1Score] = useState("")
  const [team2Score, setTeam2Score] = useState("")
  const [replayUrl, setReplayUrl] = useState("")

  useEffect(() => {
    fetch("/api/matches/teams")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.teams)) setTeams(data.teams)
      })
      .catch(() => setTeams([]))
      .finally(() => setTeamsLoading(false))
  }, [])

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? id

  const handleAIParse = async () => {
    if (!aiText.trim()) return
    setLoading(true)
    try {
      const response = await fetch("/api/ai/parse-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText }),
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error ?? "Failed to parse result")
        return
      }

      if (data.status === "success") {
        toast.success(data.message ?? "Match recorded")
        if (successRedirect) router.push(successRedirect)
        return
      }

      if (data.parsed) {
        setParsedResult(data.parsed)
        const p = data.parsed as {
          week: number
          team_a: string
          team_b: string
          winner: string
          differential: number
          proof_url?: string
        }
        setWeek(String(p.week))
        const a = teams.find((t) => t.name === p.team_a)
        const b = teams.find((t) => t.name === p.team_b)
        if (a) setTeam1Id(a.id)
        if (b) setTeam2Id(b.id)
        if (p.winner === p.team_a) {
          setTeam1Score(String(p.differential))
          setTeam2Score("0")
        } else {
          setTeam1Score("0")
          setTeam2Score(String(p.differential))
        }
        setReplayUrl(p.proof_url ?? "")
      }

      if (data.status === "needs_review") {
        toast.warning(data.message ?? "Needs manual review")
      } else if (data.status === "error") {
        toast.error(data.message ?? "Parse failed")
      }
    } catch {
      toast.error("Failed to parse result")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!week || !team1Id || !team2Id) {
      toast.error("Week and both teams are required")
      return
    }

    const s1 = Number.parseInt(team1Score, 10)
    const s2 = Number.parseInt(team2Score, 10)
    if (Number.isNaN(s1) || Number.isNaN(s2)) {
      toast.error("Enter valid scores")
      return
    }

    const winnerId = s1 > s2 ? team1Id : s2 > s1 ? team2Id : ""
    if (!winnerId) {
      toast.error("Scores cannot be tied")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/matches/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          week: Number.parseInt(week, 10),
          team1_id: team1Id,
          team2_id: team2Id,
          winner_id: winnerId,
          team1_score: s1,
          team2_score: s2,
          replay_url: replayUrl || null,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error ?? "Submit failed")
        return
      }

      toast.success(data.message ?? "Result submitted")
      if (data.warnings?.discord) {
        toast.warning(`Saved; Discord: ${data.warnings.discord}`)
      }
      if (successRedirect) router.push(successRedirect)
    } catch {
      toast.error("Failed to submit result")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Submit Match Result</h1>
        <p className="text-muted-foreground">
          Record a completed battle. Standings and Discord update automatically.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <Button
          variant={useAI ? "default" : "outline"}
          onClick={() => setUseAI(true)}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          AI Parse
        </Button>
        <Button
          variant={!useAI ? "default" : "outline"}
          onClick={() => setUseAI(false)}
        >
          Manual Entry
        </Button>
      </div>

      {useAI ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>AI Result Parser</CardTitle>
            <CardDescription>
              Paste your battle result text (Discord format works)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Week 5: Team A defeated Team B 6-4..."
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              rows={6}
            />
            <Button onClick={handleAIParse} disabled={loading || !aiText.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Parse &amp; Submit
            </Button>
            {parsedResult && (
              <Badge variant="secondary">Parsed — review manual tab if needed</Badge>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Match Details</CardTitle>
          {teamsLoading && (
            <CardDescription>Loading league teams…</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="week">Week</Label>
              <Input
                id="week"
                type="number"
                min={1}
                value={week}
                onChange={(e) => setWeek(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Team 1</Label>
              <Select value={team1Id} onValueChange={setTeam1Id}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Team 2</Label>
              <Select value={team2Id} onValueChange={setTeam2Id}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{teamName(team1Id) || "Team 1"} score (KOs)</Label>
              <Input
                type="number"
                min={0}
                value={team1Score}
                onChange={(e) => setTeam1Score(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{teamName(team2Id) || "Team 2"} score (KOs)</Label>
              <Input
                type="number"
                min={0}
                value={team2Score}
                onChange={(e) => setTeam2Score(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="replay">Replay URL (optional)</Label>
            <Input
              id="replay"
              type="url"
              placeholder="https://..."
              value={replayUrl}
              onChange={(e) => setReplayUrl(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting || teamsLoading}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Submit Result
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
