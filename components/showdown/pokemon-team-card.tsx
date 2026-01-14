'use client';

import { useState, useEffect } from 'react';
import { PokemonSprite } from '@/components/pokemon-sprite';
import { PokemonTypeIcon } from '@/components/pokemon-type-icon';
import { PokemonItemIcon } from '@/components/pokemon-item-icon';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Copy, Trash2, ArrowUpDown, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { getPokemonDataExtended, type CachedPokemonExtended } from '@/lib/pokemon-api-enhanced';
import { calculatePokemonStats, getStatAbbreviation, getStatColor, type CalculatedStats } from '@/lib/pokemon-stats-calculator';
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
  
  // Get Pokemon ID from data or try to extract from name
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
      // Map base_stats to the format expected by calculator
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

  const handleCopy = () => {
    const teamText = `${pokemon.name}${pokemon.item ? ` @ ${pokemon.item}` : ''}\n` +
      (pokemon.ability ? `Ability: ${pokemon.ability}\n` : '') +
      (pokemon.level && pokemon.level !== 50 ? `Level: ${pokemon.level}\n` : '') +
      (pokemon.evs ? `EVs: ${Object.entries(pokemon.evs).map(([k, v]) => `${v} ${getStatAbbreviation(k)}`).join(' / ')}\n` : '') +
      (pokemon.nature ? `${pokemon.nature} Nature\n` : '') +
      pokemon.moves.map(m => `- ${m}`).join('\n');
    
    navigator.clipboard.writeText(teamText);
    toast.success('Pokemon copied to clipboard');
  };

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex gap-4">
        {/* Left Column - Identity & Sprite */}
        <div className="flex-shrink-0 space-y-2">
          {loading ? (
            <div className="w-24 h-24 rounded-lg bg-muted animate-pulse" />
          ) : (
            <PokemonSprite
              name={pokemon.name}
              pokemonId={pokemonId}
              pokemon={data as any}
              size="md"
              mode={pokemon.shiny ? 'shiny' : 'front'}
            />
          )}
          <div className="space-y-1">
            <Input
              placeholder="Nickname"
              value={pokemon.name}
              readOnly={readOnly}
              className="text-sm font-medium"
              onChange={(e) => onUpdate?.(index, { name: e.target.value })}
            />
            <Input
              placeholder="Pokémon"
              value={pokemon.species || pokemon.name}
              readOnly={readOnly}
              className="text-xs text-muted-foreground"
              onChange={(e) => onUpdate?.(index, { species: e.target.value })}
            />
          </div>
        </div>

        {/* Middle Column - Details */}
        <div className="flex-1 space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">Details</div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Level:</span>
              <Input
                type="number"
                value={pokemon.level || 50}
                readOnly={readOnly}
                className="h-6 text-xs mt-1"
                onChange={(e) => onUpdate?.(index, { level: parseInt(e.target.value) || 50 })}
              />
            </div>
            <div>
              <span className="text-muted-foreground">Gender:</span>
              <Input
                value={pokemon.gender || '-'}
                readOnly={readOnly}
                className="h-6 text-xs mt-1"
                onChange={(e) => onUpdate?.(index, { gender: e.target.value || undefined })}
              />
            </div>
            <div>
              <span className="text-muted-foreground">Shiny:</span>
              <Input
                value={pokemon.shiny ? 'Yes' : 'No'}
                readOnly={readOnly}
                className="h-6 text-xs mt-1"
                onChange={(e) => onUpdate?.(index, { shiny: e.target.value === 'Yes' })}
              />
            </div>
            <div>
              <span className="text-muted-foreground">Tera Type:</span>
              <div className="flex items-center gap-1 mt-1">
                <Input
                  value={pokemon.teraType || ''}
                  readOnly={readOnly}
                  className="h-6 text-xs flex-1"
                  onChange={(e) => onUpdate?.(index, { teraType: e.target.value || undefined })}
                />
                {pokemon.teraType && (
                  <PokemonTypeIcon type={pokemon.teraType} size={16} />
                )}
              </div>
            </div>
          </div>

          {/* Type Icons */}
          {types.length > 0 && (
            <div className="flex items-center gap-2">
              {types.map((type) => (
                <PokemonTypeIcon key={type} type={type} size={20} />
              ))}
            </div>
          )}

          {/* Item */}
          <div>
            <span className="text-xs text-muted-foreground">Item:</span>
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={pokemon.item || ''}
                readOnly={readOnly}
                placeholder="No item"
                className="h-7 text-xs flex-1"
                onChange={(e) => onUpdate?.(index, { item: e.target.value || undefined })}
              />
              {pokemon.item && (
                <PokemonItemIcon itemName={pokemon.item.toLowerCase().replace(/\s+/g, '-')} size={20} />
              )}
            </div>
          </div>

          {/* Ability */}
          <div>
            <span className="text-xs text-muted-foreground">Ability:</span>
            <Input
              value={pokemon.ability || ''}
              readOnly={readOnly}
              placeholder="No ability"
              className="h-7 text-xs mt-1"
              onChange={(e) => onUpdate?.(index, { ability: e.target.value || undefined })}
            />
          </div>
        </div>

        {/* Right Column - Moves & Stats */}
        <div className="flex-1 space-y-2">
          {/* Action Buttons */}
          {!readOnly && (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
                <Copy className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove?.(index, 'up')}>
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove?.(index, 'down')}>
                <ChevronDown className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDelete?.(index)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Moves */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">Moves</div>
            <div className="space-y-1">
              {[0, 1, 2, 3].map((i) => (
                <Input
                  key={i}
                  value={pokemon.moves[i] || ''}
                  readOnly={readOnly}
                  placeholder={`Move ${i + 1}`}
                  className="h-7 text-xs"
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
            <div className="text-xs font-semibold text-muted-foreground mb-1">Stats</div>
            <div className="space-y-1">
              {calculatedStats && maxStat > 0 ? (
                <>
                  {(['hp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed'] as const).map((statKey) => {
                    const statValue = calculatedStats[statKey];
                    const statLabel = statKey === 'specialAttack' ? 'SpA' : statKey === 'specialDefense' ? 'SpD' : statKey === 'speed' ? 'Spe' : statKey === 'hp' ? 'HP' : statKey.charAt(0).toUpperCase() + statKey.slice(1);
                    const evValue = pokemon.evs?.[statKey === 'hp' ? 'hp' : statKey === 'attack' ? 'atk' : statKey === 'defense' ? 'def' : statKey === 'specialAttack' ? 'spa' : statKey === 'specialDefense' ? 'spd' : 'spe'] || 0;
                    const percentage = (statValue / maxStat) * 100;

                    return (
                      <div key={statKey} className="flex items-center gap-2 text-xs">
                        <div className="w-8 text-right font-medium">{statLabel}</div>
                        <div className="flex-1">
                          <Progress value={percentage} className="h-2" />
                        </div>
                        <div className="w-12 text-right">{statValue}</div>
                        {evValue > 0 && (
                          <div className="w-8 text-right text-muted-foreground">{evValue}</div>
                        )}
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="text-xs text-muted-foreground">Loading stats...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
