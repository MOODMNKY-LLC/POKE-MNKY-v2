import { describe, expect, it } from "vitest"
import { parseBasicReplayLog } from "./replay-parse-basic"

const LOG = `|player|p1|Alice|1|
|player|p2|Bob|2|
|turn|1|
|faint|p2a: Pikachu|
|turn|2|
|faint|p1a: Bulbasaur|
|win|Alice|
`

describe("parseBasicReplayLog", () => {
  it("extracts players winner turns and faint events with provenance", () => {
    const obs = parseBasicReplayLog(LOG)
    expect(obs.players.p1).toBe("Alice")
    expect(obs.players.p2).toBe("Bob")
    expect(obs.winner).toBe("p1")
    expect(obs.winner_name).toBe("Alice")
    expect(obs.turn_count).toBe(2)
    expect(obs.faint_events).toHaveLength(2)
    expect(obs.faint_events[0].side).toBe("p2")
    expect(obs.confidence.winner).toBe("high")
    expect(obs.disclaimers.some((d) => d.toLowerCase().includes("ko credit"))).toBe(
      true,
    )
  })

  it("records ties", () => {
    const obs = parseBasicReplayLog(`|player|p1|A|\n|player|p2|B|\n|tie|\n`)
    expect(obs.winner).toBe("tie")
  })
})
