'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Swords, 
  Library, 
  Users, 
  FileText, 
  History,
  ExternalLink,
  CheckCircle2,
  Zap,
  Shield,
  PlayCircle
} from 'lucide-react';
import Link from 'next/link';

export function ShowdownLanding() {
  const features = [
    {
      icon: Library,
      title: 'Team Library',
      description: 'Browse and manage your saved Pokémon Showdown teams. Import stock teams, create custom builds, and organize your collection.',
      href: '/showdown/team-library',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: Users,
      title: 'Match Lobby',
      description: 'Launch battles, find opponents, and create private battle rooms. Connect with league members for scheduled matches.',
      href: '/showdown/match-lobby',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      icon: FileText,
      title: 'Team Validator',
      description: 'Validate your team compositions against league rules. Check for banned moves, verify legal Pokémon, and ensure compliance.',
      href: '/showdown/team-validator',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      icon: History,
      title: 'Replay Library',
      description: 'Browse battle replays from league matches. Study strategies, review past battles, and learn from the community.',
      href: '/showdown/replay-library',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  const benefits = [
    {
      icon: Shield,
      title: 'Showdown-Level Accuracy',
      description: 'Our self-hosted Showdown server ensures battle calculations match the official simulator exactly.',
    },
    {
      icon: Zap,
      title: 'Seamless Integration',
      description: 'Teams, matches, and replays sync automatically with your league data. No manual data entry required.',
    },
    {
      icon: CheckCircle2,
      title: 'League-Specific Rules',
      description: 'Custom formats and rulesets tailored to Average at Best Draft League requirements.',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Swords className="h-12 w-12 text-primary" />
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Pokémon Showdown
          </h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Your integrated battle simulator and team management hub for the Average at Best Draft League
        </p>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Badge variant="secondary" className="text-sm">
            Self-Hosted Infrastructure
          </Badge>
          <Badge variant="secondary" className="text-sm">
            League-Optimized
          </Badge>
          <Badge variant="secondary" className="text-sm">
            Fully Integrated
          </Badge>
        </div>
      </div>

      {/* What is Showdown Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-primary" />
            What is Pokémon Showdown?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Pokémon Showdown is the industry-standard battle simulator used by competitive Pokémon players worldwide. 
            It provides accurate damage calculations, move legality validation, and real-time battle mechanics that match 
            the official games exactly.
          </p>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="font-semibold">How We Use Showdown:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Self-hosted Showdown server running in our infrastructure for league-exclusive access</li>
              <li>Deep integration with league rosters, schedules, and match results</li>
              <li>Automatic team validation against league rules and banned moves</li>
              <li>Replay capture and storage for all league battles</li>
              <li>Custom formats tailored to our draft league structure</li>
            </ul>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" size="sm" asChild>
              <a 
                href={process.env.NEXT_PUBLIC_SHOWDOWN_CLIENT_URL || 'https://aab-play.moodmnky.com'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Launch Battle Client
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">
              Opens our self-hosted Showdown client in a new tab
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Benefits Section */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Why Use Our Showdown Integration?</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {benefits.map((benefit, idx) => (
            <Card key={idx}>
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg ${benefit.icon === Shield ? 'bg-blue-500/10' : benefit.icon === Zap ? 'bg-yellow-500/10' : 'bg-green-500/10'} flex items-center justify-center mb-2`}>
                  <benefit.icon className={`h-6 w-6 ${benefit.icon === Shield ? 'text-blue-500' : benefit.icon === Zap ? 'text-yellow-500' : 'text-green-500'}`} />
                </div>
                <CardTitle className="text-lg">{benefit.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Explore Our Showdown Tools</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card key={idx} className="hover:shadow-lg transition-shadow group">
                <CardHeader>
                  <div className={`w-14 h-14 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-7 w-7 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base mt-2">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href={feature.href}>
                      Open {feature.title}
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Quick Start Guide */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>Quick Start Guide</CardTitle>
          <CardDescription>
            New to Showdown or our integration? Here's how to get started:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li className="text-muted-foreground">
              <span className="font-semibold text-foreground">Browse Stock Teams:</span> Visit the <Link href="/showdown/team-library" className="text-primary hover:underline">Team Library</Link> for pre-built teams you can use as starting points.
            </li>
            <li className="text-muted-foreground">
              <span className="font-semibold text-foreground">Validate Your Team:</span> Use the <Link href="/showdown/team-validator" className="text-primary hover:underline">Team Validator</Link> to ensure your team complies with league rules before battling.
            </li>
            <li className="text-muted-foreground">
              <span className="font-semibold text-foreground">Launch a Battle:</span> Head to the <Link href="/showdown/match-lobby" className="text-primary hover:underline">Match Lobby</Link> to create a battle room or join an existing match.
            </li>
            <li className="text-muted-foreground">
              <span className="font-semibold text-foreground">Review Replays:</span> After your battle, check the <Link href="/showdown/replay-library" className="text-primary hover:underline">Replay Library</Link> to study your performance and learn from others.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
