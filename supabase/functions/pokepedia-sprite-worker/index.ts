/**
 * Poképedia Sprite Worker Edge Function
 * Downloads sprites from PokéAPI and uploads to Supabase Storage
 * Records metadata in pokepedia_assets table
 * 
 * Usage:
 * POST /pokepedia-sprite-worker
 * Body: { batchSize?: number, visibilityTimeout?: number, concurrency?: number }
 */

import { createClient } from "npm:@supabase/supabase-js@2";

type SpriteWorkerRequest = {
  batchSize?: number;
  visibilityTimeout?: number;
  concurrency?: number;
};

const QUEUE = "pokepedia_sprites";
const DEFAULT_BUCKET = "pokedex-sprites";

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const arr = Array.from(new Uint8Array(hash));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
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
    
    const body: SpriteWorkerRequest = await req.json().catch(() => ({}));
    const batchSize = body.batchSize ?? 10;
    const visibilityTimeout = body.visibilityTimeout ?? 600;
    const concurrency = body.concurrency ?? 3;
    
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
    
    console.log(`[Sprite Worker] Processing ${messages.length} sprite messages`);
    
    const processed: any[] = [];
    const failed: any[] = [];
    
    await withConcurrency(messages, concurrency, async (msg: any) => {
      const messageId = msg?.msg_id ?? msg?.id ?? msg?.message_id;
      const payload = msg?.message ?? msg?.msg ?? msg?.payload ?? {};
      
      const source_url = payload?.source_url as string;
      const resource_type = payload?.resource_type as string | undefined;
      const resource_id = payload?.resource_id as number | undefined;
      const bucket = (payload?.target_bucket as string) ?? DEFAULT_BUCKET;
      const path = payload?.target_path as string;
      
      if (!source_url || !path) {
        failed.push({ messageId, error: "Missing source_url or target_path" });
        return;
      }
      
      try {
        // Check if we already stored this sprite (by source_url)
        const { data: existing, error: exErr } = await supabase
          .from("pokepedia_assets")
          .select("id,bucket,path")
          .eq("source_url", source_url)
          .maybeSingle();
        
        if (exErr) throw new Error(`Asset lookup failed: ${exErr.message}`);
        
        if (!existing) {
          // Download sprite
          const resp = await fetch(source_url);
          if (!resp.ok) throw new Error(`Sprite fetch failed ${resp.status}`);
          
          const contentType = resp.headers.get("content-type") ?? "application/octet-stream";
          const ab = await resp.arrayBuffer();
          const bytes = new Uint8Array(ab);
          const hash = await sha256Hex(bytes);
          
          // Upload to Storage (public bucket handles CDN delivery)
          const { error: upErr } = await supabase.storage
            .from(bucket)
            .upload(path, bytes, {
              contentType,
              upsert: true,
            });
          
          if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);
          
          // Record asset metadata
          const { error: insErr } = await supabase.from("pokepedia_assets").upsert(
            {
              asset_kind: "sprite",
              resource_type: resource_type ?? null,
              resource_id: typeof resource_id === "number" ? resource_id : null,
              source_url,
              bucket,
              path,
              content_type: contentType,
              bytes: bytes.length,
              sha256: hash,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "source_url" }
          );
          
          if (insErr) throw new Error(`Asset upsert failed: ${insErr.message}`);
          
          // Update projection "known sprite" fields for quick UI
          if (resource_type === "pokemon" && typeof resource_id === "number") {
            const updates: any = { updated_at: new Date().toISOString() };
            
            if (path.includes("/other/official-artwork/") || path.includes("official-artwork")) {
              updates.sprite_official_artwork_path = path;
            } else if (
              path.match(/\/pokemon\/\d+\/pokemon\/\d+\.(png|gif|svg)$/i) || 
              path.includes("/pokemon/") && path.includes("front_default")
            ) {
              // Very broad; you can tighten this logic later for exact "front_default"
              updates.sprite_front_default_path = path;
            }
            
            // Only write if we have something meaningful to set
            if (updates.sprite_official_artwork_path || updates.sprite_front_default_path) {
              await supabase
                .from("pokepedia_pokemon")
                .update(updates)
                .eq("id", resource_id);
            }
          }
          
          console.log(`[Sprite Worker] Downloaded and stored: ${path}`);
        } else {
          console.log(`[Sprite Worker] Sprite already exists: ${path}`);
        }
        
        // Delete queue message after success
        const { error: delErr } = await supabase.rpc("pgmq_public.delete", {
          queue_name: QUEUE,
          message_id: messageId,
        });
        
        if (delErr) throw new Error(`Queue delete failed: ${delErr.message}`);
        
        processed.push({ messageId, source_url, bucket, path });
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error(`[Sprite Worker] Error processing ${source_url}:`, errorMsg);
        failed.push({ messageId, source_url, error: errorMsg });
      }
    });
    
    return new Response(
      JSON.stringify({ ok: true, processed, failed }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Sprite Worker] Fatal error:", error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error instanceof Error ? error.message : String(error) 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
