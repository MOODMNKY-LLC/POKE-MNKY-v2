/**
 * Verify Music Tables in Production
 * Quick script to verify the music tables migration was applied successfully
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing environment variables")
  console.error("   NEXT_PUBLIC_SUPABASE_URL")
  console.error("   SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyTables() {
  console.log("🔍 Verifying music tables in production...\n")
  console.log(`   URL: ${supabaseUrl}\n`)

  try {
    // Check music_tracks table
    const { data: tracks, error: tracksError } = await supabase
      .from("music_tracks")
      .select("id")
      .limit(1)

    if (tracksError) {
      console.error("❌ music_tracks table error:", tracksError.message)
      return false
    }
    console.log("✅ music_tracks table exists")

    // Check music_playlists table
    const { data: playlists, error: playlistsError } = await supabase
      .from("music_playlists")
      .select("id")
      .limit(1)

    if (playlistsError) {
      console.error("❌ music_playlists table error:", playlistsError.message)
      return false
    }
    console.log("✅ music_playlists table exists")

    // Check user_music_preferences table
    const { data: preferences, error: preferencesError } = await supabase
      .from("user_music_preferences")
      .select("user_id")
      .limit(1)

    if (preferencesError) {
      console.error("❌ user_music_preferences table error:", preferencesError.message)
      return false
    }
    console.log("✅ user_music_preferences table exists")

    console.log("\n✨ All music tables verified successfully!")
    return true
  } catch (error: any) {
    console.error("❌ Verification failed:", error.message)
    return false
  }
}

verifyTables()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
  })
