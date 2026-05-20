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
import { Settings, Database, Loader2, Archive, FolderOpen, Upload } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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
  const [archiveName, setArchiveName] = useState("")
  const [archiveStatus, setArchiveStatus] = useState<string | null>(null)
  const [archivedPools, setArchivedPools] = useState<Array<{ id: string; name: string; created_at?: string }>>([])
  const [poolStatus, setPoolStatus] = useState<{
    season_draft_pool_included: number
    draft_pool_available: number
    draft_pool_drafted: number
    ready_for_draft: boolean
    has_active_session: boolean
  } | null>(null)
  const [publishStatus, setPublishStatus] = useState<string | null>(null)

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
      const [rulesRes, poolsRes] = await Promise.all([
        supabase.from("season_rules").select("id, season_id, rule_category, rule_key, rule_value").eq("season_id", seasonData.id),
        fetch(`/api/admin/draft-pools/archived?season_id=${seasonData.id}`).then((r) => r.json()),
      ])
      setRules(rulesRes?.data ?? [])
      if (poolsRes?.success) setArchivedPools(poolsRes.pools ?? [])
      const statusRes = await fetch(`/api/admin/draft-pools/status?season_id=${seasonData.id}`)
      const statusData = await statusRes.json()
      if (statusData.success) {
        setPoolStatus({
          season_draft_pool_included: statusData.season_draft_pool_included,
          draft_pool_available: statusData.draft_pool_available,
          draft_pool_drafted: statusData.draft_pool_drafted,
          ready_for_draft: statusData.ready_for_draft,
          has_active_session: statusData.has_active_session,
        })
      }
    }
    setLoading(false)
  }

  async function refreshPoolStatus() {
    if (!season) return
    const statusRes = await fetch(`/api/admin/draft-pools/status?season_id=${season.id}`)
    const statusData = await statusRes.json()
    if (statusData.success) {
      setPoolStatus({
        season_draft_pool_included: statusData.season_draft_pool_included,
        draft_pool_available: statusData.draft_pool_available,
        draft_pool_drafted: statusData.draft_pool_drafted,
        ready_for_draft: statusData.ready_for_draft,
        has_active_session: statusData.has_active_session,
      })
    }
  }

  async function publishToBoard() {
    if (!season) return
    setPublishStatus("Publishing...")
    try {
      const res = await fetch("/api/admin/draft-pools/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season_id: season.id }),
      })
      const data = await res.json()
      if (res.ok) {
        const parts = [
          data.published ? `${data.published} new` : null,
          data.updated ? `${data.updated} updated` : null,
          data.skipped_drafted ? `${data.skipped_drafted} drafted (skipped)` : null,
        ].filter(Boolean)
        setPublishStatus(parts.length ? `Published: ${parts.join(", ")}` : "Publish complete")
        await refreshPoolStatus()
      } else {
        setPublishStatus(data.error ?? "Publish failed")
      }
    } catch {
      setPublishStatus("Request failed")
    }
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
      if (!res.ok) {
        setGenerateStatus(data?.error ?? "Failed")
        return
      }
      const inserted = data?.inserted ?? 0
      const matched = data?.matched ?? 0
      let msg = `Added ${inserted} to season draft pool (${matched} matched filters)`
      if (data?.warning) msg += `. ${data.warning}`
      if (inserted === 0 && data?.masters_total === 0) {
        msg =
          "Added 0 — pokemon_master is empty. Run scripts/backfill-pokemon-master.ts once, then Generate again."
      }
      setGenerateStatus(msg)
      if (res.ok) await refreshPoolStatus()
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
      <Alert>
        <AlertTitle>In-app workflow (recommended)</AlertTitle>
        <AlertDescription>
          <strong>1. Generate</strong> → season_draft_pool · <strong>2. Publish</strong> → live draft board ·{" "}
          <strong>3. Create session</strong> in Draft Sessions. Notion/n8n sync is legacy — see{" "}
          <code className="rounded bg-muted px-1">docs/DRAFT-IN-APP-OPERATIONS.md</code>.
        </AlertDescription>
      </Alert>

      {poolStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pool readiness</CardTitle>
            <CardDescription>
              Builder: {poolStatus.season_draft_pool_included} included · Board: {poolStatus.draft_pool_available}{" "}
              available, {poolStatus.draft_pool_drafted} drafted
              {poolStatus.has_active_session && " · Active draft session (publish blocked)"}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

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
              <Button onClick={generateDraftPool} disabled={generateStatus?.startsWith("Generating")}>
                1. Generate draft pool
              </Button>
              {generateStatus && <p className="text-sm text-muted-foreground">{generateStatus}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Publish to draft board
              </CardTitle>
              <CardDescription>
                Copies included season_draft_pool rows into draft_pool for coaches on the live board. Drafted rows are
                never changed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={publishToBoard}
                disabled={publishStatus?.startsWith("Publishing") || poolStatus?.has_active_session}
              >
                2. Publish to draft board
              </Button>
              {publishStatus && <p className="text-sm text-muted-foreground">{publishStatus}</p>}
              {poolStatus && !poolStatus.ready_for_draft && (
                <p className="text-sm text-amber-600 dark:text-amber-500">
                  Board has no available Pokémon. Generate a pool, then publish before starting a draft.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Draft Pool Archive
              </CardTitle>
              <CardDescription>
                Save the current season draft pool for reuse. Archived pools can be loaded when creating a new draft session.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Archive name (e.g. S7 Gen 9 SV Pool)"
                  value={archiveName}
                  onChange={(e) => setArchiveName(e.target.value)}
                  className="max-w-xs"
                />
                <Button
                  onClick={async () => {
                    if (!season || !archiveName.trim()) return
                    setArchiveStatus("Saving...")
                    try {
                      const res = await fetch("/api/admin/draft-pools/archive", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          season_id: season.id,
                          name: archiveName.trim(),
                          source_metadata: {
                            generation: filterGen ? parseInt(filterGen, 10) : undefined,
                            game_code: filterGame || undefined,
                          },
                        }),
                      })
                      const data = await res.json()
                      setArchiveStatus(res.ok ? `Saved ${data?.pokemon_count ?? 0} Pokemon` : (data?.error ?? "Failed"))
                      if (res.ok) {
                        setArchiveName("")
                        const poolsRes = await fetch(`/api/admin/draft-pools/archived?season_id=${season.id}`)
                        const poolsData = await poolsRes.json()
                        if (poolsData.success) setArchivedPools(poolsData.pools ?? [])
                      }
                    } catch {
                      setArchiveStatus("Request failed")
                    }
                  }}
                  disabled={!archiveName.trim() || !!archiveStatus}
                >
                  Save as Archive
                </Button>
              </div>
              {archiveStatus && <p className="text-sm text-muted-foreground">{archiveStatus}</p>}
              {archivedPools.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Archived pools</p>
                  <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                    {archivedPools.map((p) => (
                      <li key={p.id}>
                        {p.name}
                        {p.created_at && (
                          <span className="ml-2 text-xs">
                            ({new Date(p.created_at).toLocaleDateString()})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/admin/draft/sessions">
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Create draft with archived pool
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!season && <p className="text-muted-foreground">No current season set.</p>}
    </div>
  )
}
