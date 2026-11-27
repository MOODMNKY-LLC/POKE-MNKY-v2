import { describe, expect, it } from "vitest"
import {
  getShowdownIdentityStatus,
  isLegacyLoginserverSyncEnabled,
  isShowdownOauthLinkAvailable,
  legacyShowdownSyncDeniedResponse,
  LEGACY_SHOWDOWN_SYNC_DISABLED_CODE,
  SHOWDOWN_OAUTH_LINK_IMPLEMENTED,
} from "./identity-flags"

describe("showdown identity flags", () => {
  it("defaults legacy sync off", () => {
    expect(isLegacyLoginserverSyncEnabled({})).toBe(false)
    expect(isLegacyLoginserverSyncEnabled({ SHOWDOWN_LEGACY_LOGINSERVER_SYNC: "" })).toBe(
      false,
    )
    expect(
      isLegacyLoginserverSyncEnabled({ SHOWDOWN_LEGACY_LOGINSERVER_SYNC: "false" }),
    ).toBe(false)
  })

  it("enables legacy sync only on explicit truthy", () => {
    for (const v of ["true", "1", "yes", "on", "TRUE"]) {
      expect(
        isLegacyLoginserverSyncEnabled({ SHOWDOWN_LEGACY_LOGINSERVER_SYNC: v }),
      ).toBe(true)
    }
  })

  it("does not enable oauth from CLIENT_ID alone while unimplemented", () => {
    expect(SHOWDOWN_OAUTH_LINK_IMPLEMENTED).toBe(false)
    expect(isShowdownOauthLinkAvailable({})).toBe(false)
    expect(
      isShowdownOauthLinkAvailable({ SHOWDOWN_OAUTH_CLIENT_ID: "ps-client" }),
    ).toBe(false)
    const status = getShowdownIdentityStatus({
      SHOWDOWN_OAUTH_CLIENT_ID: "ps-client",
    })
    expect(status.oauth_link_available).toBe(false)
    expect(status.oauth_link_implemented).toBe(false)
    expect(status.oauth_unavailable_reason?.toLowerCase()).toContain("not shipped")
    // Never leak client id into status payload
    expect(JSON.stringify(status)).not.toContain("ps-client")
  })

  it("status never claims team cloud import", () => {
    const status = getShowdownIdentityStatus({})
    expect(status.legacy_sync_enabled).toBe(false)
    expect(status.oauth_link_available).toBe(false)
    expect(status.team_import_note.toLowerCase()).toContain("pasting")
    expect(status.oauth_prerequisites.client_id_configured).toBe(false)
    expect(status.oauth_prerequisites.blocked_reasons.length).toBeGreaterThan(0)
  })

  it("returns 410 with code when legacy sync denied", async () => {
    const res = legacyShowdownSyncDeniedResponse({
      SHOWDOWN_OAUTH_CLIENT_ID: "secret-client-value",
    })
    expect(res).not.toBeNull()
    expect(res!.status).toBe(410)
    const body = await res!.json()
    expect(body.code).toBe(LEGACY_SHOWDOWN_SYNC_DISABLED_CODE)
    // Never leak the client id value (env var name in operator copy is OK)
    expect(JSON.stringify(body)).not.toContain("secret-client-value")
    expect(body.identity.oauth_prerequisites.client_id_configured).toBe(true)
  })

  it("allows legacy sync when flag on", () => {
    expect(
      legacyShowdownSyncDeniedResponse({
        SHOWDOWN_LEGACY_LOGINSERVER_SYNC: "true",
      }),
    ).toBeNull()
  })
})
