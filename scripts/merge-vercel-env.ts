/**
 * Merge Vercel environment variables into organized .env file
 * Reads from .env.production (pulled from Vercel) and merges into organized template
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'

interface EnvVar {
  key: string
  value: string
}

function parseEnvFile(filePath: string): Map<string, string> {
  const envMap = new Map<string, string>()
  
  if (!existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`)
    return envMap
  }

  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    // Parse KEY=VALUE
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (match) {
      const [, key, value] = match
      // Remove quotes if present
      const cleanValue = value.replace(/^["']|["']$/g, '')
      envMap.set(key, cleanValue)
    }
  }

  return envMap
}

function mergeIntoTemplate(template: string, values: Map<string, string>): string {
  let result = template
  
  // Replace values in template with actual values from Vercel
  for (const [key, value] of values.entries()) {
    // Find the line with this key and replace the value
    const regex = new RegExp(`^(${key}=)(.*)$`, 'm')
    if (regex.test(result)) {
      result = result.replace(regex, `$1${value}`)
    } else {
      // Key not found in template, might be a new variable
      // We'll add it at the end of the appropriate section
      console.log(`  ⚠️  Key not in template: ${key}`)
    }
  }
  
  return result
}

function main() {
  console.log('🔄 Merging Vercel environment variables...\n')
  
  // Read pulled .env file
  const vercelEnv = parseEnvFile('.env')
  console.log(`✅ Found ${vercelEnv.size} variables in .env`)
  
  // Read organized template
  const template = readFileSync('.env', 'utf-8')
  
  // Merge values
  console.log('📝 Merging values into organized template...')
  const merged = mergeIntoTemplate(template, vercelEnv)
  
  // Write merged file
  writeFileSync('.env', merged, 'utf-8')
  console.log('✅ .env file updated with Vercel values')
  
  console.log('\n✅ Merge complete!')
}

main()
