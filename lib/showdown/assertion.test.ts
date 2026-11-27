import { createSign, generateKeyPairSync } from "crypto"
import { describe, expect, it } from "vitest"
import {
  parseShowdownAssertion,
  verifyShowdownAssertion,
} from "./assertion"

function signAssertion(
  data: string,
  privateKeyPem: string,
): string {
  const signer = createSign("RSA-SHA1")
  signer.update(data)
  signer.end()
  return `${data};${signer.sign(privateKeyPem, "hex")}`
}

describe("showdown assertion verification", () => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  })
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString()
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString()
  const challenge = "a".repeat(64)
  const nowSec = 1_700_000_000

  function makeAssertion(overrides?: {
    challenge?: string
    userid?: string
    issuedAtSec?: number
  }): string {
    const c = overrides?.challenge ?? challenge
    const userid = overrides?.userid ?? "zarel"
    const issued = overrides?.issuedAtSec ?? nowSec
    const data = `${c},${userid},2,${issued},sim3.psim.us`
    return signAssertion(data, privateKeyPem)
  }

  it("parses signed assertion fields", () => {
    const raw = makeAssertion()
    const parsed = parseShowdownAssertion(raw)
    expect(parsed?.userid).toBe("zarel")
    expect(parsed?.challenge).toBe(challenge)
  })

  it("accepts a valid signed assertion for the expected challenge", () => {
    const result = verifyShowdownAssertion(makeAssertion(), {
      expectedChallenge: challenge,
      nowSec,
      publicKeyPem,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.userid).toBe("zarel")
    }
  })

  it("rejects missing / malformed / unsigned proof", () => {
    expect(verifyShowdownAssertion(null, { expectedChallenge: challenge }).ok).toBe(
      false,
    )
    expect(
      verifyShowdownAssertion(";;error", {
        expectedChallenge: challenge,
        publicKeyPem,
      }).code,
    ).toBe("ASSERTION_MALFORMED")
    expect(
      verifyShowdownAssertion(`${challenge},zarel,2,${nowSec},host;00`, {
        expectedChallenge: challenge,
        nowSec,
        publicKeyPem,
      }).code,
    ).toBe("ASSERTION_SIGNATURE_INVALID")
  })

  it("rejects challenge mismatch", () => {
    const result = verifyShowdownAssertion(makeAssertion(), {
      expectedChallenge: "b".repeat(64),
      nowSec,
      publicKeyPem,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("ASSERTION_CHALLENGE_MISMATCH")
  })

  it("rejects stale assertions", () => {
    const result = verifyShowdownAssertion(
      makeAssertion({ issuedAtSec: nowSec - 60 * 60 }),
      {
        expectedChallenge: challenge,
        nowSec,
        maxAgeSec: 60,
        publicKeyPem,
      },
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("ASSERTION_STALE")
  })

  it("rejects signed unregistered (userType 1) assertions", () => {
    const data = `${challenge},freename,1,${nowSec},sim3.psim.us`
    const raw = signAssertion(data, privateKeyPem)
    const result = verifyShowdownAssertion(raw, {
      expectedChallenge: challenge,
      nowSec,
      publicKeyPem,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("ASSERTION_UNREGISTERED_USER")
  })
})
