// Script to manually register Discord commands
// Usage: docker exec poke-mnky-discord-bot tsx register-commands.ts

import { registerDiscordCommands } from "./index"

async function main() {
  console.log("[v0] Manually registering Discord commands...")
  await registerDiscordCommands()
  console.log("[v0] Done!")
  process.exit(0)
}

main().catch((error) => {
  console.error("[v0] Error:", error)
  process.exit(1)
})
