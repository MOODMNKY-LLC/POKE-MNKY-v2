'use client';

import { Library, Upload, Search, Filter, ArrowLeft } from 'lucide-react';
import TeamLibrary from '@/components/showdown/team-library';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function TeamLibraryPage() {
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
          <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Library className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Team Library</h1>
            <p className="text-muted-foreground mt-1">
              Your complete collection of Pokémon Showdown teams
            </p>
          </div>
        </div>
        
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">What is the Team Library?</CardTitle>
            <CardDescription>
              Manage, organize, and share your battle-ready teams
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The Team Library is your central hub for all Pokémon Showdown teams. Browse through 
              stock teams curated for the league, manage your custom builds, and organize your 
              collection with tags and filters. Each team includes full details with sprites, 
              movesets, items, and EV spreads displayed in the authentic Showdown format.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="secondary" className="text-xs">
                <Search className="h-3 w-3 mr-1" />
                Search & Filter
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <Upload className="h-3 w-3 mr-1" />
                Import Teams
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <Filter className="h-3 w-3 mr-1" />
                Organize by Format
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Library Component */}
      <TeamLibrary />
    </div>
  );
}
