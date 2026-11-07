/**
 * Demo operator allowlist for provisional sandbox sim mutations.
 *
 * When SIM_DEMO_OPERATOR_GATE=true (or SIM_DEMO_OPERATOR_ALLOWLIST is non-empty),
 * league admin alone is insufficient — user UUID must appear in the allowlist.
 * Fail closed: empty allowlist under gate mode denies everyone.
 *
 * Never log allowlist contents.
 */

import { NextResponse } from "next/server"
import { requireLeagueAdmin, unauthorizedJson } from "@/lib/admin-api-auth"

type EnvLike = Record<string, string | undefined>

function truthy(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase()
  return v === "true" || v === "1" || v === "yes" || v === "on"
}

/** Parse comma/whitespace-separated UUIDs; invalid tokens ignored. */
export function parseDemoOperatorAllowlist(
  raw: string | undefined,
): Set<string> {
  const out = new Set<string>()
  if (!raw?.trim()) return out
  for (const part of raw.split(/[\s,]+/)) {
    const token = part.trim().toLowerCase()
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        token,
      )
    ) {
      out.add(token)
    }
  }
  return out
}

export function isDemoOperatorGateEnabled(
  env: EnvLike = process.env,
): boolean {
  if (truthy(env.SIM_DEMO_OPERATOR_GATE)) return true
  return parseDemoOperatorAllowlist(env.SIM_DEMO_OPERATOR_ALLOWLIST).size > 0
}

export function isDemoOperatorAllowlisted(
  userId: string,
  env: EnvLike = process.env,
): boolean {
  const allowed = parseDemoOperatorAllowlist(env.SIM_DEMO_OPERATOR_ALLOWLIST)
  if (allowed.size === 0) return false
  return allowed.has(userId.trim().toLowerCase())
}

/**
 * League admin + (when gate on) allowlist. Use for create/advance/reset/pause/cancel.
 * Worker tick remains worker-key auth (not user allowlist).
 */
export async function requireSimDemoOperator(): Promise<
  { userId: string; role: string } | { response: NextResponse }
> {
  const admin = await requireLeagueAdmin()
  if ("response" in admin) return admin

  if (isDemoOperatorGateEnabled()) {
    if (!isDemoOperatorAllowlisted(admin.userId)) {
      return {
        response: unauthorizedJson(
          "Forbidden — authenticated admin is not on SIM_DEMO_OPERATOR_ALLOWLIST",
          403,
        ),
      }
    }
  }

  return admin
}

export const DEMO_OPERATOR_GATE_NOTE =
  "When SIM_DEMO_OPERATOR_GATE=true or SIM_DEMO_OPERATOR_ALLOWLIST is set, only allowlisted UUIDs may mutate sandbox sim runs (in addition to league admin)."
