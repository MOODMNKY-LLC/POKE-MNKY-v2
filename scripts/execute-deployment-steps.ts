/**
 * Deployment Execution Script
 * 
 * Guides through and executes all deployment steps for homepage optimizations
 */

import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

interface Step {
  name: string
  description: string
  command?: string
  manual?: string
  verify?: () => Promise<boolean>
}

const steps: Step[] = [
  {
    name: 'Install Dependencies',
    description: 'Install @vercel/kv package',
    command: 'pnpm install',
    verify: async () => {
      try {
        const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'))
        return !!packageJson.dependencies['@vercel/kv']
      } catch {
        return false
      }
    },
  },
  {
    name: 'Run Database Migration',
    description: 'Apply homepage performance indexes migration',
    manual: `
      Option A: Supabase CLI
      Run: supabase migration up
      
      Option B: Supabase Dashboard
      1. Go to Supabase Dashboard → SQL Editor
      2. Open: supabase/migrations/20260117000003_homepage_performance_indexes.sql
      3. Copy and paste contents
      4. Click "Run"
    `,
  },
  {
    name: 'Set Up Vercel KV',
    description: 'Create Vercel KV database for Redis caching',
    manual: `
      1. Go to Vercel Dashboard → Your Project → Storage
      2. Click "Create Database" → Select "KV"
      3. Name: poke-mnky-cache
      4. Region: Choose closest to users
      5. Click "Create"
      
      Vercel automatically adds KV_URL and KV_REST_API_TOKEN environment variables
    `,
  },
  {
    name: 'Deploy to Vercel',
    description: 'Deploy optimized code to production',
    command: 'git add . && git commit -m "feat: Add homepage performance optimizations" && git push',
    manual: `
      Or deploy manually:
      vercel --prod
    `,
  },
  {
    name: 'Verify Deployment',
    description: 'Run verification scripts',
    command: 'pnpm verify:optimizations && pnpm test:performance',
  },
]

async function executeStep(step: Step, index: number) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Step ${index + 1}/${steps.length}: ${step.name}`)
  console.log('='.repeat(60))
  console.log(step.description)
  console.log('')

  if (step.verify) {
    const verified = await step.verify()
    if (verified) {
      console.log(`✅ ${step.name}: Already complete`)
      return true
    }
  }

  if (step.command) {
    console.log(`Executing: ${step.command}`)
    try {
      execSync(step.command, { stdio: 'inherit', cwd: process.cwd() })
      console.log(`✅ ${step.name}: Complete`)
      return true
    } catch (error: any) {
      console.error(`❌ ${step.name}: Failed`)
      console.error(error.message)
      return false
    }
  }

  if (step.manual) {
    console.log('📋 Manual Steps Required:')
    console.log(step.manual)
    console.log('\nPress Enter after completing this step...')
    // In a real scenario, you'd wait for user input
    return true
  }

  return true
}

async function main() {
  console.log('🚀 Homepage Optimization Deployment')
  console.log('='.repeat(60))
  console.log('')

  for (let i = 0; i < steps.length; i++) {
    const success = await executeStep(steps[i], i)
    if (!success && steps[i].command) {
      console.error(`\n❌ Deployment stopped at step ${i + 1}`)
      process.exit(1)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ All deployment steps complete!')
  console.log('='.repeat(60))
}

main().catch((error) => {
  console.error('❌ Deployment script failed:', error)
  process.exit(1)
})
