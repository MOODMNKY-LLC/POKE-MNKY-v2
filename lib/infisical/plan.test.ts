import { describe, expect, it } from "vitest"
import { commandFromArgv, planInfisicalRun, formatInfisicalPlan } from "@/lib/infisical/plan"
import type { InfisicalConfigCode, InfisicalPlanResult } from "@/lib/infisical/plan"

const execPath = "/usr/bin/node"
const dropAuthScript = "/repo/scripts/infisical-drop-auth.mjs"

function baseEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    INFISICAL_DOMAIN: "https://infisical.example.test",
    INFISICAL_PROJECT_ID: "11111111-2222-4333-8444-555555555555",
    INFISICAL_DEPLOYMENT_SLOT: "development",
    INFISICAL_AUTH: "cli-profile",
    ...overrides,
  }
}

function plan(
  env: Record<string, string | undefined>,
  command = ["pnpm", "dev"],
  requireCommand = true,
) {
  return planInfisicalRun({
    env,
    command,
    execPath,
    dropAuthScript,
    requireCommand,
  })
}

function failureCode(result: InfisicalPlanResult): InfisicalConfigCode {
  expect(result.ok).toBe(false)
  if (result.ok) throw new Error("expected Infisical config to fail")
  return result.code
}

describe("commandFromArgv", () => {
  it("keeps the command when pnpm consumes the separator", () => {
    expect(commandFromArgv(["pnpm", "dev"])).toEqual({
      planOnly: false,
      command: ["pnpm", "dev"],
    })
  })

  it("also accepts an explicit separator and a plan flag", () => {
    expect(commandFromArgv(["--plan"])).toEqual({ planOnly: true, command: [] })
    expect(commandFromArgv(["--", "pnpm", "dev"])).toEqual({
      planOnly: false,
      command: ["pnpm", "dev"],
    })
  })
})

describe("planInfisicalRun", () => {
  it("builds an explicit self-hosted run and strips credentials from argv", () => {
    const token = "token-value-should-not-appear"
    const result = plan(
      baseEnv({
        INFISICAL_AUTH: "token",
        INFISICAL_TOKEN: token,
        INFISICAL_DEPLOYMENT_SLOT: "production",
      }),
      ["pnpm", "dev"],
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.plan.host).toBe("infisical.example.test")
    expect(result.plan.environment).toBe("prod")
    expect(result.plan.deploymentSlot).toBe("production")
    expect(result.plan.loginArgs).toBeNull()
    expect(result.plan.runArgs).toEqual([
      "secrets-manager",
      "run",
      "--domain=https://infisical.example.test",
      "--projectId=11111111-2222-4333-8444-555555555555",
      "--env=prod",
      "--path=/",
      "--include-imports=false",
      "--secret-overriding=false",
      "--expand=true",
      "--",
      execPath,
      dropAuthScript,
      "--",
      "pnpm",
      "dev",
    ])
    expect(result.plan.runArgs.join(" ")).not.toContain(token)
    expect(formatInfisicalPlan(result.plan)).not.toContain(token)
    expect(formatInfisicalPlan(result.plan)).toContain("project_id: set")
    expect(formatInfisicalPlan(result.plan)).not.toContain(result.plan.projectId)
  })

  it("accepts INFISICAL_API_URL when DOMAIN is unset and keeps preview on staging", () => {
    const result = plan(
      baseEnv({
        INFISICAL_DOMAIN: undefined,
        INFISICAL_API_URL: "https://infisical.example.test/",
        INFISICAL_DEPLOYMENT_SLOT: "preview",
      }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.plan.domain).toBe("https://infisical.example.test")
    expect(result.plan.environment).toBe("staging")
  })

  it("fails closed without a domain, project, slot, auth, or command", () => {
    expect(failureCode(plan(baseEnv({ INFISICAL_DOMAIN: "  " })))).toBe("domain_missing")
    expect(failureCode(plan(baseEnv({ INFISICAL_PROJECT_ID: "" })))).toBe("project_missing")
    expect(failureCode(plan(baseEnv({ INFISICAL_DEPLOYMENT_SLOT: undefined })))).toBe(
      "slot_missing",
    )
    expect(failureCode(plan(baseEnv({ INFISICAL_AUTH: undefined })))).toBe("auth_missing")
    expect(failureCode(plan(baseEnv(), []))).toBe("command_missing")
  })

  it("rejects Cloud hosts, insecure remote http, conflicts, and placeholders", () => {
    const secret = "client-secret-should-not-appear"
    for (const host of [
      "https://app.infisical.com",
      "https://eu.infisical.com",
      "https://acme.infisical.com",
    ]) {
      const result = plan(baseEnv({ INFISICAL_DOMAIN: host }))
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.code).toBe("domain_cloud")
      expect(result.message).not.toContain(secret)
    }
    expect(failureCode(plan(baseEnv({ INFISICAL_DOMAIN: "http://secrets.example.test" })))).toBe(
      "domain_insecure",
    )
    expect(
      failureCode(plan(baseEnv({ INFISICAL_DOMAIN: "https://user:pass@infisical.example.test" }))),
    ).toBe("domain_invalid")
    expect(
      failureCode(
        plan(
          baseEnv({
            INFISICAL_API_URL: "https://other.example.test",
          }),
        ),
      ),
    ).toBe("domain_conflict")
    expect(failureCode(plan(baseEnv({ INFISICAL_PROJECT_ID: "REPLACE_WITH_PROJECT_ID" })))).toBe(
      "project_placeholder",
    )
    const placeholder = plan(baseEnv({ INFISICAL_PROJECT_ID: "REPLACE_WITH_PROJECT_ID" }))
    expect(placeholder.ok).toBe(false)
    if (!placeholder.ok) expect(placeholder.message).not.toContain("REPLACE_WITH_PROJECT_ID")
  })

  it("allows http only on localhost and refuses a slot/environment mismatch", () => {
    const local = plan(baseEnv({ INFISICAL_DOMAIN: "http://127.0.0.1:8080" }))
    expect(local.ok).toBe(true)
    if (!local.ok) return
    expect(local.plan.domain).toBe("http://127.0.0.1:8080")
    expect(failureCode(plan(baseEnv({ INFISICAL_ENVIRONMENT: "prod" })))).toBe(
      "environment_mismatch",
    )
    expect(failureCode(plan(baseEnv({ INFISICAL_DEPLOYMENT_SLOT: "prod" })))).toBe(
      "slot_unknown",
    )
  })

  it("requires complete auth and does not put universal-auth secrets on the login argv", () => {
    const secret = "client-secret-should-not-appear"
    expect(failureCode(plan(baseEnv({ INFISICAL_AUTH: "token" })))).toBe("auth_incomplete")
    expect(
      failureCode(
        plan(
          baseEnv({
            INFISICAL_AUTH: "universal-auth",
            INFISICAL_UNIVERSAL_AUTH_CLIENT_ID: "client-id",
          }),
        ),
      ),
    ).toBe("auth_incomplete")
    expect(
      failureCode(plan(baseEnv({ INFISICAL_AUTH: "cli-profile", INFISICAL_TOKEN: "leftover" }))),
    ).toBe("auth_incomplete")
    const result = plan(
      baseEnv({
        INFISICAL_AUTH: "universal-auth",
        INFISICAL_UNIVERSAL_AUTH_CLIENT_ID: "client-id",
        INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET: secret,
      }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.plan.loginArgs).toEqual([
      "login",
      "--method=universal-auth",
      "--domain=https://infisical.example.test",
      "--silent",
      "--plain",
    ])
    expect(JSON.stringify(result.plan.loginArgs)).not.toContain(secret)
    expect(result.plan.runArgs.join(" ")).not.toContain(secret)
    const incomplete = plan(
      baseEnv({
        INFISICAL_AUTH: "universal-auth",
        INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET: secret,
      }),
    )
    expect(incomplete.ok).toBe(false)
    if (!incomplete.ok) expect(incomplete.message).not.toContain(secret)
  })
})
