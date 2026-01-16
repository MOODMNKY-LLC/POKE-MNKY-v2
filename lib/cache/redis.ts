/**
 * Redis Cache Utility
 * Uses Upstash Redis (Vercel KV) for caching homepage data
 * Falls back gracefully if Redis is not configured
 */

type CacheOptions = {
  ttl?: number // Time to live in seconds
}

class RedisCache {
  private client: any = null
  private enabled: boolean = false

  constructor() {
    // Only initialize if KV_URL and KV_REST_API_TOKEN are available
    // These are provided by Vercel KV (Upstash Redis)
    if (
      process.env.KV_URL &&
      process.env.KV_REST_API_TOKEN &&
      typeof process.env.KV_URL === 'string' &&
      typeof process.env.KV_REST_API_TOKEN === 'string'
    ) {
      try {
        // Dynamic import to avoid bundling issues if @vercel/kv is not installed
        // @vercel/kv is the official Vercel KV client
        this.enabled = true
      } catch (error) {
        console.warn('[Cache] Redis not available, caching disabled:', error)
        this.enabled = false
      }
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) {
      return null
    }

    try {
      const { kv } = await import('@vercel/kv')
      const value = await kv.get<T>(key)
      return value
    } catch (error) {
      console.warn(`[Cache] Failed to get key "${key}":`, error)
      return null
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
    if (!this.enabled) {
      return false
    }

    try {
      const { kv } = await import('@vercel/kv')
      if (options?.ttl) {
        await kv.set(key, value, { ex: options.ttl })
      } else {
        await kv.set(key, value)
      }
      return true
    } catch (error) {
      console.warn(`[Cache] Failed to set key "${key}":`, error)
      return false
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.enabled) {
      return false
    }

    try {
      const { kv } = await import('@vercel/kv')
      await kv.del(key)
      return true
    } catch (error) {
      console.warn(`[Cache] Failed to delete key "${key}":`, error)
      return false
    }
  }

  /**
   * Check if cache is enabled
   */
  isEnabled(): boolean {
    return this.enabled
  }
}

// Singleton instance
export const redisCache = new RedisCache()

/**
 * Cache keys for homepage data
 */
export const CacheKeys = {
  homepageTeams: 'homepage:teams',
  homepageMatchCount: 'homepage:match_count',
  homepageRecentMatches: 'homepage:recent_matches',
  homepageTopPokemon: 'homepage:top_pokemon',
} as const

/**
 * Cache TTLs (in seconds)
 */
export const CacheTTL = {
  homepage: 60, // 60 seconds - matches ISR revalidate time
  long: 300, // 5 minutes
  short: 30, // 30 seconds
} as const
