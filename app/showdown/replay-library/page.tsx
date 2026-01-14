'use client';

import { History, ExternalLink, Calendar, TrendingUp, ArrowLeft } from 'lucide-react';
import ReplayLibrary from '@/components/showdown/replay-library';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ReplayLibraryPage() {
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
          <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <History className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Replay Library</h1>
            <p className="text-muted-foreground mt-1">
              Browse and study battle replays from league matches
            </p>
          </div>
        </div>
        
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">What is the Replay Library?</CardTitle>
            <CardDescription>
              Learn from past battles and study competitive strategies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The Replay Library contains all completed league battle replays from our Showdown 
              server. Browse matches by week, study team compositions and strategies, and learn 
              from the community's best plays. Each replay includes full battle details, team 
              information, and direct links to watch the replay on Showdown. Use this resource 
              to improve your gameplay, scout opponents, and understand the evolving meta.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="secondary" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                Weekly Archives
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <ExternalLink className="h-3 w-3 mr-1" />
                Watch Replays
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                Strategy Analysis
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Replay Library Component */}
      <ReplayLibrary />
    </div>
  );
}
