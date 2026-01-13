"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Swords, Brain, Zap, Play, History, Users, Sparkles, Shield, Target, Clock } from "lucide-react"
import Link from "next/link"

export default function ShowdownPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Swords className="h-12 w-12 text-primary" />
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Showdown
          </h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Your in-app battle simulator and team building hub. Coming soon with Showdown-accurate battle mechanics,
          AI opponents, and comprehensive team analysis.
        </p>
      </div>

      {/* Coming Soon Badge */}
      <div className="flex justify-center mb-8">
        <Badge variant="outline" className="text-lg px-4 py-2 border-primary text-primary">
          <Clock className="h-4 w-4 mr-2" />
          Coming Soon
        </Badge>
      </div>

      {/* Feature Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
        {/* Battle Simulator */}
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Swords className="h-5 w-5 text-primary" />
              <CardTitle>Battle Simulator</CardTitle>
            </div>
            <CardDescription>
              Turn-based battles with Showdown-accurate mechanics using @pkmn/engine
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Legal move validation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Turn-by-turn logging</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Complete battle history</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Battle replay system</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Team Builder */}
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle>Team Builder</CardTitle>
            </div>
            <CardDescription>
              Build and optimize your team with draft budget tracking and type coverage analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground mb-4">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Point budget management</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Type coverage analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>AI-powered suggestions</span>
              </li>
            </ul>
            <Button asChild variant="outline" className="w-full">
              <Link href="/teams/builder">
                <Brain className="h-4 w-4 mr-2" />
                Open Team Builder
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* AI Opponents */}
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle>AI Opponents</CardTitle>
            </div>
            <CardDescription>
              Battle against AI-powered opponents using OpenAI GPT-4.1 for strategic move selection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>GPT-4.1 powered decisions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Legal move enforcement</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Adaptive difficulty</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Strategic reasoning</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Battle History */}
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <History className="h-5 w-5 text-primary" />
              <CardTitle>Battle History</CardTitle>
            </div>
            <CardDescription>
              Review past battles, analyze strategies, and learn from your matches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Complete battle logs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Turn-by-turn replay</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Statistics tracking</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* League Integration */}
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>League Integration</CardTitle>
            </div>
            <CardDescription>
              Connect battles to official league matches and standings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Official match battles</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Result submission</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Standings integration</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Strategy Analysis */}
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>Strategy Analysis</CardTitle>
            </div>
            <CardDescription>
              AI-powered team analysis and strategic recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Team composition analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Weakness identification</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Matchup predictions</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Technical Details */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Technical Architecture</CardTitle>
          <CardDescription>Built with Showdown-accurate battle mechanics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Battle Engine
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                Powered by <code className="bg-muted px-1 rounded">@pkmn/engine</code> and{" "}
                <code className="bg-muted px-1 rounded">@pkmn/dex</code> for Showdown-accurate simulation.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Legal move validation</li>
                <li>• Format rule enforcement</li>
                <li>• Turn-by-turn state management</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                AI Integration
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                OpenAI GPT-4.1 for constrained decision-making and GPT-5.2 for strategic analysis.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Legal move selection</li>
                <li>• Strategic reasoning</li>
                <li>• Team composition advice</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <div className="text-center">
        <Button asChild size="lg" className="bg-gradient-to-r from-primary to-secondary">
          <Link href="/teams/builder">
            <Play className="h-5 w-5 mr-2" />
            Start Building Your Team
          </Link>
        </Button>
      </div>
    </div>
  )
}
