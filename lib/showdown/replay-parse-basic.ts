/**
 * Basic, high-confidence replay observations only.
 * Winner / tie / players / turns / faint events — no KO credit or set reconstruction.
 */

export const REPLAY_PARSER_VERSION = "phase1-basic-1"

export type ProvenanceRef = { line: number; text: string }

export type BasicReplayObservation = {
  parser_version: string
  players: { p1: string | null; p2: string | null }
  winner: "p1" | "p2" | "tie" | null
  winner_name: string | null
  turn_count: number
  faint_events: Array<{
    side: "p1" | "p2" | "unknown"
    slot: string
    turn: number
    provenance: ProvenanceRef
  }>
  confidence: {
    players: "high" | "medium" | "low"
    winner: "high" | "medium" | "low"
    turns: "high" | "medium" | "low"
    faints: "high" | "medium" | "low"
  }
  provenance: {
    players: ProvenanceRef[]
    winner: ProvenanceRef[]
  }
  disclaimers: string[]
}

export function parseBasicReplayLog(logText: string): BasicReplayObservation {
  const lines = logText.split(/\r?\n/)
  const players: { p1: string | null; p2: string | null } = { p1: null, p2: null }
  const playerProv: ProvenanceRef[] = []
  const winnerProv: ProvenanceRef[] = []
  let winner: "p1" | "p2" | "tie" | null = null
  let winnerName: string | null = null
  let turnCount = 0
  const faintEvents: BasicReplayObservation["faint_events"] = []

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i]
    if (!text.startsWith("|")) continue
    const parts = text.split("|")
    const cmd = parts[1]

    if (cmd === "player") {
      const side = parts[2]
      const name = parts[3] || ""
      if (side === "p1" || side === "p2") {
        players[side] = name || null
        playerProv.push({ line: i + 1, text })
      }
      continue
    }

    if (cmd === "turn") {
      const n = parseInt(parts[2] || "0", 10)
      if (Number.isFinite(n)) turnCount = Math.max(turnCount, n)
      continue
    }

    if (cmd === "faint") {
      const slot = parts[2] || ""
      const side: "p1" | "p2" | "unknown" = slot.startsWith("p1")
        ? "p1"
        : slot.startsWith("p2")
          ? "p2"
          : "unknown"
      faintEvents.push({
        side,
        slot,
        turn: turnCount,
        provenance: { line: i + 1, text },
      })
      continue
    }

    if (cmd === "win") {
      const arg = parts[2] || ""
      winnerProv.push({ line: i + 1, text })
      if (arg === players.p1 || arg.startsWith("p1")) {
        winner = "p1"
        winnerName = players.p1
      } else if (arg === players.p2 || arg.startsWith("p2")) {
        winner = "p2"
        winnerName = players.p2
      } else {
        winnerName = arg || null
        if (players.p1 && arg === players.p1) winner = "p1"
        else if (players.p2 && arg === players.p2) winner = "p2"
        else winner = null
      }
      continue
    }

    if (cmd === "tie" || cmd === "draw") {
      winnerProv.push({ line: i + 1, text })
      winner = "tie"
      winnerName = null
    }
  }

  return {
    parser_version: REPLAY_PARSER_VERSION,
    players,
    winner,
    winner_name: winnerName,
    turn_count: turnCount,
    faint_events: faintEvents,
    confidence: {
      players: players.p1 && players.p2 ? "high" : "medium",
      winner: winner ? "high" : "low",
      turns: "high",
      faints: "high",
    },
    provenance: { players: playerProv, winner: winnerProv },
    disclaimers: [
      "Faint events are not KO credit (residual, recoil, hazards, self-KO not attributed).",
      "Does not reconstruct EVs, IVs, moves, or hidden opponent sets.",
      "Observed facts only — not official league standings or MVP.",
    ],
  }
}
