/**
 * Team Parser Module for Pokémon Showdown Integration
 * 
 * Parses Showdown team exports and validates them against drafted rosters
 * Uses the koffing library for parsing Showdown format
 */

import { Koffing } from 'koffing';

export interface ParsedPokemon {
  name: string;
  species?: string;
  item?: string;
  ability?: string;
  moves: string[];
  nature?: string;
  evs?: Record<string, number>;
  ivs?: Record<string, number>;
  teraType?: string;
  level?: number;
  gender?: string;
  shiny?: boolean;
  happiness?: number;
}

export interface TeamMetadata {
  generation?: number;
  format?: string;
  folder?: string;
  teamName?: string;
  rawHeader?: string;
}

export interface ParsedTeam {
  pokemon: ParsedPokemon[];
  errors: string[];
  canonicalText: string;
  metadata?: TeamMetadata;
}

export interface RosterEntry {
  pokemon_id: number;
  pokemon_name: string;
}

export interface LeagueRules {
  bannedItems?: string[];
  bannedMoves?: string[];
  bannedAbilities?: string[];
  maxLevel?: number;
  minLevel?: number;
  teraRules?: {
    allowed?: boolean;
    maxPerTeam?: number;
  };
  teamSize?: {
    min?: number;
    max?: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Extract header metadata from Showdown team format
 * Format: === [genX] Folder/Team Name ===
 */
function extractTeamMetadata(teamText: string): TeamMetadata {
  const headerMatch = teamText.match(/^===\s*\[([^\]]+)\]\s*(.+?)\s*===/);
  
  if (!headerMatch) {
    return {};
  }

  const [, formatStr, namePath] = headerMatch;
  const metadata: TeamMetadata = {
    rawHeader: headerMatch[0]
  };

  // Extract generation from format string (e.g., "gen9", "gen9ou", "gen8")
  const genMatch = formatStr.match(/gen(\d+)/i);
  if (genMatch) {
    metadata.generation = parseInt(genMatch[1], 10);
  }

  // Extract format if present (e.g., "ou", "uu", "vgc")
  const formatMatch = formatStr.match(/gen\d+([a-z]+)/i);
  if (formatMatch) {
    metadata.format = formatMatch[1].toLowerCase();
  } else {
    // If no format specified, use the full format string
    metadata.format = formatStr.toLowerCase();
  }

  // Extract folder and team name from path
  const pathParts = namePath.split('/').map(p => p.trim()).filter(p => p);
  if (pathParts.length > 1) {
    metadata.folder = pathParts.slice(0, -1).join('/');
    metadata.teamName = pathParts[pathParts.length - 1];
  } else if (pathParts.length === 1) {
    metadata.teamName = pathParts[0];
  }

  return metadata;
}

/**
 * Parse a Showdown team export text into structured data
 * Handles the standard format: === [genX] Folder/Team Name ===
 */
export async function parseShowdownTeam(teamText: string): Promise<ParsedTeam> {
  try {
    // Clean up the team text
    const cleaned = teamText.trim();
    
    if (!cleaned) {
      return {
        pokemon: [],
        errors: ['Empty team text'],
        canonicalText: '',
        metadata: {}
      };
    }

    // Extract header metadata before parsing
    const metadata = extractTeamMetadata(cleaned);

    // Parse using koffing - returns PokemonTeam or PokemonTeamSet
    const parsed = Koffing.parse(cleaned);
    
    // Handle different return types
    let team: any;
    if (parsed && typeof parsed === 'object') {
      // If it's a PokemonTeamSet, get first team
      if ('teams' in parsed && Array.isArray(parsed.teams) && parsed.teams.length > 0) {
        team = parsed.teams[0];
      } else if ('pokemon' in parsed && Array.isArray(parsed.pokemon)) {
        // It's a PokemonTeam
        team = parsed;
      } else {
        throw new Error('Invalid team format: expected PokemonTeam or PokemonTeamSet');
      }
    } else {
      throw new Error('Failed to parse team: invalid format');
    }
    
    // Generate canonical export (prettified)
    // If we have metadata, preserve the header format
    let canonical: string;
    if (team.toShowdown) {
      canonical = team.toShowdown();
      // Clean up undefined values
      canonical = cleanExportedTeam(canonical);
      // If we extracted metadata and canonical doesn't have header, add it
      if (metadata.rawHeader && !canonical.includes('===')) {
        const header = metadata.rawHeader;
        canonical = `${header}\n\n${canonical}`;
      }
    } else {
      canonical = Koffing.format(cleaned);
      canonical = cleanExportedTeam(canonical);
    }

    // Transform to our format
    const pokemon: ParsedPokemon[] = (team.pokemon || []).map((p: any) => ({
      name: p.name || p.nickname || '',
      species: p.name || p.nickname || '',
      item: p.item,
      ability: p.ability,
      moves: p.moves || [],
      nature: p.nature,
      evs: p.evs ? {
        hp: p.evs.hp || 0,
        atk: p.evs.atk || 0,
        def: p.evs.def || 0,
        spa: p.evs.spa || 0,
        spd: p.evs.spd || 0,
        spe: p.evs.spe || 0
      } : undefined,
      ivs: p.ivs ? {
        hp: p.ivs.hp || 31,
        atk: p.ivs.atk || 31,
        def: p.ivs.def || 31,
        spa: p.ivs.spa || 31,
        spd: p.ivs.spd || 31,
        spe: p.ivs.spe || 31
      } : undefined,
      teraType: p.teraType,
      level: p.level || 50,
      gender: p.gender,
      shiny: p.shiny,
      happiness: p.happiness
    }));

    return {
      pokemon,
      errors: [],
      canonicalText: canonical,
      metadata
    };
  } catch (error) {
    return {
      pokemon: [],
      errors: [error instanceof Error ? error.message : 'Failed to parse team'],
      canonicalText: teamText,
      metadata: extractTeamMetadata(teamText) // Try to extract metadata even on error
    };
  }
}

/**
 * Validate a parsed team against the user's drafted roster
 */
export async function validateTeamAgainstRoster(
  team: ParsedTeam,
  roster: RosterEntry[],
  leagueRules: LeagueRules = {}
): Promise<ValidationResult> {
  const errors: string[] = [];

  // Check team size
  const teamSize = leagueRules.teamSize || { min: 6, max: 10 };
  if (team.pokemon.length < (teamSize.min || 6)) {
    errors.push(`Team must have at least ${teamSize.min || 6} Pokemon (you have ${team.pokemon.length})`);
  }
  if (team.pokemon.length > (teamSize.max || 10)) {
    errors.push(`Team cannot have more than ${teamSize.max || 10} Pokemon (you have ${team.pokemon.length})`);
  }

  // Check each Pokemon is in roster
  for (const pokemon of team.pokemon) {
    const pokemonName = (pokemon.name || pokemon.species || '').toLowerCase().trim();
    
    const inRoster = roster.some(r => {
      const rosterName = r.pokemon_name.toLowerCase().trim();
      // Check exact match or if name contains the roster name (handles forms)
      return rosterName === pokemonName || 
             pokemonName.includes(rosterName) || 
             rosterName.includes(pokemonName) ||
             // Also check species name
             (pokemon.species && pokemon.species.toLowerCase().trim() === rosterName);
    });

    if (!inRoster) {
      errors.push(`${pokemon.name || pokemon.species || 'Unknown'} is not on your drafted roster`);
    }
  }

  // Check league rules
  if (leagueRules.bannedItems) {
    for (const pokemon of team.pokemon) {
      if (pokemon.item && leagueRules.bannedItems!.includes(pokemon.item)) {
        errors.push(`${pokemon.name || pokemon.species} has banned item: ${pokemon.item}`);
      }
    }
  }

  if (leagueRules.bannedMoves) {
    for (const pokemon of team.pokemon) {
      for (const move of pokemon.moves) {
        if (leagueRules.bannedMoves!.includes(move)) {
          errors.push(`${pokemon.name || pokemon.species} has banned move: ${move}`);
        }
      }
    }
  }

  if (leagueRules.bannedAbilities) {
    for (const pokemon of team.pokemon) {
      if (pokemon.ability && leagueRules.bannedAbilities!.includes(pokemon.ability)) {
        errors.push(`${pokemon.name || pokemon.species} has banned ability: ${pokemon.ability}`);
      }
    }
  }

  if (leagueRules.maxLevel) {
    for (const pokemon of team.pokemon) {
      if (pokemon.level && pokemon.level > leagueRules.maxLevel!) {
        errors.push(`${pokemon.name || pokemon.species} exceeds level cap: ${pokemon.level} > ${leagueRules.maxLevel}`);
      }
    }
  }

  if (leagueRules.minLevel) {
    for (const pokemon of team.pokemon) {
      if (pokemon.level && pokemon.level < leagueRules.minLevel!) {
        errors.push(`${pokemon.name || pokemon.species} is below minimum level: ${pokemon.level} < ${leagueRules.minLevel}`);
      }
    }
  }

  // Check Tera rules
  if (leagueRules.teraRules) {
    const teraCount = team.pokemon.filter(p => p.teraType).length;
    if (!leagueRules.teraRules.allowed && teraCount > 0) {
      errors.push('Tera types are not allowed in this league');
    }
    if (leagueRules.teraRules.maxPerTeam && teraCount > leagueRules.teraRules.maxPerTeam) {
      errors.push(`Team has ${teraCount} Tera Pokemon, but maximum is ${leagueRules.teraRules.maxPerTeam}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Clean up exported team text by removing undefined values and normalizing whitespace
 */
function cleanExportedTeam(text: string): string {
  const lines = text.split('\n');
  const cleaned: string[] = [];
  let lastWasBlank = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip lines with "undefined" values
    if (trimmed.includes('undefined')) {
      continue;
    }
    
    // Preserve blank lines but normalize multiple blank lines to single blank line
    if (trimmed === '') {
      if (!lastWasBlank) {
        cleaned.push('');
        lastWasBlank = true;
      }
      continue;
    }
    
    // Add non-blank line (preserve original indentation/spacing)
    cleaned.push(line);
    lastWasBlank = false;
  }
  
  return cleaned
    .join('\n')
    // Remove trailing blank lines
    .replace(/\n+$/, '')
    // Ensure exactly one blank line between Pokemon entries
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Export a team to Showdown format with optional header
 */
export function exportTeamToShowdown(
  team: ParsedTeam,
  options?: {
    includeHeader?: boolean;
    generation?: number;
    format?: string;
    folder?: string;
    teamName?: string;
  }
): string {
  const includeHeader = options?.includeHeader ?? true;
  
  // Clean the canonical text first
  let cleanedBody = cleanExportedTeam(team.canonicalText);
  
  if (!includeHeader) {
    return cleanedBody;
  }

  // Build header from options or existing metadata
  const gen = options?.generation ?? team.metadata?.generation ?? 9;
  const format = options?.format ?? team.metadata?.format ?? '';
  const folder = options?.folder ?? team.metadata?.folder;
  const teamName = options?.teamName ?? team.metadata?.teamName ?? 'Team';

  // Construct header
  const formatStr = format ? `gen${gen}${format}` : `gen${gen}`;
  const namePath = folder ? `${folder}/${teamName}` : teamName;
  const header = `=== [${formatStr}] ${namePath} ===`;

  // Remove existing header from cleaned body if present
  const headerMatch = cleanedBody.match(/^===\s*\[[^\]]+\]\s*.+?\s*===\s*\n*/);
  if (headerMatch) {
    cleanedBody = cleanedBody.substring(headerMatch[0].length).trim();
  }

  return `${header}\n\n${cleanedBody}`;
}
