'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PokeballIcon } from '@/components/ui/pokeball-icon';
import { ExternalLink, Play, Clock, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Match {
  id: string;
  week: number;
  team1?: { name: string; coach_name?: string };
  team2?: { name: string; coach_name?: string };
  status: string;
  showdown_room_url?: string;
  showdown_room_id?: string;
  deadline?: string;
}

export default function MatchLobby() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await fetch('/api/matches');
      const data = await response.json();
      
      // Filter for scheduled and in_progress matches
      // Handle both { matches: [...] } and direct array responses
      const matchesArray = Array.isArray(data) ? data : (data.matches || []);
      const filteredMatches = matchesArray.filter(
        (match: Match) => match.status === 'scheduled' || match.status === 'in_progress'
      );
      
      setMatches(filteredMatches);
    } catch (error) {
      console.error('Failed to fetch matches:', error);
      toast.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchBattle = async (matchId: string) => {
    setCreating(matchId);
    try {
      const response = await fetch('/api/showdown/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ match_id: matchId })
      });

      const result = await response.json();

      if (result.success && result.room_url) {
        toast.success('Battle room created!');
        // Open Showdown room in new tab
        window.open(result.room_url, '_blank');
        // Refresh matches to show updated status
        await fetchMatches();
      } else {
        toast.error(`Failed to create battle room: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to launch battle:', error);
      toast.error('Failed to launch battle. Please try again.');
    } finally {
      setCreating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading matches...</p>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-2">No upcoming matches found</p>
        <p className="text-sm">Matches will appear here when they are scheduled</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Upcoming Matches</h2>
        <p className="text-muted-foreground">
          Launch Showdown battle rooms for your scheduled matches
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {matches.map(match => (
          <Card key={match.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-lg">Week {match.week}</CardTitle>
                <Badge 
                  variant={match.status === 'in_progress' ? 'default' : 'secondary'}
                >
                  {match.status === 'in_progress' ? 'In Progress' : 'Scheduled'}
                </Badge>
              </div>
              <CardDescription>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{match.team1?.name || 'Team 1'}</span>
                    {match.team1?.coach_name && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <PokeballIcon role="coach" size="xs" />
                        <span>{match.team1.coach_name}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-muted-foreground">vs</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{match.team2?.name || 'Team 2'}</span>
                    {match.team2?.coach_name && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <PokeballIcon role="coach" size="xs" />
                        <span>{match.team2.coach_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {match.deadline && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Deadline: {new Date(match.deadline).toLocaleDateString()}</span>
                </div>
              )}
              
              {match.showdown_room_url ? (
                <Button
                  onClick={() => window.open(match.showdown_room_url, '_blank')}
                  className="w-full"
                  variant="default"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Join Battle Room
                </Button>
              ) : (
                <Button
                  onClick={() => handleLaunchBattle(match.id)}
                  className="w-full"
                  disabled={creating === match.id}
                >
                  {creating === match.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Launch Battle
                    </>
                  )}
                </Button>
              )}
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/matches/${match.id}`)}
              >
                View Match Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
