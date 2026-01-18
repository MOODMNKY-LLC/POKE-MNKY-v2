'use client';

import { Users, Play, Clock, ExternalLink, ArrowLeft } from 'lucide-react';
import MatchLobby from '@/components/showdown/match-lobby';
import { BattleStrategyChat } from '@/components/ai/battle-strategy-chat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

export default function MatchLobbyPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Navigation */}
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/showdown">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Showdown
        </Link>
      </Button>

      {/* Hero Section */}
      <div className="mb-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Match Lobby</h1>
            <p className="text-muted-foreground mt-1">
              Launch battles and connect with league members
            </p>
          </div>
        </div>
        
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">What is the Match Lobby?</CardTitle>
            <CardDescription>
              Your gateway to league battles and match coordination
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The Match Lobby displays all scheduled and in-progress league matches. From here, 
              you can create private battle rooms, join existing matches, and launch battles 
              directly on our self-hosted Showdown server. Each match shows opponent information, 
              deadlines, and direct links to battle rooms. All battles are automatically tracked 
              and integrated with league standings.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="secondary" className="text-xs">
                <Play className="h-3 w-3 mr-1" />
                Launch Battles
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Track Deadlines
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <ExternalLink className="h-3 w-3 mr-1" />
                Direct Links
              </Badge>
            </div>
            <div className="pt-2">
              <Button 
                variant="outline" 
                size="sm"
                asChild
              >
                <a 
                  href={process.env.NEXT_PUBLIC_SHOWDOWN_CLIENT_URL || 'https://aab-play.moodmnky.com'} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Battle Client
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Match Lobby with Battle Strategy Assistant */}
      <Tabs defaultValue="matches" className="space-y-4">
        <TabsList>
          <TabsTrigger value="matches">Match Lobby</TabsTrigger>
          <TabsTrigger value="strategy">Battle Strategy</TabsTrigger>
        </TabsList>

        <TabsContent value="matches">
          <MatchLobby />
        </TabsContent>

        <TabsContent value="strategy">
          <div className="h-[700px] border rounded-lg overflow-hidden">
            <BattleStrategyChat className="h-full" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
