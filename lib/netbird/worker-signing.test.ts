import { describe, expect, it } from "vitest"
import { constantTimeEqual, signBody, verifySignature } from "./worker-signing"

const SECRET = "test-secret-not-real"
const BODY = JSON.stringify({ request_id: "r1", email: "member@example.test" })
const NOW_MS = 1_800_000_000_000
const NOW_S = String(NOW_MS / 1000)

describe("worker signing", () => {
  it("round-trips a signed body", async () => {
    const signature = await signBody(SECRET, NOW_S, BODY)
    expect(signature).toMatch(/^[0-9a-f]{64}$/)
    await expect(verifySignature(SECRET, NOW_S, BODY, signature, { nowMs: NOW_MS })).resolves.toEqual({ ok: true })
  })

  it("rejects a tampered body, wrong secret and wrong timestamp", async () => {
    const signature = await signBody(SECRET, NOW_S, BODY)
    await expect(verifySignature(SECRET, NOW_S, `${BODY} `, signature, { nowMs: NOW_MS })).resolves.toEqual({
      ok: false,
      reason: "bad_signature",
    })
    await expect(verifySignature("other", NOW_S, BODY, signature, { nowMs: NOW_MS })).resolves.toEqual({
      ok: false,
      reason: "bad_signature",
    })
    const shifted = String(Number(NOW_S) + 1)
    await expect(verifySignature(SECRET, shifted, BODY, signature, { nowMs: NOW_MS })).resolves.toEqual({
      ok: false,
      reason: "bad_signature",
    })
  })

  it("rejects replays older than 5 minutes but accepts 4 minutes", async () => {
    const oldTs = String(Number(NOW_S) - 6 * 60)
    const oldSig = await signBody(SECRET, oldTs, BODY)
    await expect(verifySignature(SECRET, oldTs, BODY, oldSig, { nowMs: NOW_MS })).resolves.toEqual({
      ok: false,
      reason: "expired",
    })

    const recentTs = String(Number(NOW_S) - 4 * 60)
    const recentSig = await signBody(SECRET, recentTs, BODY)
    await expect(verifySignature(SECRET, recentTs, BODY, recentSig, { nowMs: NOW_MS })).resolves.toEqual({ ok: true })
  })

  it("rejects timestamps far in the future", async () => {
    const futureTs = String(Number(NOW_S) + 10 * 60)
    const sig = await signBody(SECRET, futureTs, BODY)
    await expect(verifySignature(SECRET, futureTs, BODY, sig, { nowMs: NOW_MS })).resolves.toEqual({
      ok: false,
      reason: "expired",
    })
  })

  it("rejects missing or malformed inputs", async () => {
    await expect(verifySignature(SECRET, null, BODY, "abc", { nowMs: NOW_MS })).resolves.toEqual({
      ok: false,
      reason: "missing",
    })
    await expect(verifySignature(SECRET, NOW_S, BODY, undefined, { nowMs: NOW_MS })).resolves.toEqual({
      ok: false,
      reason: "missing",
    })
    await expect(verifySignature("", NOW_S, BODY, "abc", { nowMs: NOW_MS })).resolves.toEqual({
      ok: false,
      reason: "missing",
    })
    await expect(verifySignature(SECRET, "12abc", BODY, "abc", { nowMs: NOW_MS })).resolves.toEqual({
      ok: false,
      reason: "bad_timestamp",
    })
  })

  it("compares strings in a length-safe way", () => {
    expect(constantTimeEqual("abc", "abc")).toBe(true)
    expect(constantTimeEqual("abc", "abd")).toBe(false)
    expect(constantTimeEqual("abc", "abcd")).toBe(false)
    expect(constantTimeEqual("", "")).toBe(true)
  })
})
