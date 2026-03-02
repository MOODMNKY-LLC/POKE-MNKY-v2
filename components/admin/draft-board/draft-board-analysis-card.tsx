"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"

interface DraftBoardAnalysis {
  summary: string
  balanceFindings: Array<{
    pokemon_name: string
    point_value: number
    assessment: string
    reasoning: string
  }>
  tierSuggestions: Array<{
    tier: string
    pokemon: string[]
    rationale: string
  }>
  curationRecommendations: Array<{
    action: string
    pokemon_name: string
    suggestion: string
  }>
  pointValueAudit: Array<{
    pokemon_name: string
    current_point_value: number
    suggested_point_value: number
    reasoning: string
  }>
}

interface Season {
  id: string
  name: string
  is_current: boolean
}

export function DraftBoardAnalysisCard() {
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<DraftBoardAnalysis | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [analysisType, setAnalysisType] = useState<"balance" | "tiers" | "curation" | "full">("full")
  const [seasons, setSeasons] = useState<Season[]>([])
  const [seasonId, setSeasonId] = useState<string>("")
  const { toast } = useToast()

  useEffect(() => {
    async function loadSeasons() {
      const supabase = createBrowserClient()
      const { data } = await supabase
        .from("seasons")
        .select("id, name, is_current")
        .order("created_at", { ascending: false })
      if (data?.length) {
        setSeasons(data)
        const current = data.find((s) => s.is_current)
        setSeasonId(current?.id ?? data[0].id)
      }
    }
    loadSeasons()
  }, [])

  async function runAnalysis() {
    setAnalyzing(true)
    setAnalysis(null)
    try {
      const response = await fetch("/api/ai/draft-board-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ analysisType, seasonId: seasonId || undefined }),
      })

      const data = await response.json()

      if (!response.ok) {
        const msg = data.hint ? `${data.error} ${data.hint}` : (data.error || "Analysis failed")
        throw new Error(msg)
      }

      setAnalysis(data.analysis)
      setExpanded(true)
      toast({
        title: "Analysis Complete",
        description: `Analyzed ${data.poolSize} Pokémon in the draft pool`,
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Draft board analysis failed",
        variant: "destructive",
      })
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Draft Board Analysis
        </CardTitle>
        <CardDescription>
          GPT-5.2-powered analysis: balance, tiers, curation, and point value audit
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={runAnalysis}
              disabled={analyzing}
              variant="default"
              className="flex-1 min-w-[140px]"
            >
              {analyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Run Analysis
                </>
              )}
            </Button>
            <select
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              disabled={analyzing}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[140px]"
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.is_current && "(Current)"}
                </option>
              ))}
            </select>
            <select
              value={analysisType}
              onChange={(e) =>
                setAnalysisType(e.target.value as "balance" | "tiers" | "curation" | "full")
              }
              disabled={analyzing}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="full">Full</option>
              <option value="balance">Balance</option>
              <option value="tiers">Tiers</option>
              <option value="curation">Curation</option>
            </select>
          </div>
          <p className="text-xs text-muted-foreground">
            Admin/Commissioner only. Select season and analysis type, then run.
          </p>
        </div>

        {analysis && (
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                {expanded ? (
                  <>
                    Hide results <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Show results <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-4 space-y-4 rounded-lg border bg-muted/30 p-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Summary</h4>
                  <p className="text-muted-foreground">{analysis.summary}</p>
                </div>

                {analysis.balanceFindings?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Balance Findings</h4>
                    <ul className="space-y-1.5 text-muted-foreground">
                      {analysis.balanceFindings.slice(0, 8).map((f, i) => (
                        <li key={i} className="flex flex-wrap gap-1">
                          <span className="font-medium text-foreground">{f.pokemon_name}</span>
                          <span>({f.point_value} pts)</span>
                          <Badge
                            variant={
                              f.assessment === "overvalued"
                                ? "destructive"
                                : f.assessment === "undervalued"
                                  ? "default"
                                  : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {f.assessment}
                          </Badge>
                          <span>— {f.reasoning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.tierSuggestions?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Tier Suggestions</h4>
                    <div className="space-y-2">
                      {analysis.tierSuggestions.map((t, i) => (
                        <div key={i} className="rounded border p-2">
                          <span className="font-medium">Tier {t.tier}:</span>{" "}
                          {t.pokemon?.slice(0, 12).join(", ")}
                          {t.pokemon?.length > 12 && "..."}
                          <p className="text-xs text-muted-foreground mt-1">{t.rationale}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.curationRecommendations?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Curation Recommendations</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      {analysis.curationRecommendations.slice(0, 6).map((c, i) => (
                        <li key={i}>
                          <span className="font-medium text-foreground">{c.pokemon_name}</span> —{" "}
                          {c.action}: {c.suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.pointValueAudit?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Point Value Audit</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      {analysis.pointValueAudit.slice(0, 6).map((a, i) => (
                        <li key={i}>
                          <span className="font-medium text-foreground">{a.pokemon_name}</span>:{" "}
                          {a.current_point_value} → {a.suggested_point_value} pts — {a.reasoning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  )
}
