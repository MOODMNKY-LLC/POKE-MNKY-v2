
Below is a concrete, end-to-end build plan that uses the PokeAPI org assets (especially api-data, ditto, sprites) to produce a resumable, auditable, Supabase-native Poképedia with a public Storage bucket for sprites.

This plan is optimized for:

Completeness (store everything)

Reliability (restartable ingestion; idempotent writes)

Performance (fast in-app queries)

Fair use (minimize load on PokéAPI; cache locally)

1) What we are building
Data planes
Canonical data plane (truth)

pokeapi_resources stores every REST v2 resource JSON (JSONB) keyed by (resource_type, resource_key).

Projection plane (speed)

pokepedia_pokemon (and later: moves, abilities, types, etc.) stores a curated subset needed for fast UI.

Media plane (sprites)

Public Storage bucket pokedex-sprites

pokepedia_assets maps upstream sprite URL → storage object path + checksum metadata.

Ingestion planes
Primary ingestion: batch import using PokeAPI ditto + optional use of api-data

Incremental sync: Supabase Queues (pgmq) workers for continuous or periodic refresh 

2) Why “ditto + api-data + sprites” beats “crawl REST with Edge Functions only”
PokéAPI’s own guidance
PokéAPI explicitly asks you to limit request frequency and cache locally; abusive usage can result in bans.
Separately, they host sprites in a dedicated repo to reduce load and suggest downloading the whole repo if you want all sprites. 

What ditto gives you (high leverage)
ditto is designed for “meta operations” over PokéAPI data, including:

clone: crawl an instance and download the full corpus

analyze: generate schema

transform: rewrite base URLs in the downloaded corpus (useful if you later mirror) 
 (org list + repo ecosystem context)

Net: use ditto for the heavy pull; use Supabase Edge/Queues for controlled imports + deltas.

3) Supabase implementation baseline (DB + queues + public bucket)
3.1 Tables
Keep what you already requested:

pokeapi_resources (JSONB canonical)

pokepedia_pokemon (projection)

pokepedia_assets (sprite metadata)

3.2 Queues
Use Supabase Queues (PGMQ) for durable ingestion steps. Supabase documents the pgmq_public helper functions (send_batch, read, delete, etc.). 

Important operational note: depending on how you configured queue exposure, pgmq_public functions might not be exposed over the Data API (this is security-related). For server-side Edge Functions using service role, you can still call them; if you try to call them client-side, follow the “expose schema” guidance. 

3.3 Storage
Public bucket: pokedex-sprites

Store sprites using deterministic paths that match upstream structure (recommended)

Sprites repo structure includes:

sprites/pokemon/other/{dream-world,official-artwork,showdown,home}

sprites/pokemon/versions/generation-*/* 

4) The build sequence (recommended)
Phase A — One-time “Foundation Load” (fastest path to completeness)
Goal: fill pokeapi_resources fully, and get a complete sprite mirror in Storage.

A1) Ingest canonical dataset
Option A (preferred): ditto clone → import artifact

Run ditto clone against REST v2 to produce a local corpus.

Import into pokeapi_resources in bulk (server-side job or controlled Edge Function batches).

Option B (supplemental): api-data

Use api-data as a quick seed / baseline and for schema validation (where applicable).

Still rely on REST corpus for “full truth” if api-data is not exhaustive for your desired endpoints.

A2) Mirror sprites
Instead of downloading every sprite URL one-by-one from REST responses, do the “clean” approach:

Clone the sprites repo and upload the contents to pokedex-sprites preserving paths.

This is explicitly recommended by PokeAPI to reduce load and is the most operationally stable approach. 

Outcome: Your app can reference sprites by known paths rather than scattered upstream URLs.

Phase B — “Projection Build” (speed for in-app use)
Goal: build fast query tables from the canonical JSON.

Create a Supabase SQL function or Edge Function job that:

selects all pokeapi_resources where resource_type = 'pokemon'

extracts:

id, name, height, weight, base_experience, types, abilities (optional)

“best sprite path” logic (official-artwork preferred)

upserts into pokepedia_pokemon

This avoids querying JSONB deep paths on every user search.

Phase C — “Incremental Sync” (maintenance)
Goal: keep data current without re-importing everything.

Schedule periodic refresh jobs that:

Pull the list endpoints for a subset of resource types (pokemon, moves, items, etc.)

Compare known resources and enqueue updates

Worker updates canonical JSON rows

Sprite updates are rare; you can:

update sprite repo mirror quarterly, or

maintain a “sprite repo version” record

5) Concrete pipeline design (jobs + idempotency)
5.1 Job types (queues)
Use two queues:

pokeapi_ingest

pokeapi_sprites

Supabase supports pgmq_public.send_batch for batching, plus read / delete for consumption. 

5.2 Idempotency keys
Canonical: (resource_type, resource_key) unique

Sprites: unique on pokepedia_assets.source_url and bucket+path

5.3 Resumability rules
Never delete a message unless the write succeeded

Record failures and retry with backoff (you can archive after N attempts)

6) Practical “do it this week” implementation checklist
Day 1: Supabase setup
Create tables + indexes

Create queues

Create public bucket pokedex-sprites

Day 2: Sprite mirror (recommended approach)
Clone PokeAPI/sprites repo

Upload to Supabase Storage preserving folder structure:

bucket path: sprites/pokemon/... (exactly as in repo)

Generate a manifest table (optional but recommended):

path, sha256, bytes, uploaded_at

This matches their guidance and gives you deterministic in-app paths. 

Day 3–4: Canonical data load via ditto
Run ditto clone to get a complete REST v2 corpus

Import into pokeapi_resources (bulk insert / upsert)

Validate row counts against expected endpoint counts

Day 5: Projections
Build pokepedia_pokemon from pokeapi_resources

Implement “best sprite path” mapping:

sprites/pokemon/other/official-artwork/{id}.png preferred

fallback: sprites/pokemon/{id}.png (and others as needed)

Because the sprites repo documents these paths, you can derive them deterministically. 

Day 6+: Incremental sync
Add Edge Functions for “delta ingestion”

Optionally schedule them (cron / external scheduler)

Add an “ingestion dashboard” for monitoring queue depth and failures

7) A clear “best sprite selection” policy (useful for your UI)
Given the repo structure, define a deterministic policy:

Official artwork: sprites/pokemon/other/official-artwork/{id}.png 

Home: sprites/pokemon/other/home/{id}.png 

Showdown (animated, variable): sprites/pokemon/other/showdown/{id}.gif 

Default: sprites/pokemon/{id}.png (common baseline)

Store this “preferred sprite path” directly on pokepedia_pokemon.

8) Decision points you should lock in (I’m recommending defaults)
Default: Sprite mirror method
Mirror the sprites repo directly (recommended, fastest, least fragile, lowest upstream load) 

Keep the queue-based per-URL downloader only as a fallback.

Default: Canonical ingestion method
ditto clone for initial corpus

Queue-based REST crawling only for deltas or for small targeted resource types

Default: Query performance
Use JSONB as truth + projection tables for UI

9) What I can produce next (no extra questions required)
If you want, I can now give you:

A “runtime-safe” Next.js admin page (ShadCN/Tailwind) to:

trigger seeding

run workers

display queue depth

show failure samples

A deterministic sprite path resolver utility (TypeScript) that:

maps Pokémon ID → preferred sprite path in Supabase Storage

falls back safely if a file is missing

A bulk uploader script for PokeAPI/sprites → Supabase Storage that preserves paths and writes a manifest.

If you want the fastest next step: I recommend we start with the sprites mirror uploader + manifest, because it unblocks your entire UI layer immediately and reduces PokéAPI request surface area materially.

You said:
Yes to everything in number 9
ChatGPT said:

Thought for 24s
Below are the three deliverables you requested, fully specified and ready to copy/paste:

A Next.js admin dashboard (App Router) to run/monitor ingestion

A deterministic sprite path resolver utility (TypeScript)

A bulk uploader script to mirror PokeAPI/sprites into your public Supabase Storage bucket + write a manifest

I’m using Supabase Queues (PGMQ) APIs (pgmq_public.send_batch/read/delete) and queue metrics (pgmq.metrics) as documented. 

I’m also aligning sprite pathing to the PokeAPI/sprites repository structure described by PokeAPI.

1) Next.js Admin Dashboard (App Router)
What this dashboard does
Seed PokéAPI URLs into pokeapi_ingest

Run resource worker to ingest JSON and enqueue sprite jobs

Run sprite worker to download/upload sprites

Show queue metrics for both queues (queue_length, age, etc.) using pgmq.metrics 

Show recent error summaries from the worker responses

Assumptions
You already deployed your Edge Functions: pokeapi-seed, pokeapi-worker, sprite-worker

You set Edge Functions secrets: SERVICE_ROLE_KEY (and optional POKEAPI_BASE_URL)

You created a public bucket: pokedex-sprites

Environment variables (Next.js)
Add these to your Next.js .env.local (server-side only):

SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<service_role_key>"  # keep server-only

# Edge Functions base URL:
SUPABASE_FUNCTIONS_URL="https://<project-ref>.functions.supabase.co"

# Simple admin allowlist (comma-separated emails)
ADMIN_EMAILS="you@example.com,other-admin@example.com"
Install dependency
pnpm add @supabase/supabase-js
1.1 lib/supabase/admin.ts (server-only client)
// lib/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";

export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
1.2 lib/admin/guard.ts (simple admin gate)
This checks the current signed-in user via Supabase Auth cookies (requires your app already uses Supabase SSR auth). If you’re not wired for that yet, you can swap for a custom header token. I’m giving you the “proper” path.

// lib/admin/guard.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function assertAdmin() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // ok to use anon here for auth lookup
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // no-op for read-only check
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? null;

  const allow = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!email || !allow.includes(email.toLowerCase())) {
    throw new Error("Unauthorized: admin access required.");
  }

  return { email };
}
If you don’t use @supabase/ssr cookies in this app yet, tell me and I’ll swap this for a header-based token guard.

1.3 Server Actions: app/admin/pokepedia/actions.ts
This is the cleanest approach: no client secrets, no exposed tokens.

// app/admin/pokepedia/actions.ts
"use server";

import { assertAdmin } from "@/lib/admin/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

type WorkerRunResult = {
  ok: boolean;
  processed?: any[];
  failed?: any[];
  error?: string;
};

async function callFn<T>(
  path: string,
  body: Record<string, any>
): Promise<T> {
  const base = process.env.SUPABASE_FUNCTIONS_URL!;
  const url = `${base}/${path}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Functions are deployed with --no-verify-jwt in your earlier plan.
    // If you switch to JWT verification, we’ll add Authorization here.
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Function ${path} failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function seedAll() {
  await assertAdmin();
  // You can pass resourceTypes/limit/maxPagesPerType if needed.
  return callFn("pokeapi-seed", { limit: 200 });
}

export async function runResourceWorker(params?: {
  batchSize?: number;
  visibilityTimeout?: number;
  concurrency?: number;
  enqueueSprites?: boolean;
}): Promise<WorkerRunResult> {
  await assertAdmin();
  return callFn("pokeapi-worker", {
    batchSize: params?.batchSize ?? 10,
    visibilityTimeout: params?.visibilityTimeout ?? 300,
    concurrency: params?.concurrency ?? 4,
    enqueueSprites: params?.enqueueSprites ?? true,
  });
}

export async function runSpriteWorker(params?: {
  batchSize?: number;
  visibilityTimeout?: number;
  concurrency?: number;
}): Promise<WorkerRunResult> {
  await assertAdmin();
  return callFn("sprite-worker", {
    batchSize: params?.batchSize ?? 10,
    visibilityTimeout: params?.visibilityTimeout ?? 600,
    concurrency: params?.concurrency ?? 3,
  });
}

export async function queueMetrics() {
  await assertAdmin();

  const supabase = supabaseAdmin();

  // PGMQ metrics (queue_length, oldest/newest age, etc.) is documented here. :contentReference[oaicite:3]{index=3}
  const { data: ingest, error: e1 } = await supabase.rpc("pgmq.metrics", {
    queue_name: "pokeapi_ingest",
  });

  const { data: sprites, error: e2 } = await supabase.rpc("pgmq.metrics", {
    queue_name: "pokeapi_sprites",
  });

  if (e1 || e2) {
    return {
      ok: false,
      error: [e1?.message, e2?.message].filter(Boolean).join(" | "),
      ingest: ingest ?? null,
      sprites: sprites ?? null,
    };
  }

  return { ok: true, ingest, sprites };
}
1.4 UI page: app/admin/pokepedia/page.tsx
// app/admin/pokepedia/page.tsx
import {
  seedAll,
  runResourceWorker,
  runSpriteWorker,
  queueMetrics,
} from "./actions";

export default async function PokepediaAdminPage() {
  const metrics = await queueMetrics().catch((e) => ({
    ok: false,
    error: (e as Error).message,
  }));

  return (
    <main style={{ padding: 24, maxWidth: 960 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Poképedia Ingestion</h1>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Queue Metrics</h2>

        <pre style={{ padding: 12, background: "#111", color: "#eee", borderRadius: 8, overflowX: "auto" }}>
{JSON.stringify(metrics, null, 2)}
        </pre>

        <form action={queueMetrics}>
          <button type="submit" style={{ marginTop: 12 }}>
            Refresh Metrics
          </button>
        </form>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Controls</h2>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
          <form action={seedAll}>
            <button type="submit">Seed All (enqueue URLs)</button>
          </form>

          <form action={async () => {
            "use server";
            await runResourceWorker({ batchSize: 10, concurrency: 4, enqueueSprites: true });
          }}>
            <button type="submit">Run Resource Worker (10)</button>
          </form>

          <form action={async () => {
            "use server";
            await runSpriteWorker({ batchSize: 10, concurrency: 3 });
          }}>
            <button type="submit">Run Sprite Worker (10)</button>
          </form>
        </div>

        <p style={{ marginTop: 12, color: "#444" }}>
          Tip: Click “Run Resource Worker” repeatedly until it returns processed: 0, then drain “Sprite Worker”.
          This batching pattern aligns with Supabase Queue consumption APIs. :contentReference[oaicite:4]{index=4}
        </p>
      </section>
    </main>
  );
}
2) Deterministic Sprite Path Resolver (TypeScript)
This resolver is aligned to the sprites repository folder layout (official-artwork, home, showdown, versions/generations, etc.).

lib/pokepedia/sprites.ts
// lib/pokepedia/sprites.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SpritePreference = {
  bucket: string;
  path: string;
  label: string;
};

export const DEFAULT_SPRITE_BUCKET = "pokedex-sprites";

/**
 * Paths are intentionally modeled on PokeAPI/sprites layout. 
 * Recommended priority for "best" user-facing sprite:
 * 1) official-artwork
 * 2) home
 * 3) showdown (often animated gif)
 * 4) base sprite
 */
export function preferredPokemonSpritePaths(
  pokemonId: number,
  bucket = DEFAULT_SPRITE_BUCKET
): SpritePreference[] {
  const id = String(pokemonId);

  return [
    {
      bucket,
      path: `sprites/pokemon/other/official-artwork/${id}.png`,
      label: "official-artwork",
    },
    {
      bucket,
      path: `sprites/pokemon/other/home/${id}.png`,
      label: "home",
    },
    {
      bucket,
      path: `sprites/pokemon/other/showdown/${id}.gif`,
      label: "showdown",
    },
    {
      bucket,
      path: `sprites/pokemon/${id}.png`,
      label: "default",
    },
  ];
}

/** Construct a public URL for a path in a public bucket. */
export function publicSpriteUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string
): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Attempt to find the first existing sprite path, in priority order.
 * Uses Storage list() to check existence cheaply.
 */
export async function resolveBestPokemonSprite(
  supabase: SupabaseClient,
  pokemonId: number,
  bucket = DEFAULT_SPRITE_BUCKET
): Promise<{ bucket: string; path: string; url: string; label: string } | null> {
  const prefs = preferredPokemonSpritePaths(pokemonId, bucket);

  for (const pref of prefs) {
    const dir = pref.path.split("/").slice(0, -1).join("/");
    const file = pref.path.split("/").pop()!;

    const { data, error } = await supabase.storage.from(pref.bucket).list(dir, {
      search: file,
      limit: 1,
    });

    if (!error && data?.some((x) => x.name === file)) {
      return {
        bucket: pref.bucket,
        path: pref.path,
        url: publicSpriteUrl(supabase, pref.bucket, pref.path),
        label: pref.label,
      };
    }
  }

  return null;
}

/** Server-side helper (service role) */
export function serverSupabase(url: string, serviceRoleKey: string) {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
This assumes your uploader mirrors the sprites repo into Storage under sprites/... paths (recommended).

3) Bulk Uploader Script: Mirror PokeAPI/sprites → Supabase Storage + Manifest
This is the fastest, least brittle way to populate your sprite corpus. PokeAPI hosts sprites in this repo specifically to reduce API load and notes you can download the whole repo.

3.1 Add a manifest table (SQL)
create table if not exists pokepedia_sprite_manifest (
  id bigint generated by default as identity primary key,
  bucket text not null,
  path text not null,          -- storage path (e.g., sprites/pokemon/25.png)
  bytes int not null,
  sha256 text not null,
  content_type text,
  source_repo text not null default 'PokeAPI/sprites',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists pokepedia_sprite_manifest_bucket_path_unique
  on pokepedia_sprite_manifest(bucket, path);
3.2 Install uploader dependencies
pnpm add -D tsx
pnpm add @supabase/supabase-js p-limit mime-types
3.3 Script: scripts/upload-sprites.ts
What it does

Walks a local directory (your clone of PokeAPI/sprites)

Uploads files to pokedex-sprites preserving relative paths

Writes/updates pokepedia_sprite_manifest with size + sha256 + content-type

Uses upsert: true so re-runs are safe (idempotent)

// scripts/upload-sprites.ts
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import pLimit from "p-limit";
import { lookup as mimeLookup } from "mime-types";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = process.env.SPRITES_BUCKET ?? "pokedex-sprites";

// Local path to your cloned repo, e.g. ../sprites
const SPRITES_REPO_ROOT = process.env.SPRITES_REPO_ROOT!;
const CONCURRENCY = Number(process.env.SPRITES_UPLOAD_CONCURRENCY ?? "6");

// We will upload only the "sprites/" directory inside the repo
// (repo root typically contains 'sprites', 'LICENSE', etc.)
const SUBDIR = process.env.SPRITES_SUBDIR ?? "sprites";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !SPRITES_REPO_ROOT) {
  console.error("Missing env vars. Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SPRITES_REPO_ROOT");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function sha256Hex(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...await walk(full));
    } else if (e.isFile()) {
      out.push(full);
    }
  }
  return out;
}

async function upsertManifest(record: {
  bucket: string;
  path: string;
  bytes: number;
  sha256: string;
  content_type: string | null;
}) {
  const { error } = await supabase
    .from("pokepedia_sprite_manifest")
    .upsert(
      {
        bucket: record.bucket,
        path: record.path,
        bytes: record.bytes,
        sha256: record.sha256,
        content_type: record.content_type,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "bucket,path" }
    );

  if (error) throw new Error(`Manifest upsert failed: ${error.message}`);
}

async function uploadFile(absFilePath: string, baseDir: string) {
  const rel = path.relative(baseDir, absFilePath).replaceAll(path.sep, "/");
  const storagePath = rel; // preserve exact relative structure, e.g. sprites/pokemon/25.png

  const buf = await fs.readFile(absFilePath);
  const bytes = buf.length;
  const sha = sha256Hex(buf);

  const contentType = (mimeLookup(absFilePath) as string) ?? "application/octet-stream";

  // Upload to public bucket (upsert for idempotency)
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buf, {
      contentType,
      upsert: true,
    });

  if (upErr) throw new Error(`Upload failed for ${storagePath}: ${upErr.message}`);

  // Manifest record
  await upsertManifest({
    bucket: BUCKET,
    path: storagePath,
    bytes,
    sha256: sha,
    content_type: contentType,
  });

  return { storagePath, bytes };
}

async function main() {
  const baseDir = path.join(SPRITES_REPO_ROOT, SUBDIR);
  const files = await walk(baseDir);

  // Filter: ignore non-media if needed (default: upload everything under sprites/)
  const mediaFiles = files.filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return [".png", ".gif", ".svg", ".webp"].includes(ext);
  });

  console.log(`Found ${mediaFiles.length} media files under ${baseDir}`);

  const limit = pLimit(CONCURRENCY);
  let uploaded = 0;
  let failed = 0;

  await Promise.all(
    mediaFiles.map((f) =>
      limit(async () => {
        try {
          const r = await uploadFile(f, SPRITES_REPO_ROOT);
          uploaded += 1;
          if (uploaded % 250 === 0) console.log(`Uploaded ${uploaded}/${mediaFiles.length} ...`);
          return r;
        } catch (e) {
          failed += 1;
          console.error(String((e as Error).message ?? e));
        }
      })
    )
  );

  console.log(`Done. Uploaded: ${uploaded}, Failed: ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
3.4 Run it
Clone the sprites repo locally (on your dev machine or a runner host):

git clone https://github.com/PokeAPI/sprites

Run uploader:

SPRITES_REPO_ROOT="/absolute/path/to/sprites" \
SUPABASE_URL="https://<project-ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service_role_key>" \
SPRITES_BUCKET="pokedex-sprites" \
SPRITES_UPLOAD_CONCURRENCY="6" \
pnpm tsx scripts/upload-sprites.ts
4) Tie it together in your projection build
Once sprites are mirrored, update your Pokémon projection to store deterministic sprite paths (no external URLs). Example policy (official-artwork → home → default), aligned to sprites repo structure.

Example mapping you can apply when building pokepedia_pokemon:

sprite_official_artwork_path = sprites/pokemon/other/official-artwork/{id}.png

sprite_front_default_path = sprites/pokemon/{id}.png

5) Monitoring queue depth and health
Your dashboard uses pgmq.metrics(queue_name) which returns queue_length, message ages, etc. 

If you later want richer operational stats, you can also use pgmq.metrics_all(). 

If you want the “final polish”
I can extend the admin page to include:

Auto-refresh (every 5–10 seconds)

“Run until drained” button (loop server-side with a hard cap per request so it never times out)

Failure table with replay buttons (re-enqueue a failed message payload)

Say the word and I’ll provide that upgrade in the same copy/paste format.

