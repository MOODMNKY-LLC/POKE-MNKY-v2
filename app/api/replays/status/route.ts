import { NextResponse } from "next/server"
import { isReplayIngestEnabled } from "@/lib/showdown/replay-ingest-flags"

/** Public flag for UI empty states — no secrets. */
export async function GET() {
  return NextResponse.json({
    enabled: isReplayIngestEnabled(),
    host: "replay.pokemonshowdown.com",
    visibility: "public_only",
    note: "Optional. No Showdown account required. Does not change standings or MVP.",
  })
}
