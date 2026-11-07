/**
 * Shared beforeAll helper for season-sim PG suites — fail-closed target gate.
 */

import { Client } from "pg"
import {
  assertDisposableSeasonSimPgUrl,
  DisposablePgTargetError,
  resolveSeasonSimPgUrl,
} from "@/lib/season-sim/pg-disposable-target"

export function resolveHarnessPgUrlOrSkip(): {
  url: string | null
  skipReason: string | null
} {
  try {
    const url = resolveSeasonSimPgUrl()
    if (!url) {
      return {
        url: null,
        skipReason:
          "SEASON_SIM_PG_URL unset — honest skip (no POSTGRES_URL fallback)",
      }
    }
    return { url, skipReason: null }
  } catch (err) {
    if (err instanceof DisposablePgTargetError) {
      // Misconfiguration must fail loudly (never silently fall through to prod).
      throw err
    }
    throw err
  }
}

export async function connectDisposableHarnessClient(
  connectionString: string,
): Promise<Client> {
  // Second gate immediately before connect (defense in depth).
  assertDisposableSeasonSimPgUrl(connectionString)
  const client = new Client({ connectionString })
  await client.connect()
  return client
}
