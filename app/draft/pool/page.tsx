import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"
import { CoachPoolClient } from "@/components/draft/coach-pool-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CoachPoolEntry, CoachPoolRestriction } from "@/lib/draft-pool-builder/coach-pool"
import { createClient } from "@/lib/supabase/server"

export const metadata = {
  title: "Published Draft Pool | POKE MNKY",
  description: "Review the current season's published Pokémon draft pool and league restrictions.",
}

const PAGE_SIZE = 1000

type PublishedVersion = { id: string; season_id: string; version_number: number; published_at: string | null }
type Season = { id: string; name: string }

async function fetchPublishedVersions(supabase: Awaited<ReturnType<typeof createClient>>) {
  const rows: PublishedVersion[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from("draft_pool_versions").select("id, season_id, version_number, published_at").eq("status", "published").order("published_at", { ascending: false }).range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...((data ?? []) as PublishedVersion[]))
    if ((data?.length ?? 0) < PAGE_SIZE) return rows
  }
}

async function fetchVersionEntries(supabase: Awaited<ReturnType<typeof createClient>>, versionId: string) {
  const rows: CoachPoolEntry[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from("draft_pool_version_entries").select("id, pokemon_id, sheet_name, points, status, tera_banned, is_effective_tera_ban").eq("version_id", versionId).order("sort_order").range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...((data ?? []) as CoachPoolEntry[]))
    if ((data?.length ?? 0) < PAGE_SIZE) return rows
  }
}

async function fetchRestrictions(supabase: Awaited<ReturnType<typeof createClient>>, versionId: string) {
  const rows: CoachPoolRestriction[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from("season_pokemon_restrictions").select("id, pokemon_id, sheet_name, kind, name, note").eq("version_id", versionId).order("created_at").range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...((data ?? []) as CoachPoolRestriction[]))
    if ((data?.length ?? 0) < PAGE_SIZE) return rows
  }
}

export default async function DraftPoolPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login?next=/draft/pool")

  const [{ data: currentSeason }, publishedVersions, requested] = await Promise.all([
    supabase.from("seasons").select("id, name").eq("is_current", true).maybeSingle(),
    fetchPublishedVersions(supabase),
    searchParams,
  ])

  const publishedSeasonIds = [...new Set(publishedVersions.map((version) => version.season_id))]
  const seasonIds = [...new Set([...(currentSeason ? [currentSeason.id] : []), ...publishedSeasonIds])]
  const { data: seasonsData } = seasonIds.length ? await supabase.from("seasons").select("id, name").in("id", seasonIds) : { data: [] }
  const seasons = (seasonsData ?? []) as Season[]
  const seasonById = new Map(seasons.map((season) => [season.id, season]))
  const requestedSeason = requested.season && seasonById.get(requested.season)
  const selectedSeason = requestedSeason ?? (currentSeason as Season | null) ?? seasonById.get(publishedSeasonIds[0] ?? "")

  if (!selectedSeason) {
    return <main className="mx-auto flex min-h-[60dvh] max-w-3xl items-center px-4 py-10"><Card className="w-full"><CardHeader><CardTitle>No season is available</CardTitle></CardHeader><CardContent><Button asChild variant="outline"><Link href="/draft/board">Open draft board</Link></Button></CardContent></Card></main>
  }

  const version = publishedVersions.find((candidate) => candidate.season_id === selectedSeason.id)
  if (!version) {
    return <main className="mx-auto flex min-h-[60dvh] max-w-3xl items-center px-4 py-10"><Card className="w-full"><CardHeader><CardTitle>{`The ${selectedSeason.name} draft pool hasn't been published in the app yet`}</CardTitle></CardHeader><CardContent><Button asChild variant="outline"><Link href="/draft/board">Open the draft board</Link></Button></CardContent></Card></main>
  }

  const [entries, restrictions] = await Promise.all([fetchVersionEntries(supabase, version.id), fetchRestrictions(supabase, version.id)])
  const publishedSeasons = publishedSeasonIds.map((id) => seasonById.get(id)).filter((season): season is Season => Boolean(season)).sort((a, b) => a.name.localeCompare(b.name))

  return <main className="mx-auto w-full max-w-7xl px-4 py-6 md:py-10"><div className="mb-6 flex flex-col gap-3"><Button asChild variant="ghost" className="w-fit"><Link href="/draft/board"><ArrowLeftIcon data-icon="inline-start" />Draft board</Link></Button><div><p className="text-sm font-medium text-primary">Published league pool</p><h1 className="text-3xl font-bold text-balance md:text-4xl">{selectedSeason.name} draft pool</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">Browse official points, Tera eligibility, and team-sheet restrictions before you draft.</p></div></div><CoachPoolClient entries={entries} restrictions={restrictions} season={selectedSeason} publishedSeasons={publishedSeasons} /></main>
}
