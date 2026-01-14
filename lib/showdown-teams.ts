/**
 * Showdown Teams Utility Library
 * Provides functions for managing Pokemon Showdown teams in the database
 */

import { createServiceRoleClient } from './supabase/service';
import { parseShowdownTeam, exportTeamToShowdown, type ParsedTeam } from './team-parser';

export interface ShowdownTeam {
  id: string;
  team_name: string;
  generation?: number;
  format?: string;
  folder_path?: string;
  team_text: string;
  canonical_text: string;
  pokemon_data: any[];
  team_id?: string;
  coach_id?: string;
  season_id?: string;
  pokemon_count: number;
  is_validated: boolean;
  validation_errors?: string[];
  source?: string;
  tags?: string[];
  user_tags?: string[]; // User-defined tags
  notes?: string;
  original_filename?: string;
  file_size?: number;
  is_stock?: boolean; // Whether this is a stock/pre-loaded team
  created_at: string;
  updated_at: string;
  last_used_at?: string;
}

export interface CreateTeamInput {
  team_text: string;
  team_name?: string;
  team_id?: string;
  season_id?: string;
  tags?: string[];
  notes?: string;
  source?: string;
}

export interface UpdateTeamInput {
  team_name?: string;
  team_text?: string;
  tags?: string[];
  user_tags?: string[]; // User-defined tags
  notes?: string;
  folder_path?: string;
}

/**
 * Create a new Showdown team from team export text
 */
export async function createShowdownTeam(
  input: CreateTeamInput,
  coachId: string
): Promise<{ team: ShowdownTeam; errors: string[] }> {
  const supabase = createServiceRoleClient();

  // Parse the team
  const parsed = await parseShowdownTeam(input.team_text);

  if (parsed.errors.length > 0) {
    return {
      team: null as any,
      errors: parsed.errors
    };
  }

  if (parsed.pokemon.length === 0) {
    return {
      team: null as any,
      errors: ['No Pokemon found in team']
    };
  }

  // Extract metadata
  const teamName = input.team_name || parsed.metadata?.teamName || 'Untitled Team';
  const generation = parsed.metadata?.generation;
  const format = parsed.metadata?.format;
  const folderPath = parsed.metadata?.folder;

  // Convert Pokemon to JSONB format
  const pokemonData = parsed.pokemon.map(p => ({
    name: p.name,
    species: p.species,
    item: p.item,
    ability: p.ability,
    moves: p.moves,
    nature: p.nature,
    evs: p.evs,
    ivs: p.ivs,
    teraType: p.teraType,
    level: p.level,
    gender: p.gender,
    shiny: p.shiny,
    happiness: p.happiness
  }));

  // Insert into database
  const { data, error } = await supabase
    .from('showdown_teams')
    .insert({
      team_name: teamName,
      generation: generation,
      format: format,
      folder_path: folderPath,
      team_text: input.team_text,
      canonical_text: parsed.canonicalText,
      pokemon_data: pokemonData,
      pokemon_count: parsed.pokemon.length,
      coach_id: coachId,
      team_id: input.team_id,
      season_id: input.season_id,
      source: input.source || 'upload',
      tags: input.tags || [],
      notes: input.notes
    })
    .select()
    .single();

  if (error) {
    return {
      team: null as any,
      errors: [error.message]
    };
  }

  return {
    team: data as ShowdownTeam,
    errors: []
  };
}

/**
 * Get teams for a coach (includes stock teams)
 */
export async function getCoachTeams(
  coachId: string,
  options?: {
    seasonId?: string;
    format?: string;
    generation?: number;
    includeDeleted?: boolean;
    includeStock?: boolean;
  }
): Promise<ShowdownTeam[]> {
  const supabase = createServiceRoleClient();

  // Get user's teams
  let userQuery = supabase
    .from('showdown_teams')
    .select('*')
    .eq('coach_id', coachId);

  if (!options?.includeDeleted) {
    userQuery = userQuery.is('deleted_at', null);
  }

  if (options?.seasonId) {
    userQuery = userQuery.eq('season_id', options.seasonId);
  }

  if (options?.format) {
    userQuery = userQuery.eq('format', options.format);
  }

  if (options?.generation) {
    userQuery = userQuery.eq('generation', options.generation);
  }

  const { data: userTeams, error: userError } = await userQuery;

  if (userError) {
    throw new Error(`Failed to fetch user teams: ${userError.message}`);
  }

  // Get stock teams if requested (default: true)
  const includeStock = options?.includeStock !== false;
  let allTeams = (userTeams || []) as ShowdownTeam[];

  if (includeStock) {
    let stockQuery = supabase
      .from('showdown_teams')
      .select('*')
      .eq('is_stock', true)
      .is('deleted_at', null);

    if (options?.format) {
      stockQuery = stockQuery.eq('format', options.format);
    }

    if (options?.generation) {
      stockQuery = stockQuery.eq('generation', options.generation);
    }

    const { data: stockTeams, error: stockError } = await stockQuery;

    if (stockError) {
      console.error('Failed to fetch stock teams:', stockError);
      // Don't throw, just log - user teams are more important
    } else {
      allTeams = [...allTeams, ...(stockTeams || [])];
    }
  }

  // Sort by created_at descending
  allTeams.sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateB - dateA;
  });

  return allTeams;
}

/**
 * Get a team by ID
 */
export async function getTeamById(teamId: string): Promise<ShowdownTeam | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('showdown_teams')
    .select('*')
    .eq('id', teamId)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch team: ${error.message}`);
  }

  return data as ShowdownTeam;
}

/**
 * Update a team
 */
export async function updateShowdownTeam(
  teamId: string,
  input: UpdateTeamInput,
  coachId: string
): Promise<{ team: ShowdownTeam; errors: string[] }> {
  const supabase = createServiceRoleClient();

  // If team_text is being updated, re-parse
  let updateData: any = {
    team_name: input.team_name,
    tags: input.tags,
    user_tags: input.user_tags,
    notes: input.notes,
    folder_path: input.folder_path
  };

  if (input.team_text) {
    const parsed = await parseShowdownTeam(input.team_text);

    if (parsed.errors.length > 0) {
      return {
        team: null as any,
        errors: parsed.errors
      };
    }

    const pokemonData = parsed.pokemon.map(p => ({
      name: p.name,
      species: p.species,
      item: p.item,
      ability: p.ability,
      moves: p.moves,
      nature: p.nature,
      evs: p.evs,
      ivs: p.ivs,
      teraType: p.teraType,
      level: p.level,
      gender: p.gender,
      shiny: p.shiny,
      happiness: p.happiness
    }));

    updateData = {
      ...updateData,
      team_text: input.team_text,
      canonical_text: parsed.canonicalText,
      pokemon_data: pokemonData,
      pokemon_count: parsed.pokemon.length,
      generation: parsed.metadata?.generation,
      format: parsed.metadata?.format,
      folder_path: parsed.metadata?.folder || input.folder_path
    };
  }

  const { data, error } = await supabase
    .from('showdown_teams')
    .update(updateData)
    .eq('id', teamId)
    .eq('coach_id', coachId)
    .select()
    .single();

  if (error) {
    return {
      team: null as any,
      errors: [error.message]
    };
  }

  return {
    team: data as ShowdownTeam,
    errors: []
  };
}

/**
 * Delete a team (soft delete)
 */
export async function deleteShowdownTeam(teamId: string, coachId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from('showdown_teams')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', teamId)
    .eq('coach_id', coachId);

  if (error) {
    throw new Error(`Failed to delete team: ${error.message}`);
  }
}

/**
 * Search teams by name, format, or tags (includes stock teams)
 */
export async function searchTeams(
  query: string,
  options?: {
    coachId?: string;
    format?: string;
    generation?: number;
    limit?: number;
    includeStock?: boolean;
  }
): Promise<ShowdownTeam[]> {
  const supabase = createServiceRoleClient();

  // Build query for user teams
  let userQuery = supabase
    .from('showdown_teams')
    .select('*')
    .is('deleted_at', null);

  if (options?.coachId) {
    userQuery = userQuery.eq('coach_id', options.coachId);
  }

  if (options?.format) {
    userQuery = userQuery.eq('format', options.format);
  }

  if (options?.generation) {
    userQuery = userQuery.eq('generation', options.generation);
  }

  // Full-text search
  if (query) {
    userQuery = userQuery.textSearch('team_name', query, {
      type: 'websearch',
      config: 'english'
    });
  }

  const { data: userTeams, error: userError } = await userQuery.limit(options?.limit || 50);

  if (userError) {
    throw new Error(`Failed to search teams: ${userError.message}`);
  }

  let allTeams = (userTeams || []) as ShowdownTeam[];

  // Include stock teams if requested (default: true)
  const includeStock = options?.includeStock !== false;
  if (includeStock) {
    let stockQuery = supabase
      .from('showdown_teams')
      .select('*')
      .eq('is_stock', true)
      .is('deleted_at', null);

    if (options?.format) {
      stockQuery = stockQuery.eq('format', options.format);
    }

    if (options?.generation) {
      stockQuery = stockQuery.eq('generation', options.generation);
    }

    if (query) {
      stockQuery = stockQuery.textSearch('team_name', query, {
        type: 'websearch',
        config: 'english'
      });
    }

    const { data: stockTeams, error: stockError } = await stockQuery.limit(options?.limit || 50);

    if (stockError) {
      console.error('Failed to search stock teams:', stockError);
    } else {
      allTeams = [...allTeams, ...(stockTeams || [])];
    }
  }

  // Remove duplicates and limit
  const uniqueTeams = Array.from(
    new Map(allTeams.map(team => [team.id, team])).values()
  ).slice(0, options?.limit || 50);

  return uniqueTeams;
}

/**
 * Export team to Showdown format
 */
export function exportTeam(team: ShowdownTeam, options?: {
  includeHeader?: boolean;
  generation?: number;
  format?: string;
  teamName?: string;
}): string {
  // If pokemon_data is not available, try to parse from canonical_text
  let pokemonData = team.pokemon_data;
  if (!pokemonData || !Array.isArray(pokemonData) || pokemonData.length === 0) {
    // Fallback: parse from canonical_text
    const parsed = parseShowdownTeam(team.canonical_text || team.team_text || '');
    pokemonData = parsed.pokemon;
  }

  const parsedTeam: ParsedTeam = {
    pokemon: pokemonData.map((p: any) => ({
      name: p.name || '',
      species: p.species,
      item: p.item,
      ability: p.ability,
      moves: p.moves || [],
      nature: p.nature,
      evs: p.evs,
      ivs: p.ivs,
      teraType: p.teraType,
      level: p.level,
      gender: p.gender,
      shiny: p.shiny,
      happiness: p.happiness
    })),
    errors: [],
    canonicalText: team.canonical_text,
    metadata: {
      generation: team.generation,
      format: team.format,
      folder: team.folder_path,
      teamName: team.team_name
    }
  };

  return exportTeamToShowdown(parsedTeam, {
    includeHeader: options?.includeHeader ?? true,
    generation: options?.generation ?? team.generation,
    format: options?.format ?? team.format,
    teamName: options?.teamName ?? team.team_name
  });
}
