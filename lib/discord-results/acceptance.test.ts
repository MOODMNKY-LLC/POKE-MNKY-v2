import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { parseResultPost, weekOf } from "@/lib/discord-results/parse"
import { claimMatch, digestAllowed, reconcile, type ScheduleMatch } from "@/lib/discord-results/reconcile"

type FixtureMessage = {
  ts: string
  author: string
  content: string
  is_result: boolean
  expected: {
    winner: string | null
    loser: string | null
    score: [number, number] | null
    week: number
    timer?: boolean
    forfeit?: boolean
    flag?: string
  } | null
}

const fixture = JSON.parse(readFileSync(join(process.cwd(), "fixtures/s7-battle-results.anon.json"), "utf8")) as {
  coaches: Record<string, string>
  messages: FixtureMessage[]
}

const schedule = JSON.parse(
  readFileSync(join(process.cwd(), "fixtures/league-sheet/s7-production-public.json"), "utf8"),
).matches as ScheduleMatch[]

function parsed(message: FixtureMessage) {
  const result = parseResultPost({
    content: message.content,
    timestamp: message.ts,
    author: message.author,
    coaches: fixture.coaches,
  })
  const claim = claimMatch(result, result.week ?? 1, schedule)
  if (!claim) return result
  return { ...result, winner: claim.winner, loser: claim.loser, week: claim.week }
}

describe("discord result reconciliation", () => {
  it("1. finds 37 of 38 results and sends the known miss to review", () => {
    const positives = fixture.messages.filter((message) => message.is_result)
    const negatives = fixture.messages.filter((message) => !message.is_result)
    const misses: string[] = []
    let matched = 0
    for (const message of positives) {
      const result = parsed(message)
      const expected = message.expected!
      if (expected.flag === "KNOWN_MISS") {
        expect(result.queue).toBe("SCORE_WITHOUT_TEAM")
        continue
      }
      const ok = result.winner === expected.winner && result.loser === expected.loser && result.week === expected.week && JSON.stringify(result.score) === JSON.stringify(expected.score)
      if (ok) matched += 1
      else misses.push(`${message.content.slice(0, 80)} => ${result.winner}/${result.loser} w${result.week} ${JSON.stringify(result.score)} expected ${expected.winner}/${expected.loser} w${expected.week}`)
    }
    expect(misses).toEqual([])
    expect(matched).toBe(37)
    expect(negatives.filter((message) => parsed(message).winner).length).toBe(0)
  })

  it("2. Daycare over Boise is in Discord before the sheet, then resolves", () => {
    const post = fixture.messages.find((message) => message.content.includes("Daycare Dittos defeat Boise"))!
    const result = parsed(post)
    expect(reconcile({ parsed: result, sheetWinner: null, sheetStatus: "scheduled", ageHours: 2 }).severity).toBe("warn")
    expect(reconcile({ parsed: result, sheetWinner: null, sheetStatus: "scheduled", ageHours: 30 }).severity).toBe("high")
    expect(reconcile({ parsed: result, sheetWinner: "Daycare Dittos", sheetStatus: "completed" }).flag).toBe("OK")
  })

  it("3. a different remaining count is a margin advisory", () => {
    const post = fixture.messages.find((message) => message.content.includes("3-0 remaining vs Manchester"))!
    const result = parsed(post)
    expect(result.winner).toBe("Kalamazoo Kangaskhans")
    expect(reconcile({
      parsed: result,
      sheetWinner: "Kalamazoo Kangaskhans",
      sheetStatus: "completed",
      sheetKills: [6, 2],
    }).flag).toBe("OK_MARGIN_ADVISORY")
  })

  it("6. a hedged mention is medium confidence and still names Krazy", () => {
    const post = fixture.messages.find((message) => message.content.includes("I think"))!
    const result = parsed(post)
    expect(result.winner).toBe("Krazy Kecleons")
    expect(result.loser).toBe("Twin River Tyranitar")
    expect(result.week).toBe(5)
    expect(result.confidence).toBe("medium")
  })

  it("7. a late Manchester post still claims the week-9 match", () => {
    const post = fixture.messages.find((message) => message.content.includes("Manchester Milcerys beat the Twin River"))!
    expect(parsed(post).week).toBe(9)
  })

  it("8. the opposite sheet winner is a high mismatch", () => {
    const post = fixture.messages.find((message) => message.content.includes("Daycare Dittos defeat Boise"))!
    expect(reconcile({
      parsed: parsed(post),
      sheetWinner: "Boise State Mudsdales",
      sheetStatus: "completed",
    }).flag).toBe("WINNER_MISMATCH")
  })

  it("9. completed sheet matches with no post are flagged", () => {
    const claimed = new Set(
      fixture.messages.filter((message) => message.is_result && message.expected?.flag !== "KNOWN_MISS").map((message) => {
        const result = parsed(message)
        return [result.week, [result.winner, result.loser].sort().join("|")].join(":")
      }),
    )
    const missing = schedule.filter((match) => match.status === "completed" && !match.team1.startsWith("Bye") && !match.team2.startsWith("Bye") && !claimed.has(`${match.week}:${[match.team1, match.team2].sort().join("|")}`))
    expect(missing.map((match) => `${match.week} ${match.team1}`).length).toBeGreaterThanOrEqual(6)
  })

  it("10. the same input reconciles to the same flag", () => {
    const post = fixture.messages.find((message) => message.content.includes("Daycare Dittos defeat Boise"))!
    const once = reconcile({ parsed: parsed(post), sheetWinner: null, sheetStatus: "scheduled", ageHours: 2 })
    const twice = reconcile({ parsed: parsed(post), sheetWinner: null, sheetStatus: "scheduled", ageHours: 2 })
    expect(twice).toEqual(once)
  })

  it("4. timer posts keep the winner and are not margin-comparable", () => {
    const timer = fixture.messages.find((message) => message.content.includes("6-3 remaining due to timer"))!
    const result = parsed(timer)
    expect(result.winner).toBe("Leicester Lycanrocs")
    expect(result.timer).toBe(true)
    expect(reconcile({ parsed: result, sheetWinner: "Leicester Lycanrocs", sheetStatus: "completed", sheetKills: [0, 3] }).flag).toBe("OK")
  })

  it("5. a forfeit still compares the winner and skips the margin", () => {
    const post = fixture.messages.find((message) => message.content.includes("elected to forfeit"))!
    const result = parsed(post)
    expect(result.forfeit).toBe(true)
    expect(result.winner).toBe("Saint Charles Sliders")
  })

  it("12. no committed fixture contains a 17-20 digit id", () => {
    const root = join(process.cwd(), "fixtures")
    const files: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name)
        if (statSync(path).isDirectory()) walk(path)
        else files.push(path)
      }
    }
    walk(root)
    for (const file of files) expect(readFileSync(file, "utf8")).not.toMatch(/\b\d{17,20}\b/)
  })

  it("11. the poll source does not write matches and the digest stays off", () => {
    const source = readFileSync(join(process.cwd(), "app/api/cron/reconcile-discord-results/route.ts"), "utf8")
    expect(source).not.toMatch(/from\(["']matches["']\)/)
    expect(source).not.toMatch(/from\(["']pokemon_stats["']\)/)
    expect(source).not.toMatch(/from\(["']teams["']\)/)
    expect(source).toContain("DISCORD_MOD_DIGEST_ENABLED")
    expect(digestAllowed({ enabled: false, channelId: "1", blockedIds: [] })).toBe(false)
    expect(digestAllowed({ enabled: true, channelId: "results", blockedIds: ["results"] })).toBe(false)
    expect(digestAllowed({ enabled: true, channelId: "mods", blockedIds: ["results"] })).toBe(true)
  })

  it("uses New York weeks from the season start", () => {
    expect(weekOf("2026-08-27T01:44:42.787Z")).toBe(1)
    expect(weekOf("2026-09-01T21:51:29.578Z")).toBe(2)
  })
})
