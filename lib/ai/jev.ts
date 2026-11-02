/**
 * Optional Jev (TypeSafe System One) helper — flags only.
 * Gated by JEV_FLAGS_ENABLED (default false). Not wired into live routes yet.
 */

import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk"
import {
  createJevClient,
  resolveJevProvider,
  type JevProviderConfig,
} from "@/lib/ai/jev-provider"

export type { JevProviderConfig }
export {
  createJevClient,
  resolveJevProvider,
  missingProviderMessage,
} from "@/lib/ai/jev-provider"

export function isJevFlagsEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = env.JEV_FLAGS_ENABLED?.trim().toLowerCase()
  return raw === "true" || raw === "1" || raw === "yes"
}

export function getJevClientIfEnabled(
  env: NodeJS.ProcessEnv = process.env,
): { client: TypeSafeClient; provider: JevProviderConfig } | null {
  if (!isJevFlagsEnabled(env)) return null
  const provider = resolveJevProvider(env)
  if (!provider) return null
  return { client: createJevClient(provider), provider }
}

/** Example question set used by the offline pilot (kept for future flag-on experiments). */
export function discordMessagePilotQuestions() {
  return {
    message_class: choice("Classify this Discord league message.", {
      result: null,
      trade: null,
      fa_request: null,
      question: null,
      other: null,
    }),
    needs_organizer_review: noul(
      "Does this look like a rule violation needing organizer review?",
    ),
    score_winner_consistent: noul(
      "Are the stated score and winner consistent with the text?",
    ),
  }
}
