'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Loader2, 
  Folder, 
  Download, 
  Copy, 
  Edit, 
  Trash2,
  Filter,
  Grid,
  List
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TeamCard } from './team-card';
import { type ParsedPokemon } from '@/lib/team-parser';

interface ShowdownTeam {
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
}

export default function TeamLibrary() {
  const [teams, setTeams] = useState<ShowdownTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [generationFilter, setGenerationFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchTeams();
  }, [formatFilter, generationFilter]);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (formatFilter !== 'all') params.append('format', formatFilter);
      if (generationFilter !== 'all') params.append('generation', generationFilter);

      const response = await fetch(`/api/showdown/teams?${params.toString()}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData.error || `Failed to fetch teams (${response.status})`;
        console.error('Failed to fetch teams:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setTeams(data.teams || []);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load teams';
      toast.error(errorMessage);
      setTeams([]); // Clear teams on error
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchTeams();
  };

  const handleDelete = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) {
      return;
    }

    try {
      const response = await fetch(`/api/showdown/teams/${teamId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete team');
      }

      toast.success('Team deleted');
      fetchTeams();
    } catch (error) {
      console.error('Failed to delete team:', error);
      toast.error('Failed to delete team');
    }
  };

  const handleExport = async (team: ShowdownTeam) => {
    try {
      const response = await fetch(`/api/showdown/teams/${team.id}?export=showdown`, {
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData.error || `Failed to export team (${response.status})`;
        console.error('Failed to export team:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (!data.exported_text) {
        throw new Error('No exported text received');
      }
      navigator.clipboard.writeText(data.exported_text);
      toast.success('Team exported to clipboard');
    } catch (error) {
      console.error('Failed to export team:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to export team';
      toast.error(errorMessage);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Team Library</h2>
        <p className="text-muted-foreground">
          Browse and manage your saved Pokemon Showdown teams
        </p>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search teams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={formatFilter} onValueChange={setFormatFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                <SelectItem value="ou">OU</SelectItem>
                <SelectItem value="uu">UU</SelectItem>
                <SelectItem value="vgc">VGC</SelectItem>
                <SelectItem value="lc">LC</SelectItem>
                <SelectItem value="monotype">Monotype</SelectItem>
                <SelectItem value="1v1">1v1</SelectItem>
              </SelectContent>
            </Select>
            <Select value={generationFilter} onValueChange={setGenerationFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Generation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Generations</SelectItem>
                <SelectItem value="9">Gen 9</SelectItem>
                <SelectItem value="8">Gen 8</SelectItem>
                <SelectItem value="7">Gen 7</SelectItem>
                <SelectItem value="6">Gen 6</SelectItem>
                <SelectItem value="4">Gen 4</SelectItem>
                <SelectItem value="2">Gen 2</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teams Grid/List */}
      {teams.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-2">No teams found</p>
          <p className="text-sm">
            {searchQuery || formatFilter !== 'all' || generationFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Upload or import teams to get started'}
          </p>
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' 
          : 'space-y-4'
        }>
          {teams.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              viewMode={viewMode}
              onExport={handleExport}
              onDelete={handleDelete}
              onCopy={handleCopy}
            />
          ))}
        </div>
      )}
    </div>
  );
}
