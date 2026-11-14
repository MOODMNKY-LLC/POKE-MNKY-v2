"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { FilterIcon, SearchIcon, TriangleAlertIcon } from "lucide-react"
import { PokemonSprite } from "@/components/pokemon-sprite"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  filterAndSortCoachPool,
  restrictionText,
  restrictionsForEntry,
  teraRuleText,
  type CoachPoolEntry,
  type CoachPoolRestriction,
  type CoachPoolSort,
  type CoachPoolStatusFilter,
} from "@/lib/draft-pool-builder/coach-pool"

interface SeasonOption { id: string; name: string }

interface CoachPoolClientProps {
  entries: CoachPoolEntry[]
  restrictions: CoachPoolRestriction[]
  season: SeasonOption
  publishedSeasons: SeasonOption[]
}

function FilterControls({
  status,
  setStatus,
  minPoints,
  setMinPoints,
  maxPoints,
  setMaxPoints,
  effectiveTeraOnly,
  setEffectiveTeraOnly,
  hasRestrictions,
  setHasRestrictions,
  sort,
  setSort,
}: {
  status: CoachPoolStatusFilter
  setStatus: (value: CoachPoolStatusFilter) => void
  minPoints: number
  setMinPoints: (value: number) => void
  maxPoints: number
  setMaxPoints: (value: number) => void
  effectiveTeraOnly: boolean
  setEffectiveTeraOnly: (value: boolean) => void
  hasRestrictions: boolean
  setHasRestrictions: (value: boolean) => void
  sort: CoachPoolSort
  setSort: (value: CoachPoolSort) => void
}) {
  return (
    <div className="flex flex-col gap-5 md:flex-row md:flex-wrap md:items-end md:gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="pool-status">Status</Label>
        <Select value={status} onValueChange={(value) => setStatus(value as CoachPoolStatusFilter)}>
          <SelectTrigger id="pool-status" className="min-h-11 w-full md:w-36"><SelectValue /></SelectTrigger>
          <SelectContent><SelectGroup><SelectItem value="draftable">Draftable</SelectItem><SelectItem value="banned">Banned</SelectItem><SelectItem value="all">All</SelectItem></SelectGroup></SelectContent>
        </Select>
      </div>
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="min-points">Min points</Label>
          <Input id="min-points" type="number" min={1} max={20} value={minPoints} onChange={(event) => setMinPoints(Math.min(20, Math.max(1, Number(event.target.value) || 1)))} className="min-h-11 md:w-24" />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="max-points">Max points</Label>
          <Input id="max-points" type="number" min={1} max={20} value={maxPoints} onChange={(event) => setMaxPoints(Math.min(20, Math.max(1, Number(event.target.value) || 20)))} className="min-h-11 md:w-24" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="pool-sort">Sort</Label>
        <Select value={sort} onValueChange={(value) => setSort(value as CoachPoolSort)}>
          <SelectTrigger id="pool-sort" className="min-h-11 w-full md:w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectGroup><SelectItem value="points-desc">Points: high to low</SelectItem><SelectItem value="points-asc">Points: low to high</SelectItem><SelectItem value="name">Name</SelectItem></SelectGroup></SelectContent>
        </Select>
      </div>
      <Label className="flex min-h-11 items-center gap-3"><Checkbox checked={effectiveTeraOnly} onCheckedChange={(checked) => setEffectiveTeraOnly(checked === true)} />Effective Tera ban only</Label>
      <Label className="flex min-h-11 items-center gap-3"><Checkbox checked={hasRestrictions} onCheckedChange={(checked) => setHasRestrictions(checked === true)} />Has restrictions</Label>
    </div>
  )
}

function DetailContent({ entry, restrictions }: { entry: CoachPoolEntry; restrictions: CoachPoolRestriction[] }) {
  const matchedRestrictions = restrictionsForEntry(entry, restrictions)
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        {entry.pokemon_id !== null && <PokemonSprite name={entry.sheet_name} pokemonId={entry.pokemon_id} size="lg" />}
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-2xl font-bold text-balance">{entry.sheet_name}</p>
          <div className="flex flex-wrap gap-2"><Badge variant="secondary">{entry.points} pts</Badge>{entry.status === "banned" && <Badge variant="destructive">Banned</Badge>}{entry.is_effective_tera_ban && <Badge variant="outline">Tera banned</Badge>}</div>
        </div>
      </div>
      <p className="text-sm leading-relaxed">{teraRuleText(entry)}</p>
      <section className="flex flex-col gap-3 text-destructive" aria-labelledby="league-rules-heading">
        <div className="flex items-center gap-2"><TriangleAlertIcon className="size-5 shrink-0" aria-hidden="true" /><h3 id="league-rules-heading" className="font-semibold">League rules</h3></div>
        {matchedRestrictions.length > 0 ? (
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed">
            {matchedRestrictions.map((restriction) => <li key={restriction.id}><span className="font-medium">{restrictionText(restriction)}</span>{restriction.note ? ` — ${restriction.note}` : ""}</li>)}
          </ul>
        ) : <p className="text-sm">No additional restrictions are listed.</p>}
      </section>
      <p className="text-sm text-muted-foreground">These are league rules for your team sheet. You can still draft this Pokémon.</p>
    </div>
  )
}

export function CoachPoolClient({ entries, restrictions, season, publishedSeasons }: CoachPoolClientProps) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<CoachPoolStatusFilter>("draftable")
  const [minPoints, setMinPoints] = useState(1)
  const [maxPoints, setMaxPoints] = useState(20)
  const [effectiveTeraOnly, setEffectiveTeraOnly] = useState(false)
  const [hasRestrictions, setHasRestrictions] = useState(false)
  const [sort, setSort] = useState<CoachPoolSort>("points-desc")
  const [selected, setSelected] = useState<CoachPoolEntry | null>(null)
  const filteredEntries = useMemo(() => filterAndSortCoachPool(entries, restrictions, { search, status, minPoints, maxPoints, effectiveTeraBanOnly: effectiveTeraOnly, hasRestrictions, sort }), [entries, restrictions, search, status, minPoints, maxPoints, effectiveTeraOnly, hasRestrictions, sort])
  const filterProps = { status, setStatus, minPoints, setMinPoints, maxPoints, setMaxPoints, effectiveTeraOnly, setEffectiveTeraOnly, hasRestrictions, setHasRestrictions, sort, setSort }

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-20 -mx-4 flex flex-col gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-lg md:border">
        <div className="flex gap-2">
          <div className="relative flex-1"><SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Pokémon" aria-label="Search Pokémon by name" className="min-h-11 pl-10" /></div>
          <Sheet><SheetTrigger asChild><Button variant="outline" className="min-h-11 md:hidden"><FilterIcon data-icon="inline-start" />Filters</Button></SheetTrigger><SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto"><SheetHeader><SheetTitle>Filter draft pool</SheetTitle><SheetDescription>Narrow the published pool by status, points, rules, and sort order.</SheetDescription></SheetHeader><div className="px-4 pb-6"><FilterControls {...filterProps} /></div></SheetContent></Sheet>
        </div>
        <div className="hidden md:block"><FilterControls {...filterProps} /></div>
      </div>

      {publishedSeasons.length > 1 && <div className="flex items-center gap-3"><Label htmlFor="season-select">Season</Label><Select value={season.id} onValueChange={(id) => router.push(`/draft/pool?season=${encodeURIComponent(id)}`)}><SelectTrigger id="season-select" className="min-h-11 w-full max-w-xs"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{publishedSeasons.map((option) => <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>)}</SelectGroup></SelectContent></Select></div>}

      <p className="text-sm text-muted-foreground" aria-live="polite">{filteredEntries.length} Pokémon in {season.name}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredEntries.map((entry) => {
          const hasWarning = restrictionsForEntry(entry, restrictions).length > 0
          return <button key={entry.id} type="button" onClick={() => setSelected(entry)} className="min-h-24 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><Card className="h-full transition-colors hover:bg-accent/40"><CardHeader className="flex-row items-center gap-3 pb-2">{entry.pokemon_id !== null && <PokemonSprite name={entry.sheet_name} pokemonId={entry.pokemon_id} size="sm" />}<div className="min-w-0 flex-1"><CardTitle className="truncate text-base">{entry.sheet_name}</CardTitle><p className="text-sm font-semibold text-muted-foreground">{entry.points} pts</p></div>{hasWarning && <TriangleAlertIcon className="size-5 shrink-0 text-destructive" aria-label="Has league restrictions" />}</CardHeader><CardContent className="flex flex-wrap gap-2">{entry.status === "banned" && <Badge variant="destructive">Banned</Badge>}{entry.is_effective_tera_ban && <Badge variant="outline">Tera banned</Badge>}</CardContent></Card></button>
        })}
      </div>

      {filteredEntries.length === 0 && <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No Pokémon match these filters.</CardContent></Card>}

      {isMobile ? <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto"><SheetHeader><SheetTitle>Pokémon details</SheetTitle><SheetDescription>Published points and league restrictions.</SheetDescription></SheetHeader><div className="px-4 pb-6">{selected && <DetailContent entry={selected} restrictions={restrictions} />}</div></SheetContent></Sheet> : <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><DialogContent><DialogHeader><DialogTitle>Pokémon details</DialogTitle><DialogDescription>Published points and league restrictions.</DialogDescription></DialogHeader>{selected && <DetailContent entry={selected} restrictions={restrictions} />}</DialogContent></Dialog>}
    </div>
  )
}
