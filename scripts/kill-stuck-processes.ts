/**
 * Kill stuck Node.js processes
 * Usage: npx tsx scripts/kill-stuck-processes.ts
 */

import { execSync } from "child_process"
import * as os from "os"

const platform = os.platform()

function killStuckProcesses() {
  console.log("🔍 Checking for stuck Node.js processes...\n")

  try {
    if (platform === "win32") {
      // Windows: Find node processes
      const processes = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV', {
        encoding: "utf-8",
      })
        .split("\n")
        .slice(1) // Skip header
        .filter((line) => line.trim() && line.includes("node.exe"))

      console.log(`Found ${processes.length} Node.js processes`)

      if (processes.length === 0) {
        console.log("✅ No stuck processes found")
        return
      }

      // Ask user before killing (for safety)
      console.log("\n⚠️  Warning: This will kill all Node.js processes")
      console.log("Press Ctrl+C to cancel, or wait 3 seconds to proceed...\n")

      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Kill processes
      for (const process of processes) {
        const parts = process.split(",")
        if (parts.length > 1) {
          const pid = parts[1].replace(/"/g, "").trim()
          if (pid && pid !== "PID") {
            try {
              execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" })
              console.log(`✅ Killed process ${pid}`)
            } catch (e) {
              // Process might have already exited
            }
          }
        }
      }

      console.log("\n✅ Done!")
    } else {
      // Unix-like: Use pkill or killall
      try {
        execSync("pkill -f 'tsx|next-server|node.*dev'", { stdio: "inherit" })
        console.log("✅ Killed stuck processes")
      } catch (e) {
        console.log("ℹ️  No processes to kill (or pkill not available)")
      }
    }
  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

killStuckProcesses()
