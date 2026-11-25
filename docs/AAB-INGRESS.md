# Average At Best ingress (proposed, not applied)

Verified 2026-11-24 against NetBird `store.db` (read-only), Cloudflare DNS, and Coolify on `10.1.0.115`. Nothing in this file was applied to DNS, policies, or Coolify routes.

POKE MNKY is the league's AI identity. It is not a member-facing admin product. League members use the app or Discord. Operator dashboards stay on a private proxy.

## What exists

| Thing | Live state |
|-------|------------|
| Group `Average At Best: Pokemon Battle League` | Exists. **0 peers.** |
| Policy `RyuLdn Access` | That group to resource `RyuLdn`, TCP `30456` only. |
| Network `AAB Battle Net` | Resource `RyuLdn` prefix `100.64.163.195/10` (wider than one host). Not changed. |
| Coolify project `mnky-agent-stack` / `production` | Apps on server `mnky-agents-2120` (`10.1.0.112`). No AAB project, no staging env. |
| Operator dashboards | Claw `aab-claw`. Maus `aab-maus.nb`. The earlier `poke-pilot` / `poke-maus` dashboard names, including `poke-pilot.nb.moodmnky.com`, `poke-maus.nb.moodmnky.com`, and `poke-pilot.mnky-agents.lab`, are retired (2026-11-25). |
| Public app | `poke-mnky.moodmnky.com` CNAME to Vercel. |
| `aab-openclaw.moodmnky.com` | No dedicated DNS record. Matches wildcard `*.moodmnky.com` and returns Coolify's unconfigured-host page. |
| NetBird private proxy | `0.83.2`, connected. No `poke` or `aab` service row. |

`Default` policy is `MNKY LAB` ↔ `MNKY LAB`, all protocols. `ops-box-to-all` is all protocols from `ops-box` to `All`. League members must not be added to those groups.

## Proposed primary ingress

| Service | Class | Audience | Notes |
|---------|-------|----------|-------|
| League app `poke-mnky.moodmnky.com` | `public-cloudflare` / Vercel | Members and public | Keep the current URL. |
| Standings `GET /api/standings` | same app | Public read | Server holds the service-role key. Agents do not. |
| Showdown browser, replays, docs | `public-cloudflare` when they are public pages | Members | No new hostname in this pass. |
| Claw dashboard | `private-netbird-proxy` | Operators, commissioners, developers | `aab-claw`. |
| Maus dashboard | `private-netbird-proxy` | Operators and developers | `aab-maus.nb`. |
| Claw/Maus APIs used by non-browser agents | `private-mesh` | Named peer groups | Browser `*.nb` names return 403 to non-browser clients. |
| Postgres, Infisical, Coolify API | `internal-only` or existing operator `*.nb` | Operators | No AAB member path. |
| `aab-openclaw.moodmnky.com` | none until repaired | — | Do not point the app at the pilot. App agent id remains `poke-mnky`. Pilot agent id remains `main`. |

## Groups to add later, not now

| Group | Members | Grants |
|-------|---------|--------|
| `AAB-Members` | League users | No homelab routes. No agent dashboards. |
| `AAB-Commissioners` | Commissioners | Future read-only league tools, not Coolify or Maus. |
| `AAB-Developers` | App developers | Pilot dashboards, not hypervisor VLANs. |
| `AAB-Operators` | Operators | Pilot dashboards and `MNKY-AGENTS` SSH `22`, which `Remote-Operators` already has. |

Reuse `Average At Best: Pokemon Battle League` only for the existing RyuLdn policy until that `/10` resource is reviewed.

## Domain

Keep `poke-mnky.moodmnky.com`. A later `aab.moodmnky.com` zone avoids the one-label wildcard that currently catches undefined `*.moodmnky.com` names. Flat `aab-*` names also work if each record is explicit. Do not rebrand now.

## Rollback

No route was changed. If a later change adds the two `*.nb` services, delete those service rows. Do not delete the AAB group while `RyuLdn Access` still references it.
