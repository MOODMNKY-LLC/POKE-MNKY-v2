import { describe, expect, it } from "vitest"
import { getPrimaryAction } from "./controls-panel"

const base = {
  phase: "draft",
  status: "configured",
  active_command_id: null,
  cursor: {},
}

describe("getPrimaryAction", () => {
  it("queues one pick when nothing is queued", () => {
    const action = getPrimaryAction(base)
    expect(action).toMatchObject({
      kind: "queue",
      unit: "pick",
      label: "Prepare the next pick",
    })
    expect(`${action.kind === "queue" ? action.label : ""} ${action.hint}`).not.toMatch(
      /worker|step_seq|lease|command/i,
    )
  })

  it("runs the queued step when a command is waiting", () => {
    expect(
      getPrimaryAction({ ...base, status: "queued", active_command_id: "cmd" }),
    ).toMatchObject({ kind: "tick", label: "Simulate what's ready" })
  })

  it("resumes a paused run instead of inventing a result", () => {
    const action = getPrimaryAction({ ...base, status: "paused", phase: "regular", cursor: { draft_complete: true } })
    expect(action).toMatchObject({ kind: "resume", label: "Continue this practice season" })
    expect(action.hint).toMatch(/does not play/i)
  })

  it("offers no next step once the run is complete", () => {
    expect(getPrimaryAction({ ...base, status: "completed", phase: "complete" })).toMatchObject({
      kind: "none",
    })
  })
})
