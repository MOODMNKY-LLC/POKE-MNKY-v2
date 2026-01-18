/**
 * MCP Server REST API Client
 * 
 * Type-safe REST client for the POKE MNKY Draft Pool MCP Server.
 * Generated from OpenAPI spec using openapi-fetch and openapi-typescript.
 * 
 * @module lib/mcp-rest-client
 */

import createClient, { type Middleware } from "openapi-fetch"
import type { paths } from "./mcp-api-types"

/**
 * Configuration for the MCP REST client
 */
export interface MCPClientConfig {
  /** Base URL of the MCP server */
  baseUrl?: string
  /** API key for authentication */
  apiKey?: string
  /** Enable retry logic for failed requests */
  enableRetry?: boolean
  /** Maximum number of retry attempts */
  maxRetries?: number
  /** Retry delay in milliseconds */
  retryDelay?: number
}

/**
 * Error class for MCP API errors
 */
export class MCPApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public code?: string,
    public details?: unknown,
    message?: string
  ) {
    super(message || `MCP API Error: ${status} ${statusText}`)
    this.name = "MCPApiError"
  }
}

/**
 * Rate limit information from response headers
 */
export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

/**
 * Response wrapper with rate limit information
 */
export interface MCPResponse<T> {
  data: T
  rateLimit?: RateLimitInfo
}

/**
 * Create MCP REST API client with type safety and error handling
 */
export function createMCPClient(config: MCPClientConfig = {}) {
  // Helper to clean base URL (remove /mcp suffix if present)
  const cleanBaseUrl = (url?: string): string => {
    if (!url) return "https://mcp-draft-pool.moodmnky.com"
    return url.replace(/\/mcp\/?$/, "")
  }

  const {
    baseUrl = cleanBaseUrl(
      process.env.MCP_DRAFT_POOL_SERVER_URL || 
      process.env.NEXT_PUBLIC_MCP_SERVER_URL
    ),
    apiKey = process.env.MCP_API_KEY || process.env.NEXT_PUBLIC_MCP_API_KEY,
    enableRetry = true,
    maxRetries = 3,
    retryDelay = 1000,
  } = config

  if (!apiKey) {
    console.warn("[MCP Client] No API key provided. Some requests may fail.")
  }

  // Create openapi-fetch client with type safety
  const client = createClient<paths>({
    baseUrl,
    headers: {
      "Content-Type": "application/json",
    },
  })

  // Authentication middleware
  // Supports both Authorization: Bearer and X-API-Key headers per OpenAPI spec
  const authMiddleware: Middleware = {
    async onRequest({ request }) {
      // Set authentication headers if API key is provided
      if (apiKey) {
        // Try Authorization Bearer first (preferred)
        if (!request.headers.get("Authorization")) {
          request.headers.set("Authorization", `Bearer ${apiKey}`)
        }
        // Also set X-API-Key as fallback (some endpoints may prefer this)
        if (!request.headers.get("X-API-Key")) {
          request.headers.set("X-API-Key", apiKey)
        }
      }
      return request
    },
  }

  // Error handling middleware
  const errorMiddleware: Middleware = {
    async onResponse({ response }) {
      // Extract rate limit info from headers
      const rateLimit: RateLimitInfo | undefined = response.headers.get("RateLimit-Limit")
        ? {
            limit: parseInt(response.headers.get("RateLimit-Limit") || "0"),
            remaining: parseInt(response.headers.get("RateLimit-Remaining") || "0"),
            reset: parseInt(response.headers.get("RateLimit-Reset") || "0"),
            retryAfter: response.headers.get("Retry-After")
              ? parseInt(response.headers.get("Retry-After") || "0")
              : undefined,
          }
        : undefined

      // Handle non-2xx responses
      if (!response.ok) {
        let errorData: any = {}
        let errorMessage = response.statusText
        let errorCode: string | undefined
        let errorDetails: unknown
        
        try {
          const contentType = response.headers.get("content-type")
          if (contentType?.includes("application/json")) {
            errorData = await response.json()
            // Handle different error response formats
            if (errorData.error) {
              // Format: { error: { code, message, details } }
              errorMessage = errorData.error.message || errorData.error || errorMessage
              errorCode = errorData.error.code
              errorDetails = errorData.error.details
            } else if (errorData.message) {
              // Format: { message: "...", code: "...", details: ... }
              errorMessage = errorData.message
              errorCode = errorData.code
              errorDetails = errorData.details
            } else if (typeof errorData === "string") {
              // Format: plain string
              errorMessage = errorData
            } else {
              // Try to extract message from any field
              errorMessage = errorData.message || errorData.error || JSON.stringify(errorData) || errorMessage
            }
          } else {
            const text = await response.text()
            errorMessage = text || response.statusText
            errorData = { error: { message: errorMessage } }
          }
        } catch (e) {
          // If JSON parsing fails, use status text
          console.warn("[MCP Client] Failed to parse error response:", e)
          errorMessage = response.statusText || "Unknown error"
        }

        console.error("[MCP Client] API Error:", {
          status: response.status,
          statusText: response.statusText,
          message: errorMessage,
          code: errorCode,
          details: errorDetails,
          url: response.url,
        })

        throw new MCPApiError(
          response.status,
          response.statusText,
          errorCode,
          errorDetails,
          errorMessage
        )
      }

      // Attach rate limit info to response (we'll handle this in wrapper functions)
      if (rateLimit) {
        // Store in a custom property (openapi-fetch doesn't expose this directly)
        ;(response as any).__rateLimit = rateLimit
      }
    },
    async onError({ error }) {
      // Handle network errors, CORS errors, etc.
      if (error instanceof TypeError) {
        throw new MCPApiError(
          0,
          "Network Error",
          "NETWORK_ERROR",
          undefined,
          `Network request failed: ${error.message}`
        )
      }
      throw error
    },
  }

  // Retry middleware
  const retryMiddleware: Middleware = {
    async onResponse({ response, request }) {
      if (!enableRetry || response.ok) {
        return response
      }

      // Only retry on specific status codes
      const retryableStatuses = [429, 500, 502, 503, 504]
      if (!retryableStatuses.includes(response.status)) {
        return response
      }

      // Check retry count
      const retryCount = (request as any).__retryCount || 0
      if (retryCount >= maxRetries) {
        return response
      }

      // Calculate delay (exponential backoff)
      const delay = retryDelay * Math.pow(2, retryCount)
      
      // Check Retry-After header for rate limits
      const retryAfter = response.headers.get("Retry-After")
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay

      console.warn(
        `[MCP Client] Request failed with ${response.status}, retrying in ${waitTime}ms (attempt ${retryCount + 1}/${maxRetries})`
      )

      await new Promise((resolve) => setTimeout(resolve, waitTime))

      // Mark request for retry
      ;(request as any).__retryCount = retryCount + 1

      // Retry the request
      return fetch(request).then(async (retryResponse) => {
        // Re-apply error handling
        if (!retryResponse.ok) {
          throw new MCPApiError(
            retryResponse.status,
            retryResponse.statusText,
            undefined,
            undefined,
            `Request failed after ${retryCount + 1} retries`
          )
        }
        return retryResponse
      })
    },
  }

  // Apply middleware
  client.use(authMiddleware)
  client.use(errorMiddleware)
  if (enableRetry) {
    client.use(retryMiddleware)
  }

  /**
   * Extract rate limit info from response
   */
  function extractRateLimit(response: Response): RateLimitInfo | undefined {
    return (response as any).__rateLimit
  }

  /**
   * Wrapper to add rate limit info to responses
   */
  async function withRateLimit<T>(
    promise: Promise<{ data?: T; error?: unknown; response: Response }>
  ): Promise<MCPResponse<T>> {
    const result = await promise
    
    if (result.error) {
      throw result.error
    }

    if (!result.data) {
      throw new MCPApiError(0, "No data", "NO_DATA", undefined, "Response contained no data")
    }

    return {
      data: result.data,
      rateLimit: extractRateLimit(result.response),
    }
  }

  return {
    client,
    
    /**
     * Get available Pokémon in draft pool
     */
    async getAvailablePokemon(params?: {
      point_range?: [number, number]
      generation?: number
      type?: string
      limit?: number
    }): Promise<MCPResponse<paths["/api/get_available_pokemon"]["post"]["responses"]["200"]["content"]["application/json"]>> {
      return withRateLimit(
        client.POST("/api/get_available_pokemon", {
          body: params || {},
        })
      )
    },

    /**
     * Get current draft status
     */
    async getDraftStatus(params?: {
      season_id?: number
    }): Promise<MCPResponse<paths["/api/get_draft_status"]["post"]["responses"]["200"]["content"]["application/json"]>> {
      return withRateLimit(
        client.POST("/api/get_draft_status", {
          body: params || {},
        })
      )
    },

    /**
     * Get team budget information
     */
    async getTeamBudget(params: {
      team_id: number
      season_id?: number
    }): Promise<MCPResponse<paths["/api/get_team_budget"]["post"]["responses"]["200"]["content"]["application/json"]>> {
      return withRateLimit(
        client.POST("/api/get_team_budget", {
          body: params,
        })
      )
    },

    /**
     * Get team picks
     */
    async getTeamPicks(params: {
      team_id: number
      season_id?: number
    }): Promise<MCPResponse<paths["/api/get_team_picks"]["post"]["responses"]["200"]["content"]["application/json"]>> {
      return withRateLimit(
        client.POST("/api/get_team_picks", {
          body: params,
        })
      )
    },

    /**
     * Get Pokémon types
     */
    async getPokemonTypes(params?: {
      pokemon_name?: string
      pokemon_id?: number
    }): Promise<MCPResponse<paths["/api/get_pokemon_types"]["post"]["responses"]["200"]["content"]["application/json"]>> {
      return withRateLimit(
        client.POST("/api/get_pokemon_types", {
          body: params || {},
        })
      )
    },

    /**
     * Get Smogon meta data
     */
    async getSmogonMeta(params: {
      pokemon_name: string
      format?: string
    }): Promise<MCPResponse<paths["/api/get_smogon_meta"]["post"]["responses"]["200"]["content"]["application/json"]>> {
      return withRateLimit(
        client.POST("/api/get_smogon_meta", {
          body: params,
        })
      )
    },

    /**
     * Get ability mechanics
     */
    async getAbilityMechanics(params: {
      ability_name: string
    }): Promise<MCPResponse<paths["/api/get_ability_mechanics"]["post"]["responses"]["200"]["content"]["application/json"]>> {
      return withRateLimit(
        client.POST("/api/get_ability_mechanics", {
          body: params,
        })
      )
    },

    /**
     * Get move mechanics
     */
    async getMoveMechanics(params: {
      move_name: string
    }): Promise<MCPResponse<paths["/api/get_move_mechanics"]["post"]["responses"]["200"]["content"]["application/json"]>> {
      return withRateLimit(
        client.POST("/api/get_move_mechanics", {
          body: params,
        })
      )
    },

    /**
     * Analyze pick value
     */
    async analyzePickValue(params: {
      pokemon_name: string
      point_value: number
      team_id?: number
    }): Promise<MCPResponse<paths["/api/analyze_pick_value"]["post"]["responses"]["200"]["content"]["application/json"]>> {
      return withRateLimit(
        client.POST("/api/analyze_pick_value", {
          body: params,
        })
      )
    },

    /**
     * Health check
     */
    async healthCheck(): Promise<paths["/health"]["get"]["responses"]["200"]["content"]["application/json"]> {
      const result = await client.GET("/health")
      if (result.error) {
        throw result.error
      }
      if (!result.data) {
        throw new MCPApiError(0, "No data", "NO_DATA", undefined, "Health check returned no data")
      }
      return result.data
    },
  }
}

/**
 * Default MCP client instance
 * Uses environment variables for configuration
 */
export const mcpClient = createMCPClient()

/**
 * Export types for use in other modules
 */
export type { paths } from "./mcp-api-types"
export type MCPClient = ReturnType<typeof createMCPClient>
