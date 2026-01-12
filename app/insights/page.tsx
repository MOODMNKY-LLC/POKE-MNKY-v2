"use client"

import { useState } from "react"
import { Sparkles, TrendingUp, Trophy, Target, Zap } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const MOCK_INSIGHTS = {
  weekly_recap: `Week 14 brought several thrilling matchups to the Average at Best Draft League! The Detroit Drakes secured a commanding 6-4 victory over the Grand Rapids Garchomp, extending their winning streak to 3 games. Meanwhile, the Lansing Legends pulled off the upset of the week, defeating the previously undefeated Ann Arbor Alakazams in a nail-biter that went down to the final Pokémon.

In the Lance Conference, standings remain tight with three teams tied at 9-5. The Flint Fireblasts continue to dominate the Kanto Division, while the Sinnoh Division sees a four-way race for playoff positioning.

Top performers of the week include Gengar (Detroit Drakes) with 8 KOs, and Garchomp (Lansing Legends) with 7 KOs. Looking ahead to Week 15, key matchups include the conference showdown between Detroit and Flint, and the divisional clash between Ann Arbor and Kalamazoo.`,
  power_rankings: [
    { rank: 1, team: "Detroit Drakes", record: "10-4", trend: "up", notes: "3-game win streak, dominant offense" },
    {
      rank: 2,
      team: "Flint Fireblasts",
      record: "9-5",
      trend: "stable",
      notes: "Consistent performance, strong defense",
    },
    {
      rank: 3,
      team: "Lansing Legends",
      record: "9-5",
      trend: "up",
      notes: "Recent upset win, momentum building",
    },
    {
      rank: 4,
      team: "Ann Arbor Alakazams",
      record: "9-5",
      trend: "down",
      notes: "First loss, need to regroup",
    },
    { rank: 5, team: "Grand Rapids Garchomp", record: "8-6", trend: "down", notes: "Struggling on offense" },
  ],
  top_performers: [
    { pokemon: "Gengar", team: "Detroit Drakes", kos: 42, matches: 14, avg: 3.0 },
    { pokemon: "Garchomp", team: "Lansing Legends", kos: 38, matches: 14, avg: 2.7 },
    { pokemon: "Charizard", team: "Flint Fireblasts", kos: 35, matches: 13, avg: 2.7 },
  ],
  predictions: [
    {
      matchup: "Detroit Drakes vs Flint Fireblasts",
      prediction: "Detroit by 2 KOs",
      confidence: "Medium",
      reasoning: "Detroit's offensive momentum vs Flint's defensive stability creates a close matchup",
    },
    {
      matchup: "Ann Arbor vs Kalamazoo",
      prediction: "Ann Arbor by 3 KOs",
      confidence: "High",
      reasoning: "Ann Arbor's superior roster depth should prevail despite recent setback",
    },
  ],
}

export default function InsightsPage() {
  const [selectedWeek, setSelectedWeek] = useState("14")
  const [loading, setLoading] = useState(false)
  const [recapText, setRecapText] = useState(MOCK_INSIGHTS.weekly_recap)

  const generateRecap = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/ai/weekly-recap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_number: Number.parseInt(selectedWeek) }),
      })

      const data = await response.json()
      if (data.recap) {
        setRecapText(data.recap)
      }
    } catch (error) {
      console.error("Failed to generate recap:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">League Insights</h1>
        <p className="text-muted-foreground">AI-powered analysis, predictions, and weekly recaps.</p>
      </div>

      <Tabs defaultValue="recap" className="space-y-6">
        <TabsList>
          <TabsTrigger value="recap">
            <Sparkles className="h-4 w-4 mr-2" />
            Weekly Recap
          </TabsTrigger>
          <TabsTrigger value="rankings">
            <TrendingUp className="h-4 w-4 mr-2" />
            Power Rankings
          </TabsTrigger>
          <TabsTrigger value="performers">
            <Trophy className="h-4 w-4 mr-2" />
            Top Performers
          </TabsTrigger>
          <TabsTrigger value="predictions">
            <Target className="h-4 w-4 mr-2" />
            AI Predictions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recap">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>AI-Generated Weekly Recap</CardTitle>
                  <CardDescription>Commissioner-style summary of the week's action</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">Week 12</SelectItem>
                      <SelectItem value="13">Week 13</SelectItem>
                      <SelectItem value="14">Week 14</SelectItem>
                      <SelectItem value="15">Week 15</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={generateRecap} disabled={loading}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {loading ? "Generating..." : "Regenerate"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-invert max-w-none">
                <p className="whitespace-pre-wrap leading-relaxed">{recapText}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rankings">
          <Card>
            <CardHeader>
              <CardTitle>Power Rankings</CardTitle>
              <CardDescription>Teams ranked by recent performance and strength</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MOCK_INSIGHTS.power_rankings.map((team) => (
                  <div key={team.rank} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-muted-foreground w-8">{team.rank}</span>
                      {team.trend === "up" && <TrendingUp className="h-5 w-5 text-green-400" />}
                      {team.trend === "down" && <TrendingUp className="h-5 w-5 text-red-400 rotate-180" />}
                      {team.trend === "stable" && <div className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{team.team}</h3>
                      <p className="text-sm text-muted-foreground">{team.notes}</p>
                    </div>
                    <Badge variant="outline">{team.record}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performers">
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Most KOs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{MOCK_INSIGHTS.top_performers[0].kos}</div>
                <p className="text-sm text-muted-foreground">{MOCK_INSIGHTS.top_performers[0].pokemon}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Best Average</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{MOCK_INSIGHTS.top_performers[0].avg}</div>
                <p className="text-sm text-muted-foreground">KOs per match</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Most Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{MOCK_INSIGHTS.top_performers[0].matches}</div>
                <p className="text-sm text-muted-foreground">Matches played</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Season Leaders</CardTitle>
              <CardDescription>Top performing Pokémon by KO count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {MOCK_INSIGHTS.top_performers.map((performer, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-xl font-bold text-muted-foreground w-6">{idx + 1}</span>
                      <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center">
                        <Zap className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-semibold">{performer.pokemon}</p>
                        <p className="text-sm text-muted-foreground">{performer.team}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{performer.kos}</p>
                      <p className="text-sm text-muted-foreground">{performer.avg} avg</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions">
          <Card>
            <CardHeader>
              <CardTitle>AI Match Predictions</CardTitle>
              <CardDescription>Predictions for upcoming Week 15 matchups</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {MOCK_INSIGHTS.predictions.map((prediction, idx) => (
                  <div key={idx} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{prediction.matchup}</h3>
                        <p className="text-sm text-muted-foreground mt-1">Prediction: {prediction.prediction}</p>
                      </div>
                      <Badge
                        className={
                          prediction.confidence === "High"
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                        }
                      >
                        {prediction.confidence} Confidence
                      </Badge>
                    </div>
                    <p className="text-sm leading-relaxed">{prediction.reasoning}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
