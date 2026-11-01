/**
 * Poképedia Worker Edge Function
 * Processes queue messages: fetches resources from official PokéAPI, stores in JSONB cache + normalized tables
 * 
 * Usage:
 * POST /pokepedia-worker
 * Body: { batchSize?: number, visibilityTimeout?: number, concurrency?: number }
 */

import {
  createAdminClient,
  healthcheckResponse,
  isAuthorizedRequest,
  unauthorizedResponse,
} from "../_shared/supabase-admin.ts";

type WorkerRequest = {
  batchSize?: number;        // how many queue messages to read at once
  visibilityTimeout?: number; // seconds
  concurrency?: number;      // concurrent fetches
};

const QUEUE = "pokepedia_ingest";

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
  // verify_jwt is off (sb_secret_ keys are not JWTs); require a project secret key.
  if (!isAuthorizedRequest(req)) return unauthorizedResponse();

  try {
    const supabase = createAdminClient();
    
    const body: WorkerRequest & { healthcheck?: boolean } = await req.json().catch(() => ({}));
    if (body.healthcheck) return await healthcheckResponse("pokepedia-worker", supabase, "pokeapi_resources");
    const batchSize = body.batchSize ?? 10;
    const visibilityTimeout = body.visibilityTimeout ?? 300;
    const concurrency = body.concurrency ?? 4;
    
    // Read up to N messages with a visibility timeout
    const { data: messages, error: readErr } = await supabase.rpc("pgmq_public_read", {
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
        const resource_type = parseResourceType(url);
        const resource_key = String(parseResourceKey(url));
        
        // Check if resource already exists and was recently fetched (within last 24 hours)
        // Skip fetching if already synced recently to avoid unnecessary API calls
        const { data: existing, error: checkErr } = await supabase
          .from("pokeapi_resources")
          .select("id, fetched_at")
          .eq("resource_type", resource_type)
          .eq("resource_key", resource_key)
          .single();
        
        if (!checkErr && existing) {
          const fetchedAt = new Date(existing.fetched_at);
          const hoursSinceFetch = (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60);
          
          // Skip if fetched within last 24 hours
          if (hoursSinceFetch < 24) {
            console.log(`[Worker] Skipping ${url} - already synced ${hoursSinceFetch.toFixed(1)}h ago`);
            // Still delete message to remove from queue
            await supabase.rpc("pgmq_public_delete", {
              queue_name: QUEUE,
              message_id: messageId,
            });
            processed.push({ messageId, url, resource_type, resource_key, skipped: true });
            return;
          }
        }
        
        // Fetch resource with retry logic
        let data: any = null;
        let fetchError: Error | null = null;
        const maxRetries = 3;
        const retryDelay = 1000; // Start with 1 second
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const resp = await fetch(url, { 
              headers: { "Accept": "application/json" },
              signal: AbortSignal.timeout(30000), // 30 second timeout
            });
            
            if (!resp.ok) {
              // Don't retry on 4xx errors (client errors)
              if (resp.status >= 400 && resp.status < 500) {
                throw new Error(`Client error ${resp.status}: ${resp.statusText}`);
              }
              // Retry on 5xx errors (server errors)
              if (resp.status >= 500 && attempt < maxRetries) {
                const delay = retryDelay * Math.pow(2, attempt);
                console.log(`[Worker] Server error ${resp.status} for ${url}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
              }
              throw new Error(`Fetch failed ${resp.status}: ${resp.statusText}`);
            }
            
            data = await resp.json();
            
            // Basic validation - ensure response has expected structure
            if (!data || typeof data !== "object") {
              throw new Error("Invalid response: not an object");
            }
            
            // Success - break retry loop
            break;
          } catch (err: any) {
            fetchError = err instanceof Error ? err : new Error(String(err));
            
            // Don't retry on timeout/abort or client errors
            if (err.name === "AbortError" || err.name === "TimeoutError") {
              throw new Error(`Request timeout for ${url}`);
            }
            
            // Retry on network errors
            if (attempt < maxRetries && (err.message?.includes("fetch") || err.message?.includes("network"))) {
              const delay = retryDelay * Math.pow(2, attempt);
              console.log(`[Worker] Network error for ${url}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries}): ${err.message}`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            
            // Max retries exceeded or non-retryable error
            throw fetchError;
          }
        }
        
        if (!data) {
          throw new Error(`Failed to fetch ${url} after ${maxRetries} retries`);
        }
        
        // Validate response structure based on resource type
        // Note: We can't import Zod in Deno Edge Functions, so we do basic validation
        // Full Zod validation happens in Next.js API routes
        if (typeof data !== "object" || data === null) {
          throw new Error(`Invalid response: expected object, got ${typeof data}`);
        }
        
        // Basic required field checks
        if (resource_type === "pokemon" && typeof data?.id !== "number") {
          console.warn(`[Worker] Pokemon response missing id: ${url}`);
        }
        if (resource_type === "pokemon-species" && typeof data?.id !== "number") {
          console.warn(`[Worker] Pokemon-species response missing id: ${url}`);
        }
        
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
          
          // Note: Sprites are now served directly from GitHub (PokeAPI/sprites repo)
          // No local sprite downloading/storage needed
        }
        
        // TODO: Also write to normalized tables (pokemon_comprehensive, types, etc.)
        // This can be done based on resource_type to maintain compatibility
        
        // Delete message after successful processing
        const { error: delErr } = await supabase.rpc("pgmq_public_delete", {
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
