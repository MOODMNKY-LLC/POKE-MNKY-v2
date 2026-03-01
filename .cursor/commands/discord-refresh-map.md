---
description: Refresh Discord server map and update docs/DISCORD-SERVER-MAP.md using the fetch script and Discord MCP.
---

# Refresh Discord Server Map

Use this when the Discord server layout has changed or you need the canonical channel/category list and IDs updated.

1. **Run the fetch script** from repo root (requires `DISCORD_BOT_TOKEN_MNKY_VERSE` in `.env.local`):

   ```bash
   pnpm exec dotenv -e .env.local -- node scripts/fetch-discord-server-map.mjs 1069695816001933332
   ```

2. **Update [docs/DISCORD-SERVER-MAP.md](docs/DISCORD-SERVER-MAP.md):** Replace the "Categories and channels" and "Category IDs" sections with the script output. Keep the header, "How to refresh this map," and any Phase 2 or integration notes unless they are obsolete.

3. **Optional:** Use **Discord MCP** `discord_get_server_info` with guildId `1069695816001933332` to verify or cross-check the structure.

Anything after the command (e.g. `/discord-refresh-map after adding new category`) is added context.
