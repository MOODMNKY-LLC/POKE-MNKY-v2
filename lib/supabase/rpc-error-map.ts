/**
 * Phase 5.3 & 5.4: RPC Error Mapper
 * Maps Supabase RPC function error codes to HTTP status codes and user-friendly messages
 */

export interface RPCErrorMapping {
  statusCode: number
  message: string
  code?: string
}

const RPC_ERROR_MAP: Record<string, RPCErrorMapping> = {
  FORBIDDEN: {
    statusCode: 403,
    message: "You are not authorized to perform this action",
    code: "FORBIDDEN",
  },
  TEAM_NOT_IN_SEASON: {
    statusCode: 400,
    message: "Team is not registered in this season",
    code: "TEAM_NOT_IN_SEASON",
  },
  SEASON_NOT_FOUND: {
    statusCode: 404,
    message: "Season not found",
    code: "SEASON_NOT_FOUND",
  },
  POKEMON_POINTS_MISSING: {
    statusCode: 400,
    message: "Pokémon does not have draft points assigned",
    code: "POKEMON_POINTS_MISSING",
  },
  POKEMON_NOT_IN_POOL: {
    statusCode: 422,
    message: "Pokémon is not available in the draft pool for this season",
    code: "POKEMON_NOT_IN_POOL",
  },
  BUDGET_EXCEEDED: {
    statusCode: 422,
    message: "Draft pick would exceed team budget",
    code: "BUDGET_EXCEEDED",
  },
  ROSTER_FULL: {
    statusCode: 422,
    message: "Team roster is full",
    code: "ROSTER_FULL",
  },
  POKEMON_ALREADY_OWNED: {
    statusCode: 409,
    message: "Pokémon is already owned by a team in this season",
    code: "POKEMON_ALREADY_OWNED",
  },
  DROP_NOT_OWNED: {
    statusCode: 400,
    message: "Team does not own the Pokémon being dropped",
    code: "DROP_NOT_OWNED",
  },
  ADD_NOT_AVAILABLE: {
    statusCode: 422,
    message: "Pokémon being added is not available",
    code: "ADD_NOT_AVAILABLE",
  },
  ADD_NOT_IN_POOL: {
    statusCode: 422,
    message: "Pokémon being added is not in the draft pool for this season",
    code: "ADD_NOT_IN_POOL",
  },
  ADD_POINTS_MISSING: {
    statusCode: 400,
    message: "Pokémon being added does not have draft points assigned",
    code: "ADD_POINTS_MISSING",
  },
  BOT_UNAUTHORIZED: {
    statusCode: 401,
    message: "Invalid or missing bot API key",
    code: "BOT_UNAUTHORIZED",
  },
  DRAFT_WINDOW_NOT_CONFIGURED: {
    statusCode: 400,
    message: "Draft window is not configured for this season",
    code: "DRAFT_WINDOW_NOT_CONFIGURED",
  },
  DRAFT_WINDOW_CLOSED: {
    statusCode: 422,
    message: "Draft window is closed for this season",
    code: "DRAFT_WINDOW_CLOSED",
  },
  COACH_NOT_FOUND_FOR_DISCORD: {
    statusCode: 404,
    message: "No active coach found for this Discord user",
    code: "COACH_NOT_FOUND_FOR_DISCORD",
  },
  TEAM_NOT_FOUND_FOR_COACH_IN_SEASON: {
    statusCode: 404,
    message: "Coach does not have a team in this season",
    code: "TEAM_NOT_FOUND_FOR_COACH_IN_SEASON",
  },
}

/**
 * Map RPC error to HTTP response
 */
export function mapRPCError(error: any): RPCErrorMapping {
  const errorMessage = error?.message || ""
  const errorCode = error?.code || ""

  // Check for known error codes in message
  for (const [key, mapping] of Object.entries(RPC_ERROR_MAP)) {
    if (
      errorMessage.includes(key) ||
      errorCode.includes(key) ||
      errorMessage.toUpperCase().includes(key)
    ) {
      return mapping
    }
  }

  // Default error mapping
  return {
    statusCode: 500,
    message: errorMessage || "An unexpected error occurred",
    code: "INTERNAL_ERROR",
  }
}

/**
 * Extract error code from Supabase error
 */
export function extractErrorCode(error: any): string | null {
  if (error?.message) {
    for (const key of Object.keys(RPC_ERROR_MAP)) {
      if (error.message.includes(key)) {
        return key
      }
    }
  }
  return null
}
