import { describe, expect, it } from "vitest"
import { authorizeKnowledgeTool, knowledgeEnabled, knowledgeRole } from "./gate"

describe("aab knowledge gate", () => {
  it("stays off unless the flag is exactly true", () => {
    expect(knowledgeEnabled({})).toBe(false)
    expect(knowledgeEnabled({ AAB_KNOWLEDGE_ENABLED: "1" })).toBe(false)
    expect(knowledgeEnabled({ AAB_KNOWLEDGE_ENABLED: "true" })).toBe(true)
  })

  it("gives coaches the league role and commissioners the project role", () => {
    expect(knowledgeRole("coach")).toBe("claw")
    expect(knowledgeRole("spectator")).toBe("claw")
    expect(knowledgeRole(null)).toBe("claw")
    expect(knowledgeRole("commissioner")).toBe("maus")
    expect(knowledgeRole("admin")).toBe("maus")
  })

  it("hides commissioner tools and page ids from coaches", () => {
    expect(authorizeKnowledgeTool("claw", "aab_get_roadmap").error).toBe("permission_denied")
    expect(authorizeKnowledgeTool("claw", "aab_fixture_canary").error).toBe("permission_denied")
    const draft = authorizeKnowledgeTool("claw", "aab_get_draft_rules", { page_id: "vault" })
    expect(draft.error).toBe("not_configured")
    expect(draft).not.toHaveProperty("page_id")
    expect("source_url" in draft && draft.source_url).toContain("2e7cd2a65422812890eded026dc817b3")
  })

  it("lets a commissioner name the roadmap without loading private text", () => {
    const roadmap = authorizeKnowledgeTool("maus", "aab_get_roadmap")
    expect(roadmap.error).toBe("not_configured")
    expect(roadmap.content).toBeNull()
    expect(roadmap.classification).toBe("project_plan")
  })
})
