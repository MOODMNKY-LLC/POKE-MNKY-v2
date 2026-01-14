'use client';

import { useState, useEffect, useMemo } from 'react';
import { getPokemon, type PokemonDisplayData } from '@/lib/pokemon-utils';
import { type ParsedPokemon } from '@/lib/team-parser';

// Simple in-memory cache to avoid refetching the same Pokemon
const pokemonDataCache = new Map<string, PokemonDisplayData | null>();

interface UseTeamPokemonBatchOptions {
  pokemon: ParsedPokemon[];
  enabled?: boolean;
}

export function useTeamPokemonBatch({ pokemon, enabled = true }: UseTeamPokemonBatchOptions) {
  const [pokemonDataMap, setPokemonDataMap] = useState<Map<string, PokemonDisplayData | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());

  // Get unique Pokemon names
  const uniquePokemonNames = useMemo(() => {
    const names = new Set<string>();
    pokemon.forEach(p => {
      const name = (p.species || p.name).toLowerCase();
      if (name) names.add(name);
    });
    return Array.from(names);
  }, [pokemon]);

  useEffect(() => {
    if (!enabled || uniquePokemonNames.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const abortController = new AbortController();

    const fetchBatch = async () => {
      setLoading(true);
      const newDataMap = new Map<string, PokemonDisplayData | null>();
      const newErrors = new Map<string, Error>();

      // Check cache first
      const uncachedNames: string[] = [];
      uniquePokemonNames.forEach(name => {
        const cached = pokemonDataCache.get(name);
        if (cached !== undefined) {
          newDataMap.set(name, cached);
        } else {
          uncachedNames.push(name);
        }
      });

      // Fetch uncached Pokemon in parallel batches (max 6 at a time to avoid overwhelming)
      const batchSize = 6;
      for (let i = 0; i < uncachedNames.length; i += batchSize) {
        if (cancelled || abortController.signal.aborted) break;

        const batch = uncachedNames.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(async (name) => {
            try {
              const data = await getPokemon(name);
              return { name, data };
            } catch (error) {
              throw { name, error };
            }
          })
        );

        results.forEach((result) => {
          if (cancelled || abortController.signal.aborted) return;

          if (result.status === 'fulfilled') {
            const { name, data } = result.value;
            pokemonDataCache.set(name, data);
            newDataMap.set(name, data);
          } else {
            const { name, error } = result.reason;
            console.error(`Failed to fetch Pokemon data for ${name}:`, error);
            pokemonDataCache.set(name, null);
            newDataMap.set(name, null);
            newErrors.set(name, error as Error);
          }
        });

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < uncachedNames.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      if (!cancelled && !abortController.signal.aborted) {
        setPokemonDataMap(newDataMap);
        setErrors(newErrors);
        setLoading(false);
      }
    };

    fetchBatch();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [uniquePokemonNames.join(','), enabled]);

  // Helper to get Pokemon data by ParsedPokemon
  const getPokemonData = (pkmn: ParsedPokemon): PokemonDisplayData | null => {
    const name = (pkmn.species || pkmn.name).toLowerCase();
    return pokemonDataMap.get(name) || null;
  };

  return {
    pokemonDataMap,
    getPokemonData,
    loading,
    errors,
  };
}
