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
| **Interactions Endpoint URL** | `https://<project-ref>.supabase.co/functions/v1/discord-interactions` |
| **Linked Roles Verification URL** | `https://poke-mnky.moodmnky.com/verify-user` |
| **Terms of Service URL** | `https://poke-mnky.moodmnky.com/terms-of-service` |
| **Privacy Policy URL** | `https://poke-mnky.moodmnky.com/privacy-policy` |

Replace `<project-ref>` with your Supabase project reference (from Supabase dashboard URL).

---

## 2. Interactions Endpoint (Supabase Edge Function)

- **Function:** `supabase/functions/discord-interactions/index.ts`
- **Behavior:**
  - Verify every POST with Discord Ed25519 signature (`x-signature-ed25519`, `x-signature-timestamp`, raw body) using `DISCORD_PUBLIC_KEY`.
  - Respond to **PING** (`type === 1`) with `{ type: 1 }` (PONG).
  - For **APPLICATION_COMMAND** (`type === 2`), route by `data.name` and call the Next.js app APIs with `Authorization: Bearer DISCORD_BOT_API_KEY`.
- **Secrets** (set via `supabase secrets set` or `--env-file`):
  - `DISCORD_PUBLIC_KEY` — from Discord Developer Portal (Application → General → Public Key).
  - `DISCORD_BOT_API_KEY` — shared secret used by the app to authenticate bot requests.
  - `APP_BASE_URL` — e.g. `https://poke-mnky.moodmnky.com`.

After deployment, set **Interactions Endpoint URL** in the Developer Portal to the function URL. Discord will send a PING; the function must respond with PONG within 3 seconds.

---

## 3. Command → API Mapping

Slash commands are handled by the Edge Function, which forwards to the Next.js app:

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

## 4. Verify-User (Linked Roles)

- **Page:** `app/verify-user/page.tsx` — starts Discord OAuth2 with `role_connections.write` and `identify`.
- **Callback:** `app/verify-user/callback/page.tsx` and `POST /api/discord/verify-role-connection` exchange the code for a token and update the user’s application role connection metadata via Discord API and show “Connected” or redirect back to Discord.
- Add the callback URL `https://poke-mnky.moodmnky.com/verify-user/callback` to Discord Developer Portal → OAuth2 → Redirects. Set **Linked Roles Verification URL** to `https://poke-mnky.moodmnky.com/verify-user`. Optional: set `NEXT_PUBLIC_DISCORD_CLIENT_ID` for the verify-user page.

---

## 5. Terms of Service and Privacy Policy

- **Pages:** `app/terms-of-service/page.tsx` and `app/privacy-policy/page.tsx`.
- Static content or redirects; no auth. Set the URLs in the Developer Portal as above.

---

## 6. Server File Copy (Legacy Bot on 10.3.0.119)

The previous Discord bot ran on `moodmnky@10.3.0.119` as a Docker service (`tools/discord-bot` in the server’s POKE-MNKY clone). The following was copied into this repo for reference and migration:

- **Source:** `moodmnky@10.3.0.119:~/POKE-MNKY/tools/discord-bot/`
- **Destination:** [scripts/discord-bot-from-server/](scripts/discord-bot-from-server/) (no `node_modules`; run `pnpm install` there if needed)

**Files copied:** `Dockerfile`, `README.md`, `TESTING-GUIDE.md`, `clear-and-register-commands.ts`, `index.ts`, `notifications.ts`, `package.json`, `pnpm-lock.yaml`, `register-commands.ts`, `start.ts`, `test-notifications.ts`, `test-webhook-integration.ts`, `tsconfig.json`.

**Relationship to this setup:** The legacy bot used the Gateway (WebSocket) and called the Next.js app APIs with a bot key. The new **Interactions Endpoint** (Supabase Edge Function) receives HTTP POSTs from Discord instead of the Gateway; it still calls the same Next.js APIs. You can run the legacy bot from `scripts/discord-bot-from-server/` for comparison or fallback, or migrate fully to the Edge Function and point the Developer Portal Interactions Endpoint URL at Supabase.

Access: `ssh moodmnky@10.3.0.119` (use WSL + sshpass if needed).

---

## 7. Environment Summary

| Variable | Where | Purpose |
|---------|--------|---------|
| `NEXT_PUBLIC_APP_URL` | Next.js / Vercel | App URL (production: `https://poke-mnky.moodmnky.com`) |
| `APP_BASE_URL` | Next.js / Edge Function | Same; used by Supabase function to call app APIs |
| `DISCORD_PUBLIC_KEY` | Supabase secrets | Verify interaction requests |
| `DISCORD_BOT_API_KEY` | Supabase secrets + Next.js | Authenticate bot → app API calls |
| `DISCORD_BOT_TOKEN` | Bot / scripts | Register slash commands, guild APIs |
| `DISCORD_CLIENT_ID` | Developer Portal / OAuth | Application ID |

See [docs/DISCORD-ENV-VARIABLES.md](docs/DISCORD-ENV-VARIABLES.md) for full list.
