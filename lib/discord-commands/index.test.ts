import { describe, expect, it } from "vitest"
import { getAllCommands } from "./index"

describe("getAllCommands", () => {
  it("registers the 11 live app slash commands including join-battles", () => {
    const names = getAllCommands().map((command) => command.data.name)
    expect(names).toHaveLength(11)
    expect(names).toEqual(
      expect.arrayContaining([
        "pick",
        "search",
        "draftstatus",
        "whoami",
        "setseason",
        "getseason",
        "coverage",
        "calc",
        "free-agency-submit",
        "free-agency-status",
        "join-battles",
      ]),
    )
  })
})
