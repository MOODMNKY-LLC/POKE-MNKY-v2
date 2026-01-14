'use client';

import { useState } from 'react';
import { PokemonTeamCard } from './pokemon-team-card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Copy, Download, Upload } from 'lucide-react';
import { type ParsedPokemon } from '@/lib/team-parser';
import { exportTeamToShowdown } from '@/lib/team-parser';
import { downloadTeamFile } from '@/lib/team-builder-utils';
import { toast } from 'sonner';

interface TeamVisualDisplayProps {
  pokemon: ParsedPokemon[];
  format?: string;
  generation?: number;
  teamName?: string;
  readOnly?: boolean;
  onUpdate?: (pokemon: ParsedPokemon[]) => void;
  onValidate?: () => void;
  onSave?: () => void;
}

export function TeamVisualDisplay({
  pokemon,
  format = 'ou',
  generation = 9,
  teamName = 'My Team',
  readOnly = false,
  onUpdate,
  onValidate,
  onSave,
}: TeamVisualDisplayProps) {
  const [currentFormat, setCurrentFormat] = useState(format);
  const [teamPokemon, setTeamPokemon] = useState<ParsedPokemon[]>(pokemon);

  const handleUpdate = (index: number, updates: Partial<ParsedPokemon>) => {
    const updated = [...teamPokemon];
    updated[index] = { ...updated[index], ...updates };
    setTeamPokemon(updated);
    onUpdate?.(updated);
  };

  const handleDelete = (index: number) => {
    const updated = teamPokemon.filter((_, i) => i !== index);
    setTeamPokemon(updated);
    onUpdate?.(updated);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === teamPokemon.length - 1) return;

    const updated = [...teamPokemon];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setTeamPokemon(updated);
    onUpdate?.(updated);
  };

  const handleCopy = () => {
    const team = {
      pokemon: teamPokemon,
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
      pokemon: teamPokemon,
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
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Format:</span>
            <Select value={currentFormat} onValueChange={setCurrentFormat} disabled={readOnly}>
              <SelectTrigger className="w-[180px]">
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
            <Button variant="outline" size="sm" onClick={onValidate}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Validate
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          {!readOnly && onSave && (
            <Button size="sm" onClick={onSave}>
              <Upload className="h-4 w-4 mr-2" />
              Save Team
            </Button>
          )}
        </div>
      </div>

      {/* Pokemon Cards */}
      <div className="space-y-3">
        {teamPokemon.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No Pokemon in team</p>
            <p className="text-sm mt-2">Add Pokemon to build your team</p>
          </div>
        ) : (
          teamPokemon.map((pkmn, index) => (
            <PokemonTeamCard
              key={index}
              pokemon={pkmn}
              index={index}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onMove={handleMove}
              readOnly={readOnly}
            />
          ))
        )}
      </div>

      {/* Team Summary */}
      {teamPokemon.length > 0 && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">
                {teamPokemon.length} Pokemon
              </span>
              {generation && (
                <Badge variant="outline">Gen {generation}</Badge>
              )}
              {currentFormat && (
                <Badge variant="outline">{currentFormat.toUpperCase()}</Badge>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
