import crypto from "crypto"
import { describe, expect, it } from "vitest"
import {
  parseNotionVerificationToken,
  verifyNotionWebhookSignature,
} from "./verify-webhook-signature"

const SECRET = "test-secret"
const BODY = JSON.stringify({ type: "page.created", data: { database_id: "abc" } })

function sign(body: string, secret = SECRET) {
  return `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`
}

describe("verifyNotionWebhookSignature", () => {
  it("accepts a valid signature", () => {
    expect(verifyNotionWebhookSignature(BODY, sign(BODY), SECRET)).toBe(true)
  })

  it("rejects a signature made with a different secret", () => {
    expect(verifyNotionWebhookSignature(BODY, sign(BODY, "other"), SECRET)).toBe(false)
  })

  it("rejects a signature for a tampered body", () => {
    expect(verifyNotionWebhookSignature(BODY + " ", sign(BODY), SECRET)).toBe(false)
  })

  it("returns false (no throw) on length mismatch", () => {
    expect(() => verifyNotionWebhookSignature(BODY, "sha256=abcd", SECRET)).not.toThrow()
    expect(verifyNotionWebhookSignature(BODY, "sha256=abcd", SECRET)).toBe(false)
    expect(verifyNotionWebhookSignature(BODY, `${sign(BODY)}00`, SECRET)).toBe(false)
  })

  it("rejects missing header, missing secret, and missing prefix", () => {
    expect(verifyNotionWebhookSignature(BODY, null, SECRET)).toBe(false)
    expect(verifyNotionWebhookSignature(BODY, undefined, SECRET)).toBe(false)
    expect(verifyNotionWebhookSignature(BODY, "", SECRET)).toBe(false)
    expect(verifyNotionWebhookSignature(BODY, sign(BODY), undefined)).toBe(false)
    expect(verifyNotionWebhookSignature(BODY, sign(BODY), "")).toBe(false)
    expect(verifyNotionWebhookSignature(BODY, sign(BODY).replace("sha256=", ""), SECRET)).toBe(false)
  })
})

describe("parseNotionVerificationToken", () => {
  it("returns the token for a verification payload", () => {
    expect(parseNotionVerificationToken(JSON.stringify({ verification_token: "tok" }))).toBe("tok")
  })

  it("returns null for events, non-string tokens, arrays, and invalid JSON", () => {
    expect(parseNotionVerificationToken(BODY)).toBeNull()
    expect(parseNotionVerificationToken(JSON.stringify({ verification_token: 5 }))).toBeNull()
    expect(parseNotionVerificationToken("[]")).toBeNull()
    expect(parseNotionVerificationToken("not json")).toBeNull()
  })
})
