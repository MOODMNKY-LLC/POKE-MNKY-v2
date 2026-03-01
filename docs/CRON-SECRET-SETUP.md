# Cron job authentication (CRON_SECRET)

The cron routes (`/api/cron/execute-transactions`, `/api/cron/sync-pokemon`) require a shared secret so only Vercel’s cron (or you with the secret) can call them. **You generate this secret yourself** — Vercel does not issue it.

## How it works

1. You create a random string and set it as **`CRON_SECRET`** in your Vercel project.
2. When Vercel runs a cron job, it automatically sends:
   - **Header:** `Authorization: Bearer <CRON_SECRET>`
3. The route checks that header; if it matches `process.env.CRON_SECRET`, the request is allowed.

No separate “cron credentials” exist — it’s a single secret you create and store in Vercel (and optionally in `.env.local` for local testing).

## Setup

### 1. Generate a secret

Use a long random value (e.g. 32+ characters). Examples:

**PowerShell (Windows):**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

**Node:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**OpenSSL (if installed):**
```bash
openssl rand -hex 32
```

### 2. Add to Vercel

1. Open your project on [Vercel](https://vercel.com) → **Settings** → **Environment Variables**.
2. Add:
   - **Name:** `CRON_SECRET`
   - **Value:** the secret you generated (paste once; it’s shown as encrypted later).
   - **Environments:** at least **Production** (add Preview if you want to test cron on preview deployments).
3. Save. Redeploy so new runs use the variable.

### 3. Optional: local testing

Add to `.env.local` so you can call the cron route locally with the same header:

```env
CRON_SECRET=your_generated_secret_here
```

Then:

```bash
curl -H "Authorization: Bearer YOUR_SECRET" "http://localhost:3000/api/cron/execute-transactions"
```

## Routes that use CRON_SECRET

| Route | Schedule (vercel.json) | Purpose |
|-------|-------------------------|---------|
| `/api/cron/execute-transactions` | `0 5 * * 1` (Mon 05:00 UTC ≈ 00:00 EST) | Run pending trades/FA |
| `/api/cron/sync-pokemon` | `0 3 * * *` (daily 03:00 UTC) | Sync Pokémon cache |

Both use the same `CRON_SECRET`; one value in Vercel protects all cron endpoints.
