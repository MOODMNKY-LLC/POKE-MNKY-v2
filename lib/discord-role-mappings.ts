/**
 * Discord Role Mappings
 * Client-safe constants for Discord role to App role mapping
 * Extracted from discord-role-sync.ts to avoid importing discord.js in client components
 */

import type { UserRole } from "@/lib/rbac"

// App role to Discord role mapping (reverse of Discord → App)
export const APP_TO_DISCORD_ROLE_MAP: Record<UserRole, string[]> = {
  admin: ["Commissioner", "League Admin"], // Can map to multiple Discord roles
  commissioner: ["Commissioner"], // If you have a separate Commissioner role
  coach: ["Coach"],
  spectator: ["Spectator"], // Updated from viewer to spectator
}

// Discord role to App role mapping (Discord → App)
export const DISCORD_TO_APP_ROLE_MAP: Record<string, UserRole> = {
  Commissioner: "admin",
  "League Admin": "admin",
  Coach: "coach",
  Spectator: "spectator", // Updated from viewer to spectator
}
