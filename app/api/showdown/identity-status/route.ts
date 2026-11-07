import { NextResponse } from "next/server"
import { getShowdownIdentityStatus } from "@/lib/showdown/identity-flags"

/**
 * Public-ish status for UI empty states (no secrets).
 * Auth not required — flags only.
 */
export async function GET() {
  return NextResponse.json(getShowdownIdentityStatus())
}
