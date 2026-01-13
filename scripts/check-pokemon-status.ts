/**
 * Check Pokemon Import Status
 */

import { createClient } from "@supabase/supabase-js"

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data } = await supabase
    .from("pokeapi_resources")
    .select("resource_key")
    .eq("resource_type", "pokemon")
    .order("resource_key", { ascending: true })

  const ids = data?.map((r) => parseInt(r.resource_key)).filter((id) => !isNaN(id)).sort((a, b) => a - b) || []

  console.log(`Pokemon IDs in Supabase: ${ids.length}`)
  console.log(`First 10: ${ids.slice(0, 10).join(", ")}`)
  console.log(`Last 10: ${ids.slice(-10).join(", ")}`)
  if (ids.length > 0) {
    console.log(`Max ID: ${Math.max(...ids)}`)
  }
}

main()
