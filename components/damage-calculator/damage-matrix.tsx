"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Grid3x3 } from "lucide-react"
import { calculate, Generations, Pokemon, Move } from "@smogon/calc"

interface PokemonData {
  name: string
  moves?: string[]
  level?: number
  evs?: Partial<Record<"hp" | "atk" | "def" | "spa" | "spd" | "spe", number>>
  item?: string
  ability?: string
}

interface DamageMatrixProps {
  yourTeam: PokemonData[]
  opponentTeam: PokemonData[]
  generation?: number
}

export function DamageMatrix({ yourTeam, opponentTeam, generation = 9 }: DamageMatrixProps) {
  const [matrix, setMatrix] = useState<Record<string, Record<string, any>>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function calculateMatrix() {
      setLoading(true)
      const { calculate, Generations, Pokemon, Move } = await getCalcModule()
      const gen = Generations.get(generation)
      const newMatrix: Record<string, Record<string, any>> = {}

      for (const attacker of yourTeam) {
        newMatrix[attacker.name] = {}

        // Use first move if available, or default to first move slot
        const moveName = attacker.moves?.[0] || "Tackle"

        try {
          const attackerPokemon = new Pokemon(gen, attacker.name, {
            level: attacker.level || 50,
            evs: attacker.evs || {},
            item: attacker.item,
            ability: attacker.ability,
          })

          const moveObj = new Move(gen, moveName)

          for (const defender of opponentTeam) {
            try {
              const defenderPokemon = new Pokemon(gen, defender.name, {
                level: defender.level || 50,
                evs: defender.evs || {},
                item: defender.item,
                ability: defender.ability,
              })

              const result = calculate(gen, attackerPokemon, defenderPokemon, moveObj)
              newMatrix[attacker.name][defender.name] = {
                min: result.percent[0],
                max: result.percent[result.percent.length - 1],
                desc: result.desc,
                move: moveName,
              }
            } catch (err) {
              console.error(`Error calculating ${attacker.name} vs ${defender.name}:`, err)
              newMatrix[attacker.name][defender.name] = {
                min: 0,
                max: 0,
                desc: "Error",
                move: moveName,
              }
            }
          }
        } catch (err) {
          console.error(`Error setting up ${attacker.name}:`, err)
        }
      }

      setMatrix(newMatrix)
      setLoading(false)
    }

    if (yourTeam.length > 0 && opponentTeam.length > 0) {
      calculateMatrix()
    } else {
      setLoading(false)
    }
  }, [yourTeam, opponentTeam, generation])

  const getDamageColor = (percent: number) => {
    if (percent >= 100) return "text-red-600 font-bold"
    if (percent >= 75) return "text-orange-600 font-semibold"
    if (percent >= 50) return "text-yellow-600"
    if (percent >= 25) return "text-blue-600"
    return "text-muted-foreground"
  }

  const getDamageBadgeVariant = (percent: number): "destructive" | "default" | "secondary" | "outline" => {
    if (percent >= 100) return "destructive"
    if (percent >= 75) return "default"
    if (percent >= 50) return "secondary"
    return "outline"
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Calculating Matchups...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Please wait while we calculate damage for all matchups</p>
        </CardContent>
      </Card>
    )
  }

  if (yourTeam.length === 0 || opponentTeam.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Damage Matrix</CardTitle>
          <CardDescription>Compare damage output across matchups</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Add Pokémon to both teams to see damage calculations
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Grid3x3 className="h-5 w-5" />
          Damage Matrix
        </CardTitle>
        <CardDescription>
          Damage output of your team vs opponent team (using first move)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Your Pokémon</TableHead>
                {opponentTeam.map((p) => (
                  <TableHead key={p.name} className="text-center capitalize">
                    {p.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {yourTeam.map((attacker) => (
                <TableRow key={attacker.name}>
                  <TableCell className="font-medium capitalize">{attacker.name}</TableCell>
                  {opponentTeam.map((defender) => {
                    const result = matrix[attacker.name]?.[defender.name]
                    if (!result) {
                      return (
                        <TableCell key={defender.name} className="text-center">
                          <span className="text-muted-foreground">-</span>
                        </TableCell>
                      )
                    }

                    const maxPercent = result.max
                    const moveName = result.move

                    return (
                      <TableCell key={defender.name} className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant={getDamageBadgeVariant(maxPercent)} className="text-xs">
                            {result.desc || `${result.min.toFixed(1)}-${result.max.toFixed(1)}%`}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{moveName}</span>
                        </div>
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="destructive">OHKO</Badge>
              <span className="text-muted-foreground">100%+ damage</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default">Very Effective</Badge>
              <span className="text-muted-foreground">75-99% damage</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Effective</Badge>
              <span className="text-muted-foreground">50-74% damage</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Moderate/Weak</Badge>
              <span className="text-muted-foreground">&lt;50% damage</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Note: Calculations use each Pokémon's first move. For detailed calculations, use the full calculator.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
