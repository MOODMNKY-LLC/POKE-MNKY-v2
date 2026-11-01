import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { mapAuditRow, readMoveNames, transactionTypeForMove } from "@/lib/free-agency-history"

describe("sheet free-agency rows", () => {
  it("maps add/drop payload into a history row", () => {
    const row = mapAuditRow({
      id: "audit-1",
      season_id: "season-7",
      team_id: "team-1",
      action: "free_agency_add_drop",
      created_at: "2026-06-01T00:00:00Z",
      payload: {
        add: "Gholdengo",
        drop: "Gengar",
        effective_week_inferred: 4,
        source_key: "S7-sheet:Team6!F3",
      },
      team: { name: "Alabama Donphans" },
    })
    expect(transactionTypeForMove("Gholdengo", "Gengar")).toBe("replacement")
    expect(row.transaction_type).toBe("replacement")
    expect(row.added_pokemon_name).toBe("Gholdengo")
    expect(row.dropped_pokemon_name).toBe("Gengar")
    expect(row.team_name).toBe("Alabama Donphans")
    expect(row.effective_week).toBe(4)
    expect(row.status).toBe("processed")
  })

  it("reads an array embed for the team name", () => {
    const row = mapAuditRow({
      id: "audit-2",
      season_id: "season-7",
      team_id: "team-2",
      action: "drop",
      created_at: "2026-06-02T00:00:00Z",
      payload: { drop: "Magikarp" },
      team: [{ name: "Michigan Meowscaradas" }],
    })
    expect(row.transaction_type).toBe("drop_only")
    expect(row.team_name).toBe("Michigan Meowscaradas")
  })

  it("does not copy a discord id out of the payload", () => {
    const names = readMoveNames({
      add: "Pikachu",
      actor_discord_id: "123456789012345678",
    })
    const row = mapAuditRow({
      id: "audit-3",
      season_id: "season-7",
      team_id: "team-1",
      action: "free_agency_add",
      created_at: "2026-06-03T00:00:00Z",
      payload: { add: "Pikachu", actor_discord_id: "123456789012345678" },
      team: { name: "Daycare Dittos" },
    })
    expect(names.add).toBe("Pikachu")
    expect(JSON.stringify(row)).not.toMatch(/\d{17,20}/)
  })
})

describe("public free-agency view", () => {
  it("does not project actor discord or user ids", () => {
    const sql = readFileSync("supabase/migrations/20261101180000_public_free_agency_view.sql", "utf8")
    const select = sql.slice(sql.toLowerCase().indexOf("select"), sql.toLowerCase().indexOf("from"))
    expect(select).not.toMatch(/actor_/)
    expect(select).toMatch(/added_name/)
    expect(sql).toMatch(/v_public_free_agency/)
  })
})
