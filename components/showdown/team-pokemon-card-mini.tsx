'use client';

import { TeamPokemonSprite } from './team-pokemon-sprite';
import { Badge } from '@/components/ui/badge';
import { getPokemonTypeColors } from '@/lib/pokemon-type-colors';
import { type ParsedPokemon } from '@/lib/team-parser';
import { cn } from '@/lib/utils';
import { type PokemonDisplayData } from '@/lib/pokemon-utils';

interface TeamPokemonCardMiniProps {
  pokemon: ParsedPokemon;
  pokemonData?: PokemonDisplayData | null;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  viewMode?: 'grid' | 'list';
  className?: string;
}

export function TeamPokemonCardMini({
  pokemon,
  pokemonData,
  loading = false,
  size = 'sm',
  viewMode = 'grid',
  className = '',
}: TeamPokemonCardMiniProps) {
  const pokemonName = pokemon.species || pokemon.name;
  const types = pokemonData?.types || [];
  const typeColors = types.length > 0 ? getPokemonTypeColors(types) : null;

  if (loading) {
    return (
      <div className={cn('flex flex-col items-center gap-1', className)}>
        <div 
          className="flex items-center justify-center rounded bg-muted animate-pulse"
          style={{ width: size === 'sm' ? 48 : size === 'md' ? 96 : 128, height: size === 'sm' ? 48 : size === 'md' ? 96 : 128 }}
        >
          <span className="text-xs text-muted-foreground">?</span>
        </div>
        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div className="relative group">
        <TeamPokemonSprite
          pokemon={pokemon}
          pokemonData={pokemonData}
          size={size}
          className="hover:scale-110 transition-transform cursor-pointer"
        />
      </div>
      
      {/* Pokemon Name */}
      <div className="text-center">
        <p className={cn(
          'font-semibold capitalize truncate max-w-[80px]',
          viewMode === 'list' ? 'text-sm' : 'text-xs'
        )}>
          {pokemonName}
        </p>
      </div>
      
      {/* Types */}
      {types.length > 0 && (
        <div className="flex gap-0.5 flex-wrap justify-center">
          {types.map((type) => {
            const typeColor = getPokemonTypeColors([type]);
            return (
              <Badge
                key={type}
                className={cn(
                  'capitalize',
                  viewMode === 'list' ? 'text-[10px] px-1 py-0' : 'text-[9px] px-0.5 py-0'
                )}
                style={{
                  backgroundColor: typeColor.bg,
                  color: typeColor.text,
                  borderColor: typeColor.border,
                }}
              >
                {type}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
