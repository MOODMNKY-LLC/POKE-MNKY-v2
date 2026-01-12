/**
 * API Route: Sync Pokepedia Data to Local IndexedDB
 * Called by client-side sync hook to store data locally
 */

import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    // This endpoint is a placeholder - actual local storage happens client-side
    // via the pokepedia-offline-db.ts module
    // This could be used for server-side validation or logging

    return NextResponse.json({
      success: true,
      message: "Local sync handled client-side",
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
