import { NextRequest, NextResponse } from "next/server"
import { calculate, Generations, Pokemon, Move, Field } from "@smogon/calc"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      gen = 9,
      attackingPokemon,
      defendingPokemon,
      moveName,
      attackingPokemonOptions = {},
      defendingPokemonOptions = {},
      field = {},
    } = body

    if (!attackingPokemon || !defendingPokemon || !moveName) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: attackingPokemon, defendingPokemon, moveName" },
        { status: 400 }
      )
    }

    const generation = Generations.get(gen)

    // Create attacker Pokemon
    const attacker = new Pokemon(generation, attackingPokemon, {
      level: attackingPokemonOptions.level || 50,
      evs: attackingPokemonOptions.evs || {},
      ivs: attackingPokemonOptions.ivs || {},
      item: attackingPokemonOptions.item,
      ability: attackingPokemonOptions.ability,
      nature: attackingPokemonOptions.nature as any,
      teraType: attackingPokemonOptions.teraType as any,
    })

    // Create defender Pokemon
    const defender = new Pokemon(generation, defendingPokemon, {
      level: defendingPokemonOptions.level || 50,
      evs: defendingPokemonOptions.evs || {},
      ivs: defendingPokemonOptions.ivs || {},
      item: defendingPokemonOptions.item,
      ability: defendingPokemonOptions.ability,
      nature: defendingPokemonOptions.nature as any,
      teraType: defendingPokemonOptions.teraType as any,
    })

    // Create move
    const move = new Move(generation, moveName)

    // Create field
    const fieldObj = new Field()

    // Calculate damage
    const result = calculate(generation, attacker, defender, move, fieldObj)

    return NextResponse.json({
      success: true,
      damage: result.damage,
      percent: result.percent,
      desc: result.desc,
      result,
    })
  } catch (error: any) {
    console.error("Damage calculation error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to calculate damage" },
      { status: 500 }
    )
  }
}
