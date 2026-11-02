# ISR and Redis Explained - Quick Reference

> **Date**: 2026-01-17  
> **Updated**: 2026-11-02 — Redis is homepage / sheet-sync only; Pokémon catalog does not use Redis.

---

## Pokémon catalog vs Redis (2026-11-02)

Redis is **kept on purpose**. It is used by:

- `app/api/homepage/live-data` — short-TTL cache for homepage live data
- `app/api/sync/google-sheets` — invalidates related cache keys after a sync

Pokémon reads do **not** go through Redis. The single server path is `lib/pokemon-read.ts` → `pokepedia_pokemon` (canonical) → deprecated `pokemon_cache` → PokeAPI (pokenode-ts) with write-back. Clients use `/api/pokemon/catalog` and `/api/pokemon/[name]` only.

---

## What is ISR? (Incremental Static Regeneration)

### Simple Explanation

**ISR** is like having a smart cache that:
1. **Builds your page once** (like a static site)
2. **Serves it instantly** to all visitors (super fast!)
3. **Updates in the background** every 60 seconds (fresh data)
4. **Doesn't block users** while updating (seamless)

### Real-World Analogy

Think of ISR like a **restaurant menu**:
- The menu is printed (static) and given to all customers instantly
- Every hour, the kitchen updates the menu with today's specials
- Customers always get a menu immediately (cached)
- The menu stays fresh (revalidated every hour)

### Technical Details

```typescript
export const revalidate = 60 // Revalidate every 60 seconds
```

**How it works:**
1. First request → Generate page → Cache it
2. Next 60 seconds → Serve cached page (instant!)
3. After 60 seconds → Next request triggers background update
4. Background → Fetch new data → Update cache
5. Future requests → Get updated page

### Benefits

- ✅ **Fast**: Pages load in < 100ms (cached)
- ✅ **Fresh**: Data updates automatically
- ✅ **Efficient**: Database queried only every 60 seconds
- ✅ **Scalable**: Handles millions of requests easily

---

## What is Redis? (Our Caching Layer)

### Simple Explanation

**Redis** is like a **super-fast memory** that stores data temporarily:
1. **Stores data** in memory (super fast access)
2. **Expires automatically** after set time (60 seconds)
3. **Reduces database load** (fewer queries)
4. **Works with ISR** (double caching layer)

### Real-World Analogy

Think of Redis like a **refrigerator**:
- You store food (data) in the fridge (Redis)
- It's faster than going to the store (database)
- Food expires after a while (TTL)
- If fridge is empty, you go to the store (cache miss)

### How We Use It

```
User Request
    ↓
Check Redis Cache
    ↓
Cache Hit? → Return Cached Data (instant!)
    ↓
Cache Miss → Query Database → Store in Redis → Return Data
```

### Cache Flow

1. **First Request**: Cache miss → Query database → Store in Redis
2. **Next Requests**: Cache hit → Return from Redis (instant!)
3. **After 60 seconds**: Cache expires → Next request queries database
4. **Repeat**: Cycle continues

### Benefits

- ✅ **Sub-millisecond**: Redis responses are extremely fast
- ✅ **Reduces Load**: 90%+ fewer database queries
- ✅ **Cost Effective**: Upstash free tier is sufficient
- ✅ **Graceful**: Falls back to database if Redis unavailable

---

## ISR vs Redis: How They Work Together

### Two-Layer Caching Strategy

```
Layer 1: ISR (Next.js)
    ↓
Layer 2: Redis (Upstash KV)
    ↓
Database (Supabase)
```

### Request Flow

1. **Request arrives** → Check ISR cache
2. **ISR cache hit** → Return instantly (no Redis, no database)
3. **ISR cache miss** → Check Redis cache
4. **Redis cache hit** → Return from Redis (no database)
5. **Redis cache miss** → Query database → Store in both caches

### Why Both?

- **ISR**: Handles Next.js page caching (server-side)
- **Redis**: Handles data caching (application-level)
- **Together**: Maximum performance and efficiency

---

## Setup: Redis/Upstash KV

### Option 1: Vercel KV (Recommended - Easiest)

**Since you're on Vercel, use Vercel KV:**

1. **Go to Vercel Dashboard**
   - Your Project → Storage → Create Database → KV

2. **Create KV Database**
   - Name: `poke-mnky-cache`
   - Region: Choose closest to users

3. **Done!**
   - Vercel automatically adds `KV_URL` and `KV_REST_API_TOKEN`
   - No additional configuration needed

### Option 2: Upstash Redis (Standalone)

1. **Sign up**: [upstash.com](https://upstash.com)
2. **Create Redis Database**
3. **Get Connection String**
4. **Add to Environment Variables**:
   ```bash
   KV_URL=your-upstash-url
   KV_REST_API_TOKEN=your-token
   ```

### Option 3: Self-Hosted Redis (Advanced)

Not recommended unless you have specific requirements:
- Requires server management
- More complex setup
- Higher maintenance

---

## Environment Variables

### Required (Auto-set by Vercel KV)

```bash
KV_URL=https://your-kv-instance.upstash.io
KV_REST_API_TOKEN=your-token-here
```

### Optional (For Custom Setup)

```bash
REDIS_URL=redis://localhost:6379  # Self-hosted
REDIS_PASSWORD=your-password       # If password protected
```

---

## Monitoring

### Check Cache Performance

1. **Vercel KV Dashboard**
   - View cache statistics
   - Monitor hit/miss rates
   - Check storage usage

2. **Next.js Logs**
   - Look for `[v0] Loaded all data from cache`
   - Monitor ISR revalidation

3. **Supabase Dashboard**
   - Check query frequency
   - Monitor query performance

---

## Troubleshooting

### Redis Not Working?

**Check:**
1. Environment variables set? (`KV_URL`, `KV_REST_API_TOKEN`)
2. Vercel KV database created?
3. Package installed? (`@vercel/kv`)

**Fallback:**
- Redis is optional - app works without it
- Falls back to database queries
- No errors thrown

### ISR Not Working?

**Check:**
1. `revalidate` export set?
2. Not using `dynamic = 'force-dynamic'`?
3. Build logs show ISR?

**Note:**
- ISR only works in production builds
- Development mode is always dynamic

---

## Summary

- **ISR**: Next.js page caching (60-second revalidation)
- **Redis**: Application data caching (60-second TTL)
- **Together**: Maximum performance (5-10x faster)
- **Setup**: Vercel KV is easiest (automatic with Vercel)

**Result**: Fast, efficient, scalable homepage! 🚀
