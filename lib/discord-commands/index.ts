/**
 * Discord Bot Commands Index
 * Exports all command handlers for registration
 */

import { calcCommand } from "./calc-command"
import { freeAgencySubmitCommand } from "./free-agency-submit"
import { freeAgencyStatusCommand } from "./free-agency-status"
import { pickCommand } from "./pick"
import { searchCommand } from "./search"
import { draftstatusCommand } from "./draftstatus"
import { whoamiCommand } from "./whoami"
import { setseasonCommand } from "./setseason"
import { getseasonCommand } from "./getseason"
import { coverageCommand } from "./coverage"

export {
  calcCommand,
  freeAgencySubmitCommand,
  freeAgencyStatusCommand,
  pickCommand,
  searchCommand,
  draftstatusCommand,
  whoamiCommand,
  setseasonCommand,
  getseasonCommand,
  coverageCommand,
}

// Export all commands as an array for easy registration
// Using a function to avoid module evaluation issues
export function getAllCommands() {
  return [
    calcCommand,
    freeAgencySubmitCommand,
    freeAgencyStatusCommand,
    pickCommand,
    searchCommand,
    draftstatusCommand,
    whoamiCommand,
    setseasonCommand,
    getseasonCommand,
    coverageCommand,
  ]
}

// Also export as array for backward compatibility (lazy-loaded)
export const allCommands = getAllCommands()
