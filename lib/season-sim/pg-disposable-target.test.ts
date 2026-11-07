import { describe, expect, it } from "vitest"
import {
  DisposablePgTargetError,
  assertDisposableSeasonSimPgUrl,
  resolveSeasonSimPgUrl,
} from "@/lib/season-sim/pg-disposable-target"

describe("assertDisposableSeasonSimPgUrl (no network)", () => {
  it("accepts loopback disposable DB names", () => {
    expect(() =>
      assertDisposableSeasonSimPgUrl(
        "postgresql://postgres@127.0.0.1:5432/season_sim_foundation_test",
      ),
    ).not.toThrow()
    expect(() =>
      assertDisposableSeasonSimPgUrl(
        "postgres://u:p@localhost:65436/disposable_sim",
      ),
    ).not.toThrow()
  })

  it("rejects hosted Supabase / cloud hosts without connecting", () => {
    const hosted = [
      "postgresql://postgres.abc:x@db.abcdef.supabase.co:5432/postgres",
      "postgresql://u:p@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
      "postgresql://u:p@ep-foo.neon.tech:5432/neondb",
    ]
    for (const url of hosted) {
      expect(() => assertDisposableSeasonSimPgUrl(url)).toThrow(
        DisposablePgTargetError,
      )
      try {
        assertDisposableSeasonSimPgUrl(url)
      } catch (err) {
        expect(err).toBeInstanceOf(DisposablePgTargetError)
        expect((err as DisposablePgTargetError).code).toMatch(
          /HOSTED_REJECTED|NON_LOOPBACK/,
        )
      }
    }
  })

  it("rejects non-loopback even with season_sim db name", () => {
    expect(() =>
      assertDisposableSeasonSimPgUrl(
        "postgresql://postgres@10.0.0.5:5432/season_sim_test",
      ),
    ).toThrow(/NON_LOOPBACK|loopback/)
  })

  it("rejects loopback without disposable db name marker", () => {
    try {
      assertDisposableSeasonSimPgUrl(
        "postgresql://postgres@127.0.0.1:5432/postgres",
      )
      expect.unreachable("should throw")
    } catch (err) {
      expect(err).toBeInstanceOf(DisposablePgTargetError)
      expect((err as DisposablePgTargetError).code).toBe("DB_NAME_NOT_DISPOSABLE")
    }
  })
})

describe("resolveSeasonSimPgUrl", () => {
  it("returns null when no pg envs set (honest skip)", () => {
    expect(resolveSeasonSimPgUrl({})).toBeNull()
  })

  it("never reads POSTGRES_URL / DATABASE_URL as a target", () => {
    try {
      resolveSeasonSimPgUrl({
        POSTGRES_URL:
          "postgresql://postgres.abc:x@db.abcdef.supabase.co:5432/postgres",
      })
      expect.unreachable("should throw")
    } catch (err) {
      expect(err).toBeInstanceOf(DisposablePgTargetError)
      expect((err as DisposablePgTargetError).code).toBe("BLOCKED_FALLBACK_ENV")
      expect((err as Error).message).toMatch(/POSTGRES_URL/)
    }

    try {
      resolveSeasonSimPgUrl({
        DATABASE_URL: "postgresql://postgres@127.0.0.1:5432/postgres",
      })
      expect.unreachable("should throw")
    } catch (err) {
      expect(err).toBeInstanceOf(DisposablePgTargetError)
      expect((err as DisposablePgTargetError).code).toBe("BLOCKED_FALLBACK_ENV")
    }
  })

  it("uses only SEASON_SIM_PG_URL when valid", () => {
    const url =
      "postgresql://postgres@127.0.0.1:65436/season_sim_foundation_test"
    expect(
      resolveSeasonSimPgUrl({
        SEASON_SIM_PG_URL: url,
        POSTGRES_URL:
          "postgresql://postgres.abc:x@db.abcdef.supabase.co:5432/postgres",
      }),
    ).toBe(url)
  })
})
