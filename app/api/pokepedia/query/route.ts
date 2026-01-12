/**
 * API Route: Pokepedia GraphQL Query (Server-Side)
 * Uses SERVICE ROLE KEY for secure, RLS-bypassing queries
 * 
 * This endpoint allows client-side code to query Pokemon data
 * via GraphQL without exposing the service role key.
 */

import { NextRequest, NextResponse } from "next/server"
import {
  getPokemonRangeGraphQLServer,
  getMasterDataGraphQLServer,
  getPokemonByIdGraphQLServer,
} from "@/lib/supabase/graphql-server-client"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, variables } = body

    if (!query) {
      return NextResponse.json(
        { error: "query parameter is required" },
        { status: 400 }
      )
    }

    let result: any

    switch (query) {
      case "getPokemonRange":
        const { startId, endId } = variables || {}
        if (!startId || !endId) {
          return NextResponse.json(
            { error: "startId and endId are required" },
            { status: 400 }
          )
        }
        result = await getPokemonRangeGraphQLServer(startId, endId)
        break

      case "getPokemonById":
        const { pokemonId } = variables || {}
        if (!pokemonId) {
          return NextResponse.json(
            { error: "pokemonId is required" },
            { status: 400 }
          )
        }
        result = await getPokemonByIdGraphQLServer(pokemonId)
        break

      case "getMasterData":
        result = await getMasterDataGraphQLServer()
        break

      default:
        return NextResponse.json(
          { error: `Unknown query: ${query}` },
          { status: 400 }
        )
    }

    return NextResponse.json({ data: result })
  } catch (error: any) {
    console.error("GraphQL query error:", error)
    console.error("Error stack:", error.stack)
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      cause: error.cause,
    })
    return NextResponse.json(
      { 
        error: error.message || "Internal server error",
        details: process.env.NODE_ENV === "development" ? {
          stack: error.stack,
          name: error.name,
        } : undefined,
      },
      { status: 500 }
    )
  }
}
