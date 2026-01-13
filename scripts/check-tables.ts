import { createServiceRoleClient } from "@/lib/supabase/service"

async function main() {
  const supabase = createServiceRoleClient()
  
  const tables = [
    "pokepedia_assets",
    "pokeapi_resources",
    "pokepedia_pokemon",
  ]
  
  for (const table of tables) {
    const { error } = await supabase.from(table).select("id").limit(1)
    if (error) {
      console.log(`❌ ${table}: ${error.message}`)
    } else {
      console.log(`✅ ${table}: exists`)
    }
  }
}

main().catch(console.error)
