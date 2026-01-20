/**
 * Draft Pool Type Definitions
 * 
 * Shared type definitions for draft pool import and sync services.
 * This file contains NO runtime code to prevent client-side evaluation issues.
 */

/**
 * Server Agent JSON format (from app-agent-handoff)
 */
export interface ServerAgentDraftPool {
  config: {
    draftBudget: number
    teraBudget: number
    minTeamSize: number
    maxTeamSize: number
    teams: number
    pointRange: { min: number; max: number }
    freeAgencyTransactions: number
    freeAgencyDeadline: string
    rosterLockAfter: string
  }
  metadata: {
    generatedAt: string
    totalPokemon: number
    availableCount: number
    bannedCount: number
    teraBannedCount: number
    draftedCount: number
  }
  pokemon: {
    available: Array<{ name: string; pointValue: number }>
    banned: Array<{ name: string; pointValue: number }>
    teraBanned: Array<{ name: string; pointValue: number }>
    drafted: Array<{ name: string; pointValue: number }>
  }
  bannedList: string[]
  teraBannedList: string[]
  byPointValue: Record<string, any>
  pointValueDistribution: Record<string, number>
}

/**
 * Import result statistics
 */
export interface ImportResult {
  success: boolean
  imported: number
  updated: number
  errors: Array<{ pokemon: string; error: string }>
  warnings: Array<{ pokemon: string; message: string }>
  teraBannedCount: number
  totalProcessed: number
}

/**
 * Sync result statistics
 */
export interface SyncResult {
  success: boolean
  synced: number
  skipped: number
  conflicts: Array<{ pokemon: string; reason: string }>
  warnings: Array<{ pokemon: string; message: string }>
  unmatchedNames: string[]
  totalProcessed: number
}
