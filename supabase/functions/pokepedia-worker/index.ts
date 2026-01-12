/**
 * Poképedia Worker Edge Function
 * Processes queue messages: fetches resources, stores in JSONB cache + normalized tables
 * Enqueues sprite downloads for Pokemon resources
 * 
 * Usage:
 * POST /pokepedia-worker
 * Body: { batchSize?: number, visibilityTimeout?: number, concurrency?: number, enqueueSprites?: boolean }
 */

import { createClient } from "npm:@supabase/supabase-js@2";

type WorkerRequest = {
  batchSize?: number;        // how many queue messages to read at once
  visibilityTimeout?: number; // seconds
  concurrency?: number;      // concurrent fetches
  enqueueSprites?: boolean;
};

const QUEUE = "pokepedia_ingest";
const SPRITE_QUEUE = "pokepedia_sprites";
const SPRITE_BUCKET = "pokedex-sprites";

function parseResourceType(url: string): string {
  // https://pokeapi.co/api/v2/pokemon/25/
  const u = new URL(url);
  const parts = u.pathname.split("/").filter(Boolean); // ['api','v2','pokemon','25']
  return parts[2] ?? "unknown";
}

function parseResourceKey(url: string): string {
  const u = new URL(url);
  const parts = u.pathname.split("/").filter(Boolean);
  return parts[3] ?? url;
}

function normalizeSpriteTargetPath(resourceId: number, spriteUrl: string): string {
  // Keep a stable, readable path. Try to preserve sprite "category" hints.
  // Example spriteUrl contains ".../sprites/pokemon/other/official-artwork/25.png"
  // We'll store under: pokemon/{id}/{subpath-derived}.ext
  try {
    const u = new URL(spriteUrl);
    const p = u.pathname.split("/").filter(Boolean);
    // Find the 'sprites' segment and take the remainder
    const idx = p.indexOf("sprites");
    const tail = idx >= 0 ? p.slice(idx + 1) : p.slice(-3);
    const ext = (tail[tail.length - 1]?.split(".").pop() ?? "png").toLowerCase();
    
    // Replace the numeric file name with a semantic name when possible
    // e.g. ".../pokemon/25.png" -> "pokemon/front_default.png" is not knowable here
    // so we use the tail path, but put it under pokemon/{id}/
    const safeTail = tail.join("/").replace(/\.\.+/g, ".");
    return `pokemon/${resourceId}/${safeTail}`.replace(/\s+/g, "-") + 
      (safeTail.endsWith(`.${ext}`) ? "" : `.${ext}`);
  } catch {
    return `pokemon/${resourceId}/sprites/unknown.png`;
  }
}

function extractSpriteUrlsDeep(obj: unknown): string[] {
  // Walk arbitrary nested sprite structures and collect HTTP(S) URLs.
  const out: string[] = [];
  const seen = new Set<string>();
  
  const walk = (v: any) => {
    if (v == null) return;
    
    if (typeof v === "string") {
      if (/^https?:\/\//i.test(v) && !seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
      return;
    }
    
    if (Array.isArray(v)) {
      for (const x of v) walk(x);
      return;
    }
    
    if (typeof v === "object") {
      for (const key of Object.keys(v)) walk((v as any)[key]);
    }
  };
  
  walk(obj);
  return out;
}

async function withConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let i = 0;
  
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) break;
      results[idx] = await fn(items[idx]);
    }
  });
  
  await Promise.all(workers);
  return results;
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
    
    const body: WorkerRequest = await req.json().catch(() => ({}));
    const batchSize = body.batchSize ?? 10;
    const visibilityTimeout = body.visibilityTimeout ?? 300;
    const concurrency = body.concurrency ?? 4;
    const enqueueSprites = body.enqueueSprites ?? true;
    
    // Read up to N messages with a visibility timeout
    const { data: messages, error: readErr } = await supabase.rpc("pgmq_public.read", {
      queue_name: QUEUE,
      sleep_seconds: visibilityTimeout,
      n: batchSize,
    });
    
    if (readErr) {
      return new Response(
        JSON.stringify({ ok: false, error: readErr.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    if (!messages?.length) {
      return new Response(
        JSON.stringify({ ok: true, processed: 0 }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    
    console.log(`[Worker] Processing ${messages.length} messages`);
    
    const processed: any[] = [];
    const failed: any[] = [];
    
    await withConcurrency(messages, concurrency, async (msg: any) => {
      const messageId = msg?.msg_id ?? msg?.id ?? msg?.message_id;
      const payload = msg?.message ?? msg?.msg ?? msg?.payload ?? {};
      const url = payload?.url as string;
      
      if (!url || typeof url !== "string") {
        failed.push({ messageId, error: "Missing url" });
        return;
      }
      
      try {
        // Fetch resource
        const resp = await fetch(url, { headers: { "Accept": "application/json" } });
        if (!resp.ok) throw new Error(`Fetch failed ${resp.status}`);
        
        const data = await resp.json();
        const resource_type = parseResourceType(url);
        const resource_key = String(parseResourceKey(url));
        const name = typeof data?.name === "string" ? data.name : null;
        
        // Upsert canonical resource cache (JSONB)
        const { error: upErr } = await supabase
          .from("pokeapi_resources")
          .upsert(
            { 
              resource_type, 
              resource_key, 
              name, 
              url, 
              data, 
              fetched_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "resource_type,resource_key" }
          );
        
        if (upErr) throw new Error(`Upsert resource failed: ${upErr.message}`);
        
        // Projection: pokemon basic fields (for fast UI queries)
        if (resource_type === "pokemon" && typeof data?.id === "number") {
          const pokemonId = data.id as number;
          
          await supabase.from("pokepedia_pokemon").upsert(
            {
              id: pokemonId,
              name: data.name,
              height: data.height ?? null,
              weight: data.weight ?? null,
              base_experience: data.base_experience ?? null,
              is_default: data.is_default ?? null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
          
          // Enqueue sprites for download
          if (enqueueSprites) {
            const spriteUrls = extractSpriteUrlsDeep(data?.sprites);
            
            if (spriteUrls.length) {
              const spriteMessages = spriteUrls.map((spriteUrl) => ({
                resource_type: "pokemon",
                resource_id: pokemonId,
                source_url: spriteUrl,
                target_bucket: SPRITE_BUCKET,
                target_path: normalizeSpriteTargetPath(pokemonId, spriteUrl),
              }));
              
              const { error: sendErr } = await supabase.rpc("pgmq_public.send_batch", {
                queue_name: SPRITE_QUEUE,
                messages: spriteMessages,
                sleep_seconds: 0,
              });
              
              if (sendErr) {
                console.warn(`[Worker] Failed to enqueue sprites for ${pokemonId}: ${sendErr.message}`);
                // Don't fail the whole message if sprite enqueue fails
              }
            }
          }
        }
        
        // TODO: Also write to normalized tables (pokemon_comprehensive, types, etc.)
        // This can be done based on resource_type to maintain compatibility
        
        // Delete message after successful processing
        const { error: delErr } = await supabase.rpc("pgmq_public.delete", {
          queue_name: QUEUE,
          message_id: messageId,
        });
        
        if (delErr) throw new Error(`Queue delete failed: ${delErr.message}`);
        
        processed.push({ messageId, url, resource_type, resource_key });
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error(`[Worker] Error processing ${url}:`, errorMsg);
        failed.push({ messageId, url, error: errorMsg });
      }
    });
    
    return new Response(
      JSON.stringify({ ok: true, processed, failed }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Worker] Fatal error:", error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error instanceof Error ? error.message : String(error) 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
