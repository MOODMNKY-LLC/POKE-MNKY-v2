---
name: discord-agent
description: Use Discord MCP, Discord API (Context7), Supabase plugin, Notion plugin, and project Discord docs together for bot development, server structure, onboarding, and integration; keep docs updated periodically.
---

# Discord Agent Skill

Use this skill when working on Discord bots, server map, channels/categories, onboarding, welcome messages, slash commands, or app integration (gamification, agent-reply, events). It ensures the right tools and project docs are used together and that documentation stays current.

## When to Use

- Implementing or changing Discord bots (MNKY VERSE, MOOD, SAGE, CODE) or their slash commands.
- Restructuring the Discord server (categories, channel moves, new channels).
- Designing or updating onboarding, welcome embeds, or Community Server settings.
- Integrating Discord with the web app (agent-reply API, events, profile-by-discord-id, gamification).
- Refreshing or auditing the server map and keeping DISCORD-SERVER-MAP.md accurate.
- Planning a Discord-related change that needs deep research (API, onboarding) or cross-doc consistency.

Invoke via **/discord-agent** (subagent) or by describing a Discord task; the agent will apply this skill and the rule in `.cursor/rules/discord-agent.mdc`.

## Tool Orchestration

### Discord MCP

- **discord_get_server_info** (guildId `1069695816001933332`): Get current categories and channels. Use to verify layout, plan moves, or cross-check after running scripts.
- **discord_send**: Plain text only; no embeds or images. For rich welcome messages use `scripts/post-discord-welcome-embed.mjs` with the bot token.
- MCP has no "edit channel" or "move channel"; use REST API scripts (e.g. `move-discord-channels-phase2.mjs`, `discord-phase2-apps-category.mjs`) with `DISCORD_BOT_TOKEN_MNKY_VERSE` or the relevant bot token from env.

### Context7 / Discord API

- Use **Context7** plugin for up-to-date Discord API: interactions, application commands, channel/guild endpoints, embed format, guild onboarding. Use when implementing or debugging slash commands, embeds, or onboarding payloads.

### Supabase Plugin

- **agent_profiles**: Read or update rows for bot slugs (`mnky_verse`, `mood_mnky`, `sage_mnky`, `code_mnky`) — system instructions, display names, blurb. Development only.
- Discord-related app tables (e.g. event ledger, profile resolution): use for gamification or event ingestion logic. Do not alter production data without confirmation.

### Notion Plugin

- Use when the plan or community workflow is tracked in Notion. Create or update pages for restructure plans, onboarding flows, or bot use cases; link to or from `docs/DISCORD-*.md` as needed.

### Deep-Thinking Rule

- For deep research (Discord API capabilities, Community Server onboarding, restructure options) follow [.cursor/rules/deep-thinking.mdc](.cursor/rules/deep-thinking.mdc): clarify scope, present research plan, run cycles, produce a final report. Use **Brave Search** / **Tavily** and **Sequential Thinking** as specified there.

## Project Documentation (Reference and Update)

| Doc | Purpose | When to Update |
|-----|---------|----------------|
| [docs/DISCORD-SERVER-MAP.md](docs/DISCORD-SERVER-MAP.md) | Canonical categories and channel IDs | After any channel/category change; run `scripts/fetch-discord-server-map.mjs` and replace map sections |
| [docs/DISCORD-MNKY-VERSE-BOT-DESIGN.md](docs/DISCORD-MNKY-VERSE-BOT-DESIGN.md) | MNKY VERSE bot role, commands, hand-offs | When changing bot behavior or command set |
| [docs/DISCORD-INTEGRATION-PLAN.md](docs/DISCORD-INTEGRATION-PLAN.md) | Events API, bots, gamification touchpoints | When changing integration or event flow |
| [docs/DISCORD-SERVER-RESTRUCTURE.md](docs/DISCORD-SERVER-RESTRUCTURE.md) | Restructure phases and rationale | When adding a new phase or changing structure |
| [docs/DISCORD-ONBOARDING.md](docs/DISCORD-ONBOARDING.md) | Welcome copy, rules, onboarding checklist | When changing welcome message or onboarding steps |
| [docs/DISCORD-PHASE2-WALKTHROUGH.md](docs/DISCORD-PHASE2-WALKTHROUGH.md) | Script order, manual steps, optional scripts | When adding or changing scripts or manual steps |
| [docs/DISCORD-BOTS-SETUP.md](docs/DISCORD-BOTS-SETUP.md), [docs/DISCORD-BOTS-ENV.md](docs/DISCORD-BOTS-ENV.md) | Bot setup and env vars | When adding a bot or env variable |

**Periodic updates:** After running any script that changes the server (channel move, category create, welcome embed), refresh the server map and update DISCORD-SERVER-MAP.md. After changing bot behavior or slash commands, update DISCORD-MNKY-VERSE-BOT-DESIGN.md or the relevant bot section in the restructure doc.

## Commands

- **/discord-refresh-map** — Run fetch script and update DISCORD-SERVER-MAP.md.
- **/discord-plan** — Plan a Discord change with deep-thinking and doc update steps.

## Conventions

- Bot tokens and secrets stay in env (e.g. `.env.local`); never commit. Scripts use `dotenv -e .env.local`.
- For brand voice or structure on welcome/onboarding copy, use or align with **mood-mnky** and **sage-mnky** agents.
- Prefer existing scripts in `scripts/` for embeds, channel moves, and onboarding; add new scripts only when the API cannot be used via MCP or existing tooling.
