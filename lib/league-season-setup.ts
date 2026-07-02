/**
 * In-app season shell + league team slot generation (canonical teams table).
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import {
  computeAllTeamSlotPlacements,
  computeTeamSlotPlacement,
  defaultTeamSlotName,
  type SeasonLeagueStructure,
} from "@/lib/league-structure"

export type CreateSeasonInput = {
  name: string
  startDate: string
  endDate?: string | null
  setAsCurrent?: boolean
  conferenceCount?: number
  divisionCount?: number
  teamSlotCount?: number
  generateTeams?: boolean
  conferenceNames?: string[]
  divisionNames?: string[]
}

export type GenerateTeamsResult = {
  conferencesCreated: number
  divisionsCreated: number
  teamsCreated: number
  teamsSkipped: number
}

type ConferenceRow = { id: string; conference_number: number; name: string }
type DivisionRow = { id: string; division_number: number; conference_id: string; name: string }

async function upsertCanonicalLeagueConfig(
  supabase: SupabaseClient,
  seasonId: string,
  structure: SeasonLeagueStructure
) {
  const { data: existing } = await supabase
    .from("canonical_league_config")
    .select("id")
    .eq("season_id", seasonId)
    .eq("is_active", true)
    .maybeSingle()

  const payload = {
    season_id: seasonId,
    team_count: structure.teamSlotCount,
    conference_count: structure.conferenceCount,
    division_count: structure.divisionCount,
    is_active: true,
  }

  if (existing?.id) {
    await supabase.from("canonical_league_config").update(payload).eq("id", existing.id)
  } else {
    await supabase.from("canonical_league_config").insert(payload)
  }
}

async function ensureConferencesAndDivisions(
  supabase: SupabaseClient,
  seasonId: string,
  structure: SeasonLeagueStructure,
  conferenceNames?: string[],
  divisionNames?: string[]
): Promise<{ conferences: ConferenceRow[]; divisions: DivisionRow[]; conferencesCreated: number; divisionsCreated: number }> {
  const conferences: ConferenceRow[] = []
  const divisions: DivisionRow[] = []
  let conferencesCreated = 0
  let divisionsCreated = 0

  for (let c = 1; c <= structure.conferenceCount; c++) {
    const name = conferenceNames?.[c - 1] ?? `Conference ${c}`

    const { data: existing } = await supabase
      .from("conferences")
      .select("id, conference_number, name")
      .eq("season_id", seasonId)
      .eq("conference_number", c)
      .maybeSingle()

    let conferenceId = existing?.id
    if (!conferenceId) {
      const { data: inserted, error } = await supabase
        .from("conferences")
        .insert({
          season_id: seasonId,
          name,
          conference_number: c,
        })
        .select("id, conference_number, name")
        .single()

      if (error || !inserted) {
        throw new Error(error?.message ?? `Failed to create conference ${c}`)
      }
      conferenceId = inserted.id
      conferencesCreated++
      conferences.push(inserted as ConferenceRow)
    } else {
      await supabase.from("conferences").update({ name }).eq("id", conferenceId)
      conferences.push(existing as ConferenceRow)
    }

    for (let d = 1; d <= structure.divisionCount; d++) {
      const divName = divisionNames?.[d - 1] ?? `Division ${d}`

      const { data: existingDiv } = await supabase
        .from("divisions")
        .select("id, division_number, conference_id, name")
        .eq("season_id", seasonId)
        .eq("conference_id", conferenceId)
        .eq("division_number", d)
        .maybeSingle()

      if (existingDiv?.id) {
        await supabase.from("divisions").update({ name: divName }).eq("id", existingDiv.id)
        divisions.push(existingDiv as DivisionRow)
        continue
      }

      const { data: insertedDiv, error: divError } = await supabase
        .from("divisions")
        .insert({
          season_id: seasonId,
          conference_id: conferenceId,
          name: divName,
          division_number: d,
        })
        .select("id, division_number, conference_id, name")
        .single()

      if (divError || !insertedDiv) {
        throw new Error(divError?.message ?? `Failed to create division ${d}`)
      }
      divisionsCreated++
      divisions.push(insertedDiv as DivisionRow)
    }
  }

  return { conferences, divisions, conferencesCreated, divisionsCreated }
}

function findDivisionId(
  divisions: DivisionRow[],
  conferenceNumber: number,
  divisionNumber: number,
  conferences: ConferenceRow[]
): string | null {
  const conference = conferences.find((c) => c.conference_number === conferenceNumber)
  if (!conference) return null
  const division = divisions.find(
    (d) => d.conference_id === conference.id && d.division_number === divisionNumber
  )
  return division?.id ?? null
}

export async function createSeasonWithStructure(
  supabase: SupabaseClient,
  input: CreateSeasonInput
) {
  const conferenceCount = input.conferenceCount ?? 2
  const divisionCount = input.divisionCount ?? 4
  const teamSlotCount = input.teamSlotCount ?? 12

  if (input.setAsCurrent) {
    await supabase.from("seasons").update({ is_current: false }).eq("is_current", true)
  }

  const { data: season, error } = await supabase
    .from("seasons")
    .insert({
      name: input.name.trim(),
      start_date: input.startDate,
      end_date: input.endDate || null,
      is_current: Boolean(input.setAsCurrent),
      conference_count: conferenceCount,
      division_count: divisionCount,
      team_slot_count: teamSlotCount,
    })
    .select("*")
    .single()

  if (error || !season) {
    throw new Error(error?.message ?? "Failed to create season")
  }

  const structure: SeasonLeagueStructure = {
    conferenceCount,
    divisionCount,
    teamSlotCount,
  }

  await upsertCanonicalLeagueConfig(supabase, season.id, structure)

  let teamGen: GenerateTeamsResult | null = null
  if (input.generateTeams) {
    teamGen = await generateLeagueTeamsForSeason(supabase, season.id, {
      conferenceNames: input.conferenceNames,
      divisionNames: input.divisionNames,
    })
  }

  return { season, teamGeneration: teamGen }
}

export async function generateLeagueTeamsForSeason(
  supabase: SupabaseClient,
  seasonId: string,
  options?: {
    conferenceNames?: string[]
    divisionNames?: string[]
    overwritePlacement?: boolean
  }
): Promise<GenerateTeamsResult> {
  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id, name, conference_count, division_count, team_slot_count")
    .eq("id", seasonId)
    .single()

  if (seasonError || !season) {
    throw new Error("Season not found")
  }

  const structure: SeasonLeagueStructure = {
    conferenceCount: season.conference_count ?? 2,
    divisionCount: season.division_count ?? 4,
    teamSlotCount: season.team_slot_count ?? 12,
  }

  await upsertCanonicalLeagueConfig(supabase, seasonId, structure)

  const { conferences, divisions, conferencesCreated, divisionsCreated } =
    await ensureConferencesAndDivisions(
      supabase,
      seasonId,
      structure,
      options?.conferenceNames,
      options?.divisionNames
    )

  const placements = computeAllTeamSlotPlacements(structure, {
    conferenceNames: options?.conferenceNames,
    divisionNames: options?.divisionNames,
  })

  let teamsCreated = 0
  let teamsSkipped = 0

  for (const placement of placements) {
    const divisionId = findDivisionId(
      divisions,
      placement.conferenceNumber,
      placement.divisionNumber,
      conferences
    )

    const { data: existing } = await supabase
      .from("teams")
      .select("id, coach_id")
      .eq("season_id", seasonId)
      .eq("team_number", placement.teamNumber)
      .maybeSingle()

    const teamPayload = {
      name: defaultTeamSlotName(placement.teamNumber),
      coach_name: "Unassigned",
      division: placement.divisionLabel,
      conference: placement.conferenceLabel,
      season_id: seasonId,
      division_id: divisionId,
      team_number: placement.teamNumber,
      is_active: true,
      claimable: true,
    }

    if (existing?.id) {
      if (options?.overwritePlacement && !existing.coach_id) {
        await supabase.from("teams").update(teamPayload).eq("id", existing.id)
      }
      teamsSkipped++
      continue
    }

    const { data: insertedTeam, error: insertError } = await supabase
      .from("teams")
      .insert(teamPayload)
      .select("id")
      .single()

    if (insertError || !insertedTeam) {
      throw new Error(insertError?.message ?? "Failed to create team slot")
    }
    teamsCreated++

    await supabase.from("season_teams").upsert(
      { season_id: seasonId, team_id: insertedTeam.id },
      { onConflict: "season_id,team_id" }
    )
  }

  // Link season_teams for all teams in batch (cleaner second pass)
  const { data: allTeams } = await supabase
    .from("teams")
    .select("id")
    .eq("season_id", seasonId)

  if (allTeams?.length) {
    await supabase.from("season_teams").upsert(
      allTeams.map((t) => ({ season_id: seasonId, team_id: t.id })),
      { onConflict: "season_id,team_id" }
    )
  }

  return {
    conferencesCreated,
    divisionsCreated,
    teamsCreated,
    teamsSkipped,
  }
}

async function loadSeasonStructureForTeam(
  supabase: SupabaseClient,
  seasonId: string,
  teamNumberHint?: number
): Promise<SeasonLeagueStructure> {
  const { data: season } = await supabase
    .from("seasons")
    .select("conference_count, division_count, team_slot_count")
    .eq("id", seasonId)
    .single()

  if (!season) {
    throw new Error("Season not found")
  }

  return {
    conferenceCount: season.conference_count ?? 2,
    divisionCount: season.division_count ?? 4,
    teamSlotCount: season.team_slot_count ?? teamNumberHint ?? 12,
  }
}

/** Assign slot number and recompute conference/division from season structure. */
export async function assignTeamSlotNumber(
  supabase: SupabaseClient,
  teamId: string,
  teamNumber: number
) {
  if (!Number.isInteger(teamNumber) || teamNumber < 1) {
    throw new Error("Team number must be a positive integer")
  }

  const { data: team } = await supabase
    .from("teams")
    .select("id, season_id")
    .eq("id", teamId)
    .single()

  if (!team?.season_id) {
    throw new Error("Team not found")
  }

  const { data: conflict } = await supabase
    .from("teams")
    .select("id")
    .eq("season_id", team.season_id)
    .eq("team_number", teamNumber)
    .neq("id", teamId)
    .maybeSingle()

  if (conflict?.id) {
    throw new Error(`Slot number ${teamNumber} is already used in this season`)
  }

  const structure = await loadSeasonStructureForTeam(supabase, team.season_id, teamNumber)
  const { conferences, divisions } = await ensureConferencesAndDivisions(
    supabase,
    team.season_id,
    structure
  )

  const placement = computeTeamSlotPlacement(teamNumber, structure)
  const divisionId = findDivisionId(
    divisions,
    placement.conferenceNumber,
    placement.divisionNumber,
    conferences
  )

  const { data, error } = await supabase
    .from("teams")
    .update({
      team_number: teamNumber,
      conference: placement.conferenceLabel,
      division: placement.divisionLabel,
      division_id: divisionId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", teamId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }
  return data
}

/** Assign slot numbers to teams missing team_number (e.g. legacy Google Sheets rows). */
export async function backfillMissingTeamNumbers(
  supabase: SupabaseClient,
  seasonId: string
): Promise<{ updated: number; skipped: number }> {
  const { data: teamsMissing } = await supabase
    .from("teams")
    .select("id, name")
    .eq("season_id", seasonId)
    .is("team_number", null)
    .order("name", { ascending: true })

  if (!teamsMissing?.length) {
    return { updated: 0, skipped: 0 }
  }

  const { data: numbered } = await supabase
    .from("teams")
    .select("team_number")
    .eq("season_id", seasonId)
    .not("team_number", "is", null)

  const used = new Set((numbered ?? []).map((t) => t.team_number as number))
  let nextCandidate = 1

  function takeNextAvailable(): number {
    while (used.has(nextCandidate)) {
      nextCandidate++
    }
    const n = nextCandidate
    used.add(n)
    nextCandidate++
    return n
  }

  let updated = 0
  for (const row of teamsMissing) {
    const slot = takeNextAvailable()
    await assignTeamSlotNumber(supabase, row.id, slot)
    updated++
  }

  return { updated, skipped: 0 }
}

export async function updateTeamMetadata(
  supabase: SupabaseClient,
  teamId: string,
  patch: {
    name?: string
    coach_name?: string
    team_number?: number
    is_active?: boolean
    claimable?: boolean
    conference?: string
    division?: string
    division_id?: string | null
    logo_url?: string | null
    avatar_url?: string | null
  }
) {
  const { team_number, ...rest } = patch
  const hasRest = Object.keys(rest).length > 0

  if (team_number !== undefined) {
    const { conference: _c, division: _d, division_id: _did, ...restWithoutPlacement } = rest
    const updated = await assignTeamSlotNumber(supabase, teamId, team_number)
    const placementRest = Object.keys(restWithoutPlacement)
    if (placementRest.length === 0) {
      return updated
    }
    const { data, error } = await supabase
      .from("teams")
      .update({ ...restWithoutPlacement, updated_at: new Date().toISOString() })
      .eq("id", teamId)
      .select("*")
      .single()
    if (error) {
      throw new Error(error.message)
    }
    return data
  }

  if (!hasRest) {
    throw new Error("No valid fields to update")
  }

  const { data, error } = await supabase
    .from("teams")
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq("id", teamId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }
  return data
}

export async function createLeagueTeam(
  supabase: SupabaseClient,
  input: {
    seasonId: string
    name: string
    teamNumber?: number
    isActive?: boolean
    claimable?: boolean
  }
) {
  const { data: season } = await supabase
    .from("seasons")
    .select("conference_count, division_count, team_slot_count")
    .eq("id", input.seasonId)
    .single()

  if (!season) {
    throw new Error("Season not found")
  }

  let teamNumber = input.teamNumber
  if (!teamNumber) {
    const { data: maxRow } = await supabase
      .from("teams")
      .select("team_number")
      .eq("season_id", input.seasonId)
      .order("team_number", { ascending: false })
      .limit(1)
      .maybeSingle()
    teamNumber = (maxRow?.team_number ?? 0) + 1
  }

  const structure: SeasonLeagueStructure = {
    conferenceCount: season.conference_count ?? 2,
    divisionCount: season.division_count ?? 4,
    teamSlotCount: season.team_slot_count ?? teamNumber,
  }

  const { conferences, divisions } = await ensureConferencesAndDivisions(
    supabase,
    input.seasonId,
    structure
  )

  const placement = computeTeamSlotPlacement(teamNumber, structure)

  const divisionId = findDivisionId(
    divisions,
    placement.conferenceNumber,
    placement.divisionNumber,
    conferences
  )

  const { data: team, error } = await supabase
    .from("teams")
    .insert({
      name: input.name.trim(),
      coach_name: "Unassigned",
      season_id: input.seasonId,
      team_number: teamNumber,
      conference: placement.conferenceLabel,
      division: placement.divisionLabel,
      division_id: divisionId,
      is_active: input.isActive ?? true,
      claimable: input.claimable ?? true,
      coach_id: null,
    })
    .select("*")
    .single()

  if (error || !team) {
    throw new Error(error?.message ?? "Failed to create team")
  }

  await supabase
    .from("season_teams")
    .upsert({ season_id: input.seasonId, team_id: team.id }, { onConflict: "season_id,team_id" })

  return team
}
