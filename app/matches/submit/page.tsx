"use client"

import { useState } from "react"
import { ArrowLeft, Sparkles, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

const MOCK_TEAMS = [
  "Detroit Drakes",
  "Grand Rapids Garchomp",
  "Lansing Legends",
  "Ann Arbor Alakazams",
  "Flint Fireblasts",
  "Kalamazoo Kings",
]

export default function SubmitResultPage() {
  const [useAI, setUseAI] = useState(false)
  const [aiText, setAiText] = useState("")
  const [parsedResult, setParsedResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Manual form state
  const [week, setWeek] = useState("")
  const [team1, setTeam1] = useState("")
  const [team2, setTeam2] = useState("")
  const [team1Score, setTeam1Score] = useState("")
  const [team2Score, setTeam2Score] = useState("")
  const [replayUrl, setReplayUrl] = useState("")

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

      if (data.parsed) {
        setParsedResult(data.parsed)
        setWeek(data.parsed.week.toString())
        setTeam1(data.parsed.team_a)
        setTeam2(data.parsed.team_b)
        const winner = data.parsed.winner
        if (winner === data.parsed.team_a) {
          setTeam1Score(data.parsed.differential.toString())
          setTeam2Score("0")
        } else {
          setTeam1Score("0")
          setTeam2Score(data.parsed.differential.toString())
        }
        setReplayUrl(data.parsed.proof_url || "")
      }
    } catch (error) {
      console.error("AI parse error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    const differential = Math.abs(Number.parseInt(team1Score) - Number.parseInt(team2Score))
    const winner = Number.parseInt(team1Score) > Number.parseInt(team2Score) ? team1 : team2

    console.log("[v0] Submitting result:", {
      week,
      team1,
      team2,
      team1Score,
      team2Score,
      winner,
      differential,
      replayUrl,
    })

    alert("Result submitted successfully! (Mock)")
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <Link href="/matches">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Matches
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Submit Match Result</h1>
        <p className="text-muted-foreground">Enter match details manually or use AI to parse from text.</p>
      </div>

      {/* AI Toggle */}
      <div className="flex items-center gap-2 mb-6">
        <Button variant={useAI ? "default" : "outline"} onClick={() => setUseAI(!useAI)} className="flex-1">
          <Sparkles className="h-4 w-4 mr-2" />
          {useAI ? "Using AI Parser" : "Enable AI Parser"}
        </Button>
      </div>

      {useAI && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>AI Result Parser</CardTitle>
            <CardDescription>
              Paste match result text from Discord or anywhere. AI will extract the details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder={`Example: "Week 14: Detroit Drakes beat Grand Rapids Garchomp 6-4. Replay: https://replay.pokemonshowdown.com/gen9ou-123456"`}
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              rows={4}
            />
            <Button onClick={handleAIParse} disabled={loading || !aiText.trim()} className="w-full">
              <Sparkles className="h-4 w-4 mr-2" />
              {loading ? "Parsing..." : "Parse with AI"}
            </Button>

            {parsedResult && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={parsedResult.needs_review ? "destructive" : "default"}>
                    {parsedResult.needs_review ? "Needs Review" : "Parsed Successfully"}
                  </Badge>
                </div>
                {parsedResult.needs_review && <p className="text-sm text-muted-foreground">{parsedResult.notes}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Form */}
      <Card>
        <CardHeader>
          <CardTitle>Match Details</CardTitle>
          <CardDescription>
            {useAI ? "Review and edit AI-parsed data" : "Enter match information manually"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Week Number</Label>
            <Input type="number" placeholder="14" value={week} onChange={(e) => setWeek(e.target.value)} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Team 1</Label>
              <Select value={team1} onValueChange={setTeam1}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_TEAMS.map((team) => (
                    <SelectItem key={team} value={team}>
                      {team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Team 2</Label>
              <Select value={team2} onValueChange={setTeam2}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_TEAMS.map((team) => (
                    <SelectItem key={team} value={team}>
                      {team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Team 1 KOs</Label>
              <Input type="number" placeholder="6" value={team1Score} onChange={(e) => setTeam1Score(e.target.value)} />
            </div>

            <div>
              <Label>Team 2 KOs</Label>
              <Input type="number" placeholder="4" value={team2Score} onChange={(e) => setTeam2Score(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Replay URL (Optional)</Label>
            <Input
              placeholder="https://replay.pokemonshowdown.com/..."
              value={replayUrl}
              onChange={(e) => setReplayUrl(e.target.value)}
            />
          </div>

          {team1Score && team2Score && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium">
                Result: {Number.parseInt(team1Score) > Number.parseInt(team2Score) ? team1 : team2} wins
              </p>
              <p className="text-sm text-muted-foreground">
                Differential: {Math.abs(Number.parseInt(team1Score) - Number.parseInt(team2Score))} KOs
              </p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!week || !team1 || !team2 || !team1Score || !team2Score}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            Submit Result
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
