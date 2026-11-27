import { describe, expect, it } from "vitest"
import {
  EXTERNAL_DOCS_HREF,
  PUBLIC_FOOTER_GROUPS,
  PUBLIC_NAV_GROUPS,
  getPublicFooterHrefs,
  getPublicInternalHrefs,
  getPublicNavItems,
  getPublicPaletteEntries,
} from "./public-nav"

describe("public nav groups", () => {
  it("exposes the five required groups in order", () => {
    expect(PUBLIC_NAV_GROUPS.map((g) => g.id)).toEqual([
      "league",
      "draft",
      "battle",
      "reference",
      "join",
    ])
  })

  it("lists every required public route exactly once", () => {
    const hrefs = getPublicInternalHrefs()
    const required = [
      "/standings",
      "/teams",
      "/schedule",
      "/matches",
      "/playoffs",
      "/mvp",
      "/draft",
      "/draft/board",
      "/showdown",
      "/showdown/match-lobby",
      "/showdown/team-library",
      "/showdown/team-validator",
      "/showdown/replay-library",
      "/teams/builder",
      "/calc",
      "/pokedex",
      "/insights",
      "/videos",
      "/docs/api",
      "/apply/coach",
    ]
    for (const href of required) {
      expect(hrefs).toContain(href)
    }
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it("keeps the external docs link in the reference group", () => {
    const reference = PUBLIC_NAV_GROUPS.find((g) => g.id === "reference")
    const external = reference?.items.find((i) => i.external)
    expect(external?.href).toBe(EXTERNAL_DOCS_HREF)
  })

  it("has unique item ids across groups", () => {
    const ids = getPublicNavItems().map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("feeds the same items to the command palette", () => {
    const paletteHrefs = getPublicPaletteEntries().map((e) => e.href).sort()
    const navHrefs = getPublicNavItems().map((i) => i.href).sort()
    expect(paletteHrefs).toEqual(navHrefs)
  })
})

describe("public footer", () => {
  it("includes Legal privacy and terms links", () => {
    const legal = PUBLIC_FOOTER_GROUPS.find((g) => g.id === "legal")
    expect(legal?.items.map((i) => ("href" in i ? i.href : null))).toEqual([
      "/privacy-policy",
      "/terms-of-service",
    ])
  })

  it("leaves Discord server and League rules unlinked", () => {
    const connect = PUBLIC_FOOTER_GROUPS.find((g) => g.id === "connect")
    const plain = (connect?.items ?? []).filter((i) => "plain" in i && i.plain)
    expect(plain.map((i) => i.title)).toEqual(["Discord server", "League rules"])
  })

  it("only returns real hrefs from the footer helper", () => {
    const hrefs = getPublicFooterHrefs()
    expect(hrefs).toContain("/privacy-policy")
    expect(hrefs).toContain("/standings")
    expect(hrefs.every((h) => h.startsWith("/") || h.startsWith("https://"))).toBe(true)
  })
})
