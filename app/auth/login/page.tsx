"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import { MessageSquare, Mail, Lock, Sparkles, Users, Trophy, Zap } from "lucide-react"
import { PokemonSprite } from "@/components/pokemon-sprite"

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDiscordLoading, setIsDiscordLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Handle error from OAuth callback
  useEffect(() => {
    const errorParam = searchParams.get("error")
    const messageParam = searchParams.get("message")
    if (errorParam) {
      setError(messageParam || "Authentication failed. Please try again.")
    }
  }, [searchParams])

  const handleDiscordSignIn = async () => {
    const supabase = createClient()
    setIsDiscordLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to sign in with Discord")
      setIsDiscordLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push("/admin")
      router.refresh()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side - Auth Form */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-pokemon">Average at Best</h1>
            <p className="text-muted-foreground">Pokémon Battle League Platform</p>
          </div>

          {/* Auth Card */}
          <Card className="border-2">
            <CardHeader className="text-center space-y-1">
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>Sign in to your account to continue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Discord OAuth - Primary */}
              <div className="space-y-3">
                <Button
                  onClick={handleDiscordSignIn}
                  disabled={isDiscordLoading}
                  className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white h-12 text-base font-medium"
                  size="lg"
                >
                  <MessageSquare className="mr-2 h-5 w-5" />
                  {isDiscordLoading ? "Connecting..." : "Continue with Discord"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Recommended for coaches and players
                </p>
              </div>

              {/* Separator */}
              <div className="relative">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                  Or continue with email
                </span>
              </div>

              {/* Email/Password Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive text-center">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full h-11" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              {/* Footer Link */}
              <div className="text-center">
                <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  ← Back to Home
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Side - App Info */}
      <div className="hidden lg:flex items-center justify-center p-12 bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }} />
        </div>

        <div className="relative z-10 w-full max-w-lg space-y-8 text-center">
          {/* Logo/Branding */}
          <div className="space-y-4">
            <div className="flex justify-center gap-4">
              <PokemonSprite name="Pikachu" pokemonId={25} size="xl" mode="artwork" />
              <PokemonSprite name="Charizard" pokemonId={6} size="xl" mode="artwork" />
              <PokemonSprite name="Blastoise" pokemonId={9} size="xl" mode="artwork" />
            </div>
            <h2 className="text-4xl font-bold text-pokemon">Average at Best</h2>
            <p className="text-xl text-muted-foreground">Pokémon Battle League Platform</p>
          </div>

          {/* Features */}
          <div className="space-y-6 pt-8">
            <div className="grid gap-6 text-left">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">AI-Powered Insights</h3>
                  <p className="text-sm text-muted-foreground">
                    Get strategic recommendations and battle analysis powered by advanced AI
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-accent/10 p-3">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Discord Integration</h3>
                  <p className="text-sm text-muted-foreground">
                    Seamless connection with Discord for team management and notifications
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Competitive League</h3>
                  <p className="text-sm text-muted-foreground">
                    Draft your team, compete in matches, and track your standings
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-accent/10 p-3">
                  <Zap className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Real-time Analytics</h3>
                  <p className="text-sm text-muted-foreground">
                    Track performance, analyze battles, and optimize your strategy
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-8 border-t">
            <p className="text-sm text-muted-foreground">
              Join coaches and players competing in the most advanced Pokémon battle league platform
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-pokemon mb-2">Average at Best</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
