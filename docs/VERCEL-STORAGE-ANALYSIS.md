# Vercel Storage Analysis - Correct Approach

> **Date**: 2026-01-17  
> **Critical Finding**: Vercel KV has been **SUNSET**

---

## Key Discovery

According to the [Vercel Storage documentation](https://vercel.com/docs/storage):

> **"KV (formerly Vercel KV): The KV product has been sunset"**

Vercel no longer provides a native Redis-like KV store. Instead, you should use:
1. **Edge Config** - For config-like data (feature flags, redirects)
2. **Marketplace integrations** - Like Upstash Redis for Redis-like needs

---

## Available Vercel Storage Options

### 1. Vercel Edge Config ✅ (Native Vercel Product)

**Best For:**
- Feature flags, A/B testing
- Critical redirects
- IP/user-agent blocklists
- Data that's "read often but changes rarely"

**Limits:**
- **Hobby**: 8 KB max store size, 1 store, 100 writes/month included
- **Pro**: 64 KB max store size, 3 stores, more writes
- **Enterprise**: 512 KB max store size, 10 stores

**Characteristics:**
- Ultra-fast reads (< 1ms, P99 < 15ms)
- Write propagation: Up to 10 seconds globally
- Global replication to all CDN regions
- **Must be created via Dashboard** (no CLI command)

**Setup:**
```bash
# Install SDK
pnpm i @vercel/edge-config

# Create store via Dashboard:
# Storage → Create Database → Edge Config
# Name: homepage-cache (or similar)
# Connect to project

# Pull environment variables
vercel env pull
```

**Usage:**
```typescript
import { get, getAll } from '@vercel/edge-config';

// Read single value
const teams = await get('homepage:teams');

// Read multiple values (counts as 1 read)
const [teams, matches, pokemon] = await getAll([
  'homepage:teams',
  'homepage:matches',
  'homepage:pokemon'
]);
```

**Limitations for Our Use Case:**
- ❌ Size limit (8KB Hobby, 64KB Pro) - our homepage data might exceed this
- ❌ Write propagation delay (10s) - acceptable for 60s ISR but not ideal
- ❌ Must use Dashboard to create (no CLI)

---

### 2. Upstash Redis ✅ (Marketplace Integration)

**Best For:**
- Caching with TTL
- Session storage
- Real-time data
- Data larger than Edge Config limits

**Characteristics:**
- No size limits
- Fast writes (milliseconds)
- TTL support
- Serverless Redis
- Works with `@vercel/kv` package (already implemented!)

**Setup:**
1. Go to Vercel Dashboard → **Marketplace**
2. Search for **"Upstash"**
3. Add **Upstash Redis** integration
4. Connect to your project
5. Environment variables (`KV_URL`, `KV_REST_API_TOKEN`) are automatically added

**Usage:**
```typescript
// Already implemented in lib/cache/redis.ts
import { redisCache } from '@/lib/cache/redis';

const teams = await redisCache.get('homepage:teams');
await redisCache.set('homepage:teams', data, { ttl: 60 });
```

**Advantages for Our Use Case:**
- ✅ No size limits
- ✅ Fast writes
- ✅ TTL support (perfect for 60s cache)
- ✅ Already implemented in our codebase
- ✅ Works with ISR revalidation

---

## Recommendation for Homepage Caching

### Option A: Upstash Redis (Recommended) ✅

**Why:**
- Our homepage data (teams, matches, pokemon stats) might exceed Edge Config's 8KB limit
- We need TTL support (60 seconds)
- Fast writes needed for ISR revalidation
- Code already implemented and ready

**Setup Steps:**
1. Vercel Dashboard → **Marketplace**
2. Search **"Upstash"** → Add **Upstash Redis**
3. Connect to project `poke-mnky-v2`
4. Environment variables auto-added
5. Done! Code already works.

**Time**: ~2 minutes

---

### Option B: Edge Config (Alternative)

**Why Consider:**
- Native Vercel product
- Ultra-fast reads (< 1ms)
- No external service

**Limitations:**
- Size limits (8KB Hobby, 64KB Pro)
- Must verify data fits
- Write propagation delay (10s)
- Dashboard-only creation

**Setup Steps:**
1. Vercel Dashboard → **Storage** → **Create Database**
2. Select **Edge Config**
3. Name: `homepage-cache`
4. Connect to project
5. Update code to use `@vercel/edge-config` instead of `@vercel/kv`

**Time**: ~5 minutes + code changes

---

## Current Implementation Status

### What We Have:
- ✅ `lib/cache/redis.ts` - Uses `@vercel/kv` (Upstash Redis compatible)
- ✅ `app/page.tsx` - Integrated Redis caching
- ✅ Graceful fallback if Redis unavailable

### What We Need:
- ⏳ Upstash Redis Marketplace integration (if choosing Option A)
- OR Edge Config store creation + code refactor (if choosing Option B)

---

## Decision Matrix

| Factor | Edge Config | Upstash Redis |
|--------|-------------|---------------|
| **Setup Complexity** | Medium (Dashboard + code changes) | Easy (Marketplace + done) |
| **Size Limits** | 8KB (Hobby) / 64KB (Pro) | None |
| **Read Latency** | < 1ms (ultra-fast) | ~1-2ms (very fast) |
| **Write Latency** | Up to 10s propagation | Milliseconds |
| **TTL Support** | No (manual expiration) | Yes (native) |
| **Code Changes** | Required (refactor) | None (already done) |
| **Cost** | Included (with limits) | Free tier available |

---

## Recommended Next Steps

### For Upstash Redis (Recommended):

1. **Add Upstash Redis via Marketplace**
   - Vercel Dashboard → Marketplace → Upstash Redis
   - Connect to `poke-mnky-v2` project
   - Environment variables auto-added

2. **Verify Setup**
   ```bash
   vercel env ls | Select-String -Pattern 'KV'
   ```
   Should show: `KV_URL` and `KV_REST_API_TOKEN`

3. **Test**
   ```bash
   pnpm verify:optimizations
   pnpm test:performance
   ```

**Total Time**: ~2 minutes

---

### For Edge Config (Alternative):

1. **Create Edge Config Store**
   - Vercel Dashboard → Storage → Create Database → Edge Config
   - Name: `homepage-cache`
   - Connect to project

2. **Refactor Code**
   - Replace `@vercel/kv` with `@vercel/edge-config`
   - Update `lib/cache/redis.ts` to use Edge Config API
   - Handle size limits and write propagation

3. **Test**
   - Verify data fits in size limits
   - Test write propagation timing

**Total Time**: ~15 minutes + code changes

---

## Conclusion

**Recommendation**: Use **Upstash Redis via Marketplace**

**Reasons:**
1. Code already implemented and tested
2. No size limits (safer for future growth)
3. Native TTL support (perfect for 60s cache)
4. Fast writes (better for ISR revalidation)
5. Quick setup (~2 minutes)

**Edge Config** is better suited for:
- Feature flags
- Configuration data
- Small, rarely-changing data

---

## References

- [Vercel Storage Overview](https://vercel.com/docs/storage)
- [Vercel Edge Config](https://vercel.com/docs/storage/edge-config)
- [Vercel Edge Config Limits](https://vercel.com/docs/storage/edge-config/edge-config-limits)
- [Vercel Marketplace - Upstash](https://vercel.com/marketplace?category=storage&search=redis)
- [Vercel KV Sunset Announcement](https://vercel.com/changelog/vercel-kv)
