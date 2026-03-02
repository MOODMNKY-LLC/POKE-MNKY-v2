# Supabase Discord Bot Setup

> **Source:** Setup guide for hosting Discord bot interactions via Supabase Edge Functions and configuring Developer Portal URLs.  
> **Video reference:** [YouTube](https://www.youtube.com/watch?v=J24Bvo_m7DM) — transcript was requested but could not be retrieved; this document summarizes the setup flow and project implementation.

---

## Overview

This guide covers configuring the POKE MNKY Discord app to use:

1. **Interactions Endpoint URL** — Supabase Edge Function that receives Discord interaction POSTs (slash commands, PING).
2. **Linked Roles Verification URL** — Next.js page for Discord Linked Roles OAuth flow.
3. **Terms of Service URL** and **Privacy Policy URL** — Static app pages for the Developer Portal.

Production app domain: **https://poke-mnky.moodmnky.com**

---

## 1. Discord Developer Portal URLs

Configure these in [Discord Developer Portal](https://discord.com/developers/applications) → your application → General / OAuth2:

| Setting | URL |
|--------|-----|
| **Interactions Endpoint URL** | Use **Option A** (Next.js) or **Option B** (Supabase) below. |
| **Linked Roles Verification URL** | `https://poke-mnky.moodmnky.com/verify-user` |

**Option A — Next.js (recommended if Supabase returns 401):**  
`https://poke-mnky.moodmnky.com/api/discord/interactions`  
Discord hits your app first; the route verifies the signature and responds to PING or forwards commands to the Supabase Edge Function. Requires `DISCORD_PUBLIC_KEY` and `DISCORD_BOT_API_KEY` in your Next.js env (e.g. Vercel).

**Option B — Supabase Edge Function direct:**  
`https://<project-ref>.supabase.co/functions/v1/discord-interactions`  
If you get 401 (signature verification failed), switch to Option A.
| **Terms of Service URL** | `https://poke-mnky.moodmnky.com/terms-of-service` |
| **Privacy Policy URL** | `https://poke-mnky.moodmnky.com/privacy-policy` |

Replace `<project-ref>` with your Supabase project reference (from Supabase dashboard URL).

---

## 2. Interactions Endpoint

**Next.js route (Option A):** `app/api/discord/interactions/route.ts`  
Receives Discord POSTs directly, verifies Ed25519 signature, responds to PING, and forwards APPLICATION_COMMAND to the Supabase Edge Function with `X-Discord-Verified`. Use this URL in the Developer Portal when the Supabase URL returns 401 (e.g. signature headers stripped by the proxy).

**Supabase Edge Function (Option B):** `supabase/functions/discord-interactions/index.ts`
- **Behavior:**
  - If request has header `X-Discord-Verified` equal to `DISCORD_BOT_API_KEY`, treat as already verified (forwarded from Next.js).
  - Else verify every POST with Discord Ed25519 signature (`x-signature-ed25519`, `x-signature-timestamp`, raw body) using `DISCORD_PUBLIC_KEY`.
  - Respond to **PING** (`type === 1`) with `{ type: 1 }` (PONG).
  - For **APPLICATION_COMMAND** (`type === 2`), route by `data.name` and call the Next.js app APIs with `Authorization: Bearer DISCORD_BOT_API_KEY`.
- **Secrets** (set via `supabase secrets set` or `--env-file`):
  - `DISCORD_PUBLIC_KEY` — from Discord Developer Portal (Application → General → Public Key).
  - `DISCORD_BOT_API_KEY` — shared secret used by the app to authenticate bot requests.
  - `APP_BASE_URL` — e.g. `https://poke-mnky.moodmnky.com`.

After deployment, set **Interactions Endpoint URL** in the Developer Portal to the function URL. Discord will send a PING; the function must respond with PONG within 3 seconds.

**If Discord says "The specified interactions endpoint url could not be verified":**

1. **JWT must be off** — Discord does not send a Supabase JWT. Either:
   - Deploy with: `supabase functions deploy discord-interactions --no-verify-jwt`, or
   - Set in `supabase/config.toml`: `[functions.discord-interactions]` and `verify_jwt = false`, then deploy.
2. **URL must be exact** — `https://<project-ref>.supabase.co/functions/v1/discord-interactions` (no trailing slash). Get `<project-ref>` from your Supabase project URL in the dashboard.
3. **At least `DISCORD_PUBLIC_KEY`** must be set as a secret so the function can verify Discord’s request and respond with PONG. Set with: `supabase secrets set DISCORD_PUBLIC_KEY=<your-app-public-key>` (from Developer Portal → your app → General Information → Public Key).
4. **Redeploy** after changing config or secrets: `supabase functions deploy discord-interactions --no-verify-jwt`.

**Important:** The Interactions Endpoint is a **Supabase Edge Function**. It is **not** deployed by `pnpm build` or by pushing to GitHub. You must run `supabase functions deploy discord-interactions --no-verify-jwt` to deploy or update it. Secrets are set with `supabase secrets set` (or in Supabase Dashboard → Project Settings → Edge Functions → Secrets) and apply to the linked project.

**Step-by-step for project `chmrszrwlfeqovwxyrmt`:** (1) `supabase link --project-ref chmrszrwlfeqovwxyrmt` (2) `supabase secrets set DISCORD_PUBLIC_KEY=bed1d73f9643f9532519c5a2049428dde7913c735e317bff8dd1f1b3d3f8c758` (3) `supabase functions deploy discord-interactions --no-verify-jwt` (4) In Discord set URL to `https://chmrszrwlfeqovwxyrmt.supabase.co/functions/v1/discord-interactions` and Save. **If it still fails:** Supabase Dashboard → Edge Functions → discord-interactions → Logs; click Save in Discord and check the **HTTP status** in the logs. **500** = missing `DISCORD_PUBLIC_KEY` or runtime error (the function now returns a JSON body with `error` and `message` and logs the exception — check logs for the exact message). **401** = signature verification failed. Check the log line `discord-interactions: verify failed` for `sig:`/`ts:` (if either is false, the request may be missing Discord’s signature headers). Otherwise ensure `DISCORD_PUBLIC_KEY` is exactly the 64‑char hex from Developer Portal → your app → General Information → Public Key (same app as the Interactions Endpoint). The function also tries canonical JSON body verification in case a proxy re-serializes the body. No logs at all = request blocked before the function (redeploy with `--no-verify-jwt`). Confirm the secret in Dashboard → Project Settings → Edge Functions → Secrets, then redeploy: `supabase functions deploy discord-interactions --no-verify-jwt`.

**Local testing (same flow as [video](https://www.youtube.com/watch?v=J24Bvo_m7DM)):** Run `supabase functions serve discord-interactions --no-verify-jwt` and pass secrets via `--env-file` (e.g. a local `supabase/functions/discord-interactions/.env` with `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_API_KEY`, `APP_BASE_URL`). Supabase serves functions on port **54321** at `/functions/v1/<function-name>`. Expose with ngrok: `ngrok http 54321`, then set Interactions Endpoint URL in the Developer Portal to `https://<ngrok-host>/functions/v1/discord-interactions`. Use `--no-verify-jwt` so Discord (which does not send a Supabase JWT) can reach the function; verification is done inside the function via the Discord signature.

---

## 3. Command handling and timeouts

When using **Option A** (Next.js URL), slash commands are handled **in the Next.js route** (`app/api/discord/interactions/route.ts`), which calls app APIs (whoami, draft status, etc.) directly. This avoids a round-trip to the Supabase Edge Function and keeps the response within Discord’s **3 second** limit. If you see “POKE MNKY didn’t respond in time”, ensure the Interactions Endpoint URL is the Next.js URL and that `DISCORD_BOT_API_KEY` and a base URL (`VERCEL_URL` is set automatically on Vercel; or `APP_BASE_URL` / `NEXT_PUBLIC_APP_URL`) are configured.

**Debugging with Vercel CLI:** From the project root, run `vercel logs <deployment-url>` (e.g. `vercel logs https://poke-mnky-moodmnky-com.vercel.app`) to stream runtime logs while you trigger a slash command. Use the deployment URL from the Vercel dashboard or `vercel ls`.

---

## 4. Command → API Mapping

Slash commands are handled by the Next.js route (Option A) or the Edge Function (Option B), which call the Next.js app:

| Command | App API | Method |
|---------|---------|--------|
| `/whoami` | `/api/discord/coach/whoami` | GET |
| `/draftstatus` | `/api/discord/draft/status` | GET |
| `/pick` | `/api/discord/draft/pick` | POST |
| `/search` | `/api/discord/pokemon/search` | GET |
| `/getseason` / `/setseason` | `/api/discord/guild/config` | GET / POST |
| `/coverage` | `/api/discord/notify/coverage` + status | GET/POST |
| `/free-agency-submit` / `free-agency-status` | Free agency APIs | POST/GET |

See [docs/DISCORD-BOT-API-WIRING.md](docs/DISCORD-BOT-API-WIRING.md) for full mapping.

---

## 5. Verify-User (Linked Roles)

- **Page:** `app/verify-user/page.tsx` — starts Discord OAuth2 with `role_connections.write` and `identify`.
- **Callback:** `app/verify-user/callback/page.tsx` and `POST /api/discord/verify-role-connection` exchange the code for a token and update the user’s application role connection metadata via Discord API and show “Connected” or redirect back to Discord.
- Add the callback URL `https://poke-mnky.moodmnky.com/verify-user/callback` to Discord Developer Portal → OAuth2 → Redirects. Set **Linked Roles Verification URL** to `https://poke-mnky.moodmnky.com/verify-user`. Optional: set `NEXT_PUBLIC_DISCORD_CLIENT_ID` for the verify-user page.

---

## 6. Terms of Service and Privacy Policy

- **Pages:** `app/terms-of-service/page.tsx` and `app/privacy-policy/page.tsx`.
- Static content or redirects; no auth. Set the URLs in the Developer Portal as above.

---

## 7. Server File Copy (Legacy Bot on 10.3.0.119)

The previous Discord bot ran on `moodmnky@10.3.0.119` as a Docker service (`tools/discord-bot` in the server’s POKE-MNKY clone). The following was copied into this repo for reference and migration:

- **Source:** `moodmnky@10.3.0.119:~/POKE-MNKY/tools/discord-bot/`
- **Destination:** [scripts/discord-bot-from-server/](scripts/discord-bot-from-server/) (no `node_modules`; run `pnpm install` there if needed)

**Files copied:** `Dockerfile`, `README.md`, `TESTING-GUIDE.md`, `clear-and-register-commands.ts`, `index.ts`, `notifications.ts`, `package.json`, `pnpm-lock.yaml`, `register-commands.ts`, `start.ts`, `test-notifications.ts`, `test-webhook-integration.ts`, `tsconfig.json`.

**Relationship to this setup:** The legacy bot used the Gateway (WebSocket) and called the Next.js app APIs with a bot key. The new **Interactions Endpoint** (Supabase Edge Function) receives HTTP POSTs from Discord instead of the Gateway; it still calls the same Next.js APIs. You can run the legacy bot from `scripts/discord-bot-from-server/` for comparison or fallback, or migrate fully to the Edge Function and point the Developer Portal Interactions Endpoint URL at Supabase.

Access: `ssh moodmnky@10.3.0.119` (use WSL + sshpass if needed).

---

## 8. Environment Summary

| Variable | Where | Purpose |
|---------|--------|---------|
| `NEXT_PUBLIC_APP_URL` | Next.js / Vercel | App URL (production: `https://poke-mnky.moodmnky.com`) |
| `APP_BASE_URL` | Next.js / Edge Function | Same; used by Supabase function to call app APIs |
| `DISCORD_PUBLIC_KEY` | Supabase secrets + Next.js | Verify interaction requests (required for Next.js `/api/discord/interactions` and Edge Function) |
| `DISCORD_BOT_API_KEY` | Supabase secrets + Next.js | Authenticate bot → app API calls; also used as `X-Discord-Verified` when Next.js forwards to Edge Function |
| `DISCORD_BOT_TOKEN` | Bot / scripts | Register slash commands, guild APIs |
| `DISCORD_CLIENT_ID` | Developer Portal / OAuth | Application ID |

See [docs/DISCORD-ENV-VARIABLES.md](docs/DISCORD-ENV-VARIABLES.md) for full list.
