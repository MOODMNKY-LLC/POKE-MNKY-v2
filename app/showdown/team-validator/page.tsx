'use client';

import { FileText, CheckCircle2, AlertTriangle, Upload, ArrowLeft } from 'lucide-react';
import TeamValidator from '@/components/showdown/team-validator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function TeamValidatorPage() {
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
          <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Team Validator</h1>
            <p className="text-muted-foreground mt-1">
              Ensure your teams comply with league rules
            </p>
          </div>
        </div>
        
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">What is the Team Validator?</CardTitle>
            <CardDescription>
              Validate teams against league rules before battling
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The Team Validator checks your Pokémon Showdown team files against league-specific 
              rules and restrictions. Upload a team file or paste team text to verify banned moves, 
              illegal Pokémon combinations, item restrictions, and format compliance. Get detailed 
              error messages and suggestions to fix any issues before your match. This ensures fair 
              play and prevents rule violations that could result in match forfeits.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="secondary" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Rule Compliance
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Error Detection
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <Upload className="h-3 w-3 mr-1" />
                File Upload
              </Badge>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-4">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Important: Teams that fail validation may result in a 0-6 loss per league rules
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Validator Component */}
      <TeamValidator />
    </div>
  );
}
