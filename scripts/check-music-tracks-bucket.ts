/**
 * Check music-tracks bucket and list files
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing environment variables")
  console.error("   NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✅" : "❌")
  console.error("   SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY:", supabaseKey ? "✅" : "❌")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkMusicTracksBucket() {
  console.log("🔍 Checking music-tracks bucket...\n")
  console.log(`   URL: ${supabaseUrl}\n`)

  try {
    // List all buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      console.error("❌ Failed to list buckets:", bucketsError.message)
      return false
    }

    console.log(`📦 Found ${buckets?.length || 0} bucket(s):`)
    buckets?.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.public ? "public" : "private"})`)
    })
    console.log("")

    // Check if music-tracks bucket exists
    const musicTracksBucket = buckets?.find(b => b.name === "music-tracks")

    if (!musicTracksBucket) {
      console.log("⚠️  music-tracks bucket not found!")
      console.log("   Available buckets:", buckets?.map(b => b.name).join(", ") || "none")
      return false
    }

    console.log(`✅ Found music-tracks bucket`)
    console.log(`   Public: ${musicTracksBucket.public ? "Yes" : "No"}`)
    console.log(`   Created: ${musicTracksBucket.created_at || "N/A"}`)
    console.log("")

    // List files in the bucket
    console.log("📁 Listing files in music-tracks bucket...\n")

    const { data: files, error: filesError } = await supabase.storage
      .from("music-tracks")
      .list("", {
        limit: 1000,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      })

    if (filesError) {
      console.error("❌ Failed to list files:", filesError.message)
      return false
    }

    if (!files || files.length === 0) {
      console.log("📭 No files found in music-tracks bucket")
      return true
    }

    console.log(`✅ Found ${files.length} file(s):\n`)

    // Group files by folder
    const folders = new Map<string, any[]>()
    const rootFiles: any[] = []

    files.forEach(file => {
      // Check if it's a folder (folders typically don't have metadata.size)
      const isFolder = file.id === undefined || file.metadata === null || file.metadata?.size === undefined

      if (isFolder) {
        // It's a folder
        if (!folders.has(file.name)) {
          folders.set(file.name, [])
        }
      } else {
        // It's a file in root
        rootFiles.push(file)
      }
    })

    // Show root files
    if (rootFiles.length > 0) {
      console.log("📄 Root files:")
      rootFiles.forEach(file => {
        const size = file.metadata?.size || file.size || 0
        const sizeMB = (size / (1024 * 1024)).toFixed(2)
        const updated = file.updated_at || file.created_at || "N/A"
        console.log(`   - ${file.name} (${sizeMB} MB) - Updated: ${updated}`)
      })
      console.log("")
    }

    // Show folders
    if (folders.size > 0) {
      console.log("📁 Folders:")
      for (const [folderName, folderFiles] of folders.entries()) {
        console.log(`\n   📂 ${folderName}/`)

        // List files in folder
        const { data: folderFilesData, error: folderError } = await supabase.storage
          .from("music-tracks")
          .list(folderName, {
            limit: 1000,
            offset: 0,
            sortBy: { column: "name", order: "asc" },
          })

        if (!folderError && folderFilesData) {
          folderFilesData.forEach(file => {
            const isFolder = file.id === undefined || file.metadata === null || file.metadata?.size === undefined
            if (!isFolder) {
              const size = file.metadata?.size || file.size || 0
              const sizeMB = (size / (1024 * 1024)).toFixed(2)
              const updated = file.updated_at || file.created_at || "N/A"
              console.log(`      - ${file.name} (${sizeMB} MB) - Updated: ${updated}`)
            }
          })
        }
      }
      console.log("")
    }

    // Get public URLs for files
    if (rootFiles.length > 0 || folders.size > 0) {
      console.log("🔗 Sample public URLs:")
      if (rootFiles.length > 0) {
        const sampleFile = rootFiles[0]
        const { data: urlData } = supabase.storage
          .from("music-tracks")
          .getPublicUrl(sampleFile.name)
        console.log(`   ${urlData.publicUrl}`)
      }
      if (folders.size > 0) {
        const firstFolder = Array.from(folders.keys())[0]
        const { data: folderFilesData } = await supabase.storage
          .from("music-tracks")
          .list(firstFolder, { limit: 1 })
        if (folderFilesData && folderFilesData.length > 0) {
          const sampleFile = folderFilesData[0]
          const isFolder = sampleFile.id === undefined || sampleFile.metadata === null || sampleFile.metadata?.size === undefined
          if (!isFolder) {
            const { data: urlData } = supabase.storage
              .from("music-tracks")
              .getPublicUrl(`${firstFolder}/${sampleFile.name}`)
            console.log(`   ${urlData.publicUrl}`)
          }
        }
      }
    }

    console.log("\n✨ Bucket check complete!")
    return true
  } catch (error: any) {
    console.error("❌ Error:", error.message)
    return false
  }
}

checkMusicTracksBucket()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
  })
