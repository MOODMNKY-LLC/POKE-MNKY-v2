'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Folder, Download, Copy, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TeamDisplayShowdown } from './team-display-showdown';
import { TeamPokemonCardMini } from './team-pokemon-card-mini';
import { useTeamPokemonBatch } from './use-team-pokemon-batch';
import { type ParsedPokemon } from '@/lib/team-parser';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TeamCardProps {
  team: {
    id: string;
    team_name: string;
    generation?: number;
    format?: string;
    folder_path?: string;
    pokemon_count: number;
    is_validated: boolean;
    tags?: string[];
    user_tags?: string[];
    notes?: string;
    created_at: string;
    canonical_text: string;
    is_stock?: boolean;
    pokemon_data?: ParsedPokemon[];
  };
  viewMode: 'grid' | 'list';
  onExport: (team: any) => Promise<void>;
  onDelete: (teamId: string) => Promise<void>;
  onCopy: (text: string) => void;
}

export function TeamCard({ team, viewMode, onExport, onDelete, onCopy }: TeamCardProps) {
  // Batch fetch Pokemon data for this team
  const { getPokemonData, loading: pokemonLoading } = useTeamPokemonBatch({
    pokemon: team.pokemon_data || [],
    enabled: Array.isArray(team.pokemon_data) && team.pokemon_data.length > 0,
  });

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <CardTitle className="text-lg">{team.team_name}</CardTitle>
          <Badge variant={team.is_validated ? 'default' : 'secondary'}>
            {team.is_validated ? 'Validated' : 'Draft'}
          </Badge>
        </div>
        <CardDescription className="flex flex-wrap gap-2">
          {team.generation && (
            <Badge variant="outline">Gen {team.generation}</Badge>
          )}
          {team.format && (
            <Badge variant="outline">{team.format.toUpperCase()}</Badge>
          )}
          {team.folder_path && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Folder className="h-3 w-3" />
              {team.folder_path.split('/').pop()}
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Pokemon Sprites with Names and Types */}
        {Array.isArray(team.pokemon_data) && team.pokemon_data.length > 0 ? (
          <div className={`flex flex-wrap ${viewMode === 'list' ? 'gap-3' : 'gap-2'}`}>
            {team.pokemon_data.slice(0, 6).map((pkmn, idx) => (
              <TeamPokemonCardMini
                key={`${team.id}-${pkmn.name}-${idx}`}
                pokemon={pkmn}
                pokemonData={getPokemonData(pkmn)}
                loading={pokemonLoading}
                size={viewMode === 'list' ? 'md' : 'sm'}
                viewMode={viewMode}
              />
            ))}
            {team.pokemon_data.length > 6 && (
              <div className={cn(
                'flex flex-col items-center justify-center rounded bg-muted text-xs text-muted-foreground',
                viewMode === 'list' ? 'w-24 h-24' : 'w-16 h-16'
              )}>
                <span className="font-semibold">+{team.pokemon_data.length - 6}</span>
                <span className="text-[10px]">more</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{team.pokemon_count} Pokemon</span>
          </div>
        )}
        
        <div className="text-sm text-muted-foreground">
          {new Date(team.created_at).toLocaleDateString()}
        </div>
        
        {(team.tags && team.tags.length > 0) || (team.user_tags && team.user_tags.length > 0) ? (
          <div className="flex flex-wrap gap-1">
            {team.tags?.map((tag, i) => (
              <Badge key={`tag-${i}`} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {team.user_tags?.map((tag, i) => (
              <Badge key={`user-tag-${i}`} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="flex gap-2 pt-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Copy className="h-3 w-3 mr-1" />
                View
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto scrollbar-hide">
              <DialogHeader>
                <DialogTitle>{team.team_name}</DialogTitle>
                <DialogDescription>
                  {team.generation && `Gen ${team.generation}`}
                  {team.format && ` • ${team.format.toUpperCase()}`}
                  {team.folder_path && ` • ${team.folder_path}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {Array.isArray(team.pokemon_data) && team.pokemon_data.length > 0 ? (
                  <TeamDisplayShowdown
                    pokemon={team.pokemon_data as ParsedPokemon[]}
                    format={team.format}
                    generation={team.generation}
                    teamName={team.team_name}
                    readOnly={true}
                  />
                ) : (
                  <div className="p-8 text-center text-muted-foreground border rounded-lg">
                    <p>Team data not available</p>
                    <p className="text-sm mt-2">Pokemon data may not be loaded</p>
                    <div className="mt-4 flex gap-2 justify-center">
                      <Button
                        variant="outline"
                        onClick={() => onCopy(team.canonical_text)}
                        size="sm"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Text Format
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => onExport(team)}
                        size="sm"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport(team)}
          >
            <Download className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(team.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
