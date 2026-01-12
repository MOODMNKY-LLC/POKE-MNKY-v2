import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { hasGoogleSheetsCredentials } from "@/lib/utils/google-sheets"

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get latest config
    const { data: config, error } = await supabase
      .from("google_sheets_config")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found, which is fine
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get mappings if config exists
    let mappings = []
    if (config) {
      const { data: mappingData } = await supabase
        .from("sheet_mappings")
        .select("*")
        .eq("config_id", config.id)
        .order("sync_order")

      mappings = mappingData || []
    }

    return NextResponse.json({
      config: config || null,
      mappings,
      credentials_configured: hasGoogleSheetsCredentials(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch config" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { config, mappings } = body

    if (!config) {
      return NextResponse.json({ error: "Config is required" }, { status: 400 })
    }

    // Validate required fields
    if (!config.spreadsheet_id) {
      return NextResponse.json(
        { error: "Spreadsheet ID is required" },
        { status: 400 }
      )
    }

    // Check if credentials are configured via env vars
    if (!hasGoogleSheetsCredentials()) {
      return NextResponse.json(
        { error: "Google Sheets credentials not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY environment variables." },
        { status: 500 }
      )
    }

    let configId: string

    if (config.id) {
      // Update existing config (credentials come from env vars, not database)
      const { data, error } = await supabase
        .from("google_sheets_config")
        .update({
          spreadsheet_id: config.spreadsheet_id,
          enabled: config.enabled ?? true,
          sync_schedule: config.sync_schedule || "manual",
          updated_at: new Date().toISOString(),
        })
        .eq("id", config.id)
        .select()
        .single()

      if (error) throw error
      configId = data.id
    } else {
      // Create new config (credentials come from env vars, not database)
      const { data, error } = await supabase
        .from("google_sheets_config")
        .insert({
          spreadsheet_id: config.spreadsheet_id,
          enabled: config.enabled ?? true,
          sync_schedule: config.sync_schedule || "manual",
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error
      configId = data.id
    }

    // Save mappings if provided
    if (mappings && Array.isArray(mappings)) {
      // Delete existing mappings
      await supabase.from("sheet_mappings").delete().eq("config_id", configId)

      // Insert new mappings
      const mappingInserts = mappings.map((mapping: any) => ({
        config_id: configId,
        sheet_name: mapping.sheet_name,
        table_name: mapping.table_name,
        range: mapping.range || "A:Z",
        enabled: mapping.enabled ?? true,
        sync_order: mapping.sync_order || 0,
        column_mapping: mapping.column_mapping || {},
      }))

      const { error: mappingError } = await supabase.from("sheet_mappings").insert(mappingInserts)

      if (mappingError) {
        console.error("Error saving mappings:", mappingError)
        // Don't fail the whole request if mappings fail
      }
    }

    return NextResponse.json({
      success: true,
      config_id: configId,
      message: "Configuration saved successfully",
    })
  } catch (error) {
    console.error("Error saving config:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save configuration" },
      { status: 500 }
    )
  }
}
