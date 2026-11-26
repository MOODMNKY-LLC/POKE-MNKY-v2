import { InteractionContextType, SlashCommandBuilder } from "discord.js"

/**
 * /join-battles: asks for access to the private NetBird battle network.
 * Handled over HTTP by app/api/discord/interactions (lib/discord/netbird-interactions.ts), so there is no
 * discord.js `execute` here. Guild-only: it never appears in DMs.
 */
export const joinBattlesCommand = {
  data: new SlashCommandBuilder()
    .setName("join-battles")
    .setDescription("Get access to the league battle network")
    .setDMPermission(false)
    .setContexts(InteractionContextType.Guild),
}
