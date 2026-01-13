/**
 * Mirror Sprites to Supabase Storage
 * 
 * Uploads sprites from resources/sprites to Supabase Storage bucket (pokedex-sprites).
 * Preserves directory structure and tracks metadata in pokepedia_assets table.
 * 
 * Usage:
 *   pnpm tsx scripts/mirror-sprites-to-storage.ts [--dry-run] [--limit=100]
 */

import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"
import crypto from "crypto"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const SPRITES_DIR = path.join(__dirname, "..", "resources", "sprites", "sprites")
const BUCKET_NAME = "pokedex-sprites"
const BATCH_SIZE = 50 // Upload in batches

interface UploadStats {
  total: number
  uploaded: number
  skipped: number
  errors: number
}

/**
 * Calculate file checksum (SHA-256)
 */
function calculateChecksum(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath)
  return crypto.createHash("sha256").update(fileBuffer).digest("hex")
}

/**
 * Upload a single sprite file
 */
async function uploadSprite(
  supabase: any,
  filePath: string,
  storagePath: string,
  dryRun: boolean
): Promise<{ success: boolean; checksum?: string }> {
  if (dryRun) {
    console.log(`   [DRY RUN] Would upload: ${storagePath}`)
    return { success: true }
  }

  try {
    const fileBuffer = fs.readFileSync(filePath)
    const checksum = calculateChecksum(filePath)

    // Check if file already exists with same checksum
    const { data: existing } = await supabase
      .from("pokepedia_assets")
      .select("sha256")
      .eq("bucket", BUCKET_NAME)
      .eq("path", storagePath)
      .single()

    if (existing?.sha256 === checksum) {
      return { success: true, checksum, skipped: true }
    }

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: getContentType(filePath),
        upsert: true,
      })

    if (uploadError) {
      throw uploadError
    }

    // Record metadata (using correct schema: asset_kind, bucket, path, bytes, source_url)
    // Construct source URL from storage path (approximate)
    const sourceUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/${storagePath.replace(/^sprites\//, "")}`
    
    const { error: metadataError } = await supabase.from("pokepedia_assets").upsert(
      {
        asset_kind: "sprite",
        bucket: BUCKET_NAME,
        path: storagePath,
        source_url: sourceUrl,
        sha256: checksum,
        bytes: fileBuffer.length,
        content_type: getContentType(filePath),
      },
      {
        onConflict: "bucket,path",
      }
    )

    if (metadataError) {
      console.warn(`⚠️  Failed to record metadata for ${storagePath}:`, metadataError)
    }

    return { success: true, checksum }
  } catch (error) {
    console.error(`❌ Error uploading ${storagePath}:`, error)
    return { success: false }
  }
}

/**
 * Get content type from file extension
 */
function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const types: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
  }
  return types[ext] || "application/octet-stream"
}

/**
 * Collect all sprite files recursively
 */
function collectSpriteFiles(dir: string, basePath: string = ""): string[] {
  const files: string[] = []
  const entries = fs.readdirSync(dir)

  for (const entry of entries) {
    const fullPath = path.join(dir, entry)
    const relativePath = path.join(basePath, entry)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      files.push(...collectSpriteFiles(fullPath, relativePath))
    } else if (/\.(png|jpg|jpeg|gif|svg)$/i.test(entry)) {
      files.push(fullPath)
    }
  }

  return files
}

async function main() {
  console.log("=".repeat(70))
  console.log("🖼️  Mirror Sprites to Supabase Storage")
  console.log("=".repeat(70))
  console.log("")

  // Check if sprites directory exists
  if (!fs.existsSync(SPRITES_DIR)) {
    console.error(`❌ Sprites directory not found: ${SPRITES_DIR}`)
    console.error("")
    console.error("Please clone the sprites repository first:")
    console.error("  cd resources")
    console.error("  git clone https://github.com/PokeAPI/sprites.git")
    console.error("")
    process.exit(1)
  }

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

  // Check if bucket exists
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
  if (bucketsError) {
    console.error("❌ Failed to list buckets:", bucketsError)
    process.exit(1)
  }

  const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME)
  if (!bucketExists) {
    console.log(`📦 Creating bucket: ${BUCKET_NAME}`)
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 52428800, // 50MB
    })

    if (createError) {
      console.error(`❌ Failed to create bucket:`, createError)
      process.exit(1)
    }
    console.log(`✅ Bucket created`)
    console.log("")
  }

  // Parse command line arguments
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const limitArg = args.find((a) => a.startsWith("--limit="))
  const limit = limitArg ? parseInt(limitArg.split("=")[1]) : undefined

  if (dryRun) {
    console.log("🔍 DRY RUN MODE - No files will be uploaded")
    console.log("")
  }

  // Collect sprite files
  console.log("📦 Collecting sprite files...")
  const allFiles = collectSpriteFiles(SPRITES_DIR)
  const files = limit ? allFiles.slice(0, limit) : allFiles

  console.log(`📊 Found ${files.length} sprite files${limit ? ` (limited from ${allFiles.length})` : ""}`)
  console.log("")

  const stats: UploadStats = {
    total: files.length,
    uploaded: 0,
    skipped: 0,
    errors: 0,
  }

  // Upload in batches
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE)
    console.log(`📤 Uploading batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} files)...`)

    for (const filePath of batch) {
      const relativePath = path.relative(SPRITES_DIR, filePath)
      const storagePath = `sprites/${relativePath.replace(/\\/g, "/")}`

      const result = await uploadSprite(supabase, filePath, storagePath, dryRun)

      if (result.success) {
        if (result.skipped) {
          stats.skipped++
        } else {
          stats.uploaded++
        }
      } else {
        stats.errors++
      }
    }

    console.log(`   ✅ Batch complete: ${stats.uploaded} uploaded, ${stats.skipped} skipped, ${stats.errors} errors`)
  }

  // Summary
  console.log("")
  console.log("=".repeat(70))
  console.log("📊 Upload Summary")
  console.log("=".repeat(70))
  console.log(`Total files: ${stats.total}`)
  console.log(`Uploaded: ${stats.uploaded}`)
  console.log(`Skipped (already exists): ${stats.skipped}`)
  console.log(`Errors: ${stats.errors}`)
  console.log("")
  console.log("✅ Sprite mirroring complete!")
  console.log("")
  console.log("Next steps:")
  console.log("1. Sprites are now available at:")
  console.log(`   ${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/sprites/...`)
  console.log("2. Update pokepedia_pokemon sprite paths to use storage URLs")
  console.log("")
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
