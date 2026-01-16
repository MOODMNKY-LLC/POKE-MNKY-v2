'use client';

import { use } from 'react';
import { ArrowLeft, History, Calendar, Users, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ReplayViewer } from '@/components/showdown/replay-viewer';
import { extractReplayId } from '@/lib/showdown/replay-utils';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ReplayDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const replayId = extractReplayId(id) || id;

  // Try to fetch match data for this replay
  // This would ideally come from your database
  // For now, we'll just show the replay viewer

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Navigation */}
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/showdown/replay-library">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Replay Library
        </Link>
      </Button>

      {/* Header */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <History className="h-6 w-6 text-orange-500" />
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-bold">Battle Replay</h1>
            <p className="text-muted-foreground mt-1">
              Watch and analyze this battle replay
            </p>
          </div>
        </div>

        {/* Replay Info Card */}
        <Card className="bg-muted/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Replay Information</CardTitle>
                <CardDescription>
                  Battle replay details and metadata
                </CardDescription>
              </div>
              <Badge variant="outline">Replay</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Replay ID</p>
                  <p className="text-xs text-muted-foreground font-mono">{replayId}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Date</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">External Link</p>
                  <a
                    href={`https://aab-replay.moodmnky.com/${replayId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View on Showdown
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Replay Viewer */}
      <Card>
        <CardHeader>
          <CardTitle>Replay Viewer</CardTitle>
          <CardDescription>
            Use the controls below to play, pause, and navigate through the battle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReplayViewer 
            replayIdOrUrl={replayId}
            height="800px"
            showExternalLink={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
