import { createServiceRoleClient } from "@/lib/supabase/service"

async function main() {
  const supabase = createServiceRoleClient()
  
  console.log("Creating queues...")
  
  // Create queues using SQL
  const queues = ["pokepedia_ingest", "pokepedia_sprites"]
  
  for (const queueName of queues) {
    const { error } = await supabase.rpc("pgmq_public.create", {
      queue_name: queueName,
    })
    
    if (error) {
      if (error.message?.includes("already exists")) {
        console.log(`✅ Queue '${queueName}' already exists`)
      } else {
        console.log(`❌ Failed to create '${queueName}': ${error.message}`)
      }
    } else {
      console.log(`✅ Created queue '${queueName}'`)
    }
  }
}

main().catch(console.error)
