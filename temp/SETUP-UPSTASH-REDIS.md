# Setup Upstash Redis via Vercel Marketplace

> **Date**: 2026-01-17  
> **Status**: Ready to Execute

---

## Important Discovery

**Vercel KV has been SUNSET** - it's no longer a native Vercel product.

Instead, use **Upstash Redis** via the Vercel Marketplace, which works perfectly with our existing `@vercel/kv` implementation!

---

## Quick Setup (2 Minutes)

### Step 1: Add Upstash Redis Integration

1. **Go to Vercel Dashboard**
   - URL: https://vercel.com/dashboard
   - Select project: `poke-mnky-v2`

2. **Open Marketplace**
   - Click **"Marketplace"** in left sidebar (or top navigation)
   - Search for **"Upstash"**
   - Click on **"Upstash"** integration

3. **Add Integration**
   - Click **"Add Integration"** button
   - Select **"Upstash Redis"** (not Vector or Queue)
   - Choose project: `poke-mnky-v2`
   - Click **"Add"** or **"Connect"**

4. **Configure (if prompted)**
   - Create new Upstash Redis database
   - Choose region closest to users (e.g., `us-east-1`)
   - Click **"Create"**

### Step 2: Verify Environment Variables

**Check variables were added:**
```bash
vercel env ls | Select-String -Pattern 'KV'
```

**Should show:**
- `KV_URL`
- `KV_REST_API_TOKEN`

These are automatically available in your Next.js app!

### Step 3: Verify Everything Works

```bash
# Verify optimizations
pnpm verify:optimizations

# Test performance
pnpm test:performance
```

---

## Why Upstash Redis?

✅ **Works with existing code** - Our `@vercel/kv` implementation is compatible  
✅ **No size limits** - Unlike Edge Config (8KB Hobby, 64KB Pro)  
✅ **TTL support** - Perfect for 60-second cache expiration  
✅ **Fast writes** - Better for ISR revalidation  
✅ **Quick setup** - Marketplace integration is instant  

---

## Alternative: Edge Config

If you prefer a native Vercel solution:

**Limitations:**
- Size limits (8KB Hobby, 64KB Pro)
- Write propagation delay (10 seconds)
- Requires code refactoring
- Dashboard-only creation (no CLI)

**Setup:**
- Vercel Dashboard → Storage → Create Database → Edge Config
- Name: `homepage-cache`
- Connect to project
- Refactor code to use `@vercel/edge-config`

**Not recommended** for our use case due to size limits and code changes needed.

---

## Current Code Status

✅ **Already Implemented:**
- `lib/cache/redis.ts` - Uses `@vercel/kv` (Upstash compatible)
- `app/page.tsx` - Integrated Redis caching
- Graceful fallback if Redis unavailable

✅ **Ready to Use:**
- Just add Upstash Redis via Marketplace
- Environment variables auto-added
- Code works immediately!

---

## Next Steps

1. **Add Upstash Redis** via Marketplace (2 minutes)
2. **Verify** environment variables exist
3. **Test** performance improvements
4. **Monitor** cache hit rates

**That's it!** Your code is already ready. 🚀

---

## References

- [Vercel Marketplace - Upstash](https://vercel.com/marketplace?category=storage&search=redis)
- [Vercel Storage Docs](https://vercel.com/docs/storage)
- [Upstash Redis Docs](https://docs.upstash.com/redis)
