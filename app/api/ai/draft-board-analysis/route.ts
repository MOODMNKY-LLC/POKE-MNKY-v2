/**
 * POST /api/ai/draft-board-analysis
 * AI-powered analysis of the draft pool: balance, tiers, curation, point value audit.
 * Auth: admin or commissioner.
 * Body: { seasonId?: string, analysisType?: 'balance' | 'tiers' | 'curation' | 'full' }
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { getOpenAI, AI_MODELS } from "@/lib/openai-client"

const DRAFT_BOARD_ANALYSIS_SCHEMA = {
  type: "object" as const,
  properties: {
    summary: { type: "string", description: "Executive summary of the draft pool" },
    balanceFindings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          pokemon_name: { type: "string" },
          point_value: { type: "number" },
          assessment: { type: "string", enum: ["overvalued", "undervalued", "fair"] },
          reasoning: { type: "string" },
        },
        required: ["pokemon_name", "point_value", "assessment", "reasoning"],
      },
    },
    tierSuggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          tier: { type: "string", enum: ["S", "A", "B", "C"] },
          pokemon: { type: "array", items: { type: "string" } },
          rationale: { type: "string" },
        },
        required: ["tier", "pokemon", "rationale"],
      },
    },
    curationRecommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["consider_adding", "consider_removing", "consider_point_adjustment"] },
          pokemon_name: { type: "string" },
          suggestion: { type: "string" },
        },
        required: ["action", "pokemon_name", "suggestion"],
      },
    },
    pointValueAudit: {
      type: "array",
      items: {
        type: "object",
        properties: {
          pokemon_name: { type: "string" },
          current_point_value: { type: "number" },
          suggested_point_value: { type: "number" },
          reasoning: { type: "string" },
        },
        required: ["pokemon_name", "current_point_value", "suggested_point_value", "reasoning"],
      },
    },
  },
  required: ["summary", "balanceFindings", "tierSuggestions", "curationRecommendations", "pointValueAudit"],
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const serviceSupabase = createServiceRoleClient()
    const { data: profile, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("role, discord_roles")
      .eq("id", user.id)
      .single()

    if (profileError && profileError.code !== "PGRST116") {
      console.error("[draft-board-analysis] Profile lookup error:", profileError)
    }

    const isAdminByRole = profile?.role === "admin" || profile?.role === "commissioner"
    const discordRoles = (profile?.discord_roles as Array<{ name?: string }> | null) ?? []
    const isAdminByDiscord =
      Array.isArray(discordRoles) &&
      discordRoles.some((r) => r?.name === "Admin" || r?.name === "Commissioner")

    if (!isAdminByRole && !isAdminByDiscord) {
      return NextResponse.json(
        {
          error: "Forbidden - Admin or Commissioner required",
          hint: !profile
            ? "Profile not found. Ensure you have a profile row and role set in Admin → Users."
            : undefined,
        },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const seasonId = body.seasonId as string | undefined
    const analysisType = (body.analysisType as "balance" | "tiers" | "curation" | "full") || "full"

    // Resolve season: use provided seasonId or current season
    let targetSeasonId: string
    if (seasonId) {
      const { data: season, error: seasonError } = await serviceSupabase
        .from("seasons")
        .select("id")
        .eq("id", seasonId)
        .single()
      if (seasonError || !season) {
        return NextResponse.json({ error: "Season not found" }, { status: 404 })
      }
      targetSeasonId = season.id
    } else {
      const { data: currentSeason, error: currentError } = await serviceSupabase
        .from("seasons")
        .select("id")
        .eq("is_current", true)
        .single()
      if (currentError || !currentSeason) {
        return NextResponse.json(
          { error: "No current season. Create or set a current season." },
          { status: 400 }
        )
      }
      targetSeasonId = currentSeason.id
    }

    // Fetch draft pool (prefer draft_pool_enriched for types; fallback to draft_pool)
    let rows: Array<Record<string, unknown>> = []
    const { data: poolRows, error: poolError } = await serviceSupabase
      .from("draft_pool_enriched")
      .select("pokemon_name, point_value, status, tera_captain_eligible, generation, types")
      .eq("season_id", targetSeasonId)
      .order("point_value", { ascending: false })
      .limit(200)

    if (!poolError && poolRows?.length) {
      rows = poolRows as Array<Record<string, unknown>>
    } else {
      const { data: fallbackRows, error: fallbackError } = await serviceSupabase
        .from("draft_pool")
        .select("pokemon_name, point_value, status, tera_captain_eligible, generation")
        .eq("season_id", targetSeasonId)
        .order("point_value", { ascending: false })
        .limit(200)

      if (fallbackError || !fallbackRows?.length) {
        return NextResponse.json(
          { error: "Draft pool empty or unavailable for this season." },
          { status: 404 }
        )
      }
      rows = fallbackRows as Array<Record<string, unknown>>
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Draft pool is empty for this season." },
        { status: 404 }
      )
    }

    const poolSummary = rows.map((r: Record<string, unknown>) => ({
      pokemon_name: r.pokemon_name,
      point_value: r.point_value,
      status: r.status,
      tera_captain_eligible: r.tera_captain_eligible,
      generation: r.generation,
      types: (r as { types?: string[] }).types,
    }))

    const focusPrompt =
      analysisType === "balance"
        ? "Focus primarily on balance findings (over/undervalued Pokémon)."
        : analysisType === "tiers"
          ? "Focus primarily on tier suggestions (S/A/B/C groupings)."
          : analysisType === "curation"
            ? "Focus primarily on curation recommendations (add/remove/adjust)."
            : "Provide a comprehensive analysis covering all areas."

    const systemPrompt = `You are an expert Pokémon draft league commissioner for the Average at Best Battle League. Analyze the draft pool data provided and produce structured insights. Use ONLY the Pokémon and data provided—do not invent or hallucinate Pokémon. Point values range from 2–20; higher = more valuable. ${focusPrompt}

League context: Gen 9 OU-style draft league; 120-point budget per team; 8–10 Pokémon per roster; Tera Captains have special eligibility.`

    const userPrompt = `Analyze this draft pool (${rows.length} Pokémon):

\`\`\`json
${JSON.stringify(poolSummary, null, 2)}
\`\`\`

Provide: summary, balanceFindings (top 5–10 notable over/undervalued), tierSuggestions (S/A/B/C groupings), curationRecommendations (add/remove/adjust), pointValueAudit (top 5–10 suggested point changes). Be specific and cite the data.`

    const openai = getOpenAI()

    const model = AI_MODELS.DRAFT_BOARD_ANALYSIS
    const createParams: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "draft_board_analysis",
          schema: DRAFT_BOARD_ANALYSIS_SCHEMA,
          strict: true,
        },
      },
      max_tokens: 4096,
    }

    // Add reasoning for GPT-5.2 (supported in Chat Completions for reasoning models)
    if (model.includes("gpt-5") || model.includes("o3") || model.includes("o4")) {
      ;(createParams as Record<string, unknown>).reasoning = { effort: "medium" as const }
    }

    const response = await openai.chat.completions.create(
      createParams as Parameters<typeof openai.chat.completions.create>[0]
    )

    const content = response.choices?.[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: "No analysis generated" },
        { status: 500 }
      )
    }

    const analysis = JSON.parse(content) as {
      summary: string
      balanceFindings: Array<{ pokemon_name: string; point_value: number; assessment: string; reasoning: string }>
      tierSuggestions: Array<{ tier: string; pokemon: string[]; rationale: string }>
      curationRecommendations: Array<{ action: string; pokemon_name: string; suggestion: string }>
      pointValueAudit: Array<{
        pokemon_name: string
        current_point_value: number
        suggested_point_value: number
        reasoning: string
      }>
    }

    return NextResponse.json({
      success: true,
      seasonId: targetSeasonId,
      analysisType,
      poolSize: rows.length,
      analysis,
    })
  } catch (err) {
    console.error("[draft-board-analysis]", err)
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Draft board analysis failed",
      },
      { status: 500 }
    )
  }
}
