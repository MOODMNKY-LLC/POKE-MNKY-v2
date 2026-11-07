/**
 * Shared beforeAll helper for season-sim PG suites — fail-closed target gate.
 */

import { Client } from "pg"
import {
  DisposablePgTargetError,
  disposablePgClientConfigFromUrl,
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
  // Defense in depth: validate + build Client from authority/path fields only.
  // Never pass `connectionString` to pg — pg-connection-string would honor
  // ?host= / ?hostaddr= overrides and bypass a hostname-only guard.
  const config = disposablePgClientConfigFromUrl(connectionString)
  const client = new Client({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
  })
  await client.connect()
  return client
}
