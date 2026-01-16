"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Zap, AlertCircle } from "lucide-react"

// Dynamic import to avoid SSR issues
let calcModule: any = null

async function getCalcModule() {
  if (!calcModule) {
    calcModule = await import("@smogon/calc")
  }
  return calcModule
}

interface DamagePreviewProps {
  attacker: {
    name: string
    level?: number
    evs?: Partial<Record<"hp" | "atk" | "def" | "spa" | "spd" | "spe", number>>
    ivs?: Partial<Record<"hp" | "atk" | "def" | "spa" | "spd" | "spe", number>>
    item?: string
    ability?: string
    nature?: string
    teraType?: string
  }
  defender: {
    name: string
    level?: number
    evs?: Partial<Record<"hp" | "atk" | "def" | "spa" | "spd" | "spe", number>>
    ivs?: Partial<Record<"hp" | "atk" | "def" | "spa" | "spd" | "spe", number>>
    item?: string
    ability?: string
    nature?: string
    teraType?: string
  }
  move: string
  generation?: number
}

export function DamagePreview({ attacker, defender, move, generation = 9 }: DamagePreviewProps) {
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [calculating, setCalculating] = useState(true)

  useEffect(() => {
    async function calculateDamage() {
      setCalculating(true)
      setError(null)

      try {
        const { calculate, Generations, Pokemon, Move, Field } = await getCalcModule()
        const gen = Generations.get(generation)

        // Create attacker Pokemon
        const attackerPokemon = new Pokemon(gen, attacker.name, {
          level: attacker.level || 50,
          evs: attacker.evs || {},
          ivs: attacker.ivs || {},
          item: attacker.item,
          ability: attacker.ability,
          nature: attacker.nature as any,
          teraType: attacker.teraType as any,
        })

        // Create defender Pokemon
        const defenderPokemon = new Pokemon(gen, defender.name, {
          level: defender.level || 50,
          evs: defender.evs || {},
          ivs: defender.ivs || {},
          item: defender.item,
          ability: defender.ability,
          nature: defender.nature as any,
          teraType: defender.teraType as any,
        })

        // Create move
        const moveObj = new Move(gen, move)

        // Create field (optional)
        const field = new Field()

        // Calculate damage
        const calcResult = calculate(gen, attackerPokemon, defenderPokemon, moveObj, field)

        setResult(calcResult)
      } catch (err: any) {
        console.error("Damage calculation error:", err)
        setError(err.message || "Failed to calculate damage")
      } finally {
        setCalculating(false)
      }
    }

    if (attacker.name && defender.name && move) {
      calculateDamage()
    } else {
      setCalculating(false)
    }
  }, [attacker, defender, move, generation])

  if (calculating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Calculating Damage...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Please wait</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            Calculation Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Make sure the Pokémon names and move name are spelled correctly.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Damage Preview</CardTitle>
          <CardDescription>Select attacker, defender, and move to calculate damage</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const minDamage = result.damage[0]
  const maxDamage = result.damage[result.damage.length - 1]
  const minPercent = result.percent[0]
  const maxPercent = result.percent[result.percent.length - 1]

  // Determine effectiveness
  const getEffectivenessBadge = () => {
    if (maxPercent >= 100) {
      return <Badge variant="destructive">OHKO Possible</Badge>
    } else if (maxPercent >= 75) {
      return <Badge variant="default">Very Effective</Badge>
    } else if (maxPercent >= 50) {
      return <Badge variant="secondary">Effective</Badge>
    } else if (maxPercent >= 25) {
      return <Badge variant="outline">Moderate</Badge>
    } else {
      return <Badge variant="outline">Weak</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Damage Calculation
        </CardTitle>
        <CardDescription>
          {attacker.name} using {move} vs {defender.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Damage Range */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Damage Range</span>
            {getEffectivenessBadge()}
          </div>
          <div className="text-2xl font-bold">
            {minDamage} - {maxDamage}
          </div>
          <div className="text-sm text-muted-foreground">
            {minPercent.toFixed(1)}% - {maxPercent.toFixed(1)}% of {defender.name}'s HP
          </div>
        </div>

        {/* Description */}
        {result.desc && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">{result.desc}</p>
          </div>
        )}

        {/* Additional Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Min Roll:</span>
            <span className="ml-2 font-medium">{minDamage} ({minPercent.toFixed(1)}%)</span>
          </div>
          <div>
            <span className="text-muted-foreground">Max Roll:</span>
            <span className="ml-2 font-medium">{maxDamage} ({maxPercent.toFixed(1)}%)</span>
          </div>
        </div>

        {/* Link to Full Calculator */}
        <div className="pt-4 border-t">
          <Button variant="outline" className="w-full" asChild>
            <a href="/calc" target="_blank" rel="noopener noreferrer">
              Open Full Calculator
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
