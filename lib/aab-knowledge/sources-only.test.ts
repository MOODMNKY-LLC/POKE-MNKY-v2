import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { collectSources, extractExcerpts, questionKeywords } from "./excerpts"
import { buildDraftTemplate } from "./template"

const root = process.cwd()
const ROUTES = ["app/api/ai/aab-knowledge/route.ts", "app/api/ai/aab-drafts/route.ts"]
// Built from parts so this file does not itself contain the literal strings it forbids.
const Q = String.fromCharCode(34)
const FORBIDDEN = [
  ["@ai-sdk", "openai"].join("/"),
  `from ${Q}${"open" + "ai"}${Q}`,
  `from ${Q}${"a" + "i"}${Q}`,
  `from '${"open" + "ai"}'`,
  `from '${"a" + "i"}'`,
  "stream" + "Text",
  "generate" + "Text",
  ["OPEN", "AI_API_KEY"].join(""),
  ["AAB_KNOWLEDGE", "MODEL"].join("_"),
  ["open", "ai-client"].join(""),
]

describe("sources-only routes", () => {
  for (const route of ROUTES) {
    it(`${route} never references an LLM`, () => {
      const text = readFileSync(join(root, route), "utf8")
      for (const needle of FORBIDDEN) expect(text).not.toContain(needle)
    })
  }
})

describe("questionKeywords", () => {
  it("drops short words and stopwords", () => {
    expect(questionKeywords("What is the Tera Captain rule?")).toEqual(["tera", "captain", "rule"])
  })
})

describe("extractExcerpts", () => {
  const packet = {
    title: "Draft Rules",
    source_url: "https://example.test/draft",
    classification: "confirmed_rule",
    content: "Intro paragraph.\n\nThe species clause bans duplicates.\n\nUnrelated trade deadline text.",
  }

  it("returns nothing when content is null or empty", () => {
    expect(extractExcerpts("species clause", { ...packet, content: null })).toEqual([])
    expect(extractExcerpts("species clause", { ...packet, content: "  " })).toEqual([])
  })

  it("keeps only keyword matches, tagged with the source", () => {
    const excerpts = extractExcerpts("Explain the species clause", packet)
    expect(excerpts).toEqual([
      { text: "The species clause bans duplicates.", source_title: "Draft Rules", source_url: "https://example.test/draft" },
    ])
  })

  it("falls back to the first two paragraphs without a match", () => {
    const excerpts = extractExcerpts("zzzz", packet)
    expect(excerpts.map((row) => row.text)).toEqual(["Intro paragraph.", "The species clause bans duplicates."])
  })

  it("caps at five excerpts and trims each to about 600 characters", () => {
    const blocks = Array.from({ length: 8 }, (_, i) => `species ${i} ${"x".repeat(900)}`)
    const excerpts = extractExcerpts("species", { ...packet, content: blocks.join("\n\n") })
    expect(excerpts).toHaveLength(5)
    for (const row of excerpts) expect(row.text.length).toBeLessThanOrEqual(600)
  })

  it("splits single-block content by line", () => {
    const excerpts = extractExcerpts("tera", { ...packet, content: "alpha\ntera captain rule\nomega" })
    expect(excerpts.map((row) => row.text)).toEqual(["tera captain rule"])
  })
})

describe("collectSources", () => {
  it("merges the packet source and sources[] without duplicates", () => {
    const sources = collectSources({
      title: "A",
      source_url: "https://a.test",
      classification: "confirmed_rule",
      sources: [{ title: "B", source_url: "https://b.test" }, { title: "A2", source_url: "https://a.test" }],
    })
    expect(sources).toEqual([
      { title: "A", source_url: "https://a.test", classification: "confirmed_rule" },
      { title: "B", source_url: "https://b.test", classification: "confirmed_rule" },
    ])
  })
})

describe("buildDraftTemplate", () => {
  it("leaves blanks and invents nothing when text is not loaded", () => {
    const draft = buildDraftTemplate(
      "pending",
      ["aab_get_pending_decisions"],
      [{ title: "Pending", source_url: "https://p.test", content: null, error: "not_configured" }],
    )
    expect(draft).toContain("## Confirmed rules")
    expect(draft).toContain("## Historical")
    expect(draft).toContain("## Pending decisions")
    expect(draft).toContain("## Commissioner notes\n____")
    expect(draft).toContain("https://p.test")
    expect(draft).toContain("Commissioner to fill in")
    expect(draft).not.toMatch(/\d/)
  })
})
