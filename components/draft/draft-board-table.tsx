"use client"

import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PokemonSprite } from "@/components/pokemon-sprite"
import { POKEMON_TYPE_COLORS } from "@/lib/pokemon-type-colors"
import { CheckCircle2 } from "lucide-react"

export interface DraftBoardTablePokemon {
  name: string
  point_value: number
  generation: number | null
  pokemon_id: number | null
  status: "available" | "drafted" | "banned" | "unavailable"
  types?: string[]
  tera_captain_eligible?: boolean
}

interface DraftBoardTableProps {
  /** Pokemon to display (already filtered by parent). Sorted by point_value desc, then name. */
  pokemon: DraftBoardTablePokemon[]
  draftedPokemon: string[]
  isYourTurn: boolean
  onPick: (pokemonName: string) => void
}

/** Status label for display (matches Notion: Available, Drafted, Banned, Unavailable) */
function statusLabel(status: string): string {
  const s = status?.toLowerCase()
  if (s === "drafted") return "Drafted"
  if (s === "banned") return "Banned"
  if (s === "unavailable") return "Unavailable"
  return "Available"
}

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  const s = status?.toLowerCase()
  if (s === "drafted") return "default"
  if (s === "banned" || s === "unavailable") return "destructive"
  return "secondary"
}

export function DraftBoardTable({
  pokemon,
  draftedPokemon,
  isYourTurn,
  onPick,
}: DraftBoardTableProps) {
  const sorted = [...pokemon].sort((a, b) => {
    if (b.point_value !== a.point_value) return b.point_value - a.point_value
    return (a.name || "").localeCompare(b.name || "")
  })

  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[220px] font-semibold">Name</TableHead>
              <TableHead className="w-[90px] font-semibold text-right">
                Point Value
              </TableHead>
              <TableHead className="w-[100px] font-semibold">Status</TableHead>
              <TableHead className="w-[70px] font-semibold text-center">
                Gen
              </TableHead>
              <TableHead className="min-w-[120px] font-semibold">Types</TableHead>
              <TableHead className="w-[80px] font-semibold text-center">
                Tera Captain
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((p) => {
              const isDrafted =
                p.status === "drafted" ||
                draftedPokemon.includes(p.name.toLowerCase())
              const isBanned = p.status === "banned"
              const isAvailable =
                p.status === "available" && !isDrafted && !isBanned
              const canPick =
                isYourTurn && isAvailable && !!p.name

              return (
                <TableRow
                  key={p.name}
                  className={cn(
                    "cursor-default transition-colors",
                    isDrafted && "opacity-60",
                    isBanned && "opacity-40",
                    canPick &&
                      "cursor-pointer hover:bg-primary/10 focus:bg-primary/10"
                  )}
                  onClick={() => canPick && onPick(p.name)}
                  tabIndex={canPick ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (canPick && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault()
                      onPick(p.name)
                    }
                  }}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded bg-muted/50">
                        <PokemonSprite
                          name={p.name}
                          pokemonId={p.pokemon_id ?? undefined}
                          size="sm"
                          mode="front"
                        />
                      </div>
                      <span className="capitalize truncate">{p.name}</span>
                      {isDrafted && (
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Badge variant="secondary">{p.point_value}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(p.status)}>
                      {statusLabel(p.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-muted-foreground">
                    {p.generation != null ? p.generation : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(p.types ?? []).length > 0 ? (
                        (p.types ?? []).map((t) => {
                          const colors =
                            POKEMON_TYPE_COLORS[t.toLowerCase()] ??
                            POKEMON_TYPE_COLORS.normal
                          return (
                            <span
                              key={t}
                              className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium text-white border"
                              style={{
                                backgroundColor: colors.bg,
                                borderColor: colors.border,
                              }}
                            >
                              {t}
                            </span>
                          )
                        })
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {p.tera_captain_eligible === true ? (
                      <span className="text-xs text-muted-foreground">Yes</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      {sorted.length === 0 && (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          No Pokémon match the current filters.
        </div>
      )}
    </div>
  )
}
