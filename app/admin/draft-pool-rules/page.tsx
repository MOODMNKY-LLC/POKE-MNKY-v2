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
  const [masterRegistry, setMasterRegistry] = useState<{
    pokemon_master_count: number
    draft_pool_rows_total: number
    draft_pool_rows_with_generation: number
    pokemon_games_rows: number
  } | null>(null)
  const [backfillStatus, setBackfillStatus] = useState<string | null>(null)
  const [bootstrapStatus, setBootstrapStatus] = useState<string | null>(null)

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
      await refreshMasterRegistry()
    }
    setLoading(false)
  }

  async function refreshMasterRegistry() {
    try {
      const res = await fetch("/api/admin/pokemon-master/backfill")
      const data = await res.json()
      if (data.success) {
        setMasterRegistry({
          pokemon_master_count: data.pokemon_master_count ?? 0,
          draft_pool_rows_total: data.draft_pool_rows_total ?? 0,
          draft_pool_rows_with_generation: data.draft_pool_rows_with_generation ?? 0,
          pokemon_games_rows: data.pokemon_games_rows ?? 0,
        })
      }
    } catch {
      setMasterRegistry(null)
    }
  }

  async function bootstrapFromShowdown() {
    if (!season) {
      setBootstrapStatus("No current season loaded.")
      return
    }
    const gen = filterGen ? parseInt(filterGen, 10) : 9
    setBootstrapStatus("Seeding from Showdown tiers...")
    try {
      const res = await fetch("/api/admin/draft-pool/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season_id: season.id, generation: Number.isFinite(gen) ? gen : 9 }),
      })
      const data = await res.json()
      if (!res.ok) {
        setBootstrapStatus(data?.error ?? "Bootstrap failed")
        return
      }
      const parts: string[] = []
      if (data.catalog?.needed) {
        const b = data.catalog.before
        const a = data.catalog.after
        parts.push(`catalog ${b.unified}→${a.unified} unified`)
        if (data.catalog.showdown_ingest?.ok) parts.push("Showdown ingest ok")
        if (data.catalog.pokeapi_sync?.synced) {
          parts.push(`PokeAPI +${data.catalog.pokeapi_sync.synced}`)
        }
        if (data.catalog.pokenode_cache?.synced) {
          parts.push(`pokenode cache +${data.catalog.pokenode_cache.synced}`)
        }
      }
      if (data.showdown_seed?.inserted) {
        parts.push(`${data.showdown_seed.inserted} added to draft board`)
      } else if (data.draft_pool_after > data.draft_pool_before) {
        parts.push(`${data.draft_pool_after} rows on draft board`)
      }
      if (data.master?.upserted) {
        parts.push(`${data.master.upserted} registered in pokemon_master (${data.master_source})`)
      }
      if (data.trimmed_removed) {
        parts.push(`removed ${data.trimmed_removed} non-Gen-${gen} board rows`)
      }
      let msg = parts.length ? parts.join(" · ") : "Bootstrap complete"
      if (data.warning) msg += `. ${data.warning}`
      if (!data.ready_for_generate) {
        msg = `Not ready to generate yet. ${data.warning ?? msg}`
      } else {
        msg += " — you can run Generate draft pool next."
      }
      setBootstrapStatus(msg)
      await refreshMasterRegistry()
      await refreshPoolStatus()
    } catch {
      setBootstrapStatus("Request failed")
    }
  }

  async function backfillMasterRegistry() {
    if (!season) {
      setBackfillStatus("No current season loaded.")
      return
    }
    setBackfillStatus("Building registry...")
    try {
      const res = await fetch("/api/admin/pokemon-master/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season_id: season.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setBackfillStatus(data?.error ?? "Backfill failed")
        return
      }
      let msg = `Registered ${data.upserted ?? 0} Pokémon (${data.after_count ?? 0} in pokemon_master, ${data.source_entries ?? 0} unique names from ${data.draft_pool_rows_scanned ?? 0} board rows)`
      if (data.warning) msg += `. ${data.warning}`
      if ((data.upserted ?? 0) === 0) {
        msg = `Registered 0. ${data.warning ?? "Publish a draft board pool first, then try again."}`
      }
      setBackfillStatus(msg)
      await refreshMasterRegistry()
    } catch {
      setBackfillStatus("Request failed")
    }
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
      if (data?.backfill?.upserted) {
        msg = `Auto-built pokemon_master (${data.backfill.upserted} registered). ${msg}`
      }
      if (data?.warning) msg += `. ${data.warning}`
      setGenerateStatus(msg)
      if (res.ok) {
        await refreshPoolStatus()
        await refreshMasterRegistry()
      }
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
                Builds season_draft_pool from the canonical pokemon_master registry. Generate auto-populates the
                registry from draft_pool when it is empty.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {masterRegistry && (
                <Alert>
                  <AlertTitle>Pokémon registry</AlertTitle>
                  <AlertDescription className="space-y-2 text-sm">
                    <p>
                      <strong>{masterRegistry.pokemon_master_count}</strong> species in pokemon_master ·{" "}
                      <strong>{masterRegistry.draft_pool_rows_total}</strong> rows on draft board (
                      {masterRegistry.draft_pool_rows_with_generation} with generation set) ·{" "}
                      <strong>{masterRegistry.pokemon_games_rows}</strong> pokemon_games rows
                    </p>
                    {masterRegistry.draft_pool_rows_total === 0 &&
                      masterRegistry.pokemon_master_count === 0 && (
                        <div className="space-y-2">
                          <p className="text-amber-600 dark:text-amber-500">
                            Cold start: board and registry are empty. Seed from Showdown runs Showdown ingest +
                            PokeAPI sync (Edge Functions) and pokenode-ts fallback, then builds the draft board and
                            registry. Then Generate, then Publish. Full sync also lives at{" "}
                            <Link href="/admin/sync" className="underline">
                              Admin → Sync
                            </Link>
                            .
                          </p>
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={bootstrapFromShowdown}
                            disabled={bootstrapStatus?.startsWith("Seeding")}
                          >
                            0. Seed from Showdown (Gen {filterGen || "9"})
                          </Button>
                          {bootstrapStatus && (
                            <p className="text-muted-foreground text-xs">{bootstrapStatus}</p>
                          )}
                        </div>
                      )}
                    {masterRegistry.draft_pool_rows_total === 0 &&
                      masterRegistry.pokemon_master_count > 0 && (
                        <p className="text-amber-600 dark:text-amber-500">
                          Draft board is empty but registry has species. Run Generate, then Publish to draft board.
                        </p>
                      )}
                    {masterRegistry.pokemon_master_count === 0 && masterRegistry.draft_pool_rows_total > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span>Registry is empty; draft board has rows.</span>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={backfillMasterRegistry}
                          disabled={backfillStatus?.startsWith("Building")}
                        >
                          Populate registry from draft board
                        </Button>
                      </div>
                    )}
                    {backfillStatus && <p className="text-muted-foreground text-sm">{backfillStatus}</p>}
                  </AlertDescription>
                </Alert>
              )}

              <Alert>
                <AlertTitle>Game code (optional)</AlertTitle>
                <AlertDescription className="text-sm">
                  Filters to species listed in the <code className="text-xs">pokemon_games</code> table for that code
                  (e.g. SV for Scarlet/Violet, FRLG). Leave blank to use generation and legendary/mythical/paradox only.
                  If pokemon_games is empty, any game code returns 0 matches — use generation filter instead.
                </AlertDescription>
              </Alert>

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
                    placeholder="Leave empty unless pokemon_games is populated"
                    value={filterGame}
                    onChange={(e) => setFilterGame(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    e.g. SV — requires rows in pokemon_games linking species to that game
                  </p>
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
