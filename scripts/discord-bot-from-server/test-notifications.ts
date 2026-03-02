/**
 * Test suite for Discord notification embeds
 * Run with: pnpm tsx test-notifications.ts
 */

import { EmbedBuilder } from "discord.js"

// Mock Supabase client
const mockSupabase = {
  from: (table: string) => ({
    select: (query: string) => ({
      eq: (column: string, value: string) => ({
        single: async () => {
          if (table === "matches" && value === "test-match-id") {
            return {
              data: {
                id: "test-match-id",
                week: 5,
                team1_score: 3,
                team2_score: 2,
                differential: 1,
                replay_url: "https://replay.pokemonshowdown.com/test",
                team1: { name: "Team Alpha" },
                team2: { name: "Team Beta" },
                winner: { name: "Team Alpha" },
              },
            }
          }
          if (table === "discord_webhooks" && value === "match_results") {
            return {
              data: {
                webhook_url: process.env.TEST_WEBHOOK_URL || "https://discord.com/api/webhooks/test/test",
                name: "match_results",
              },
            }
          }
          return { data: null }
        },
      }),
    }),
  }),
}

// Test embed structure validation
function validateEmbedStructure(embed: EmbedBuilder): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const json = embed.toJSON()

  // Check required fields
  if (!json.title) errors.push("Missing title")
  if (!json.color) errors.push("Missing color")
  // Fields OR description required (not both mandatory)
  if ((!json.fields || json.fields.length === 0) && !json.description) {
    errors.push("Missing fields or description")
  }
  if (!json.timestamp) errors.push("Missing timestamp")
  if (!json.footer) errors.push("Missing footer")

  // Validate field structure
  if (json.fields) {
    json.fields.forEach((field, index) => {
      if (!field.name) errors.push(`Field ${index} missing name`)
      if (field.value === undefined) errors.push(`Field ${index} missing value`)
    })
  }

  // Check embed size limits (Discord limits)
  if (json.title && json.title.length > 256) errors.push("Title exceeds 256 characters")
  if (json.description && json.description.length > 4096) errors.push("Description exceeds 4096 characters")
  if (json.fields && json.fields.length > 25) errors.push("Too many fields (max 25)")
  if (json.fields) {
    json.fields.forEach((field, index) => {
      if (field.name && field.name.length > 256) errors.push(`Field ${index} name exceeds 256 characters`)
      if (field.value && field.value.length > 1024) errors.push(`Field ${index} value exceeds 1024 characters`)
    })
  }

  return { valid: errors.length === 0, errors }
}

// Test match result embed
async function testMatchResultEmbed() {
  console.log("\n🧪 Testing Match Result Embed...")

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
    .setTimestamp()
    .setFooter({ text: "POKE MNKY League" })
    .setURL("https://replay.pokemonshowdown.com/test")

  const validation = validateEmbedStructure(embed)
  if (validation.valid) {
    console.log("✅ Match result embed structure is valid")
    console.log("📋 Embed JSON:", JSON.stringify(embed.toJSON(), null, 2))
  } else {
    console.error("❌ Match result embed validation failed:")
    validation.errors.forEach((error) => console.error(`   - ${error}`))
  }

  return validation.valid
}

// Test weekly recap embed
async function testWeeklyRecapEmbed() {
  console.log("\n🧪 Testing Weekly Recap Embed...")

  const recapText = "This week saw intense battles across all divisions. Team Alpha secured a crucial victory, while Team Beta showed strong defensive play. The standings are tightening as we approach the playoffs!"

  const embed = new EmbedBuilder()
    .setColor(0xff9900)
    .setTitle("📰 Week 5 Recap")
    .setDescription(recapText)
    .setTimestamp()
    .setFooter({ text: "POKE MNKY League" })

  const validation = validateEmbedStructure(embed)
  if (validation.valid) {
    console.log("✅ Weekly recap embed structure is valid")
    console.log("📋 Embed JSON:", JSON.stringify(embed.toJSON(), null, 2))
  } else {
    console.error("❌ Weekly recap embed validation failed:")
    validation.errors.forEach((error) => console.error(`   - ${error}`))
  }

  return validation.valid
}

// Test trade proposal embed
async function testTradeProposalEmbed() {
  console.log("\n🧪 Testing Trade Proposal Embed...")

  const embed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle("🔄 New Trade Proposal")
    .addFields(
      { name: "Offering Team", value: "Team Alpha", inline: true },
      { name: "Requesting From", value: "Team Beta", inline: true },
      { name: "Trade ID", value: "test-trade-id", inline: false },
    )
    .setDescription("View trade details on the website to accept or reject.")
    .setTimestamp()
    .setFooter({ text: "POKE MNKY League" })

  const validation = validateEmbedStructure(embed)
  if (validation.valid) {
    console.log("✅ Trade proposal embed structure is valid")
    console.log("📋 Embed JSON:", JSON.stringify(embed.toJSON(), null, 2))
  } else {
    console.error("❌ Trade proposal embed validation failed:")
    validation.errors.forEach((error) => console.error(`   - ${error}`))
  }

  return validation.valid
}

// Test embed format consistency
function testEmbedFormatConsistency() {
  console.log("\n🧪 Testing Embed Format Consistency...")

  // Create embed using EmbedBuilder
  const embedBuilder = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle("Test Title")
    .addFields({ name: "Test Field", value: "Test Value", inline: true })
    .setTimestamp()
    .setFooter({ text: "POKE MNKY League" })

  const embedJson = embedBuilder.toJSON()

  // Manually create matching JSON (like integration worker does)
  const manualJson = {
    color: 0x0099ff,
    title: "Test Title",
    fields: [{ name: "Test Field", value: "Test Value", inline: true }],
    timestamp: new Date().toISOString(),
    footer: { text: "POKE MNKY League" },
  }

  // Compare structures (ignoring timestamp)
  const builderFields = JSON.stringify(embedJson.fields)
  const manualFields = JSON.stringify(manualJson.fields)

  if (builderFields === manualFields && embedJson.color === manualJson.color && embedJson.title === manualJson.title) {
    console.log("✅ Embed formats are consistent between EmbedBuilder and manual JSON")
    return true
  } else {
    console.error("❌ Embed formats differ:")
    console.error("   EmbedBuilder:", JSON.stringify(embedJson, null, 2))
    console.error("   Manual JSON:", JSON.stringify(manualJson, null, 2))
    return false
  }
}

// Main test runner
async function runTests() {
  console.log("🚀 Starting Discord Notification Embed Tests\n")
  console.log("=" .repeat(60))

  const results = {
    matchResult: await testMatchResultEmbed(),
    weeklyRecap: await testWeeklyRecapEmbed(),
    tradeProposal: await testTradeProposalEmbed(),
    formatConsistency: testEmbedFormatConsistency(),
  }

  console.log("\n" + "=".repeat(60))
  console.log("\n📊 Test Results Summary:")
  console.log(`   Match Result Embed: ${results.matchResult ? "✅ PASS" : "❌ FAIL"}`)
  console.log(`   Weekly Recap Embed: ${results.weeklyRecap ? "✅ PASS" : "❌ FAIL"}`)
  console.log(`   Trade Proposal Embed: ${results.tradeProposal ? "✅ PASS" : "❌ FAIL"}`)
  console.log(`   Format Consistency: ${results.formatConsistency ? "✅ PASS" : "❌ FAIL"}`)

  const allPassed = Object.values(results).every((result) => result === true)
  console.log(`\n${allPassed ? "✅" : "❌"} Overall: ${allPassed ? "ALL TESTS PASSED" : "SOME TESTS FAILED"}`)

  process.exit(allPassed ? 0 : 1)
}

// Run tests
runTests().catch((error) => {
  console.error("❌ Test execution failed:", error)
  process.exit(1)
})
