import { describe, expect, it } from "vitest"
import nextConfig from "../next.config.mjs"

type RemotePattern = { protocol?: string; hostname: string; pathname?: string }

const images = nextConfig.images as {
  unoptimized?: boolean
  formats?: string[]
  minimumCacheTTL?: number
  remotePatterns?: RemotePattern[]
}

describe("next.config images", () => {
  it("keeps Next image optimization on", () => {
    expect(images.unoptimized).not.toBe(true)
    expect(images.formats).toEqual(["image/avif", "image/webp"])
    expect(images.minimumCacheTTL).toBe(2678400)
  })

  it("allows every remote host used by next/image", () => {
    const hosts = (images.remotePatterns ?? []).map((p) => p.hostname)
    expect(hosts).toContain("raw.githubusercontent.com")
    expect(hosts).toContain("i.ytimg.com")
    expect(hosts).toContain("*.supabase.co")
  })

  it("scopes remote hosts to https and specific paths", () => {
    for (const pattern of images.remotePatterns ?? []) {
      expect(pattern.protocol).toBe("https")
      expect(pattern.pathname).toBeTruthy()
    }
  })

  it("does not enable dangerouslyAllowSVG", () => {
    expect((images as Record<string, unknown>).dangerouslyAllowSVG).toBeUndefined()
  })
})
