import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const post = vi.fn()
const get = vi.fn()

vi.mock("axios", () => ({
  default: { create: vi.fn(() => ({ post, get, put: vi.fn(), patch: vi.fn(), delete: vi.fn() })) },
}))

import { createNotionSyncWorkflow, resolveNotionSyncCredential } from "./workflow-manager"

const WEBHOOK = "https://n8n.example.test/webhook/notion-draft-board"
const SYNC_URL = "https://app.example.test/api/sync/notion/pull"
const SENTINEL = "sentinel-secret-should-not-appear"
const ENV_KEYS = [
  "NOTION_SYNC_SECRET",
  "NOTION_PULL_SYNC_ENABLED",
  "N8N_NOTION_SYNC_CREDENTIAL_ID",
  "N8N_NOTION_SYNC_CREDENTIAL_NAME",
  "N8N_API_URL",
  "N8N_API_KEY",
] as const

describe("createNotionSyncWorkflow", () => {
  const saved: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const k of ENV_KEYS) saved[k] = process.env[k]
    process.env.N8N_API_URL = "https://n8n.example.test"
    process.env.N8N_API_KEY = "test-n8n-api-key"
    process.env.NOTION_PULL_SYNC_ENABLED = "true"
    process.env.NOTION_SYNC_SECRET = SENTINEL
    process.env.N8N_NOTION_SYNC_CREDENTIAL_ID = "cred-123"
    delete process.env.N8N_NOTION_SYNC_CREDENTIAL_NAME
    post.mockReset()
    get.mockReset()
    post.mockResolvedValue({ data: { id: "wf-1" } })
    get.mockResolvedValue({ data: { id: "wf-1", nodes: [] } })
  })

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
  })

  it("uses a credential reference and never embeds the secret or a Bearer string", async () => {
    await createNotionSyncWorkflow(WEBHOOK, SYNC_URL)
    expect(post).toHaveBeenCalledTimes(1)
    const workflow = post.mock.calls[0][1]
    const serialized = JSON.stringify(workflow)

    expect(serialized).not.toContain(SENTINEL)
    expect(serialized).not.toContain("Bearer ")

    const node = workflow.nodes.find((n: { name: string }) => n.name === "Trigger Sync")
    expect(node).toBeDefined()
    expect(node.parameters.authentication).toBe("genericCredentialType")
    expect(node.parameters.genericAuthType).toBe("httpHeaderAuth")
    const headerNames = node.parameters.headerParameters.parameters.map((p: { name: string }) => p.name.toLowerCase())
    expect(headerNames).not.toContain("authorization")
    expect(node.credentials.httpHeaderAuth).toEqual({
      id: "cred-123",
      name: "POKE MNKY Notion Sync Bearer",
    })
  })

  it("honours a custom credential name from env and an explicit parameter override", async () => {
    process.env.N8N_NOTION_SYNC_CREDENTIAL_NAME = "Custom Name"
    await createNotionSyncWorkflow(WEBHOOK, SYNC_URL, undefined, { id: "override-id" })
    const node = post.mock.calls[0][1].nodes.find((n: { name: string }) => n.name === "Trigger Sync")
    expect(node.credentials.httpHeaderAuth).toEqual({ id: "override-id", name: "Custom Name" })
  })

  it("throws when no credential id is configured", async () => {
    delete process.env.N8N_NOTION_SYNC_CREDENTIAL_ID
    await expect(createNotionSyncWorkflow(WEBHOOK, SYNC_URL)).rejects.toThrow(/N8N_NOTION_SYNC_CREDENTIAL_ID/)
    expect(post).not.toHaveBeenCalled()
  })

  it("throws for a blank credential id", () => {
    process.env.N8N_NOTION_SYNC_CREDENTIAL_ID = "   "
    expect(() => resolveNotionSyncCredential()).toThrow(/N8N_NOTION_SYNC_CREDENTIAL_ID/)
  })

  it("still refuses when the pull sync gate is off", async () => {
    delete process.env.NOTION_PULL_SYNC_ENABLED
    await expect(createNotionSyncWorkflow(WEBHOOK, SYNC_URL)).rejects.toThrow()
    expect(post).not.toHaveBeenCalled()
  })
})
