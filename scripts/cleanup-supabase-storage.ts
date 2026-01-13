/**
 * Cleanup Supabase Storage Buckets
 * 
 * Lists and optionally deletes files from Supabase Storage buckets.
 * Useful for freeing up space after migrating to MinIO.
 * 
 * Usage:
 *   pnpm tsx scripts/cleanup-supabase-storage.ts [--bucket=pokedex-sprites] [--dry-run] [--delete]
 */

import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"
import { config } from "dotenv"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
const envPath = path.join(__dirname, "..", ".env.local")
if (fs.existsSync(envPath)) {
  config({ path: envPath })
}
config({ path: path.join(__dirname, "..", ".env") })

interface FileInfo {
  name: string
  path: string
  size?: number
  updated_at?: string
}

interface BucketStats {
  bucketName: string
  fileCount: number
  totalSize: number
  files: FileInfo[]
}

/**
 * Recursively list all files in a bucket folder
 */
async function listBucketFiles(
  supabase: any,
  bucketName: string,
  folderPath: string = "",
  allFiles: FileInfo[] = [],
  depth: number = 0
): Promise<FileInfo[]> {
  // Prevent infinite recursion
  if (depth > 20) {
    console.warn(`⚠️  Max depth reached for ${folderPath}`)
    return allFiles
  }

  const { data: files, error } = await supabase.storage.from(bucketName).list(folderPath, {
    limit: 1000,
    offset: 0,
    sortBy: { column: "name", order: "asc" },
  })

  if (error) {
    console.error(`❌ Error listing ${folderPath || "root"}:`, error.message)
    return allFiles
  }

  if (!files || files.length === 0) {
    return allFiles
  }

  for (const file of files) {
    const fullPath = folderPath ? `${folderPath}/${file.name}` : file.name

    // Check if it's a folder (folders don't have an 'id' property in Supabase Storage)
    // Folders typically have metadata.size === null or undefined
    const isFolder = file.id === undefined || file.metadata === null || file.metadata?.size === undefined

    if (isFolder) {
      // It's a folder, recurse
      if (depth < 3) {
        // Only show progress for top-level folders
        process.stdout.write(`   Scanning ${fullPath}...\r`)
      }
      await listBucketFiles(supabase, bucketName, fullPath, allFiles, depth + 1)
    } else {
      // It's a file
      allFiles.push({
        name: file.name,
        path: fullPath,
        size: file.metadata?.size || file.size || 0,
        updated_at: file.updated_at || file.created_at,
      })
    }
  }

  if (depth === 0) {
    process.stdout.write("   " + " ".repeat(50) + "\r") // Clear progress line
  }

  return allFiles
}

/**
 * Get bucket statistics
 */
async function getBucketStats(
  supabase: any,
  bucketName: string
): Promise<BucketStats | null> {
  console.log(`📊 Analyzing bucket: ${bucketName}...`)

  const files = await listBucketFiles(supabase, bucketName)
  const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0)

  return {
    bucketName,
    fileCount: files.length,
    totalSize,
    files,
  }
}

/**
 * Delete files from bucket
 */
async function deleteBucketFiles(
  supabase: any,
  bucketName: string,
  files: FileInfo[],
  batchSize: number = 100
): Promise<{ deleted: number; errors: number }> {
  let deleted = 0
  let errors = 0

  console.log(`🗑️  Deleting ${files.length} files in batches of ${batchSize}...`)

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize)
    const paths = batch.map((f) => f.path)

    const { data, error } = await supabase.storage.from(bucketName).remove(paths)

    if (error) {
      console.error(`❌ Error deleting batch ${Math.floor(i / batchSize) + 1}:`, error.message)
      errors += batch.length
    } else {
      const deletedCount = data?.length || 0
      deleted += deletedCount
      console.log(`   ✅ Deleted batch ${Math.floor(i / batchSize) + 1}: ${deletedCount} files`)
    }
  }

  return { deleted, errors }
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

async function main() {
  console.log("=".repeat(70))
  console.log("🧹 Supabase Storage Cleanup")
  console.log("=".repeat(70))
  console.log("")

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials")
    console.error("   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Parse command line arguments
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const deleteFlag = args.includes("--delete")
  const bucketArg = args.find((a) => a.startsWith("--bucket="))
  const bucketName = bucketArg ? bucketArg.split("=")[1] : "pokedex-sprites"

  console.log(`📦 Target bucket: ${bucketName}`)
  console.log(`🔍 Mode: ${dryRun ? "DRY RUN" : deleteFlag ? "DELETE" : "LIST ONLY"}`)
  console.log("")

  // Check if bucket exists
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
  if (bucketsError) {
    console.error("❌ Failed to list buckets:", bucketsError.message)
    process.exit(1)
  }

  const bucketExists = buckets?.some((b) => b.name === bucketName)
  if (!bucketExists) {
    console.error(`❌ Bucket "${bucketName}" not found`)
    console.log("")
    console.log("Available buckets:")
    buckets?.forEach((b) => console.log(`  - ${b.name}`))
    process.exit(1)
  }

  // Get bucket statistics
  const stats = await getBucketStats(supabase, bucketName)

  if (!stats) {
    console.error("❌ Failed to get bucket statistics")
    process.exit(1)
  }

  // Display statistics
  console.log("")
  console.log("=".repeat(70))
  console.log("📊 Bucket Statistics")
  console.log("=".repeat(70))
  console.log(`Bucket: ${stats.bucketName}`)
  console.log(`Files: ${stats.fileCount.toLocaleString()}`)
  console.log(`Total Size: ${formatBytes(stats.totalSize)}`)
  console.log("")

  if (stats.fileCount === 0) {
    console.log("✅ Bucket is already empty!")
    process.exit(0)
  }

  // Show sample files
  console.log("📁 Sample files (first 10):")
  stats.files.slice(0, 10).forEach((file, idx) => {
    const size = file.size ? formatBytes(file.size) : "unknown"
    console.log(`  ${idx + 1}. ${file.path} (${size})`)
  })
  if (stats.files.length > 10) {
    console.log(`  ... and ${stats.files.length - 10} more files`)
  }
  console.log("")

  // Delete if requested
  if (deleteFlag && !dryRun) {
    console.log("⚠️  WARNING: This will permanently delete all files in the bucket!")
    console.log(`   Files to delete: ${stats.fileCount.toLocaleString()}`)
    console.log(`   Total size: ${formatBytes(stats.totalSize)}`)
    console.log("")
    console.log("Press Ctrl+C to cancel, or wait 5 seconds to proceed...")
    console.log("")

    // Wait 5 seconds
    await new Promise((resolve) => setTimeout(resolve, 5000))

    const result = await deleteBucketFiles(supabase, bucketName, stats.files)

    console.log("")
    console.log("=".repeat(70))
    console.log("✅ Cleanup Complete")
    console.log("=".repeat(70))
    console.log(`Deleted: ${result.deleted.toLocaleString()} files`)
    console.log(`Errors: ${result.errors}`)
    console.log("")

    // Verify bucket is empty
    const verifyStats = await getBucketStats(supabase, bucketName)
    if (verifyStats && verifyStats.fileCount === 0) {
      console.log("✅ Bucket is now empty!")
    } else {
      console.log(`⚠️  Bucket still contains ${verifyStats?.fileCount || 0} files`)
    }
  } else if (deleteFlag && dryRun) {
    console.log("🔍 DRY RUN: Would delete the following files:")
    console.log(`   Total: ${stats.fileCount.toLocaleString()} files`)
    console.log(`   Size: ${formatBytes(stats.totalSize)}`)
    console.log("")
    console.log("Run without --dry-run to actually delete:")
    console.log(`   pnpm tsx scripts/cleanup-supabase-storage.ts --bucket=${bucketName} --delete`)
  } else {
    console.log("💡 To delete these files, run:")
    console.log(`   pnpm tsx scripts/cleanup-supabase-storage.ts --bucket=${bucketName} --delete`)
    console.log("")
    console.log("💡 For a dry run (preview only):")
    console.log(`   pnpm tsx scripts/cleanup-supabase-storage.ts --bucket=${bucketName} --delete --dry-run`)
  }

  console.log("")
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
