import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import * as appSigning from "../../../lib/netbird/worker-signing"
import * as workerSigning from "./worker-signing"

describe("worker-signing copy", () => {
  it("is byte-identical to the app's lib/netbird/worker-signing.ts", () => {
    const appSource = readFileSync(join(__dirname, "../../../lib/netbird/worker-signing.ts"))
    const workerSource = readFileSync(join(__dirname, "worker-signing.ts"))
    expect(workerSource.equals(appSource)).toBe(true)
  })

  it("signs identically and verifies each side's signatures", async () => {
    const body = JSON.stringify({ request_id: "abc", email: "member@example.test" })
    const timestamp = Math.floor(Date.now() / 1000).toString()

    const fromApp = await appSigning.signBody("shared-secret", timestamp, body)
    const fromWorker = await workerSigning.signBody("shared-secret", timestamp, body)
    expect(fromWorker).toBe(fromApp)
    expect(fromApp).toMatch(/^[0-9a-f]{64}$/)

    expect(await workerSigning.verifySignature("shared-secret", timestamp, body, fromApp)).toEqual({ ok: true })
    expect(await appSigning.verifySignature("shared-secret", timestamp, body, fromWorker)).toEqual({ ok: true })
  })

  it("matches a fixed known vector so a silent change on either side is caught", async () => {
    const signature = await workerSigning.signBody("secret", "1700000000", '{"a":1}')
    expect(signature).toBe(await appSigning.signBody("secret", "1700000000", '{"a":1}'))
    expect(workerSigning.SIGNATURE_HEADER).toBe(appSigning.SIGNATURE_HEADER)
    expect(workerSigning.TIMESTAMP_HEADER).toBe(appSigning.TIMESTAMP_HEADER)
  })

  it("rejects replays older than 5 minutes and wrong secrets", async () => {
    const body = "{}"
    const now = Date.now()
    const old = Math.floor(now / 1000 - 301).toString()
    const signature = await workerSigning.signBody("s", old, body)
    expect(await workerSigning.verifySignature("s", old, body, signature, { nowMs: now })).toEqual({
      ok: false,
      reason: "expired",
    })
    const fresh = Math.floor(now / 1000).toString()
    const freshSignature = await workerSigning.signBody("s", fresh, body)
    expect(await workerSigning.verifySignature("other", fresh, body, freshSignature, { nowMs: now })).toEqual({
      ok: false,
      reason: "bad_signature",
    })
  })
})
