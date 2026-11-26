# Automated NetBird battle-network onboarding

Status: built, **switched off everywhere**, nothing deployed. Every step in the rollout section needs Simeon's approval.

The battle network is a private NetBird network that only reaches the RyuLDN battle server (TCP 30456). This feature lets league members get an invite without anyone creating it by hand.

## How it works

### For members and coaches

You can ask for access in two places:

1. **The app:** sign in, open **Dashboard > Guides > NetBird**, press **Get battle access**.
2. **Discord:** run `/join-battles` in the league server. The reply is private (only you see it).

What happens next depends on who you are:

- **Current league coach:** you are approved automatically. Your invite link appears on the guide page and is also sent to your Discord DMs. You are done in a few seconds.
- **Everyone else:** your request waits for a league admin. You see "Waiting for a league admin to approve you." When it is approved, the invite arrives the same way (guide page plus a Discord DM).

The invite link works for **72 hours**. If it expires or fails, press **Try again** on the guide page (or run `/join-battles` again). If access was denied or removed, contact a league admin.

"Current coach" is decided by the database, never by the browser: an active coach who has a team in a season that is not a sandbox and is either the current season or a live competitive season. No season names or ids are hard-coded.

If the league-wide limit of 10 automatic invites in 24 hours is reached, a coach's request simply becomes a normal pending request for an admin to approve. A person can make at most 3 requests per hour.

### For admins

Open **Admin > NetBird requests** (`/admin/netbird-requests`). Each request shows where it came from (App or Discord), whether it was automatic (Coach) or needs an admin, its status, when it was created and updated, and the last error if something went wrong.

One-tap buttons, shown only when they make sense:

| Button | When | What it does |
| --- | --- | --- |
| Approve | Waiting for approval | Approves and sends the invite automatically |
| Deny | Waiting for approval | Declines the request |
| Revoke | Approved or invited | Cancels an unused invite, or blocks the member's access if they already joined (their account is never deleted) |
| Send again | Invited, expired, failed | Sends a fresh invite |

A **Recent activity** list at the bottom shows the last 25 events.

If `NETBIRD_ADMIN_DISCORD_IDS` is set, each new pending request also sends the listed admins a Discord DM with **Approve** and **Deny** buttons. Clicking works only for the listed admins who are also admins in the app.

When onboarding is switched off, a banner on the admin page says so. Approve still saves the decision but sends nothing; use **Send again** after switching on.

## Architecture

```
Member --(app page or /join-battles)--> Next.js app (Vercel)
                                           | decides coach vs. pending in Supabase (service role)
                                           | signed HTTPS call (HMAC-SHA256 + timestamp)
                                           v
                              Cloudflare Worker  aab-netbird-onboard
                                |  holds NetBird token + Discord bot token
                                |--> NetBird API: create / regenerate / delete invite, block user
                                '--> Discord API: DM the invite, DM admins
```

- The **Next.js app never sees** the NetBird token or the Discord bot token. Only the Worker has them.
- App to Worker calls are JSON bodies signed with HMAC-SHA256 using a shared secret. A timestamp header is included and anything older than 5 minutes is rejected. `lib/netbird/worker-signing.ts` is the single source; the Worker has a byte-identical copy (`workers/aab-netbird-onboard/src/worker-signing.ts`), and a test fails if they drift apart.
- Invite links are stored in `netbird_invite_links`, which only the service role can read. A member sees their own link only through the server route `/api/netbird/my-invite`.
- All writes to request tables go through server code with the service role. Members can only read their own rows.
- Worker endpoints (all POST, all signed, all refuse to run while the Worker switch is off):
  - `/invite`: safe to repeat for the same request id. Checks NetBird users (already a member? say so), reuses and regenerates a pending invite, otherwise creates one with role `user` in only the league group. Sends the Discord DM; a failed DM never fails the invite.
  - `/revoke`: deletes a pending invite, or blocks (never deletes) the user. Refuses to touch admin or service accounts.
  - `/notify-admins`: DMs the listed admins the Approve / Deny buttons.
- The Worker enforces its own daily cap (`DAILY_INVITE_CAP`, default 20) and never logs emails, tokens or invite links.

Code map:

| Area | Files |
| --- | --- |
| Database | `supabase/migrations/20261126165003_netbird_automated_onboarding.sql` |
| App logic | `lib/netbird/automation.ts`, `lib/netbird/access-requests.ts`, `lib/netbird/worker-signing.ts` |
| Member UI | `app/dashboard/guides/netbird/`, `components/dashboard/netbird/`, `app/api/netbird/my-invite/route.ts` |
| Admin UI | `app/admin/netbird-requests/`, `app/api/admin/netbird-requests/route.ts`, `components/admin/netbird-review-actions.tsx` |
| Discord | `lib/discord/netbird-interactions.ts`, `lib/discord/interactions-handler.ts`, `app/api/discord/interactions/route.ts`, `lib/discord-commands/join-battles.ts`, `scripts/register-join-battles-command.ts` |
| Worker | `workers/aab-netbird-onboard/` |

## Environment variables

### Vercel (the app)

| Name | Purpose |
| --- | --- |
| `NETBIRD_ONBOARDING_ENABLED` | Kill switch. Only the exact text `true` turns it on. Leave unset or `false` for off. |
| `NETBIRD_ONBOARD_WORKER_URL` | Base URL of the Worker, for example the `workers.dev` address. |
| `NETBIRD_ONBOARD_SIGNING_SECRET` | Shared HMAC secret. Must equal the Worker's `SIGNING_SECRET`. |
| `DISCORD_LEAGUE_GUILD_ID` | The league Discord server id. `/join-battles` is refused everywhere else. |
| `NETBIRD_ADMIN_DISCORD_IDS` | Comma-separated Discord ids of admins who get DMs and may use the buttons. |

The app also needs `DISCORD_PUBLIC_KEY` and an app URL (`APP_BASE_URL`), which already exist for the other Discord commands.

### Cloudflare Worker `aab-netbird-onboard`

Plain variables (in `wrangler.toml`, safe to commit):

| Name | Value |
| --- | --- |
| `ONBOARDING_ENABLED` | `"false"` until go-live; only `"true"` turns it on |
| `NETBIRD_API_BASE` | `https://netbird.moodmnky.com` |
| `NETBIRD_LEAGUE_GROUP_ID` | The NetBird group id for league members (the "Average At Best: Pokemon Battle League" group). Now committed in `wrangler.toml`. Empty would make the Worker refuse to create invites. |
| `INVITE_TTL_SECONDS` | `259200` (72 hours) |
| `DAILY_INVITE_CAP` | `20` |

Secrets (set by a human with `wrangler secret put`, never committed):

| Name | Purpose |
| --- | --- |
| `NETBIRD_API_TOKEN` | Token of a dedicated NetBird service user |
| `DISCORD_BOT_TOKEN` | Discord bot token, used only to send DMs |
| `SIGNING_SECRET` | Same value as `NETBIRD_ONBOARD_SIGNING_SECRET` in Vercel |

It also needs a KV namespace bound as `ONBOARD_KV`. Its id is now committed in `wrangler.toml` (ids are not secret).

## Rollout (needs Simeon's approval at every step)

Do these in order. Progress (Nov 26 2026): steps 1 to 5 are done. The NetBird service user `aab-netbird-onboard` and its token exist, the Worker is deployed at https://aab-netbird-onboard.simeon-bowman.workers.dev with its secrets set, the migration is applied to production, PR #70 is merged, and the Vercel variables are set. Both switches are still off.

1. **Create the NetBird service user and token.** Use a dedicated service user whose role is allowed to create user invites, and create a personal access token for it. Create the league group (and a separate test group with no policies) and note their ids.
2. **Set the Worker secrets** with `wrangler secret put` for `NETBIRD_API_TOKEN`, `DISCORD_BOT_TOKEN` and `SIGNING_SECRET`. The KV namespace id and the league group id are already committed in `wrangler.toml`.
3. **Apply the database migration** `20261126165003_netbird_automated_onboarding.sql` to hosted Supabase. Status: already applied to production (recorded there as version `20261126165003`, which is why the file carries that version).
4. **Deploy the Worker with the switch off** (`ONBOARDING_ENABLED = "false"`).
5. **Merge and deploy the app with the switch off.** Set the Vercel variables above, leaving `NETBIRD_ONBOARDING_ENABLED` unset or `false`. The page and bot will say onboarding is paused.
6. **Register `/join-battles`** with the single-command script: `pnpm discord:register-join-battles`. It adds only this one command and leaves the others alone. Do not run the bulk registration script for this.
7. **Live test** with a test email, pointing the Worker at the **test group** (no policies) first. Turn both switches on briefly, request access, accept the invite, confirm the member lands in the test group, then revoke and confirm access is blocked. Then switch the group id to the real league group.
8. **Turn on NetBird "User approval required"** in NetBird settings, so a joined account still needs approval inside NetBird.
9. **Flip both switches on:** Worker `ONBOARDING_ENABLED = "true"` (redeploy) and Vercel `NETBIRD_ONBOARDING_ENABLED=true` (redeploy).
10. **Reduce the bot's Discord permissions** from Administrator to the minimum (send DMs and respond to commands) after an audit of what it actually uses.

## Kill switch and rollback

Fastest stop, either one is enough:

- **App side:** set `NETBIRD_ONBOARDING_ENABLED` to `false` (or remove it) in Vercel and redeploy. The page and `/join-battles` say onboarding is paused and nothing calls the Worker.
- **Worker side:** set `ONBOARDING_ENABLED = "false"` and redeploy the Worker. It answers 503 to everything.

Undoing things:

- **A bad or leaked invite:** in the admin page press **Revoke**. This deletes an unused invite or blocks a member who already joined.
- **Stop the Discord command:** remove `/join-battles` in the Discord developer portal or with a Discord API DELETE on that one guild command. Buttons stop working when the app switch is off.
- **Remove the Worker:** `wrangler delete aab-netbird-onboard`, and delete its secrets and KV namespace. Unset the Vercel variables.
- **Roll back the app:** redeploy the previous Vercel deployment. The new tables are unused by the old code.
- **Roll back the database:** the migration file starts with a commented manual rollback section. Run it only if nothing depends on the new columns and tables.
- **Rotate secrets:** if a secret may have leaked, create a new value, update both sides (`SIGNING_SECRET` and `NETBIRD_ONBOARD_SIGNING_SECRET`), and revoke the old NetBird or Discord token.

## Running the tests

- Everything, including the Worker: `pnpm test:run`. The Worker tests need no Wrangler or Cloudflare account.
- Worker only: `pnpm --dir workers/aab-netbird-onboard test`.
- Worker type check: `pnpm exec tsc -p workers/aab-netbird-onboard/tsconfig.json`.
