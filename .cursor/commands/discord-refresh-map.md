---
description: Refresh Discord server map and update docs/DISCORD-SERVER-MAP.md using the fetch script and Discord MCP.
---

# Refresh Discord Server Map

Use this when the Discord server layout has changed or you need the canonical channel/category list and IDs updated.

1. **Run the fetch script** from repo root (requires `DISCORD_BOT_TOKEN` in `.env.local`):

   ```bash
   pnpm discord:refresh-map
   # Or with guild ID: pnpm discord:refresh-map 1190512330556063764
   ```

2. **Update [docs/DISCORD-SERVER-MAP.md](docs/DISCORD-SERVER-MAP.md):** Replace the "Categories and Channels" section with any structural changes from the script output. The script writes `docs/DISCORD-SERVER-MAP.json` and `docs/DISCORD-SERVER-MAP-RAW.md`.

3. **Optional:** Use **Discord MCP** `discord_get_server_info` with guildId `1190512330556063764` to verify or cross-check the structure.

Anything after the command (e.g. `/discord-refresh-map after adding new category`) is added context.
