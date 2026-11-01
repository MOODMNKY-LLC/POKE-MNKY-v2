import { describe, expect, it } from "vitest"
import {
  configuredSupabaseProjectRef,
  isAllowedSupabaseManagementPath,
  mcpProxyEndpoint,
  supabaseManagementUrl,
} from "./proxy-allowlists"

const env = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abcd1234.supabase.co",
}

describe("mcpProxyEndpoint", () => {
  it("allows the typed MCP client paths", () => {
    expect(mcpProxyEndpoint(["api", "health"])).toBe("/api/health")
    expect(mcpProxyEndpoint(["api", "get_smogon_meta"])).toBe("/api/get_smogon_meta")
  })

  it("rejects unknown paths, traversal, and absolute URLs", () => {
    expect(mcpProxyEndpoint(["api", "admin", "delete"])).toBeNull()
    expect(mcpProxyEndpoint(["..", "etc", "passwd"])).toBeNull()
    expect(mcpProxyEndpoint(["https://evil.example"])).toBeNull()
    expect(mcpProxyEndpoint([])).toBeNull()
  })
})

describe("supabase management proxy allowlist", () => {
  it("allows only this project's platform-kit reads", () => {
    expect(isAllowedSupabaseManagementPath("v1/projects/abcd1234/database/query", env)).toBe(true)
    expect(isAllowedSupabaseManagementPath("v1/projects/abcd1234/logs", env)).toBe(true)
    expect(isAllowedSupabaseManagementPath("v1/projects/abcd1234/storage/buckets", env)).toBe(true)
    expect(
      supabaseManagementUrl("v1/projects/abcd1234/logs", "service=api", env)
    ).toBe("https://api.supabase.com/v1/projects/abcd1234/logs?service=api")
  })

  it("rejects other projects, other hosts, and traversal", () => {
    expect(isAllowedSupabaseManagementPath("v1/projects/otherproj/database/query", env)).toBe(false)
    expect(isAllowedSupabaseManagementPath("v1/projects/abcd1234/database/backups", env)).toBe(false)
    expect(isAllowedSupabaseManagementPath("https://evil.example/steal", env)).toBe(false)
    expect(isAllowedSupabaseManagementPath("v1/projects/abcd1234/../secrets", env)).toBe(false)
    expect(configuredSupabaseProjectRef({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" })).toBeNull()
  })
})
