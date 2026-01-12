/**
 * Poképedia Seed Edge Function
 * Discovers all PokéAPI REST v2 resource URLs and enqueues them
 * Respects dependency ordering: master → reference → species → pokemon → relationships
 * 
 * Usage:
 * POST /pokepedia-seed
 * Body: { resourceTypes?: string[], limit?: number, maxPagesPerType?: number }
 */

import { createClient } from "npm:@supabase/supabase-js@2";

type SeedRequest = {
  resourceTypes?: string[];
  limit?: number;
  maxPagesPerType?: number; // safety valve
};

// Resource types organized by dependency phase
const RESOURCE_PHASES = {
  // Phase 1: Master data (no dependencies)
  master: [
    "type",
    "stat",
    "egg-group",
    "growth-rate",
    "ability",
    "move",
  ],
  
  // Phase 2: Reference data (may reference master data)
  reference: [
    "generation",
    "pokemon-color",
    "pokemon-habitat",
    "pokemon-shape",
    "item",
    "item-attribute",
    "item-category",
    "item-fling-effect",
    "location",
    "location-area",
    "pal-park-area",
    "region",
    "pokedex",
    "version",
    "version-group",
    "encounter-method",
    "encounter-condition",
    "encounter-condition-value",
    "gender",
    "nature",
    "characteristic",
    "berry",
    "berry-firmness",
    "berry-flavor",
    "contest-type",
    "contest-effect",
    "super-contest-effect",
    "machine",
    "move-ailment",
    "move-battle-style",
    "move-category",
    "move-damage-class",
    "move-learn-method",
    "move-target",
    "language",
  ],
  
  // Phase 3: Species (depends on reference data)
  species: [
    "pokemon-species",
  ],
  
  // Phase 4: Pokemon (depends on species)
  pokemon: [
    "pokemon",
  ],
  
  // Phase 5: Relationships (depends on pokemon + master)
  relationships: [
    "evolution-chain",
  ],
};

// Default: all resource types
const DEFAULT_TYPES = [
  ...RESOURCE_PHASES.master,
  ...RESOURCE_PHASES.reference,
  ...RESOURCE_PHASES.species,
  ...RESOURCE_PHASES.pokemon,
  ...RESOURCE_PHASES.relationships,
];

function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY")!;
    
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase configuration" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    const body: SeedRequest = await req.json().catch(() => ({}));
    const resourceTypes = body.resourceTypes?.length 
      ? body.resourceTypes 
      : DEFAULT_TYPES;
    const limit = body.limit ?? 200;
    const maxPagesPerType = body.maxPagesPerType ?? 500;
    
    const base = Deno.env.get("POKEAPI_BASE_URL") ?? "https://pokeapi.co/api/v2";
    
    let totalEnqueued = 0;
    const perType: Record<string, number> = {};
    const errors: Array<{ type: string; error: string }> = [];
    
    // Process resources in dependency order
    const phases = [
      { name: "master", types: RESOURCE_PHASES.master },
      { name: "reference", types: RESOURCE_PHASES.reference },
      { name: "species", types: RESOURCE_PHASES.species },
      { name: "pokemon", types: RESOURCE_PHASES.pokemon },
      { name: "relationships", types: RESOURCE_PHASES.relationships },
    ];
    
    for (const phase of phases) {
      // Only process types that were requested
      const typesToProcess = phase.types.filter(t => resourceTypes.includes(t));
      
      if (typesToProcess.length === 0) continue;
      
      console.log(`[Seed] Processing phase: ${phase.name} (${typesToProcess.length} types)`);
      
      for (const type of typesToProcess) {
        try {
          let offset = 0;
          let pages = 0;
          perType[type] = 0;
          
          while (pages < maxPagesPerType) {
            const listUrl = joinUrl(base, `${type}?limit=${limit}&offset=${offset}`);
            
            console.log(`[Seed] Fetching ${type} page ${pages + 1} (offset ${offset})`);
            
            const resp = await fetch(listUrl, { 
              headers: { "Accept": "application/json" },
            });
            
            if (!resp.ok) {
              const errorMsg = `Failed to fetch ${type} list: ${resp.status} ${resp.statusText}`;
              console.error(`[Seed] ${errorMsg}`);
              errors.push({ type, error: errorMsg });
              break;
            }
            
            const json = await resp.json();
            const results: Array<{ name: string; url: string }> = json?.results ?? [];
            
            if (!results.length) {
              console.log(`[Seed] No more results for ${type}`);
              break;
            }
            
            // Enqueue in batches
            const messages = results.map((r) => ({ 
              url: r.url,
              resource_type: type,
              phase: phase.name,
            }));
            
            const { error: sendErr } = await supabase.rpc("pgmq_public.send_batch", {
              queue_name: "pokepedia_ingest",
              messages,
              sleep_seconds: 0,
            });
            
            if (sendErr) {
              const errorMsg = `Failed to enqueue ${type}: ${sendErr.message}`;
              console.error(`[Seed] ${errorMsg}`);
              errors.push({ type, error: errorMsg });
              break;
            }
            
            totalEnqueued += messages.length;
            perType[type] += messages.length;
            
            console.log(`[Seed] Enqueued ${messages.length} ${type} URLs (total: ${perType[type]})`);
            
            pages += 1;
            
            // Pagination: if no next, stop; else continue
            if (!json?.next) {
              console.log(`[Seed] No next page for ${type}`);
              break;
            }
            
            offset += limit;
            
            // Rate limiting: small delay between pages
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          
          console.log(`[Seed] Completed ${type}: ${perType[type]} URLs enqueued`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[Seed] Error processing ${type}:`, errorMsg);
          errors.push({ type, error: errorMsg });
        }
      }
    }
    
    return new Response(
      JSON.stringify({ 
        ok: true, 
        totalEnqueued, 
        perType,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Seed] Fatal error:", error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error instanceof Error ? error.message : String(error) 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
