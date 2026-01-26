/**
 * Phase 7: Comprehensive Testing Script
 * Runs all Phase 7 test suites and generates summary report
 */

import { execSync } from "child_process"
import { readFileSync, writeFileSync } from "fs"
import { join } from "path"

interface TestSuiteResult {
  suite: string
  passed: number
  failed: number
  total: number
  successRate: number
}

const results: TestSuiteResult[] = []

function runTestSuite(name: string, script: string): TestSuiteResult {
  console.log(`\n${"=".repeat(60)}`)
  console.log(`🧪 Running ${name}...`)
  console.log("=".repeat(60))

  try {
    const output = execSync(`pnpm exec tsx ${script}`, {
      encoding: "utf-8",
      cwd: process.cwd(),
      stdio: "pipe",
    })

    console.log(output)

    // Parse output for summary
    const summaryMatch = output.match(/Success Rate: ([\d.]+)%/)
    const passedMatch = output.match(/✅ Passed: (\d+)/)
    const failedMatch = output.match(/❌ Failed: (\d+)/)
    const totalMatch = output.match(/Total Tests: (\d+)/)

    const total = totalMatch ? parseInt(totalMatch[1]) : 0
    const passed = passedMatch ? parseInt(passedMatch[1]) : 0
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0
    const successRate = summaryMatch ? parseFloat(summaryMatch[1]) : 0

    return {
      suite: name,
      passed,
      failed,
      total,
      successRate,
    }
  } catch (error: any) {
    console.error(`Error running ${name}:`, error.message)
    return {
      suite: name,
      passed: 0,
      failed: 1,
      total: 1,
      successRate: 0,
    }
  }
}

async function main() {
  console.log("🧪 Phase 7: Comprehensive Testing")
  console.log("=".repeat(60))
  console.log(`Date: ${new Date().toISOString()}\n`)

  // Run all test suites
  results.push(runTestSuite("Phase 7.1: Database Testing", "scripts/test-phase7-database.ts"))
  results.push(runTestSuite("Phase 7.2: API Endpoint Testing", "scripts/test-phase7-api-endpoints.ts"))
  results.push(runTestSuite("Phase 7.4: Notion Integration Testing", "scripts/test-phase7-notion-sync.ts"))

  // Generate summary
  console.log("\n" + "=".repeat(60))
  console.log("📊 Comprehensive Test Summary")
  console.log("=".repeat(60))

  let totalPassed = 0
  let totalFailed = 0
  let totalTests = 0

  results.forEach((result) => {
    totalPassed += result.passed
    totalFailed += result.failed
    totalTests += result.total

    const status = result.successRate === 100 ? "✅" : result.successRate >= 80 ? "🟡" : "❌"
    console.log(
      `\n${status} ${result.suite}: ${result.passed}/${result.total} passed (${result.successRate.toFixed(1)}%)`
    )
  })

  const overallSuccessRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0

  console.log("\n" + "-".repeat(60))
  console.log(`\n📈 Overall Results:`)
  console.log(`   Total Tests: ${totalTests}`)
  console.log(`   ✅ Passed: ${totalPassed}`)
  console.log(`   ❌ Failed: ${totalFailed}`)
  console.log(`   Success Rate: ${overallSuccessRate.toFixed(1)}%\n`)

  // Generate report file
  const report = {
    date: new Date().toISOString(),
    overall: {
      total: totalTests,
      passed: totalPassed,
      failed: totalFailed,
      successRate: overallSuccessRate,
    },
    suites: results,
  }

  const reportPath = join(process.cwd(), "docs", "PHASE7-COMPREHENSIVE-TEST-REPORT.json")
  writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`📄 Report saved to: ${reportPath}\n`)

  process.exit(totalFailed > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
