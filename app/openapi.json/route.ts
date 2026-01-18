/**
 * OpenAPI Spec Route
 * 
 * Serves the OpenAPI specification JSON.
 * Access at: /openapi.json
 */

import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

export const dynamic = "force-dynamic"

/**
 * GET /openapi.json
 * 
 * Serves the OpenAPI specification
 */
export async function GET() {
  try {
    const openApiPath = join(process.cwd(), "openapi.json")
    const openApiSpec = await readFile(openApiPath, "utf-8")
    const spec = JSON.parse(openApiSpec)

    return NextResponse.json(spec, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      },
    })
  } catch (error: any) {
    console.error("Error serving OpenAPI spec:", error)
    return NextResponse.json(
      { error: "Failed to load OpenAPI specification" },
      { status: 500 }
    )
  }
}
