/**
 * API Documentation Route
 * 
 * Serves interactive API documentation using Redoc.
 * Access at: /api-docs
 */

import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

export const dynamic = "force-dynamic"

/**
 * GET /api-docs
 * 
 * Serves Redoc HTML with OpenAPI spec embedded
 */
export async function GET(request: NextRequest) {
  try {
    // Read OpenAPI spec
    const openApiPath = join(process.cwd(), "openapi.json")
    const openApiSpec = await readFile(openApiPath, "utf-8")
    const spec = JSON.parse(openApiSpec)

    // Generate Redoc HTML
    const html = `<!DOCTYPE html>
<html>
  <head>
    <title>${spec.info.title} - API Documentation</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <style>
      body {
        margin: 0;
        padding: 0;
      }
    </style>
  </head>
  <body>
    <redoc spec-url="/openapi.json"></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  </body>
</html>`

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    })
  } catch (error: any) {
    console.error("Error serving API docs:", error)
    return NextResponse.json(
      { error: "Failed to load API documentation" },
      { status: 500 }
    )
  }
}
