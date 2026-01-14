'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Copy, Loader2, FileText, Upload, Info, Save } from 'lucide-react';
import { toast } from 'sonner';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  team?: {
    pokemon: Array<{
      name: string;
      item?: string;
      ability?: string;
      moves: string[];
    }>;
    count: number;
  };
  canonical_text?: string;
  metadata?: {
    generation?: number;
    format?: string;
    folder?: string;
    teamName?: string;
  };
}

export default function TeamValidator() {
  const [teamText, setTeamText] = useState('');
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.txt') && !file.name.endsWith('.team')) {
      toast.error('Please upload a .txt or .team file');
      return;
    }

    try {
      const text = await file.text();
      setTeamText(text);
      toast.success('Team file loaded');
    } catch (error) {
      console.error('Failed to read file:', error);
      toast.error('Failed to read file');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleValidate = async () => {
    if (!teamText.trim()) {
      toast.error('Please paste a Showdown team export');
      return;
    }

    setValidating(true);
    setResult(null);

    try {
      const response = await fetch('/api/showdown/validate-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ team_text: teamText })
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        if (data.valid) {
          toast.success('Team is valid!');
        } else {
          toast.error(`Team validation failed: ${data.errors.length} error(s)`);
        }
      } else {
        toast.error(data.error || 'Failed to validate team');
        setResult({
          valid: false,
          errors: [data.error || 'Validation failed']
        });
      }
    } catch (error) {
      console.error('Failed to validate team:', error);
      toast.error('Failed to validate team. Please try again.');
      setResult({
        valid: false,
        errors: ['Network error. Please try again.']
      });
    } finally {
      setValidating(false);
    }
  };

  const handleCopyCanonical = () => {
    if (result?.canonical_text) {
      navigator.clipboard.writeText(result.canonical_text);
      toast.success('Canonical team text copied to clipboard');
    }
  };

  const handleSaveTeam = async () => {
    if (!result?.valid || !teamText.trim()) {
      toast.error('Team must be valid before saving');
      return;
    }

    try {
      const response = await fetch('/api/showdown/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          team_text: teamText,
          team_name: result.metadata?.teamName,
          tags: result.metadata?.format ? [result.metadata.format] : [],
          source: 'validator'
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Team saved successfully!');
      } else {
        toast.error(data.error || 'Failed to save team');
      }
    } catch (error) {
      console.error('Failed to save team:', error);
      toast.error('Failed to save team. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Team Validator</h2>
        <p className="text-muted-foreground">
          Paste your Showdown team export to validate it against your drafted roster and league rules
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paste Team Export</CardTitle>
          <CardDescription>
            Copy your team from Showdown and paste it here to validate
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              type="file"
              accept=".txt,.team"
              onChange={handleFileSelect}
              className="hidden"
              id="team-file-upload"
            />
            <label htmlFor="team-file-upload">
              <Button variant="outline" type="button" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </span>
              </Button>
            </label>
          </div>

          <Textarea
            placeholder="=== [gen9] My Team ===&#10;&#10;Pikachu @ Light Ball&#10;Ability: Static&#10;Level: 50&#10;EVs: 252 Atk / 4 SpD / 252 Spe&#10;Jolly Nature&#10;- Thunderbolt&#10;- Quick Attack&#10;- Iron Tail&#10;- Brick Break"
            value={teamText}
            onChange={(e) => setTeamText(e.target.value)}
            className="min-h-[200px] font-mono text-sm"
          />
          
          <Button
            onClick={handleValidate}
            disabled={validating || !teamText.trim()}
            className="w-full"
          >
            {validating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Validate Team
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Validation Results</CardTitle>
              <Badge variant={result.valid ? 'default' : 'destructive'}>
                {result.valid ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Valid
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Invalid
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.metadata && (result.metadata.teamName || result.metadata.generation) && (
              <div className="p-3 rounded-md border bg-muted/50 space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Info className="h-4 w-4" />
                  Team Metadata
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {result.metadata.teamName && (
                    <div>
                      <span className="font-medium">Name:</span> {result.metadata.teamName}
                    </div>
                  )}
                  {result.metadata.generation && (
                    <div>
                      <span className="font-medium">Generation:</span> Gen {result.metadata.generation}
                    </div>
                  )}
                  {result.metadata.format && (
                    <div>
                      <span className="font-medium">Format:</span> {result.metadata.format}
                    </div>
                  )}
                  {result.metadata.folder && (
                    <div>
                      <span className="font-medium">Folder:</span> {result.metadata.folder}
                    </div>
                  )}
                </div>
              </div>
            )}

            {result.valid ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Your team is valid and ready for battle!
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">Validation Errors:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {result.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {result.team && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">
                  Team Composition: {result.team.count} Pokemon
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  {result.team.pokemon.map((pokemon, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-md border bg-muted/50 text-sm"
                    >
                      <div className="font-medium">{pokemon.name}</div>
                      {pokemon.item && (
                        <div className="text-muted-foreground text-xs">
                          Item: {pokemon.item}
                        </div>
                      )}
                      {pokemon.ability && (
                        <div className="text-muted-foreground text-xs">
                          Ability: {pokemon.ability}
                        </div>
                      )}
                      {pokemon.moves.length > 0 && (
                        <div className="text-muted-foreground text-xs mt-1">
                          Moves: {pokemon.moves.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.canonical_text && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Canonical Team Text</p>
                  <div className="flex gap-2">
                    {result.valid && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleSaveTeam}
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Save Team
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyCanonical}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={result.canonical_text}
                  readOnly
                  className="font-mono text-xs min-h-[100px]"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
