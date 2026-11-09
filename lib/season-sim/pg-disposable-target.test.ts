import { createRequire } from "node:module"
import { describe, expect, it } from "vitest"
import {
  DisposablePgTargetError,
  assertDisposableSeasonSimPgUrl,
  disposablePgClientConfigFromUrl,
  resolveSeasonSimPgUrl,
} from "@/lib/season-sim/pg-disposable-target"

// Resolve the same pg-connection-string major that `pg` depends on (lockfile 2.14.1)
// without adding a direct package.json dependency solely for this regression.
const requireFromPg = createRequire(require.resolve("pg"))
const parsePgConnectionString = requireFromPg("pg-connection-string")
  .parse as (connectionString: string) => { host?: string; port?: string | number }

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

  it("rejects exact ?host= override that pg-connection-string would prefer", () => {
    const bypass =
      "postgresql://127.0.0.1/season_sim_test?host=remote.example.invalid"
    // Prove the parser hazard exists for the pinned major (no network).
    const parsed = parsePgConnectionString(bypass)
    expect(parsed.host).toBe("remote.example.invalid")

    try {
      assertDisposableSeasonSimPgUrl(bypass)
      expect.unreachable("should throw")
    } catch (err) {
      expect(err).toBeInstanceOf(DisposablePgTargetError)
      expect((err as DisposablePgTargetError).code).toBe("QUERY_TARGET_OVERRIDE")
    }
  })

  it("rejects other pg-connection-string override query vectors", () => {
    const vectors: Array<{ url: string; code: string }> = [
      {
        url: "postgresql://127.0.0.1/season_sim_test?host=/var/run/postgresql",
        code: "QUERY_TARGET_OVERRIDE",
      },
      {
        url: "postgresql://127.0.0.1/season_sim_test?hostaddr=8.8.8.8",
        code: "QUERY_TARGET_OVERRIDE",
      },
      {
        url: "postgresql://127.0.0.1:5432/season_sim_test?port=9999",
        code: "QUERY_TARGET_OVERRIDE",
      },
      {
        url: "postgresql://u:p@127.0.0.1/season_sim_test?user=evil",
        code: "QUERY_TARGET_OVERRIDE",
      },
      {
        url: "postgresql://127.0.0.1/season_sim_test?database=postgres",
        code: "QUERY_TARGET_OVERRIDE",
      },
      {
        url: "postgresql://127.0.0.1/season_sim_test?dbname=postgres",
        code: "QUERY_TARGET_OVERRIDE",
      },
      {
        url: "postgresql://127.0.0.1/season_sim_test?options=-csearch_path=evil",
        code: "QUERY_TARGET_OVERRIDE",
      },
      {
        url: "postgresql://127.0.0.1/season_sim_test?sslmode=require",
        code: "QUERY_TARGET_OVERRIDE",
      },
      {
        url: "postgresql://127.0.0.1/season_sim_test?application_name=ok",
        code: "QUERY_TARGET_OVERRIDE",
      },
      {
        url: "postgresql://127.0.0.1/season_sim_test?foo=bar",
        code: "QUERY_PARAMS_FORBIDDEN",
      },
    ]
    for (const { url, code } of vectors) {
      try {
        assertDisposableSeasonSimPgUrl(url)
        expect.unreachable(`should throw for ${url}`)
      } catch (err) {
        expect(err).toBeInstanceOf(DisposablePgTargetError)
        expect((err as DisposablePgTargetError).code).toBe(code)
      }
    }
  })
})

describe("disposablePgClientConfigFromUrl (no network; effective target)", () => {
  it("builds Client fields from authority+path only (CI localhost shape)", () => {
    const config = disposablePgClientConfigFromUrl(
      "postgresql://postgres@localhost:5432/season_sim_foundation_test",
    )
    expect(config).toEqual({
      host: "localhost",
      port: 5432,
      database: "season_sim_foundation_test",
      user: "postgres",
    })
    expect(hostnameLoopback(config.host)).toBe(true)
  })

  it("keeps effective host on loopback even when a raw string would parse remote", () => {
    // Guard rejects before config build — proving we never emit remote host.
    const bypass =
      "postgresql://127.0.0.1/season_sim_test?host=remote.example.invalid"
    expect(parsePgConnectionString(bypass).host).toBe("remote.example.invalid")
    try {
      disposablePgClientConfigFromUrl(bypass)
      expect.unreachable("should throw")
    } catch (err) {
      expect(err).toBeInstanceOf(DisposablePgTargetError)
      expect((err as DisposablePgTargetError).code).toBe("QUERY_TARGET_OVERRIDE")
    }
  })

  it("never includes connectionString in the returned config object", () => {
    const config = disposablePgClientConfigFromUrl(
      "postgresql://postgres:secret@127.0.0.1:65436/season_sim_foundation_test",
    )
    expect(config).toEqual({
      host: "127.0.0.1",
      port: 65436,
      database: "season_sim_foundation_test",
      user: "postgres",
      password: "secret",
    })
    expect(
      Object.prototype.hasOwnProperty.call(config, "connectionString"),
    ).toBe(false)
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

  it("rejects SEASON_SIM_PG_URL with ?host= override", () => {
    expect(() =>
      resolveSeasonSimPgUrl({
        SEASON_SIM_PG_URL:
          "postgresql://127.0.0.1/season_sim_test?host=remote.example.invalid",
      }),
    ).toThrow(DisposablePgTargetError)
  })
})

function hostnameLoopback(host: string): boolean {
  const h = host.toLowerCase()
  return h === "127.0.0.1" || h === "localhost" || h === "::1"
}
