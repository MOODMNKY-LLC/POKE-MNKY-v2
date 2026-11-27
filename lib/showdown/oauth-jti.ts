/**
 * Server-side single-use consumption of OAuth binding JTIs.
 * Cookie clearing alone is not enough — replays can resend Cookie headers.
 */

export type OauthJtiConsumeStore = {
  /**
   * Atomically mark `jti` as consumed.
   * @returns true if this caller won the race; false if already consumed.
   */
  tryConsume: (params: {
    jti: string
    leagueUserId: string
    expiresAt: Date
  }) => Promise<{ ok: true } | { ok: false; code: "JTI_REPLAY" | "JTI_STORE_ERROR"; message: string }>
}

/** In-memory store for unit tests. Not shared across serverless isolates. */
export function createMemoryOauthJtiStore(): OauthJtiConsumeStore & {
  reset: () => void
  size: () => number
} {
  const seen = new Set<string>()
  return {
    reset: () => seen.clear(),
    size: () => seen.size,
    async tryConsume({ jti }) {
      if (seen.has(jti)) {
        return {
          ok: false,
          code: "JTI_REPLAY",
          message: "OAuth binding was already used. Restart linking from your profile.",
        }
      }
      seen.add(jti)
      return { ok: true }
    },
  }
}

type AdminLike = {
  from: (table: string) => {
    insert: (
      row: Record<string, unknown>,
    ) => PromiseLike<{ error: { code?: string; message: string } | null }>
  }
}

/**
 * Supabase-backed atomic JTI consume via unique primary key insert.
 * Requires migration `20261127213000_showdown_oauth_consumed_jti.sql`.
 */
export function createSupabaseOauthJtiStore(admin: AdminLike): OauthJtiConsumeStore {
  return {
    async tryConsume({ jti, leagueUserId, expiresAt }) {
      const { error } = await admin.from("showdown_oauth_consumed_jti").insert({
        jti,
        league_user_id: leagueUserId,
        expires_at: expiresAt.toISOString(),
      })
      if (!error) return { ok: true }
      // unique_violation
      if (error.code === "23505") {
        return {
          ok: false,
          code: "JTI_REPLAY",
          message: "OAuth binding was already used. Restart linking from your profile.",
        }
      }
      return {
        ok: false,
        code: "JTI_STORE_ERROR",
        message: error.message || "Failed to consume OAuth binding nonce.",
      }
    },
  }
}
