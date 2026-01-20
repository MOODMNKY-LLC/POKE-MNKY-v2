/**
 * Update Google Sheet ID in environment files
 * 
 * Usage: npx tsx scripts/update-google-sheet-id.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const NEW_SPREADSHEET_ID = '1ezZTEqhLrE4id9EdXRIAd0J8hqiGE9dh9Ar5RvcPCLw'
const PROJECT_ROOT = process.cwd()

function updateEnvFile(filePath: string, description: string): boolean {
  const fullPath = join(PROJECT_ROOT, filePath)
  
  if (!existsSync(fullPath)) {
    console.log(`⚠️  ${description} not found at ${filePath}`)
    console.log(`   Creating new file...`)
    
    // Create new file with both variables
    const content = `# Google Sheets Configuration
GOOGLE_SHEET_ID=${NEW_SPREADSHEET_ID}
NEXT_PUBLIC_GOOGLE_SHEET_ID=${NEW_SPREADSHEET_ID}
`
    writeFileSync(fullPath, content, 'utf-8')
    console.log(`✅ Created ${description} with GOOGLE_SHEET_ID=${NEW_SPREADSHEET_ID}`)
    return true
  }

  try {
    let content = readFileSync(fullPath, 'utf-8')
    const lines = content.split('\n')
    let updated = false
    let foundServer = false
    let foundClient = false

    const newLines = lines.map((line) => {
      // Match GOOGLE_SHEET_ID (server-side) with or without quotes, with or without comments
      if (/^GOOGLE_SHEET_ID\s*=\s*/.test(line)) {
        foundServer = true
        updated = true
        // Preserve any comments after the value
        const commentMatch = line.match(/#.*$/)
        const comment = commentMatch ? ' ' + commentMatch[0] : ''
        return `GOOGLE_SHEET_ID=${NEW_SPREADSHEET_ID}${comment}`
      }
      // Match NEXT_PUBLIC_GOOGLE_SHEET_ID (client-side) with or without quotes, with or without comments
      if (/^NEXT_PUBLIC_GOOGLE_SHEET_ID\s*=\s*/.test(line)) {
        foundClient = true
        updated = true
        // Preserve any comments after the value
        const commentMatch = line.match(/#.*$/)
        const comment = commentMatch ? ' ' + commentMatch[0] : ''
        return `NEXT_PUBLIC_GOOGLE_SHEET_ID=${NEW_SPREADSHEET_ID}${comment}`
      }
      return line
    })

    // Add server-side variable if it doesn't exist
    if (!foundServer) {
      newLines.push(`GOOGLE_SHEET_ID=${NEW_SPREADSHEET_ID}`)
      updated = true
    }

    // Add client-side variable if it doesn't exist
    if (!foundClient) {
      newLines.push(`NEXT_PUBLIC_GOOGLE_SHEET_ID=${NEW_SPREADSHEET_ID}`)
      updated = true
    }

    if (updated) {
      writeFileSync(fullPath, newLines.join('\n'), 'utf-8')
      console.log(`✅ Updated ${description}`)
      return true
    } else {
      console.log(`ℹ️  ${description} already has correct values`)
      return false
    }
  } catch (error: any) {
    console.error(`❌ Error updating ${description}:`, error.message)
    return false
  }
}

function main() {
  console.log('🔄 Updating Google Sheet ID in environment files...\n')
  console.log(`New Spreadsheet ID: ${NEW_SPREADSHEET_ID}\n`)

  const results = {
    local: updateEnvFile('.env.local', 'Local environment file (.env.local)'),
    production: updateEnvFile('.env', 'Production environment file (.env)'),
  }

  console.log('\n' + '='.repeat(60))
  console.log('📋 Summary')
  console.log('='.repeat(60))
  console.log(`✅ Local (.env.local): ${results.local ? 'Updated' : 'No changes'}`)
  console.log(`✅ Production (.env): ${results.production ? 'Updated' : 'No changes'}`)
  
  console.log('\n⚠️  IMPORTANT: Share Spreadsheet with Service Account')
  console.log('='.repeat(60))
  console.log('Before using the export feature, you MUST share the spreadsheet')
  console.log('with your Google Service Account:')
  console.log('\n1. Open: https://docs.google.com/spreadsheets/d/' + NEW_SPREADSHEET_ID + '/edit')
  console.log('2. Click "Share" (top right)')
  console.log('3. Add service account email (check your .env.local for GOOGLE_SERVICE_ACCOUNT_EMAIL)')
  console.log('4. Grant "Editor" access (required for write operations)')
  console.log('5. Uncheck "Notify people"')
  console.log('6. Click "Share"')
  console.log('\n📝 Note: For production, also update these variables in Vercel Dashboard')
  console.log('   → Project Settings → Environment Variables')
  console.log('   → Add/Update: GOOGLE_SHEET_ID')
  console.log('   → Add/Update: NEXT_PUBLIC_GOOGLE_SHEET_ID')
}

main()
