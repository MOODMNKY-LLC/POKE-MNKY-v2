import { spawnSync } from "node:child_process"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("infisical-drop-auth", () => {
  it("removes machine credentials before the command starts", () => {
    const script = resolve("scripts/infisical-drop-auth.mjs")
    const result = spawnSync(
      process.execPath,
      [
        script,
        "--",
        process.execPath,
        "-e",
        "process.stdout.write([process.env.INFISICAL_TOKEN, process.env.INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET, process.env.INFISICAL_DOMAIN].map((value) => (value ? 'present' : 'absent')).join(','))",
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          INFISICAL_TOKEN: "sentinel-token",
          INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET: "sentinel-secret",
          INFISICAL_DOMAIN: "https://infisical.example.test",
        },
      },
    )
    expect(result.status).toBe(0)
    expect(result.stdout).toBe("absent,absent,present")
  })
})
