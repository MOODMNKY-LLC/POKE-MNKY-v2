import { beforeEach, describe, expect, it, vi } from "vitest"

const { appGet } = vi.hoisted(() => ({
  appGet: vi.fn(),
}))

vi.mock("./api-client", () => ({
  appGet,
}))

import { canManageDraftConfig } from "./permissions"

describe("canManageDraftConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("allows admins via Discord permission without fetching config", async () => {
    const interaction = {
      guildId: "123",
      user: { id: "u1" },
      guild: {
        members: {
          fetch: vi.fn().mockResolvedValue({ permissions: { has: () => true } }),
        },
      },
    } as any

    await expect(canManageDraftConfig(interaction)).resolves.toBe(true)
    expect(appGet).not.toHaveBeenCalled()
  })

  it("reads top-level admin_role_ids from guild config", async () => {
    appGet.mockResolvedValue({ ok: true, admin_role_ids: ["role-a", "role-b"] })
    const interaction = {
      guildId: "123",
      user: { id: "u1" },
      guild: {
        members: {
          fetch: vi.fn().mockResolvedValue({
            permissions: { has: () => false },
            roles: { cache: new Map([["role-a", { id: "role-a" }]]) },
          }),
        },
      },
    } as any

    await expect(canManageDraftConfig(interaction)).resolves.toBe(true)
    expect(appGet).toHaveBeenCalledTimes(1)
  })

  it("falls back to nested config.admin_role_ids for compatibility", async () => {
    appGet.mockResolvedValue({ ok: true, config: { admin_role_ids: ["role-z"] } })
    const interaction = {
      guildId: "123",
      user: { id: "u1" },
      guild: {
        members: {
          fetch: vi.fn().mockResolvedValue({
            permissions: { has: () => false },
            roles: { cache: new Map([["role-z", { id: "role-z" }]]) },
          }),
        },
      },
    } as any

    await expect(canManageDraftConfig(interaction)).resolves.toBe(true)
  })
})
