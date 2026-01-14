/**
 * Team Builder Utilities
 * Converts team builder Pokemon selections to Showdown format
 */

import { type PokemonDisplayData } from './pokemon-utils';
import { exportTeamToShowdown, type ParsedTeam, type ParsedPokemon } from './team-parser';

/**
 * Convert PokemonDisplayData to ParsedPokemon for Showdown export
 * Creates a basic template with defaults for missing fields
 */
export function convertToShowdownPokemon(pokemon: PokemonDisplayData): ParsedPokemon {
  // Use first ability as default (or first non-hidden ability)
  const defaultAbility = pokemon.abilities && pokemon.abilities.length > 0
    ? pokemon.abilities[0]
    : '';

  // Get first 4 moves if available, otherwise empty array
  const defaultMoves = pokemon.moves && pokemon.moves.length > 0
    ? pokemon.moves.slice(0, 4)
    : [];

  // Map base_stats to evs format (spa/spd instead of special_attack/special_defense)
  let evs: Record<string, number> | undefined = undefined;
  if (pokemon.base_stats) {
    // Use base stats as a starting point for EVs (optional, can be removed)
    // For now, we'll leave EVs undefined so users can set them in Showdown
  }

  return {
    name: pokemon.name,
    species: pokemon.name,
    item: undefined, // User can add in Showdown
    ability: defaultAbility,
    moves: defaultMoves,
    nature: undefined, // User can add in Showdown
    evs: evs, // User can add in Showdown
    ivs: undefined, // User can add in Showdown
    teraType: undefined, // User can add in Showdown
    level: 50, // Default level for competitive
    gender: undefined,
    shiny: false,
    happiness: undefined
  };
}

/**
 * Convert team builder selection to Showdown team format
 */
export function convertTeamToShowdown(
  pokemonList: PokemonDisplayData[],
  teamName: string,
  generation: number = 9,
  format: string = 'ou'
): ParsedTeam {
  const parsedPokemon = pokemonList.map(convertToShowdownPokemon);

  // Generate canonical text
  const header = `=== [gen${generation}${format}] ${teamName} ===`;
  const pokemonTexts = parsedPokemon.map(p => {
    const lines: string[] = [];
    
    // Name and item
    if (p.item) {
      lines.push(`${p.name} @ ${p.item}`);
    } else {
      lines.push(p.name);
    }
    
    // Ability
    if (p.ability) {
      lines.push(`Ability: ${p.ability}`);
    }
    
    // Level
    if (p.level && p.level !== 50) {
      lines.push(`Level: ${p.level}`);
    }
    
    // EVs
    if (p.evs) {
      const evParts: string[] = [];
      if (p.evs.hp) evParts.push(`${p.evs.hp} HP`);
      if (p.evs.atk) evParts.push(`${p.evs.atk} Atk`);
      if (p.evs.def) evParts.push(`${p.evs.def} Def`);
      if (p.evs.spa) evParts.push(`${p.evs.spa} SpA`);
      if (p.evs.spd) evParts.push(`${p.evs.spd} SpD`);
      if (p.evs.spe) evParts.push(`${p.evs.spe} Spe`);
      if (evParts.length > 0) {
        lines.push(`EVs: ${evParts.join(' / ')}`);
      }
    }
    
    // IVs (only if not 31)
    if (p.ivs) {
      const ivParts: string[] = [];
      if (p.ivs.hp !== undefined && p.ivs.hp !== 31) ivParts.push(`${p.ivs.hp} HP`);
      if (p.ivs.atk !== undefined && p.ivs.atk !== 31) ivParts.push(`${p.ivs.atk} Atk`);
      if (p.ivs.def !== undefined && p.ivs.def !== 31) ivParts.push(`${p.ivs.def} Def`);
      if (p.ivs.spa !== undefined && p.ivs.spa !== 31) ivParts.push(`${p.ivs.spa} SpA`);
      if (p.ivs.spd !== undefined && p.ivs.spd !== 31) ivParts.push(`${p.ivs.spd} SpD`);
      if (p.ivs.spe !== undefined && p.ivs.spe !== 31) ivParts.push(`${p.ivs.spe} Spe`);
      if (ivParts.length > 0) {
        lines.push(`IVs: ${ivParts.join(' / ')}`);
      }
    }
    
    // Nature
    if (p.nature) {
      lines.push(`${p.nature} Nature`);
    }
    
    // Moves
    if (p.moves && p.moves.length > 0) {
      p.moves.forEach(move => {
        lines.push(`- ${move}`);
      });
    } else {
      // Add placeholder moves if none
      lines.push('- Move 1');
      lines.push('- Move 2');
      lines.push('- Move 3');
      lines.push('- Move 4');
    }
    
    return lines.join('\n');
  });

  const canonicalText = `${header}\n\n${pokemonTexts.join('\n\n')}`;

  return {
    pokemon: parsedPokemon,
    errors: [],
    canonicalText,
    metadata: {
      generation,
      format,
      teamName
    }
  };
}

/**
 * Generate Showdown team export text from team builder selection
 */
export function generateShowdownTeamExport(
  pokemonList: PokemonDisplayData[],
  teamName: string,
  generation: number = 9,
  format: string = 'ou'
): string {
  const parsedTeam = convertTeamToShowdown(pokemonList, teamName, generation, format);
  return exportTeamToShowdown(parsedTeam, {
    includeHeader: true,
    generation,
    format,
    teamName
  });
}

/**
 * Download team as .txt file
 */
export function downloadTeamFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.txt') ? filename : `${filename}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
