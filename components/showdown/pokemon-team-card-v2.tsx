'use client';

import { useState, useEffect } from 'react';
import { PokemonSprite } from '@/components/pokemon-sprite';
import { PokemonTypeIcon } from '@/components/pokemon-type-icon';
import { PokemonItemIcon } from '@/components/pokemon-item-icon';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Copy, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { getPokemonDataExtended, type CachedPokemonExtended } from '@/lib/pokemon-api-enhanced';
import { calculatePokemonStats, getStatAbbreviation, type CalculatedStats } from '@/lib/pokemon-stats-calculator';
import { type ParsedPokemon } from '@/lib/team-parser';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PokemonTeamCardProps {
  pokemon: ParsedPokemon;
  index: number;
  pokemonData?: CachedPokemonExtended | null;
  onUpdate?: (index: number, updates: Partial<ParsedPokemon>) => void;
  onDelete?: (index: number) => void;
  onMove?: (index: number, direction: 'up' | 'down') => void;
  readOnly?: boolean;
}

export function PokemonTeamCard({
  pokemon,
  index,
  pokemonData,
  onUpdate,
  onDelete,
  onMove,
  readOnly = false,
}: PokemonTeamCardProps) {
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
  const maxStat = calculatedStats ? Math.max(...Object.values(calculatedStats)) : 0;

  return (
    <div className="border rounded-lg bg-card hover:shadow-sm transition-shadow">
      <div className="p-4">
        <div className="flex gap-4">
          {/* Left: Sprite and Name */}
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            {loading ? (
              <div className="w-20 h-20 rounded-lg bg-muted animate-pulse" />
            ) : (
              <PokemonSprite
                name={pokemon.name}
                pokemonId={pokemonId}
                pokemon={data as any}
                size="md"
                mode={pokemon.shiny ? 'shiny' : 'front'}
              />
            )}
            <div className="w-full text-center">
              <Input
                placeholder="Nickname"
                value={pokemon.name}
                readOnly={readOnly}
                className="text-sm font-semibold text-center h-8"
                onChange={(e) => onUpdate?.(index, { name: e.target.value })}
              />
              <Input
                placeholder="Pokémon"
                value={pokemon.species || pokemon.name}
                readOnly={readOnly}
                className="text-xs text-muted-foreground text-center h-6 mt-1"
                onChange={(e) => onUpdate?.(index, { species: e.target.value })}
              />
            </div>
          </div>

          {/* Middle: Details */}
          <div className="flex-1 space-y-3">
            {/* Details Row */}
            <div className="grid grid-cols-4 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground mb-1">Level</div>
                <Input
                  type="number"
                  value={pokemon.level || 50}
                  readOnly={readOnly}
                  className="h-7 text-xs"
                  onChange={(e) => onUpdate?.(index, { level: parseInt(e.target.value) || 50 })}
                />
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Gender</div>
                <Input
                  value={pokemon.gender || '-'}
                  readOnly={readOnly}
                  className="h-7 text-xs"
                  onChange={(e) => onUpdate?.(index, { gender: e.target.value || undefined })}
                />
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Shiny</div>
                <Input
                  value={pokemon.shiny ? 'Yes' : 'No'}
                  readOnly={readOnly}
                  className="h-7 text-xs"
                  onChange={(e) => onUpdate?.(index, { shiny: e.target.value === 'Yes' })}
                />
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Tera Type</div>
                <div className="flex items-center gap-1">
                  <Input
                    value={pokemon.teraType || ''}
                    readOnly={readOnly}
                    className="h-7 text-xs flex-1"
                    onChange={(e) => onUpdate?.(index, { teraType: e.target.value || undefined })}
                  />
                  {pokemon.teraType && (
                    <PokemonTypeIcon type={pokemon.teraType} size={18} />
                  )}
                </div>
              </div>
            </div>

            {/* Types */}
            {types.length > 0 && (
              <div className="flex items-center gap-2">
                {types.map((type) => (
                  <PokemonTypeIcon key={type} type={type} size={24} />
                ))}
              </div>
            )}

            {/* Item */}
            <div>
              <div className="text-xs text-muted-foreground mb-1">Item</div>
              <div className="flex items-center gap-2">
                {pokemon.item && (
                  <PokemonItemIcon itemName={pokemon.item.toLowerCase().replace(/\s+/g, '-')} size={20} />
                )}
                <Input
                  value={pokemon.item || ''}
                  readOnly={readOnly}
                  placeholder="No item"
                  className="h-8 text-sm flex-1"
                  onChange={(e) => onUpdate?.(index, { item: e.target.value || undefined })}
                />
              </div>
            </div>

            {/* Ability */}
            <div>
              <div className="text-xs text-muted-foreground mb-1">Ability</div>
              <Input
                value={pokemon.ability || ''}
                readOnly={readOnly}
                placeholder="No ability"
                className="h-8 text-sm"
                onChange={(e) => onUpdate?.(index, { ability: e.target.value || undefined })}
              />
            </div>
          </div>

          {/* Right: Moves & Stats */}
          <div className="flex-1 space-y-3">
            {/* Action Buttons */}
            {!readOnly && (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove?.(index, 'up')}>
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove?.(index, 'down')}>
                  <ChevronDown className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete?.(index)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Moves */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2">Moves</div>
              <div className="space-y-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <Input
                    key={i}
                    value={pokemon.moves[i] || ''}
                    readOnly={readOnly}
                    placeholder={`Move ${i + 1}`}
                    className="h-8 text-sm"
                    onChange={(e) => {
                      const newMoves = [...pokemon.moves];
                      newMoves[i] = e.target.value;
                      onUpdate?.(index, { moves: newMoves.filter(Boolean) });
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Stats */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2">Stats</div>
              <div className="space-y-1.5">
                {calculatedStats && maxStat > 0 ? (
                  <>
                    {(['hp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed'] as const).map((statKey) => {
                      const statValue = calculatedStats[statKey];
                      const statLabel = statKey === 'specialAttack' ? 'SpA' : statKey === 'specialDefense' ? 'SpD' : statKey === 'speed' ? 'Spe' : statKey === 'hp' ? 'HP' : statKey.charAt(0).toUpperCase() + statKey.slice(1);
                      const evKey = statKey === 'hp' ? 'hp' : statKey === 'attack' ? 'atk' : statKey === 'defense' ? 'def' : statKey === 'specialAttack' ? 'spa' : statKey === 'specialDefense' ? 'spd' : 'spe';
                      const evValue = pokemon.evs?.[evKey] || 0;
                      const percentage = (statValue / maxStat) * 100;

                      return (
                        <div key={statKey} className="flex items-center gap-2 text-xs">
                          <div className="w-10 text-right font-medium text-muted-foreground">{statLabel}</div>
                          <div className="flex-1 min-w-[100px]">
                            <Progress value={percentage} className="h-2.5" />
                          </div>
                          <div className="w-12 text-right font-medium">{statValue}</div>
                          {evValue > 0 && (
                            <div className="w-10 text-right text-muted-foreground text-xs">{evValue}</div>
                          )}
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground py-2">Loading stats...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
