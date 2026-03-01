"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { Settings, Database, Loader2 } from "lucide-react"

interface Season {
  id: string
  name: string
  is_current: boolean
}

interface SeasonRule {
  id: string
  season_id: string
  rule_category: string
  rule_key: string
  rule_value: unknown
}

export default function AdminDraftPoolRulesPage() {
  const router = useRouter()
  const [season, setSeason] = useState<Season | null>(null)
  const [rules, setRules] = useState<SeasonRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filterGen, setFilterGen] = useState<string>("")
  const [filterGame, setFilterGame] = useState<string>("")
  const [includeLegendary, setIncludeLegendary] = useState(false)
  const [includeMythical, setIncludeMythical] = useState(false)
  const [includeParadox, setIncludeParadox] = useState(false)
  const [generateStatus, setGenerateStatus] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/auth/login")
        return
      }
      supabase.from("profiles").select("role").eq("id", data.user.id).single().then(({ data: profile }) => {
        if (profile?.role !== "admin" && profile?.role !== "commissioner") {
          router.push("/admin")
          return
        }
        load()
      })
    })
  }, [router])

  async function load() {
    const supabase = createBrowserClient()
    const { data: seasonData } = await supabase
      .from("seasons")
      .select("id, name, is_current")
      .eq("is_current", true)
      .single()
    setSeason(seasonData ?? null)
    if (seasonData?.id) {
      const { data: rulesData } = await supabase
        .from("season_rules")
        .select("id, season_id, rule_category, rule_key, rule_value")
        .eq("season_id", seasonData.id)
      setRules(rulesData ?? [])
    }
    setLoading(false)
  }

  async function saveRule(category: string, key: string, value: unknown) {
    if (!season) return
    setSaving(true)
    const supabase = createBrowserClient()
    await supabase.from("season_rules").upsert(
      { season_id: season.id, rule_category: category, rule_key: key, rule_value: value ?? null },
      { onConflict: "season_id,rule_category,rule_key" }
    )
    await load()
    setSaving(false)
  }

  async function generateDraftPool() {
    if (!season) return
    setGenerateStatus("Generating...")
    try {
      const res = await fetch("/api/admin/draft-pool-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season_id: season.id,
          generation: filterGen ? parseInt(filterGen, 10) : undefined,
          game_code: filterGame || undefined,
          include_legendary: includeLegendary,
          include_mythical: includeMythical,
          include_paradox: includeParadox,
        }),
      })
      const data = await res.json()
      setGenerateStatus(res.ok ? `Added ${data?.inserted ?? 0} to season draft pool` : (data?.error ?? "Failed"))
    } catch {
      setGenerateStatus("Request failed")
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Draft pool & season rules</h1>
          <p className="text-muted-foreground">
            Set season rules and build draft pool from canonical Pokemon (pokemon_master). Filter by game or generation.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin">Back to Dashboard</Link>
        </Button>
      </div>

      {season && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Season rules
              </CardTitle>
              <CardDescription>
                Current season: {season.name}. Add or edit rule toggles (e.g. transaction_cap=10, draft_budget=120, tera_budget=15, tera_mode=restricted).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Use API or Supabase to upsert season_rules (season_id, rule_category, rule_key, rule_value). Categories: season, draft, battle.
              </p>
              {rules.length > 0 && (
                <ul className="text-sm space-y-1">
                  {rules.map((r) => (
                    <li key={r.id}>
                      {r.rule_category} / {r.rule_key} = {JSON.stringify(r.rule_value)}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Build draft pool from pokemon_master
              </CardTitle>
              <CardDescription>
                Filter by generation, game (pokemon_games), and legendary/mythical/paradox. Generates season_draft_pool rows.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Generation (optional)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 9"
                    value={filterGen}
                    onChange={(e) => setFilterGen(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Game code (optional)</Label>
                  <Input
                    placeholder="e.g. SV, FRLG"
                    value={filterGame}
                    onChange={(e) => setFilterGame(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2">
                  <Checkbox checked={includeLegendary} onCheckedChange={(c) => setIncludeLegendary(!!c)} />
                  Include legendary
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox checked={includeMythical} onCheckedChange={(c) => setIncludeMythical(!!c)} />
                  Include mythical
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox checked={includeParadox} onCheckedChange={(c) => setIncludeParadox(!!c)} />
                  Include paradox
                </label>
              </div>
              <Button onClick={generateDraftPool} disabled={!!generateStatus}>
                Generate draft pool
              </Button>
              {generateStatus && <p className="text-sm text-muted-foreground">{generateStatus}</p>}
            </CardContent>
          </Card>
        </>
      )}

      {!season && <p className="text-muted-foreground">No current season set.</p>}
    </div>
  )
}
