/**
 * Discord Role Mappings
 * Client-safe constants for Discord role to App role mapping
 * Extracted from discord-role-sync.ts to avoid importing discord.js in client components
 */

import { UserRole } from "@/lib/rbac"

// App role to Discord role mapping (reverse of Discord → App)
export const APP_TO_DISCORD_ROLE_MAP: Record<UserRole, string[]> = {
  [UserRole.ADMIN]: ["Commissioner", "League Admin"], // Can map to multiple Discord roles
  [UserRole.COMMISSIONER]: ["Commissioner"], // If you have a separate Commissioner role
  [UserRole.COACH]: ["Coach"],
  [UserRole.SPECTATOR]: ["Spectator"], // Updated from viewer to spectator
}

// Discord role to App role mapping (Discord → App)
export const DISCORD_TO_APP_ROLE_MAP: Record<string, UserRole> = {
  Commissioner: UserRole.ADMIN,
  "League Admin": UserRole.ADMIN,
  Coach: UserRole.COACH,
  Spectator: UserRole.SPECTATOR, // Updated from viewer to spectator
}
