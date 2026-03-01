/**
 * Seed stock Showdown teams into public.showdown_teams.
 * Reads supabase/seeds/seed_showdown_stock_teams.sql and runs it with pg.
 *
 * Requires: POSTGRES_URL in .env or .env.local (Supabase Database → Connection string → URI).
 * SSL: Self-signed certs are allowed by default. Set PGSSL_REJECT_UNAUTHORIZED=true to reject them.
 *
 * Usage:
 *   pnpm exec tsx scripts/seed-stock-teams.ts
 *   npm run db:seed:showdown:ts
 */

import { config } from "dotenv"
import { resolve } from "path"
import { readFileSync } from "fs"
import pg from "pg"

const { Client } = pg

// Load .env and .env.local
config({ path: resolve(process.cwd(), ".env") })
config({ path: resolve(process.cwd(), ".env.local") })

const postgresUrl = process.env.POSTGRES_URL

if (!postgresUrl) {
  console.error("Missing POSTGRES_URL. Set it in .env or .env.local.")
  console.error("Supabase: Project Settings → Database → Connection string → URI")
  process.exit(1)
}

// SSL: allow self-signed certs by default so seed works with local/custom Supabase; set PGSSL_REJECT_UNAUTHORIZED=true to enforce
const useSsl =
  postgresUrl.startsWith("postgres://") || postgresUrl.startsWith("postgresql://")
const rejectUnauthorized = process.env.PGSSL_REJECT_UNAUTHORIZED === "true"
const pgOptions: pg.ClientConfig = {
  connectionString: postgresUrl,
  ssl: useSsl ? { rejectUnauthorized } : undefined,
}

async function main() {
  // Force Node to accept self-signed certs for this script (pg may not pass ssl options through in all code paths)
  if (process.env.PGSSL_REJECT_UNAUTHORIZED !== "true") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
  }

  const seedPath = resolve(process.cwd(), "supabase/seeds/seed_showdown_stock_teams.sql")
  let sql: string
  try {
    sql = readFileSync(seedPath, "utf-8")
  } catch (e) {
    console.error("Could not read seed file:", seedPath, e)
    process.exit(1)
  }

  const client = new Client(pgOptions)
  try {
    await client.connect()
    await client.query(sql)
    console.log("Stock teams seed completed successfully.")
    const { rows } = await client.query(
      "SELECT COUNT(*) AS count FROM public.showdown_teams WHERE is_stock = true AND deleted_at IS NULL"
    )
    console.log("Stock teams in database:", rows[0]?.count ?? 0)
  } catch (e) {
    console.error("Seed failed:", e)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
