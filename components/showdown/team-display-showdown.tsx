'use client';

import { useState } from 'react';
import { PokemonTeamEntry } from './pokemon-team-entry';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Copy, Download, Upload } from 'lucide-react';
import { type ParsedPokemon } from '@/lib/team-parser';
import { exportTeamToShowdown } from '@/lib/team-parser';
import { downloadTeamFile } from '@/lib/team-builder-utils';
import { toast } from 'sonner';

interface TeamDisplayShowdownProps {
  pokemon: ParsedPokemon[];
  format?: string;
  generation?: number;
  teamName?: string;
  readOnly?: boolean;
  onUpdate?: (pokemon: ParsedPokemon[]) => void;
  onValidate?: () => void;
  onSave?: () => void;
}

export function TeamDisplayShowdown({
  pokemon,
  format = 'ou',
  generation = 9,
  teamName = 'My Team',
  readOnly = false,
  onUpdate,
  onValidate,
  onSave,
}: TeamDisplayShowdownProps) {
  const [currentFormat, setCurrentFormat] = useState(format);

  const handleCopy = () => {
    const team = {
      pokemon,
      errors: [],
      canonicalText: '',
      metadata: {
        generation,
        format: currentFormat,
        teamName,
      },
    };
    const exported = exportTeamToShowdown(team, {
      includeHeader: true,
      generation,
      format: currentFormat,
      teamName,
    });
    navigator.clipboard.writeText(exported);
    toast.success('Team copied to clipboard');
  };

  const handleDownload = () => {
    const team = {
      pokemon,
      errors: [],
      canonicalText: '',
      metadata: {
        generation,
        format: currentFormat,
        teamName,
      },
    };
    const exported = exportTeamToShowdown(team, {
      includeHeader: true,
      generation,
      format: currentFormat,
      teamName,
    });
    const filename = `[gen${generation}${currentFormat}] ${teamName}.txt`;
    downloadTeamFile(exported, filename);
    toast.success('Team downloaded');
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between pb-3 border-b">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Format:</span>
            <Select value={currentFormat} onValueChange={setCurrentFormat} disabled={readOnly}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ou">OU</SelectItem>
                <SelectItem value="uu">UU</SelectItem>
                <SelectItem value="vgc">VGC</SelectItem>
                <SelectItem value="lc">LC</SelectItem>
                <SelectItem value="monotype">Monotype</SelectItem>
                <SelectItem value="1v1">1v1</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={onValidate} className="h-9">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Validate
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="h-9">
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} className="h-9">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          {!readOnly && onSave && (
            <Button size="sm" onClick={onSave} className="h-9">
              <Upload className="h-4 w-4 mr-2" />
              Save Team
            </Button>
          )}
        </div>
      </div>

      {/* Pokemon List - Showdown Style */}
      <div className="bg-background rounded-lg border">
        {pokemon.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium mb-2">No Pokemon in team</p>
            <p className="text-sm">Add Pokemon to build your team</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {pokemon.map((pkmn, index) => (
              <PokemonTeamEntry
                key={`${pkmn.name}-${index}`}
                pokemon={pkmn}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer Summary */}
      {pokemon.length > 0 && (
        <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>{pokemon.length} Pokemon</span>
            {generation && (
              <Badge variant="outline" className="text-xs">Gen {generation}</Badge>
            )}
            {currentFormat && (
              <Badge variant="outline" className="text-xs">{currentFormat.toUpperCase()}</Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
