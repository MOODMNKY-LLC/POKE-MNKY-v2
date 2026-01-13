import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getOpenAI } from "@/lib/openai-client"
import createClient from "openapi-fetch"
import type { paths } from "@/lib/management-api-schema"

const client = createClient<paths>({
  baseUrl: "https://api.supabase.com",
  headers: {
    Authorization: `Bearer ${process.env.SUPABASE_MANAGEMENT_API_TOKEN}`,
  },
})

// Function to get database schema
async function getDbSchema(projectRef: string) {
  const token = process.env.SUPABASE_MANAGEMENT_API_TOKEN
  if (!token) {
    throw new Error("Supabase Management API token is not configured.")
  }

  const sql = `
    SELECT 
      table_name,
      column_name,
      data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `

  const { data, error } = await client.POST("/v1/projects/{ref}/database/query", {
    params: {
      path: {
        ref: projectRef,
      },
    },
    body: {
      query: sql,
      read_only: true,
    },
  })

  if (error) {
    throw error
  }

  return data as any
}

function formatSchemaForPrompt(schema: any) {
  let schemaString = ""
  if (schema && Array.isArray(schema)) {
    const tables = new Map()

    schema.forEach((row: any) => {
      if (!tables.has(row.table_name)) {
        tables.set(row.table_name, [])
      }
      tables.get(row.table_name).push(`${row.column_name} (${row.data_type})`)
    })

    tables.forEach((columns, tableName) => {
      schemaString += `Table "${tableName}" has columns: ${columns.join(", ")}.\n`
    })
  }
  return schemaString
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { prompt, projectRef } = await request.json()

    if (!prompt) {
      return NextResponse.json({ message: "Prompt is required." }, { status: 400 })
    }

    // Extract and validate projectRef
    let ref = projectRef
    if (!ref || ref === "default" || ref === "") {
      // Fallback: extract from Supabase URL
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
      const isLocal = supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1")
      
      if (isLocal) {
        // For local development, Management API doesn't work
        // Check for explicit override
        ref = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF || ""
        if (!ref) {
          return NextResponse.json(
            {
              message: "Management API is not available for local Supabase. Set NEXT_PUBLIC_SUPABASE_PROJECT_REF to your production project ref to use AI SQL generation.",
              error: "Local development limitation"
            },
            { status: 400 }
          )
        }
      } else {
        // Extract from production URL
        ref = supabaseUrl.split("//")[1]?.split(".")[0] || ""
      }
    }

    if (!ref || ref === "") {
      return NextResponse.json(
        { 
          message: "Project reference is required. Check NEXT_PUBLIC_SUPABASE_URL or provide projectRef.",
          error: "Invalid project reference"
        },
        { status: 400 }
      )
    }

    // Skip format validation for "local" (local development marker)
    if (ref !== "local") {
      // Validate projectRef format (should be alphanumeric with hyphens, no dots)
      if (!/^[a-z0-9-]+$/.test(ref)) {
        return NextResponse.json(
          {
            message: `Invalid project reference format: "${ref}". Project ref should be alphanumeric with hyphens.`,
            error: "Invalid project reference format"
          },
          { status: 400 }
        )
      }
    }

    // Get database schema
    const schema = await getDbSchema(ref)
    const schemaString = formatSchemaForPrompt(schema)

    const openai = getOpenAI()

    // Generate SQL using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `You are a SQL expert. Generate safe, read-only SQL queries based on the user's request. Here is the database schema:\n\n${schemaString}\n\nOnly return the SQL query, nothing else.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
    })

    let sqlQuery = completion.choices[0]?.message?.content?.trim() || ""

    // Clean SQL from markdown code blocks if present
    // Remove ```sql or ``` at start/end
    sqlQuery = sqlQuery.replace(/^```(?:sql)?\s*/i, "").replace(/\s*```$/i, "").trim()

    return NextResponse.json({ sql: sqlQuery })
  } catch (error: any) {
    console.error("[v0] AI SQL generation error:", error)
    return NextResponse.json({ error: error.message || "Failed to generate SQL" }, { status: 500 })
  }
}
