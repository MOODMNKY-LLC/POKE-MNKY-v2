/**
 * Demo operator allowlist for provisional sandbox sim mutations.
 *
 * Gate ON (SIM_DEMO_OPERATOR_GATE=true or non-empty ALLOWLIST):
 *   Authenticated + allowlisted UUID is enough. League admin is NOT required
 *   and allowlist membership does NOT grant broad league admin APIs.
 * Gate OFF:
 *   Falls back to requireLeagueAdmin (local/dev convenience only).
 *
 * Fail closed: empty allowlist under gate mode denies everyone.
 * Never log allowlist contents.
 */

import { NextResponse } from "next/server"
import {
  requireLeagueAdmin,
  requireSignedInUser,
  unauthorizedJson,
} from "@/lib/admin-api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service"

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
 * Sandbox sim mutation/read gate.
 * Worker tick remains worker-key auth (not user allowlist).
 */
export async function requireSimDemoOperator(): Promise<
  { userId: string; role: string } | { response: NextResponse }
> {
  if (isDemoOperatorGateEnabled()) {
    const signed = await requireSignedInUser()
    if ("response" in signed) return signed
    if (!isDemoOperatorAllowlisted(signed.userId)) {
      return {
        response: unauthorizedJson(
          "Forbidden — authenticated user is not on SIM_DEMO_OPERATOR_ALLOWLIST",
          403,
        ),
      }
    }
    // Role is informational only — spectator Matt is valid for sim routes.
    let role = "spectator"
    try {
      const service = createServiceRoleClient()
      const { data: profile } = await service
        .from("profiles")
        .select("role")
        .eq("id", signed.userId)
        .maybeSingle()
      if (typeof profile?.role === "string" && profile.role) {
        role = profile.role
      }
    } catch {
      role = "spectator"
    }
    return { userId: signed.userId, role }
  }

  return requireLeagueAdmin()
}

export const DEMO_OPERATOR_GATE_NOTE =
  "When SIM_DEMO_OPERATOR_GATE=true or SIM_DEMO_OPERATOR_ALLOWLIST is set, only allowlisted authenticated UUIDs may use sandbox sim APIs. Membership does not grant league admin. Gate off → league admin fallback (dev only)."
