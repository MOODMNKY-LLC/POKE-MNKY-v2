/**
 * Integration test for Discord webhook notifications
 * Tests actual webhook posting with test Discord webhook URL
 * 
 * Usage:
 *   TEST_WEBHOOK_URL=https://discord.com/api/webhooks/... pnpm tsx test-webhook-integration.ts
 */

import { EmbedBuilder } from "discord.js"

const TEST_WEBHOOK_URL = process.env.TEST_WEBHOOK_URL

if (!TEST_WEBHOOK_URL) {
  console.error("❌ TEST_WEBHOOK_URL environment variable is required")
  console.error("   Set it to a Discord webhook URL for testing")
  process.exit(1)
}

/**
 * Post embed to Discord webhook
 */
async function postWebhook(url: string, embed: EmbedBuilder): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed.toJSON()] }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`   ❌ Webhook failed: ${response.status} ${errorText}`)
      return false
    }

    return true
  } catch (error) {
    console.error(`   ❌ Webhook error:`, error)
    return false
  }
}

/**
 * Test 1: Match Result Embed
 */
async function testMatchResultWebhook() {
  console.log("\n🧪 Test 1: Posting Match Result Embed...")

  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle("🏆 Match Result - Week 5")
    .addFields(
      { name: "Team Alpha", value: "3", inline: true },
      { name: "vs", value: "—", inline: true },
      { name: "Team Beta", value: "2", inline: true },
      { name: "Winner", value: "Team Alpha", inline: true },
      { name: "Differential", value: "1 KOs", inline: true },
      { name: "Replay", value: "[Watch Replay](https://replay.pokemonshowdown.com/test)", inline: false },
    )
    .setURL("https://replay.pokemonshowdown.com/test")
    .setTimestamp()
    .setFooter({ text: "POKE MNKY League" })

  const success = await postWebhook(TEST_WEBHOOK_URL, embed)
  if (success) {
    console.log("   ✅ Match result embed posted successfully")
    console.log("   👉 Check your Discord channel to verify the embed appearance")
  }
  return success
}

/**
 * Test 2: Weekly Recap Embed
 */
async function testWeeklyRecapWebhook() {
  console.log("\n🧪 Test 2: Posting Weekly Recap Embed...")

  const recapText = `This week saw intense battles across all divisions. 

**Key Highlights:**
• Team Alpha secured a crucial victory against Team Beta
• Team Gamma showed strong defensive play in their matchup
• The standings are tightening as we approach the playoffs!

**Standings Update:**
The top teams are now separated by just a few points, making every match critical.`

  const embed = new EmbedBuilder()
    .setColor(0xff9900)
    .setTitle("📰 Week 5 Recap")
    .setDescription(recapText)
    .setTimestamp()
    .setFooter({ text: "POKE MNKY League" })

  const success = await postWebhook(TEST_WEBHOOK_URL, embed)
  if (success) {
    console.log("   ✅ Weekly recap embed posted successfully")
    console.log("   👉 Check your Discord channel to verify the embed appearance")
  }
  return success
}

/**
 * Test 3: Trade Proposal Embed
 */
async function testTradeProposalWebhook() {
  console.log("\n🧪 Test 3: Posting Trade Proposal Embed...")

  const embed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle("🔄 New Trade Proposal")
    .addFields(
      { name: "Offering Team", value: "Team Alpha", inline: true },
      { name: "Requesting From", value: "Team Beta", inline: true },
      { name: "Trade ID", value: "test-trade-12345", inline: false },
    )
    .setDescription("View trade details on the website to accept or reject.")
    .setTimestamp()
    .setFooter({ text: "POKE MNKY League" })

  const success = await postWebhook(TEST_WEBHOOK_URL, embed)
  if (success) {
    console.log("   ✅ Trade proposal embed posted successfully")
    console.log("   👉 Check your Discord channel to verify the embed appearance")
  }
  return success
}

/**
 * Test 4: Match Result without Replay
 */
async function testMatchResultNoReplayWebhook() {
  console.log("\n🧪 Test 4: Posting Match Result (No Replay)...")

  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle("🏆 Match Result - Week 5")
    .addFields(
      { name: "Team Alpha", value: "3", inline: true },
      { name: "vs", value: "—", inline: true },
      { name: "Team Beta", value: "2", inline: true },
      { name: "Winner", value: "Team Alpha", inline: true },
      { name: "Differential", value: "1 KOs", inline: true },
    )
    .setTimestamp()
    .setFooter({ text: "POKE MNKY League" })

  const success = await postWebhook(TEST_WEBHOOK_URL, embed)
  if (success) {
    console.log("   ✅ Match result (no replay) embed posted successfully")
    console.log("   👉 Check your Discord channel to verify the embed appearance")
  }
  return success
}

/**
 * Main test runner
 */
async function runIntegrationTests() {
  console.log("🚀 Starting Discord Webhook Integration Tests")
  console.log("=".repeat(60))
  console.log(`📡 Webhook URL: ${TEST_WEBHOOK_URL.substring(0, 50)}...`)
  console.log("\n⚠️  This will post test embeds to your Discord channel!")
  console.log("   Make sure you're using a test webhook URL\n")

  // Wait a moment for user to read
  await new Promise((resolve) => setTimeout(resolve, 2000))

  const results = {
    matchResult: await testMatchResultWebhook(),
    weeklyRecap: await testWeeklyRecapWebhook(),
    tradeProposal: await testTradeProposalWebhook(),
    matchResultNoReplay: await testMatchResultNoReplayWebhook(),
  }

  // Add delay between tests
  await new Promise((resolve) => setTimeout(resolve, 1000))

  console.log("\n" + "=".repeat(60))
  console.log("\n📊 Integration Test Results:")
  console.log(`   Match Result Embed: ${results.matchResult ? "✅ PASS" : "❌ FAIL"}`)
  console.log(`   Weekly Recap Embed: ${results.weeklyRecap ? "✅ PASS" : "❌ FAIL"}`)
  console.log(`   Trade Proposal Embed: ${results.tradeProposal ? "✅ PASS" : "❌ FAIL"}`)
  console.log(`   Match Result (No Replay): ${results.matchResultNoReplay ? "✅ PASS" : "❌ FAIL"}`)

  const allPassed = Object.values(results).every((result) => result === true)
  console.log(`\n${allPassed ? "✅" : "❌"} Overall: ${allPassed ? "ALL TESTS PASSED" : "SOME TESTS FAILED"}`)

  if (allPassed) {
    console.log("\n✨ All webhook tests passed! Check your Discord channel to verify embed appearance.")
  } else {
    console.log("\n⚠️  Some tests failed. Check the error messages above.")
  }

  process.exit(allPassed ? 0 : 1)
}

// Run tests
runIntegrationTests().catch((error) => {
  console.error("❌ Test execution failed:", error)
  process.exit(1)
})
