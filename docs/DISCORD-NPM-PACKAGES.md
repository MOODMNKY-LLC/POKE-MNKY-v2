# Discord NPM Packages

This project uses the following Discord-related npm packages for bots, embeds, and webhooks.

---

## Installed packages

| Package | Purpose | Where it's used |
|--------|---------|------------------|
| **discord.js** | Full Discord bot client (slash commands, interactions, Gateway). | `lib/discord-commands/`, command handlers and registration. |
| **discord-api-types** | TypeScript types for Discord REST/Gateway/Voice APIs (e.g. `APIEmbed`, `APIEmbedField`). | Typing in `lib/discord/slash-commands-guide-embed.ts` and anywhere we build API payloads. |
| **@discordjs/builders** | Official builders for Discord API payloads: `EmbedBuilder`, slash command builders, components. | `lib/discord/slash-commands-guide-embed.ts` (embed), `scripts/post-slash-commands-guide-embed.ts` (channel message). |
| **discord-webhook-node** | Simple webhook client: send plain messages or `MessageBuilder` embeds to a webhook URL. | `scripts/post-slash-commands-guide-webhook.ts` (post guide via webhook). |

---

## Discohook (not an npm package)

**Discohook** ([discohook.app](https://discohook.app)) is a web tool for building and sending Discord messages via webhooks. It is not an npm package; the name is sometimes confused with:

- **dishook** (npm) — old Discord webhook module (we use **discord-webhook-node** instead).
- **dischook** (npm) — unrelated (Nitro code checker).
- **discohook** (PyPI) — Python Discord API wrapper.

We use **@discordjs/builders** for type-safe embed building and **discord-webhook-node** for simple webhook sends, which cover the same use cases as using Discohook manually.

---

## Scripts that use these packages

| Script | Packages used | Command |
|--------|----------------|--------|
| Register slash commands | `discord.js` (REST, Routes) | `pnpm discord:register-commands` |
| Post guide embed (channel) | `@discordjs/builders`, `discord-api-types` | `pnpm discord:post-guide-embed [channelId]` |
| Post guide via webhook | `discord-webhook-node` | `pnpm discord:post-guide-webhook <webhook_url>` |

---

## References

- [Discord API](https://discord.com/developers/docs/intro)
- [discord.js guide](https://discordjs.guide/)
- [@discordjs/builders](https://discord.js.org/docs/packages/builders/stable)
- [discord-api-types](https://github.com/discordjs/discord-api-types)
- [discord-webhook-node (npm)](https://www.npmjs.com/package/discord-webhook-node)
