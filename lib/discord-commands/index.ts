/**
 * Discord Bot Commands Index
 * Exports all command handlers for registration
 */

export { calcCommand } from "./calc-command"
export { freeAgencySubmitCommand } from "./free-agency-submit"
export { freeAgencyStatusCommand } from "./free-agency-status"

// Export all commands as an array for easy registration
// Using a function to avoid module evaluation issues
export function getAllCommands() {
  return [
    require("./calc-command").calcCommand,
    require("./free-agency-submit").freeAgencySubmitCommand,
    require("./free-agency-status").freeAgencyStatusCommand,
  ]
}

// Also export as array for backward compatibility (lazy-loaded)
export const allCommands = getAllCommands()
