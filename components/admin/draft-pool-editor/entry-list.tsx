"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { Plus, Search, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { DraftPoolEntrySnapshot } from "@/lib/draft-pool-builder/diff"
import { searchPokemonCatalog } from "@/lib/draft-pool-builder/editor-client"

const validPoints = (points: number) => points === 99 || (points >= 1 && points <= 20)

type EntryListProps = {
  entries: DraftPoolEntrySnapshot[]
  editable: boolean
  versionId?: string
  onUpdate?: (
    entry: DraftPoolEntrySnapshot,
    values: Pick<DraftPoolEntrySnapshot, "points" | "status" | "tera_banned">,
  ) => Promise<void>
  onRemove?: (entry: DraftPoolEntrySnapshot) => Promise<void>
  onAdd?: (
    entry: Omit<DraftPoolEntrySnapshot, "id" | "is_effective_tera_ban" | "sort_order">,
  ) => Promise<void>
}

type RowProps = Pick<EntryListProps, "editable" | "onUpdate" | "onRemove"> & {
  entry: DraftPoolEntrySnapshot
  layout: "mobile" | "desktop"
}

function EntryBadges({ entry }: { entry: DraftPoolEntrySnapshot }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={entry.status === "banned" ? "destructive" : "secondary"}>
        {entry.status}
      </Badge>
      {entry.tera_banned && entry.points <= 10 ? (
        <Badge variant="outline">Effective Tera ban</Badge>
      ) : null}
      {entry.tera_banned && entry.points > 10 ? (
        <span className="text-xs text-muted-foreground">Tera-legal at &gt;10 pts</span>
      ) : null}
    </div>
  )
}

function EntryRow({ entry, editable, onUpdate, onRemove, layout }: RowProps) {
  const [pointsInput, setPointsInput] = useState(String(entry.points))

  async function commitPoints() {
    const points = Number(pointsInput)
    if (!validPoints(points) || points === entry.points || !onUpdate) {
      setPointsInput(String(entry.points))
      return
    }
    await onUpdate(entry, {
      points,
      status: points === 99 ? "banned" : "draftable",
      tera_banned: entry.tera_banned,
    })
  }

  if (layout === "mobile") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{entry.sheet_name}</CardTitle>
          <EntryBadges entry={entry} />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {editable ? (
            <div className="flex items-end gap-3">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor={`mobile-points-${entry.id}`}>Points</Label>
                <Input
                  id={`mobile-points-${entry.id}`}
                  inputMode="numeric"
                  value={pointsInput}
                  onChange={(event) => setPointsInput(event.target.value)}
                  onBlur={() => void commitPoints()}
                  className="min-h-11"
                />
              </div>
              <div className="flex min-h-11 items-center gap-2">
                <Switch
                  id={`mobile-tera-${entry.id}`}
                  checked={entry.tera_banned}
                  onCheckedChange={(tera_banned) =>
                    void onUpdate?.(entry, {
                      points: entry.points,
                      status: entry.status,
                      tera_banned,
                    })
                  }
                />
                <Label htmlFor={`mobile-tera-${entry.id}`}>Tera list</Label>
              </div>
            </div>
          ) : (
            <p className="text-sm">{entry.points} points</p>
          )}
          {editable ? (
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => void onRemove?.(entry)}
            >
              <Trash2 data-icon="inline-start" />
              Remove
            </Button>
          ) : null}
        </CardContent>
      </Card>
    )
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{entry.sheet_name}</TableCell>
      <TableCell>
        {editable ? (
          <Input
            aria-label={`${entry.sheet_name} points`}
            inputMode="numeric"
            value={pointsInput}
            onChange={(event) => setPointsInput(event.target.value)}
            onBlur={() => void commitPoints()}
            className="min-h-11 w-20"
          />
        ) : (
          entry.points
        )}
      </TableCell>
      <TableCell><EntryBadges entry={entry} /></TableCell>
      <TableCell>
        {editable ? (
          <div className="flex min-h-11 items-center gap-2">
            <Switch
              aria-label={`Toggle ${entry.sheet_name} Tera ban`}
              checked={entry.tera_banned}
              onCheckedChange={(tera_banned) =>
                void onUpdate?.(entry, {
                  points: entry.points,
                  status: entry.status,
                  tera_banned,
                })
              }
            />
          </div>
        ) : entry.tera_banned ? "Listed" : "No"}
      </TableCell>
      {editable ? (
        <TableCell className="text-right">
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label={`Remove ${entry.sheet_name}`}
            onClick={() => void onRemove?.(entry)}
          >
            <Trash2 />
          </Button>
        </TableCell>
      ) : null}
    </TableRow>
  )
}

export function EntryList({
  entries,
  editable,
  versionId,
  onUpdate,
  onRemove,
  onAdd,
}: EntryListProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [teraFilter, setTeraFilter] = useState("all")
  const [minPoints, setMinPoints] = useState("")
  const [maxPoints, setMaxPoints] = useState("")
  const [sheetName, setSheetName] = useState("")
  const [pokemonId, setPokemonId] = useState<number | null>(null)
  const [newPoints, setNewPoints] = useState("1")
  const [newStatus, setNewStatus] = useState<"draftable" | "banned">("draftable")
  const { data: pokemonMatches = [] } = useSWR(
    editable && sheetName.trim().length >= 2 ? ["pokemon-lookup", sheetName] : null,
    ([, query]) => searchPokemonCatalog(query),
    { keepPreviousData: true },
  )

  const filtered = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase()
    const min = minPoints === "" ? null : Number(minPoints)
    const max = maxPoints === "" ? null : Number(maxPoints)
    return entries.filter((entry) => {
      if (normalized && !entry.sheet_name.toLocaleLowerCase().includes(normalized)) return false
      if (statusFilter !== "all" && entry.status !== statusFilter) return false
      if (min !== null && entry.points < min) return false
      if (max !== null && entry.points > max) return false
      if (teraFilter === "listed" && !entry.tera_banned) return false
      if (teraFilter === "effective" && !(entry.tera_banned && entry.points <= 10)) return false
      return true
    })
  }, [entries, maxPoints, minPoints, search, statusFilter, teraFilter])

  async function addEntry() {
    if (!onAdd || !versionId) return
    const points = Number(newPoints)
    if (!sheetName.trim() || !validPoints(points)) return
    const status = points === 99 ? "banned" : newStatus
    if ((status === "banned") !== (points === 99)) return
    await onAdd({
      version_id: versionId,
      pokemon_id: pokemonId,
      sheet_name: sheetName.trim(),
      points,
      status,
      tera_banned: false,
    })
    setSheetName("")
    setPokemonId(null)
    setNewPoints("1")
    setNewStatus("draftable")
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-5">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-3 text-muted-foreground" />
          <Input
            aria-label="Search entries by name"
            placeholder="Search by name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-h-11 pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="min-h-11 w-full" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent><SelectGroup>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draftable">Draftable</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
          </SelectGroup></SelectContent>
        </Select>
        <Select value={teraFilter} onValueChange={setTeraFilter}>
          <SelectTrigger className="min-h-11 w-full" aria-label="Filter by Tera status">
            <SelectValue placeholder="Tera" />
          </SelectTrigger>
          <SelectContent><SelectGroup>
            <SelectItem value="all">All Tera states</SelectItem>
            <SelectItem value="listed">On Tera list</SelectItem>
            <SelectItem value="effective">Effective bans</SelectItem>
          </SelectGroup></SelectContent>
        </Select>
        <div className="flex gap-2">
          <Input aria-label="Minimum points" placeholder="Min" inputMode="numeric" value={minPoints} onChange={(event) => setMinPoints(event.target.value)} className="min-h-11" />
          <Input aria-label="Maximum points" placeholder="Max" inputMode="numeric" value={maxPoints} onChange={(event) => setMaxPoints(event.target.value)} className="min-h-11" />
        </div>
      </div>

      {editable ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add entry</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="relative flex flex-col gap-2 md:col-span-2">
                <Label htmlFor="new-entry-name">Sheet name</Label>
                <Input id="new-entry-name" value={sheetName} onChange={(event) => { setSheetName(event.target.value); setPokemonId(null) }} placeholder="Pokémon name" className="min-h-11" />
                {pokemonMatches.length > 0 && !pokemonId ? (
                  <div className="flex flex-wrap gap-2" aria-label="Pokemon catalog matches">
                    {pokemonMatches.map((pokemon) => (
                      <Button key={pokemon.id} type="button" variant="outline" size="sm" onClick={() => { setSheetName(pokemon.name); setPokemonId(pokemon.id) }}>
                        {pokemon.name}
                      </Button>
                    ))}
                  </div>
                ) : null}
                {pokemonId ? <p className="text-xs text-muted-foreground">Catalog matched: #{pokemonId}</p> : null}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-entry-points">Points</Label>
                <Input id="new-entry-points" inputMode="numeric" value={newPoints} onChange={(event) => { const next = event.target.value; setNewPoints(next); const points = Number(next); if (points === 99) setNewStatus("banned"); else if (points >= 1 && points <= 20) setNewStatus("draftable") }} className="min-h-11" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-entry-status">Status</Label>
                <Select value={newStatus} onValueChange={(value: "draftable" | "banned") => { setNewStatus(value); if (value === "banned") setNewPoints("99"); else if (Number(newPoints) === 99) setNewPoints("1") }}>
                  <SelectTrigger id="new-entry-status" className="min-h-11 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    <SelectItem value="draftable">Draftable</SelectItem>
                    <SelectItem value="banned">Banned (99)</SelectItem>
                  </SelectGroup></SelectContent>
                </Select>
              </div>
            </div>
            <Button className="min-h-11 md:self-end" onClick={() => void addEntry()} disabled={!sheetName.trim() || !validPoints(Number(newPoints))}>
              <Plus data-icon="inline-start" />
              Add entry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-sm text-muted-foreground">Showing {filtered.length} of {entries.length} entries.</p>
      <div className="flex flex-col gap-3 md:hidden">
        {filtered.map((entry) => <EntryRow key={entry.id} entry={entry} editable={editable} onUpdate={onUpdate} onRemove={onRemove} layout="mobile" />)}
      </div>
      <div className="hidden overflow-hidden rounded-md border md:block">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Pokémon</TableHead><TableHead>Points</TableHead><TableHead>Status</TableHead><TableHead>Tera</TableHead>{editable ? <TableHead><span className="sr-only">Actions</span></TableHead> : null}
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((entry) => <EntryRow key={entry.id} entry={entry} editable={editable} onUpdate={onUpdate} onRemove={onRemove} layout="desktop" />)}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
