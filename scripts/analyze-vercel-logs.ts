/**
 * Analyze Vercel Logs
 * 
 * Parses and summarizes Vercel function logs
 */

import { readFileSync } from "fs"

const LOG_FILE = "c:/Users/Simeon/Downloads/logs_result.json"

interface LogEntry {
  TimeUTC: string
  responseStatusCode: number
  requestId: string
  message?: string
  requestUserAgent?: string
  requestPath?: string
  requestMethod?: string
}

function main() {
  console.log("📊 Analyzing Vercel Logs\n")
  console.log("=".repeat(60))

  try {
    const logs: LogEntry[] = JSON.parse(readFileSync(LOG_FILE, "utf8"))

    console.log(`\n📋 Total log entries: ${logs.length}\n`)

    // Status code summary
    console.log("=== Status Code Summary ===")
    const statusCounts: Record<number, number> = {}
    logs.forEach((l) => {
      statusCounts[l.responseStatusCode] = (statusCounts[l.responseStatusCode] || 0) + 1
    })

    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([code, count]) => {
        const statusCode = parseInt(code)
        const emoji = statusCode === 200 ? "[OK]" : statusCode >= 400 ? "[ERROR]" : "[WARN]"
        console.log(`  ${emoji} ${code}: ${count}`)
      })

    // Error entries
    const errors = logs.filter((l) => l.responseStatusCode >= 400)
    if (errors.length > 0) {
      console.log(`\n=== Error Entries (${errors.length} total) ===")
      errors.slice(-10).forEach((l, i) => {
        console.log(`\n${i + 1}. [${l.TimeUTC}] Status: ${l.responseStatusCode}`)
        console.log(`   Request ID: ${l.requestId}`)
        console.log(`   Path: ${l.requestPath || "N/A"}`)
        console.log(`   Method: ${l.requestMethod || "N/A"}`)
        console.log(`   User Agent: ${l.requestUserAgent || "N/A"}`)
        if (l.message) {
          const msg = l.message.substring(0, 200)
          console.log(`   Message: ${msg}`)
        }
      })
    }

    // Success entries
    const successes = logs.filter((l) => l.responseStatusCode === 200)
    if (successes.length > 0) {
      console.log(`\n=== Recent Success Entries (last 5) ===")
      successes.slice(-5).forEach((l, i) => {
        console.log(`\n${i + 1}. [${l.TimeUTC}]`)
        console.log(`   Request ID: ${l.requestId}`)
        if (l.message) {
          const msg = l.message.substring(0, 200)
          console.log(`   Message: ${msg}`)
        }
      })
    }

    // Messages containing "Notion Webhook"
    const notionLogs = logs.filter((l) => l.message?.includes("Notion Webhook"))
    if (notionLogs.length > 0) {
      console.log(`\n=== Notion Webhook Logs (${notionLogs.length} total) ===")
      notionLogs.slice(-10).forEach((l, i) => {
        console.log(`\n${i + 1}. [${l.TimeUTC}] Status: ${l.responseStatusCode}`)
        console.log(`   Request ID: ${l.requestId}`)
        if (l.message) {
          console.log(`   ${l.message}`)
        }
      })
    }

    console.log("\n" + "=".repeat(60))
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main()
