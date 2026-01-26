/**
 * Discord Bot Commands Index
 * Exports all command handlers for registration
 */

export { calcCommand } from "./calc-command"
export { freeAgencySubmitCommand } from "./free-agency-submit"
export { freeAgencyStatusCommand } from "./free-agency-status"

// Phase 6: New Discord bot commands
export { pickCommand } from "./pick"
export { searchCommand } from "./search"
export { draftstatusCommand } from "./draftstatus"
export { whoamiCommand } from "./whoami"
export { setseasonCommand } from "./setseason"
export { getseasonCommand } from "./getseason"
export { coverageCommand } from "./coverage"

// Export all commands as an array for easy registration
// Using a function to avoid module evaluation issues
export function getAllCommands() {
  return [
    require("./calc-command").calcCommand,
    require("./free-agency-submit").freeAgencySubmitCommand,
    require("./free-agency-status").freeAgencyStatusCommand,
    // Phase 6 commands
    require("./pick").pickCommand,
    require("./search").searchCommand,
    require("./draftstatus").draftstatusCommand,
    require("./whoami").whoamiCommand,
    require("./setseason").setseasonCommand,
    require("./getseason").getseasonCommand,
    require("./coverage").coverageCommand,
  ]
}

// Also export as array for backward compatibility (lazy-loaded)
export const allCommands = getAllCommands()
