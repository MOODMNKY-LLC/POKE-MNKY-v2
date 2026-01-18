/**
 * MCP REST API Proxy Route
 * 
 * Server-side proxy for MCP REST API requests.
 * Keeps API keys secure by handling authentication server-side.
 * 
 * Usage: POST /api/mcp-proxy/{endpoint}
 * Example: POST /api/mcp-proxy/api/health
 */

import { NextRequest, NextResponse } from "next/server"
import { mcpClient } from "@/lib/mcp-rest-client"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const body = await request.json().catch(() => ({}))
    
    // Reconstruct the API endpoint path
    const endpoint = `/${path.join("/")}`
    
    // Route to the appropriate MCP client method based on endpoint
    let result: any
    let rateLimit: any

    switch (endpoint) {
      case "/api/health":
      case "/health": {
        result = await mcpClient.healthCheck()
        break
      }
      case "/api/get_available_pokemon": {
        result = await mcpClient.getAvailablePokemon(body)
        rateLimit = result.rateLimit
        result = result.data
        break
      }
      case "/api/get_draft_status": {
        result = await mcpClient.getDraftStatus(body)
        rateLimit = result.rateLimit
        result = result.data
        break
      }
      case "/api/get_team_budget": {
        result = await mcpClient.getTeamBudget(body)
        rateLimit = result.rateLimit
        result = result.data
        break
      }
      case "/api/get_team_picks": {
        result = await mcpClient.getTeamPicks(body)
        rateLimit = result.rateLimit
        result = result.data
        break
      }
      case "/api/get_pokemon_types": {
        result = await mcpClient.getPokemonTypes(body)
        rateLimit = result.rateLimit
        result = result.data
        break
      }
      case "/api/get_smogon_meta": {
        result = await mcpClient.getSmogonMeta(body)
        rateLimit = result.rateLimit
        result = result.data
        break
      }
      case "/api/get_ability_mechanics": {
        result = await mcpClient.getAbilityMechanics(body)
        rateLimit = result.rateLimit
        result = result.data
        break
      }
      case "/api/get_move_mechanics": {
        result = await mcpClient.getMoveMechanics(body)
        rateLimit = result.rateLimit
        result = result.data
        break
      }
      case "/api/analyze_pick_value": {
        result = await mcpClient.analyzePickValue(body)
        rateLimit = result.rateLimit
        result = result.data
        break
      }
      default:
        return NextResponse.json(
          { error: `Unknown endpoint: ${endpoint}` },
          { status: 404 }
        )
    }

    return NextResponse.json({
      data: result,
      rateLimit,
    })
  } catch (error: any) {
    console.error("[MCP Proxy] Error:", error)
    
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
        status: error.status || 500,
        statusText: error.statusText || "Internal Server Error",
      },
      { status: error.status || 500 }
    )
  }
}
