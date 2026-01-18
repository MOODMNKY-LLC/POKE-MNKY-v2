"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Users, Coins, RefreshCw, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { TransactionForm } from "@/components/free-agency/transaction-form"
import { AvailablePokemonBrowser } from "@/components/free-agency/available-pokemon-browser"
import { TransactionHistory } from "@/components/free-agency/transaction-history"
import { FreeAgencyChat } from "@/components/ai/free-agency-chat"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function FreeAgencyPage() {
  const [profile, setProfile] = useState<any>(null)
  const [teamStatus, setTeamStatus] = useState<any>(null)
  const [availablePokemon, setAvailablePokemon] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [seasonId, setSeasonId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const supabase = createBrowserClient()
      
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      // Get user profile with team info
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(`
          *,
          teams (
            id,
            name,
            coach_id
          )
        `)
        .eq("id", user.id)
        .single()

      if (profileError || !profileData) {
        console.error("Error loading profile:", profileError)
        router.push("/auth/login")
        return
      }

      const userProfile = {
        ...profileData,
        role: profileData.role || "viewer",
        team_id: Array.isArray(profileData.teams) 
          ? profileData.teams[0]?.id || null
          : (profileData.teams as any)?.id || null,
      }

      setProfile(userProfile)

      // Get current season
      const { data: season } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_current", true)
        .single()

      if (!season) {
        console.error("No current season found")
        return
      }

      setSeasonId(season.id)

      // Get team status if user is a coach
      if (userProfile.role === "coach" && userProfile.team_id) {
        const statusResponse = await fetch(
          `/api/free-agency/team-status?team_id=${userProfile.team_id}&season_id=${season.id}`
        )
        const statusData = await statusResponse.json()
        if (statusData.success) {
          setTeamStatus(statusData.status)
        }

        // Load available Pokemon
        const pokemonResponse = await fetch(
          `/api/free-agency/available?season_id=${season.id}&limit=200`
        )
        const pokemonData = await pokemonResponse.json()
        if (pokemonData.success) {
          setAvailablePokemon(pokemonData.pokemon || [])
        }
      }
    } catch (error) {
      console.error("Error loading free agency data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return null
  }

  if (profile.role !== "coach" || !profile.team_id) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription>
            You must be a coach with an assigned team to access free agency.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!seasonId || !teamStatus) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Active Season</AlertTitle>
          <AlertDescription>
            There is no active season. Please contact an administrator.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Free Agency</h1>
        <p className="text-muted-foreground">
          Manage your team roster through free agency transactions
        </p>
      </div>

      {/* Team Status */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Roster Size</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="h-5 w-5" />
              {teamStatus.rosterSize}/10
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Budget</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Coins className="h-5 w-5" />
              {teamStatus.budget.spent}/120
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {teamStatus.budget.remaining} remaining
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Transactions Used</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              {teamStatus.transactionCount}/10
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {teamStatus.remainingTransactions} remaining
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Current Roster</CardDescription>
            <CardTitle className="text-lg">
              {teamStatus.roster.length} Pokemon
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Warning if transaction limit reached */}
      {teamStatus.transactionCount >= 10 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Transaction Limit Reached</AlertTitle>
          <AlertDescription>
            You have used all 10 free agency transactions for this season.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs defaultValue="submit" className="space-y-4">
        <TabsList>
          <TabsTrigger value="submit">Submit Transaction</TabsTrigger>
          <TabsTrigger value="browse">Browse Available</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
          <TabsTrigger value="assistant">AI Assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="submit" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <TransactionForm
              teamId={profile.team_id}
              seasonId={seasonId}
              roster={teamStatus.roster}
              availablePokemon={availablePokemon}
              onSuccess={loadData}
            />
            <Card>
              <CardHeader>
                <CardTitle>Current Roster</CardTitle>
                <CardDescription>Your team's current Pokemon</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {teamStatus.roster.map((pokemon: any) => (
                    <div
                      key={pokemon.pokemon_id}
                      className="flex items-center justify-between p-2 border rounded-lg"
                    >
                      <span className="font-medium">{pokemon.pokemon_name}</span>
                      <Badge variant="secondary">{pokemon.point_value}pts</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="browse">
          <AvailablePokemonBrowser seasonId={seasonId} />
        </TabsContent>

        <TabsContent value="history">
          <TransactionHistory teamId={profile.team_id} seasonId={seasonId} />
        </TabsContent>

        <TabsContent value="assistant">
          <div className="h-[700px] border rounded-lg overflow-hidden">
            <FreeAgencyChat
              teamId={profile.team_id}
              seasonId={seasonId}
              className="h-full"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
