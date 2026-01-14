'use client';

import { useState, useEffect } from 'react';
import { PokemonSprite } from '@/components/pokemon-sprite';
import { PokemonTypeIcon } from '@/components/pokemon-type-icon';
import { PokemonItemIcon } from '@/components/pokemon-item-icon';
import { getPokemonDataExtended, type CachedPokemonExtended } from '@/lib/pokemon-api-enhanced';
import { calculatePokemonStats, getStatAbbreviation, type CalculatedStats } from '@/lib/pokemon-stats-calculator';
import { type ParsedPokemon } from '@/lib/team-parser';
import { 
  getPokePasteTypeColor, 
  getPokePasteGenderColor,
  POKEPASTE_ATTR_COLOR,
  isTypeSpecificItem 
} from '@/lib/pokepaste-colors';
import { cn } from '@/lib/utils';

export function PokemonTeamEntry({
  pokemon,
  pokemonData,
}: PokemonTeamEntryProps) {
  const [loading, setLoading] = useState(!pokemonData);
  const [data, setData] = useState<CachedPokemonExtended | null>(pokemonData || null);
  const [calculatedStats, setCalculatedStats] = useState<CalculatedStats | null>(null);

  const pokemonId = data?.pokemon_id || (data as any)?.id;

  // Fetch Pokemon data if not provided
  useEffect(() => {
    if (!pokemonData && pokemon.name) {
      setLoading(true);
      getPokemonDataExtended(pokemon.name)
        .then((fetched) => {
          setData(fetched);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setData(pokemonData || null);
    }
  }, [pokemon.name, pokemonData]);

  // Calculate stats when data is available
  useEffect(() => {
    if (data?.base_stats) {
      const baseStats = {
        hp: data.base_stats.hp || 0,
        attack: data.base_stats.attack || 0,
        defense: data.base_stats.defense || 0,
        'special-attack': data.base_stats.special_attack || 0,
        'special-defense': data.base_stats.special_defense || 0,
        speed: data.base_stats.speed || 0,
      };
      
      const stats = calculatePokemonStats(
        baseStats,
        pokemon.evs || {},
        pokemon.ivs || {},
        pokemon.level || 50,
        pokemon.nature
      );
      setCalculatedStats(stats);
    }
  }, [data, pokemon.evs, pokemon.ivs, pokemon.level, pokemon.nature]);

  const types = data?.types || [];
  const primaryType = types[0]?.toLowerCase() || 'normal';
  const pokemonNameColor = getPokePasteTypeColor(primaryType);
  const teraTypeColor = pokemon.teraType ? getPokePasteTypeColor(pokemon.teraType.toLowerCase()) : '';
  const genderColor = pokemon.gender ? getPokePasteGenderColor(pokemon.gender) : '';
  
  // Check if item is type-specific
  const itemTypeInfo = pokemon.item ? isTypeSpecificItem(pokemon.item) : null;
  const itemColor = itemTypeInfo?.isTypeSpecific && itemTypeInfo.type 
    ? getPokePasteTypeColor(itemTypeInfo.type) 
    : undefined;

  // Format EVs string
  const formatEVs = () => {
    if (!pokemon.evs) return null;
    const evParts: string[] = [];
    if (pokemon.evs.hp) evParts.push(`${pokemon.evs.hp} HP`);
    if (pokemon.evs.atk) evParts.push(`${pokemon.evs.atk} Atk`);
    if (pokemon.evs.def) evParts.push(`${pokemon.evs.def} Def`);
    if (pokemon.evs.spa) evParts.push(`${pokemon.evs.spa} SpA`);
    if (pokemon.evs.spd) evParts.push(`${pokemon.evs.spd} SpD`);
    if (pokemon.evs.spe) evParts.push(`${pokemon.evs.spe} Spe`);
    return evParts.length > 0 ? evParts.join(' / ') : null;
  };

  // Format IVs string (only show if not all 31)
  const formatIVs = () => {
    if (!pokemon.ivs) return null;
    const ivParts: string[] = [];
    const defaultIVs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
    
    if (pokemon.ivs.hp !== undefined && pokemon.ivs.hp !== defaultIVs.hp) ivParts.push(`${pokemon.ivs.hp} HP`);
    if (pokemon.ivs.atk !== undefined && pokemon.ivs.atk !== defaultIVs.atk) ivParts.push(`${pokemon.ivs.atk} Atk`);
    if (pokemon.ivs.def !== undefined && pokemon.ivs.def !== defaultIVs.def) ivParts.push(`${pokemon.ivs.def} Def`);
    if (pokemon.ivs.spa !== undefined && pokemon.ivs.spa !== defaultIVs.spa) ivParts.push(`${pokemon.ivs.spa} SpA`);
    if (pokemon.ivs.spd !== undefined && pokemon.ivs.spd !== defaultIVs.spd) ivParts.push(`${pokemon.ivs.spd} SpD`);
    if (pokemon.ivs.spe !== undefined && pokemon.ivs.spe !== defaultIVs.spe) ivParts.push(`${pokemon.ivs.spe} Spe`);
    
    return ivParts.length > 0 ? ivParts.join(' / ') : null;
  };

  return (
    <div className="flex gap-4 py-3 border-b border-border/50 last:border-0">
      {/* Left: Sprite */}
      <div className="flex-shrink-0">
        {loading ? (
          <div className="w-20 h-20 rounded bg-muted animate-pulse" />
        ) : (
          <PokemonSprite
            name={pokemon.name}
            pokemonId={pokemonId}
            pokemon={data as any}
            size="md"
            mode={pokemon.shiny ? 'shiny' : 'front'}
          />
        )}
      </div>

      {/* Right: Text Details */}
      <div className="flex-1 space-y-0.5 text-sm font-mono">
        {/* Name @ Item */}
        <div className="flex items-center gap-2">
          <span 
            className="font-semibold"
            style={{ color: pokemonNameColor }}
          >
            {pokemon.name}
          </span>
          {pokemon.gender && (
            <span style={{ color: genderColor }}>
              ({pokemon.gender})
            </span>
          )}
          {pokemon.item && (
            <>
              <span style={{ color: POKEPASTE_ATTR_COLOR }}>@</span>
              <span style={{ color: itemColor || 'inherit' }}>
                {pokemon.item}
              </span>
              <PokemonItemIcon itemName={pokemon.item.toLowerCase().replace(/\s+/g, '-')} size={16} className="ml-1" />
            </>
          )}
        </div>

        {/* Ability */}
        {pokemon.ability && (
          <div>
            <span style={{ color: POKEPASTE_ATTR_COLOR }}>Ability:</span>{' '}
            <span>{pokemon.ability}</span>
          </div>
        )}

        {/* Tera Type */}
        {pokemon.teraType && (
          <div>
            <span style={{ color: POKEPASTE_ATTR_COLOR }}>Tera Type:</span>{' '}
            <span 
              className="font-semibold"
              style={{ color: teraTypeColor }}
            >
              {pokemon.teraType}
            </span>
          </div>
        )}

        {/* EVs */}
        {formatEVs() && (
          <div>
            <span style={{ color: POKEPASTE_ATTR_COLOR }}>EVs:</span>{' '}
            <span>{formatEVs()}</span>
          </div>
        )}

        {/* Nature */}
        {pokemon.nature && (
          <div>
            <span className="capitalize">{pokemon.nature}</span>{' '}
            <span style={{ color: POKEPASTE_ATTR_COLOR }}>Nature</span>
          </div>
        )}

        {/* IVs */}
        {formatIVs() && (
          <div>
            <span style={{ color: POKEPASTE_ATTR_COLOR }}>IVs:</span>{' '}
            <span>{formatIVs()}</span>
          </div>
        )}

        {/* Moves */}
        {pokemon.moves && pokemon.moves.length > 0 && (
          <div className="pt-1">
            {pokemon.moves.map((move, i) => {
              // For now, we'll color the hyphen. Later we can fetch move types for full coloring
              // Move type coloring would require fetching move data, which we can optimize later
              return (
                <div key={i}>
                  <span style={{ color: POKEPASTE_ATTR_COLOR }}>-</span>{' '}
                  <span>{move}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
