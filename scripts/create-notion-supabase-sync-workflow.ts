/**
 * Create Notion-Supabase Sync Workflow (Native Nodes)
 * 
 * Creates an n8n workflow using native Notion and Supabase nodes.
 * This is more reliable than webhooks and doesn't require our API endpoint.
 * 
 * Workflow:
 * 1. Notion Trigger → Detects page updates
 * 2. IF Node → Filter only "Added to Draft Board" = true
 * 3. Notion Node → Get full page data
 * 4. Function Node → Transform Notion data to Supabase format
 * 5. Supabase Node → Upsert to draft_pool table
 * 6. Discord Node → Send notification
 */

import { config } from "dotenv"
import { createN8nWorkflow } from "../lib/n8n/workflow-manager"

config({ path: ".env.local" })

const DRAFT_BOARD_DATABASE_ID = "5e58ccd73ceb44ed83de826b51cf5c36"
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase configuration")
  process.exit(1)
}

async function main() {
  console.log("🔧 Creating Notion-Supabase Sync Workflow (Native Nodes)\n")
  console.log("=".repeat(60))

  try {
    // Build workflow nodes using native n8n nodes
    const nodes = [
      // Notion Trigger node (polls for database changes)
      {
        id: "notion-trigger",
        name: "Notion Trigger",
        type: "n8n-nodes-base.notionTrigger",
        typeVersion: 1,
        position: [250, 300],
        parameters: {
          databaseId: DRAFT_BOARD_DATABASE_ID,
          event: "pageUpdated", // Triggers on page updates (includes property changes)
          simple: false, // Return full page data
        },
        // Credentials must be set up manually in n8n UI
      },
      // IF Node: Filter only rows with "Added to Draft Board" = true
      {
        id: "filter-added-to-draft",
        name: "Filter Added to Draft Board",
        type: "n8n-nodes-base.if",
        typeVersion: 1,
        position: [450, 300],
        parameters: {
          conditions: {
            boolean: [
              {
                value1: "={{ $json.properties['Added to Draft Board']?.checkbox || false }}",
                value2: true,
              },
            ],
          },
        },
      },
      // Notion Node: Get full page data
      {
        id: "get-page-data",
        name: "Get Page Data",
        type: "n8n-nodes-base.notion",
        typeVersion: 2,
        position: [650, 300],
        parameters: {
          operation: "get",
          pageId: "={{ $json.id }}",
          simple: false,
        },
        // Uses same Notion credentials as trigger
      },
      // Supabase Node: Get current season
      {
        id: "get-current-season",
        name: "Get Current Season",
        type: "n8n-nodes-base.supabase",
        typeVersion: 1,
        position: [850, 300],
        parameters: {
          operation: "select",
          table: "seasons",
          returnAll: false,
          limit: 1,
          filters: {
            conditions: [
              {
                keyName: "is_current",
                condition: "equals",
                keyValue: true,
              },
            ],
          },
          options: {
            sort: {
              sortBy: "created_at",
              orderBy: "desc",
            },
          },
        },
        // Uses same Supabase credentials as upsert node
      },
      // Function Node: Transform Notion data to Supabase format
      {
        id: "transform-data",
        name: "Transform to Supabase",
        type: "n8n-nodes-base.function",
        typeVersion: 1,
        position: [1050, 300],
        parameters: {
          functionCode: `
// Transform Notion page data to Supabase draft_pool format
// $input.item.json contains the Notion page data
// $('Get Current Season').item.json contains the season data

const page = $input.item.json;
const seasonData = $('Get Current Season').item.json;

// Extract properties from Notion page
const name = page.properties?.Name?.title?.[0]?.plain_text || '';
const pointValue = page.properties?.['Point Value']?.number || null;
const status = page.properties?.Status?.select?.name?.toLowerCase() || 'available';
const teraCaptainEligible = page.properties?.['Tera Captain Eligible']?.checkbox || false;
const pokemonId = page.properties?.['Pokemon ID (PokeAPI)']?.number || null;
const bannedReason = page.properties?.Notes?.rich_text?.[0]?.plain_text || null;

// Map status to enum
const statusMap = {
  'available': 'available',
  'banned': 'banned',
  'unavailable': 'unavailable',
  'drafted': 'drafted'
};

const mappedStatus = statusMap[status] || 'available';

// Get season ID from Supabase query
const seasonId = seasonData?.id || null;

if (!seasonId) {
  throw new Error('No current season found in database. Please ensure a season exists with is_current = true');
}

if (!name) {
  throw new Error('Pokemon name is required');
}

if (!pointValue || pointValue < 1 || pointValue > 20) {
  throw new Error('Point value must be between 1 and 20');
}

// Return Supabase-ready data
return {
  json: {
    pokemon_name: name,
    point_value: pointValue,
    status: mappedStatus,
    tera_captain_eligible: teraCaptainEligible,
    pokemon_id: pokemonId,
    season_id: seasonId,
    banned_reason: bannedReason || null,
    // Include Notion page ID for reference
    notion_page_id: page.id,
  }
};
`,
        },
      },
      // Supabase Node: Upsert to draft_pool
      {
        id: "upsert-supabase",
        name: "Upsert to Supabase",
        type: "n8n-nodes-base.supabase",
        typeVersion: 1,
        position: [1250, 300],
        parameters: {
          operation: "upsert",
          table: "draft_pool",
          // Match on season_id + pokemon_name (unique constraint)
          matchColumns: ["season_id", "pokemon_name"],
          columns: {
            mappingMode: "defineBelow",
            value: {
              pokemon_name: "={{ $json.pokemon_name }}",
              point_value: "={{ $json.point_value }}",
              status: "={{ $json.status }}",
              tera_captain_eligible: "={{ $json.tera_captain_eligible }}",
              pokemon_id: "={{ $json.pokemon_id }}",
              season_id: "={{ $json.season_id }}",
              banned_reason: "={{ $json.banned_reason }}",
            },
          },
        },
        // Supabase credentials must be set up manually in n8n UI
      },
      // Discord Node: Send notification
      {
        id: "discord-notify",
        name: "Discord Notification",
        type: "n8n-nodes-base.discord",
        typeVersion: 1,
        position: [1450, 300],
        parameters: {
          webhookUrl: "={{ $env.DISCORD_WEBHOOK_URL }}", // Set in n8n environment variables
          text: "✅ **Draft Board Updated**\n**Pokemon:** {{ $json.pokemon_name }}\n**Points:** {{ $json.point_value }}\n**Status:** {{ $json.status }}\n**Tera Captain Eligible:** {{ $json.tera_captain_eligible ? 'Yes' : 'No' }}",
        },
      },
    ]

    // Build connections
    const connections = {
      "Notion Trigger": {
        main: [[{ node: "Filter Added to Draft Board", type: "main", index: 0 }]],
      },
      "Filter Added to Draft Board": {
        main: [
          [{ node: "Get Page Data", type: "main", index: 0 }], // True branch
        ],
      },
      "Get Page Data": {
        main: [[{ node: "Get Current Season", type: "main", index: 0 }]],
      },
      "Get Current Season": {
        main: [[{ node: "Transform to Supabase", type: "main", index: 0 }]],
      },
      "Transform to Supabase": {
        main: [[{ node: "Upsert to Supabase", type: "main", index: 0 }]],
      },
      "Upsert to Supabase": {
        main: [[{ node: "Discord Notification", type: "main", index: 0 }]],
      },
    }

    const workflowData = {
      name: "Notion Draft Board → Supabase Sync",
      nodes,
      connections,
      settings: {
        executionOrder: "v1",
        saveManualExecutions: true,
        saveDataErrorExecution: "all",
        saveDataSuccessExecution: "all",
        saveExecutionProgress: false,
        callerPolicy: "workflowsFromSameOwner",
        errorWorkflow: "",
        timezone: "America/New_York",
      },
    }

    console.log("2️⃣ Creating workflow...")
    const result = await createN8nWorkflow(workflowData as any)
    console.log("   ✅ Workflow created")
    console.log(`\n   Workflow ID: ${result.id}`)
    console.log(`   Workflow URL: https://aab-n8n.moodmnky.com/workflow/${result.id}`)

    console.log("\n" + "=".repeat(60))
    console.log("\n✅ Workflow Created!")
    console.log("\n⚠️  IMPORTANT: Manual Setup Required in n8n:")
    console.log("\n📋 Step-by-Step Setup:")
    console.log("\n1. Go to n8n Dashboard:")
    console.log("   https://aab-n8n.moodmnky.com")
    console.log("\n2. Open workflow: 'Notion Draft Board → Supabase Sync'")
    console.log("\n3. Set up Notion API Credentials:")
    console.log("   a. Click on 'Notion Trigger' node")
    console.log("   b. Add 'Internal Integration Secret' credential")
    console.log("   c. Enter your Notion API Token (from NOTION_API_KEY)")
    console.log("   d. Save credentials")
    console.log("\n4. Set up Supabase Credentials:")
    console.log("   a. Click on 'Get Current Season' node (or 'Upsert to Supabase' node)")
    console.log("   b. Add Supabase credential")
    console.log(`   c. Host: ${SUPABASE_URL?.replace('https://', '').replace('.supabase.co', '')}`)
    console.log("   d. Service Role Key: (from SUPABASE_SERVICE_ROLE_KEY)")
    console.log("   e. Save credentials")
    console.log("   f. Apply same credentials to BOTH Supabase nodes")
    console.log("\n5. Set Environment Variables in n8n:")
    console.log("   - DISCORD_WEBHOOK_URL: Discord webhook URL for notifications")
    console.log("   (Season ID is queried dynamically from Supabase)")
    console.log("\n6. Configure Trigger:")
    console.log("   - Database ID: " + DRAFT_BOARD_DATABASE_ID)
    console.log("   - Event: Page Updated")
    console.log("   - Polling Interval: 2 minutes")
    console.log("\n8. Verify Integration Connection:")
    console.log("   - Open Draft Board in Notion")
    console.log("   - Ensure integration is connected")
    console.log("\n9. Activate the workflow")
    console.log("\n💡 Benefits:")
    console.log("   ✅ Uses native n8n nodes (more reliable)")
    console.log("   ✅ No custom API endpoint needed")
    console.log("   ✅ Direct Notion → Supabase sync")
    console.log("   ✅ Built-in error handling and retries")
    console.log("   ✅ Discord notifications included")

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`)
    if (error.response) {
      console.error(`   Status: ${error.response.status}`)
      console.error(`   Response: ${JSON.stringify(error.response.data)}`)
    }
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main()
