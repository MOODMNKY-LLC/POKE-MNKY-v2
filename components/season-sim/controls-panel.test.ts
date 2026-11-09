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
    expect(getPrimaryAction(base)).toMatchObject({ kind: "queue", unit: "pick" })
  })

  it("runs the queued step when a command is waiting", () => {
    expect(
      getPrimaryAction({ ...base, status: "queued", active_command_id: "cmd" }),
    ).toMatchObject({ kind: "tick" })
  })

  it("resumes a paused run instead of inventing a result", () => {
    expect(getPrimaryAction({ ...base, status: "paused", phase: "regular" })).toMatchObject({
      kind: "resume",
    })
  })

  it("offers no next step once the run is complete", () => {
    expect(getPrimaryAction({ ...base, status: "completed", phase: "complete" })).toMatchObject({
      kind: "none",
    })
  })
})
