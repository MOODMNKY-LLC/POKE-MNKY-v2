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
import { mcpClient, MCPApiError } from "@/lib/mcp-rest-client"

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
        // Health check endpoint is /health (not /api/health)
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
        // Validate required parameters
        if (!body.pokemon_name) {
          return NextResponse.json(
            { error: "pokemon_name is required" },
            { status: 400 }
          )
        }
        // Filter out empty format strings and normalize pokemon name
        const params: any = { 
          pokemon_name: String(body.pokemon_name).trim().toLowerCase()
        }
        if (body.format && body.format.trim()) {
          params.format = body.format.trim()
        }
        
        console.log("[MCP Proxy] Smogon meta request:", params)
        
        try {
          result = await mcpClient.getSmogonMeta(params)
          rateLimit = result.rateLimit
          result = result.data
        } catch (error: any) {
          console.error("[MCP Proxy] Smogon meta error:", {
            params,
            error: error.message,
            status: error.status,
            code: error.code,
            details: error.details,
          })
          throw error // Re-throw to be caught by outer catch
        }
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
    // Log detailed error information
    const errorInfo = {
      endpoint,
      errorMessage: error.message,
      status: error.status,
      statusText: error.statusText,
      code: error.code,
      details: error.details,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'), // First 5 lines of stack
    }
    
    console.error("[MCP Proxy] Error:", errorInfo)
    
    // Handle MCPApiError specifically
    if (error instanceof MCPApiError) {
      // Construct a more informative error message
      let errorMessage = error.message || `HTTP ${error.status}: ${error.statusText}`
      if (error.code) {
        errorMessage = `${error.code}: ${errorMessage}`
      }
      if (error.details) {
        errorMessage += ` (Details: ${JSON.stringify(error.details)})`
      }
      
      return NextResponse.json(
        {
          error: errorMessage,
          status: error.status,
          statusText: error.statusText,
          code: error.code,
          details: error.details,
        },
        { status: error.status }
      )
    }
    
    // Handle other errors
    const errorMessage = error.message || "Internal server error"
    const errorStatus = error.status || 500
    const errorStatusText = error.statusText || "Internal Server Error"
    
    return NextResponse.json(
      {
        error: `${errorStatus} ${errorStatusText}: ${errorMessage}`,
        status: errorStatus,
        statusText: errorStatusText,
        details: error.details || undefined,
      },
      { status: errorStatus }
    )
  }
}
