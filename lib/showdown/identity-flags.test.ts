import { describe, expect, it } from "vitest"
import {
  getShowdownIdentityStatus,
  isLegacyLoginserverSyncEnabled,
  isShowdownOauthLinkAvailable,
  legacyShowdownSyncDeniedResponse,
  LEGACY_SHOWDOWN_SYNC_DISABLED_CODE,
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

  it("treats oauth as unavailable without client id", () => {
    expect(isShowdownOauthLinkAvailable({})).toBe(false)
    expect(
      isShowdownOauthLinkAvailable({ SHOWDOWN_OAUTH_CLIENT_ID: "  " }),
    ).toBe(false)
    expect(
      isShowdownOauthLinkAvailable({ SHOWDOWN_OAUTH_CLIENT_ID: "ps-client" }),
    ).toBe(true)
  })

  it("status never claims team cloud import", () => {
    const status = getShowdownIdentityStatus({})
    expect(status.legacy_sync_enabled).toBe(false)
    expect(status.oauth_link_available).toBe(false)
    expect(status.team_import_note.toLowerCase()).toContain("pasting")
  })

  it("returns 410 with code when legacy sync denied", async () => {
    const res = legacyShowdownSyncDeniedResponse({})
    expect(res).not.toBeNull()
    expect(res!.status).toBe(410)
    const body = await res!.json()
    expect(body.code).toBe(LEGACY_SHOWDOWN_SYNC_DISABLED_CODE)
  })

  it("allows legacy sync when flag on", () => {
    expect(
      legacyShowdownSyncDeniedResponse({
        SHOWDOWN_LEGACY_LOGINSERVER_SYNC: "true",
      }),
    ).toBeNull()
  })
})
