'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, History, Loader2, Calendar, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { extractReplayId } from '@/lib/showdown/replay-utils';

interface Match {
  id: string;
  week: number;
  team1?: { name: string };
  team2?: { name: string };
  status: string;
  showdown_room_url?: string;
  showdown_room_id?: string;
  created_at?: string;
  completed_at?: string;
}

export default function ReplayLibrary() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchReplays();
  }, []);

  const fetchReplays = async () => {
    try {
      const response = await fetch('/api/matches');
      const data = await response.json();
      
      // Handle both { matches: [...] } and direct array responses
      const matchesArray = Array.isArray(data) ? data : (data.matches || []);
      
      // Filter for completed matches with Showdown room URLs
      const completedMatches = matchesArray.filter(
        (match: Match) => 
          match.status === 'completed' && 
          match.showdown_room_url
      );
      
      // Sort by completed_at or created_at descending (most recent first)
      completedMatches.sort((a: Match, b: Match) => {
        const dateA = a.completed_at || a.created_at || '';
        const dateB = b.completed_at || b.created_at || '';
        return dateB.localeCompare(dateA);
      });
      
      setMatches(completedMatches);
    } catch (error) {
      console.error('Failed to fetch replays:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading replays...</p>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg mb-2">No replays available</p>
        <p className="text-sm">Completed battles with Showdown rooms will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Replay Library</h2>
        <p className="text-muted-foreground">
          Review past battles and analyze strategies from completed matches
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {matches.map(match => (
          <Card key={match.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-lg">Week {match.week}</CardTitle>
                <Badge variant="outline">Completed</Badge>
              </div>
              <CardDescription>
                {match.team1?.name || 'Team 1'} vs {match.team2?.name || 'Team 2'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(match.completed_at || match.created_at) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(match.completed_at || match.created_at || '').toLocaleDateString()}
                  </span>
                </div>
              )}
              
              {match.showdown_room_url && (
                <Button
                  onClick={() => {
                    // Extract replay ID from room URL or use showdown_room_id
                    const replayId = extractReplayId(match.showdown_room_url) || match.showdown_room_id;
                    
                    if (replayId) {
                      router.push(`/showdown/replay/${replayId}`);
                    } else {
                      // Fallback to external link
                      window.open(match.showdown_room_url, '_blank');
                    }
                  }}
                  className="w-full"
                  variant="default"
                >
                  <History className="h-4 w-4 mr-2" />
                  Watch Replay
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
