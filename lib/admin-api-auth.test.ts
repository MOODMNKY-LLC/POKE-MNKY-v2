import { describe, expect, it } from "vitest"
import { hasDiscordLeagueAdminRole, profileGrantsLeagueAdminAccess } from "./admin-api-auth"

describe("hasDiscordLeagueAdminRole", () => {
  it("returns true for Admin or Commissioner Discord roles", () => {
    expect(
      hasDiscordLeagueAdminRole([{ name: "Coach" }, { name: "Admin", id: "1" }])
    ).toBe(true)
    expect(hasDiscordLeagueAdminRole([{ name: "Commissioner" }])).toBe(true)
  })

  it("returns false for unrelated or missing roles", () => {
    expect(hasDiscordLeagueAdminRole([{ name: "Coach" }])).toBe(false)
    expect(hasDiscordLeagueAdminRole(null)).toBe(false)
    expect(hasDiscordLeagueAdminRole(undefined)).toBe(false)
  })
})

describe("profileGrantsLeagueAdminAccess", () => {
  it("allows admin and commissioner profile roles", () => {
    expect(profileGrantsLeagueAdminAccess({ role: "admin" })).toBe(true)
    expect(profileGrantsLeagueAdminAccess({ role: "commissioner" })).toBe(true)
  })

  it("allows coach profile when Discord Admin role is present", () => {
    expect(
      profileGrantsLeagueAdminAccess({
        role: "coach",
        discord_roles: [{ name: "Admin" }],
      })
    ).toBe(true)
  })

  it("denies coach without elevated Discord roles", () => {
    expect(profileGrantsLeagueAdminAccess({ role: "coach" })).toBe(false)
  })
})
