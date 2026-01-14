'use client';

import { useState, useEffect } from 'react';
import { PokemonSprite } from '@/components/pokemon-sprite';
import { getPokemon, type PokemonDisplayData } from '@/lib/pokemon-utils';
import { type ParsedPokemon } from '@/lib/team-parser';

interface TeamPokemonSpriteProps {
  pokemon: ParsedPokemon;
  pokemonData?: PokemonDisplayData | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showName?: boolean;
  showTypes?: boolean;
}

export function TeamPokemonSprite({ 
  pokemon,
  pokemonData,
  size = 'sm',
  className = '',
  showName = false,
  showTypes = false,
}: TeamPokemonSpriteProps) {
  // If pokemonData is provided, use it directly (from batch fetch)
  // Otherwise, fall back to individual fetch (for backward compatibility)
  const [localPokemonData, setLocalPokemonData] = useState<PokemonDisplayData | null>(pokemonData || null);
  const [loading, setLoading] = useState(!pokemonData);

  useEffect(() => {
    // If pokemonData is provided, use it
    if (pokemonData !== undefined) {
      setLocalPokemonData(pokemonData);
      setLoading(false);
      return;
    }

    // Otherwise, fetch individually (fallback)
    let cancelled = false;
    
    const fetchPokemonData = async () => {
      try {
        const pokemonName = pokemon.species || pokemon.name;
        const data = await getPokemon(pokemonName);
        
        if (!cancelled) {
          setLocalPokemonData(data);
          setLoading(false);
        }
      } catch (error) {
        console.error(`Failed to fetch Pokemon data for ${pokemon.name}:`, error);
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchPokemonData();

    return () => {
      cancelled = true;
    };
  }, [pokemon.name, pokemon.species, pokemonData]);

  if (loading) {
    return (
      <div 
        className={`flex items-center justify-center rounded bg-muted animate-pulse ${className}`}
        style={{ width: size === 'sm' ? 48 : size === 'md' ? 96 : 128, height: size === 'sm' ? 48 : size === 'md' ? 96 : 128 }}
      >
        <span className="text-xs text-muted-foreground">?</span>
      </div>
    );
  }

  return (
    <PokemonSprite
      name={pokemon.species || pokemon.name}
      pokemonId={localPokemonData?.pokemon_id}
      pokemon={localPokemonData || undefined}
      size={size}
      mode={pokemon.shiny ? 'shiny' : 'front'}
      className={className}
    />
  );
}

// Export a hook to get Pokemon data for display
export function useTeamPokemonData(pokemon: ParsedPokemon) {
  const [pokemonData, setPokemonData] = useState<PokemonDisplayData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    
    const fetchPokemonData = async () => {
      try {
        const pokemonName = pokemon.species || pokemon.name;
        const data = await getPokemon(pokemonName);
        
        if (!cancelled) {
          setPokemonData(data);
          setLoading(false);
        }
      } catch (error) {
        console.error(`Failed to fetch Pokemon data for ${pokemon.name}:`, error);
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchPokemonData();

    return () => {
      cancelled = true;
    };
  }, [pokemon.name, pokemon.species]);

  return { pokemonData, loading };
}
