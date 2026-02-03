"use client"

import { cn } from "@/lib/utils"
import { DraftPokemonCard } from "./draft-pokemon-card"

interface Pokemon {
  name: string
  point_value: number
  generation: number
  pokemon_id?: number | null
  status?: "available" | "drafted" | "banned" | "unavailable"
  types?: string[]
}

interface DraftBoardKanbanProps {
  /** Pokemon grouped by point value (1-20). Keys are point values. */
  pokemonByPoint: Record<number, Pokemon[]>
  draftedPokemon: string[]
  isYourTurn: boolean
  onPick: (pokemonName: string) => void
  /** Optional filter: only show these point values (e.g. when tier filter is set). */
  visiblePointValues?: number[]
}

const POINT_VALUES = Array.from({ length: 20 }, (_, i) => 20 - i) // 20 down to 1

export function DraftBoardKanban({
  pokemonByPoint,
  draftedPokemon,
  isYourTurn,
  onPick,
  visiblePointValues = POINT_VALUES,
}: DraftBoardKanbanProps) {
  return (
    <div className="w-full overflow-x-auto overflow-y-hidden pb-2 scroll-smooth">
      <div className="flex gap-4 min-w-max py-1">
        {visiblePointValues.map((points) => {
          const pokemon = pokemonByPoint[points] ?? []
          return (
            <div
              key={points}
              className="flex-shrink-0 w-[220px] flex flex-col rounded-lg border bg-muted/30 dark:bg-muted/10"
            >
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b rounded-t-lg bg-muted/50 dark:bg-muted/20">
                <span className="font-semibold text-sm">{points} pts</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {pokemon.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[120px] p-2 space-y-2">
                {pokemon.length === 0 ? (
                  <div className="flex items-center justify-center h-20 text-xs text-muted-foreground rounded border border-dashed">
                    Empty
                  </div>
                ) : (
                  pokemon.map((p) => (
                    <DraftPokemonCard
                      key={p.name}
                      pokemon={{
                        name: p.name,
                        point_value: p.point_value,
                        generation: p.generation ?? 1,
                        pokemon_id: p.pokemon_id ?? null,
                        status: p.status ?? "available",
                        types: p.types,
                      }}
                      isDrafted={
                        p.status === "drafted" ||
                        draftedPokemon.includes(p.name.toLowerCase())
                      }
                      isYourTurn={isYourTurn}
                      onPick={() => onPick(p.name)}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
