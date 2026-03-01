---
description: Plan a Discord change (restructure, onboarding, new bot feature) using deep-thinking, server map, and project Discord docs; output a clear plan and doc update steps.
---

# Discord Plan

Use this when planning a Discord server restructure, onboarding update, new bot feature, or integration change. Anything after the command (e.g. `/discord-plan add a rewards channel under MNKY SHOP`) is added context.

1. **Gather context:** Read [docs/DISCORD-SERVER-MAP.md](docs/DISCORD-SERVER-MAP.md) and relevant docs ([DISCORD-MNKY-VERSE-BOT-DESIGN.md](docs/DISCORD-MNKY-VERSE-BOT-DESIGN.md), [DISCORD-INTEGRATION-PLAN.md](docs/DISCORD-INTEGRATION-PLAN.md), [DISCORD-SERVER-RESTRUCTURE.md](docs/DISCORD-SERVER-RESTRUCTURE.md)). Use **Discord MCP** `discord_get_server_info` for current state if needed.

2. **Research (if needed):** For API limits, Community Server features, or multi-step restructures use the **Deep Research Protocol** in [.cursor/rules/deep-thinking.mdc](.cursor/rules/deep-thinking.mdc). Use **Context7** for current Discord API behavior.

3. **Produce a plan:** List steps (scripts to run, manual Discord UI steps, doc updates). Call out which docs to update and that the server map should be refreshed after channel/category changes.

4. **Doc updates:** Specify edits to DISCORD-SERVER-MAP.md, DISCORD-ONBOARDING.md, DISCORD-SERVER-RESTRUCTURE.md, or others so the plan is documented and repeatable.
