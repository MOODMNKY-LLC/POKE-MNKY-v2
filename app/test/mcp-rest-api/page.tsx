"use client"

/**
 * MCP REST API Testing Playground
 * 
 * Comprehensive testing interface for the MCP REST API client.
 * Tests all 9 MCP tools + health check endpoint.
 * 
 * Features:
 * - Tabbed interface for each API method
 * - Parameter input forms
 * - Real-time result display
 * - Error handling display
 * - Rate limit tracking
 * - Request/response logging
 * - Copy to clipboard functionality
 */

import { useState } from "react"
import type { RateLimitInfo } from "@/lib/mcp-rest-client"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MagicCard } from "@/components/ui/magic-card"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Copy, 
  RefreshCw, 
  AlertCircle,
  Zap,
  Sparkles,
  ClipboardList,
  Users,
  DollarSign,
  Type,
  TrendingUp,
  Shield,
  Sword,
  BarChart3,
  TestTube,
  Activity,
  Clock,
  Gauge,
  Code,
  Play,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

interface TestResult {
  success: boolean
  data?: any
  error?: string
  status?: number
  duration?: number
  rateLimit?: RateLimitInfo
  timestamp?: Date
}

interface RequestLog {
  tool: string
  request: any
  response?: any
  error?: string
  duration: number
  timestamp: Date
  rateLimit?: RateLimitInfo
}

export default function MCPRestAPIPlaygroundPage() {
  const [activeTab, setActiveTab] = useState("health")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Record<string, TestResult>>({})
  const [requestLog, setRequestLog] = useState<RequestLog[]>([])

  // Form states for each tool
  const [availablePokemonParams, setAvailablePokemonParams] = useState({
    point_range_min: "",
    point_range_max: "",
    generation: "",
    type: "",
    limit: "10",
  })

  const [draftStatusParams, setDraftStatusParams] = useState({
    season_id: "",
  })

  const [teamBudgetParams, setTeamBudgetParams] = useState({
    team_id: "",
    season_id: "",
  })

  const [teamPicksParams, setTeamPicksParams] = useState({
    team_id: "",
    season_id: "",
  })

  const [pokemonTypesParams, setPokemonTypesParams] = useState({
    pokemon_name: "pikachu",
    pokemon_id: "",
  })

  const [smogonMetaParams, setSmogonMetaParams] = useState({
    pokemon_name: "pikachu",
    format: "",
  })

  const [abilityMechanicsParams, setAbilityMechanicsParams] = useState({
    ability_name: "lightning-rod",
  })

  const [moveMechanicsParams, setMoveMechanicsParams] = useState({
    move_name: "thunderbolt",
  })

  const [analyzePickParams, setAnalyzePickParams] = useState({
    pokemon_name: "pikachu",
    point_value: "15",
    team_id: "",
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard!")
  }

  // Helper function to call proxy API route
  const callProxyAPI = async (endpoint: string, params: any = {}) => {
    const response = await fetch(`/api/mcp-proxy${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const error = new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      ;(error as any).status = response.status
      ;(error as any).statusText = response.statusText
      throw error
    }

    return await response.json()
  }

  const handleTest = async (toolName: string, params: any) => {
    setLoading(true)
    const startTime = Date.now()
    const timestamp = new Date()
    
    // Add to request log
    const logEntry: RequestLog = {
      tool: toolName,
      request: params,
      duration: 0,
      timestamp,
    }
    setRequestLog(prev => [logEntry, ...prev.slice(0, 49)]) // Keep last 50

    try {
      let result: any
      let rateLimit: RateLimitInfo | undefined

      switch (toolName) {
        case "health": {
          // Health check endpoint is /health (not /api/health)
          const response = await callProxyAPI("/health", {})
          result = response.data
          rateLimit = response.rateLimit
          break
        }
        case "available-pokemon": {
          const parsedParams: any = {}
          if (params.limit) parsedParams.limit = parseInt(params.limit)
          if (params.point_range_min && params.point_range_max) {
            parsedParams.point_range = [parseInt(params.point_range_min), parseInt(params.point_range_max)]
          }
          if (params.generation) parsedParams.generation = parseInt(params.generation)
          if (params.type) parsedParams.type = params.type
          const response = await callProxyAPI("/api/get_available_pokemon", parsedParams)
          result = response.data
          rateLimit = response.rateLimit
          break
        }
        case "draft-status": {
          const parsedParams: any = {}
          if (params.season_id) parsedParams.season_id = parseInt(params.season_id)
          const response = await callProxyAPI("/api/get_draft_status", parsedParams)
          result = response.data
          rateLimit = response.rateLimit
          break
        }
        case "team-budget": {
          if (!params.team_id) throw new Error("team_id is required")
          const parsedParams: any = { team_id: parseInt(params.team_id) }
          if (params.season_id) parsedParams.season_id = parseInt(params.season_id)
          const response = await callProxyAPI("/api/get_team_budget", parsedParams)
          result = response.data
          rateLimit = response.rateLimit
          break
        }
        case "team-picks": {
          if (!params.team_id) throw new Error("team_id is required")
          const parsedParams: any = { team_id: parseInt(params.team_id) }
          if (params.season_id) parsedParams.season_id = parseInt(params.season_id)
          const response = await callProxyAPI("/api/get_team_picks", parsedParams)
          result = response.data
          rateLimit = response.rateLimit
          break
        }
        case "pokemon-types": {
          const parsedParams: any = {}
          if (params.pokemon_name) parsedParams.pokemon_name = params.pokemon_name
          if (params.pokemon_id) parsedParams.pokemon_id = parseInt(params.pokemon_id)
          const response = await callProxyAPI("/api/get_pokemon_types", parsedParams)
          result = response.data
          rateLimit = response.rateLimit
          break
        }
        case "smogon-meta": {
          if (!params.pokemon_name) throw new Error("pokemon_name is required")
          const parsedParams: any = { pokemon_name: params.pokemon_name }
          if (params.format) parsedParams.format = params.format
          const response = await callProxyAPI("/api/get_smogon_meta", parsedParams)
          result = response.data
          rateLimit = response.rateLimit
          break
        }
        case "ability-mechanics": {
          if (!params.ability_name) throw new Error("ability_name is required")
          const response = await callProxyAPI("/api/get_ability_mechanics", { ability_name: params.ability_name })
          result = response.data
          rateLimit = response.rateLimit
          break
        }
        case "move-mechanics": {
          if (!params.move_name) throw new Error("move_name is required")
          const response = await callProxyAPI("/api/get_move_mechanics", { move_name: params.move_name })
          result = response.data
          rateLimit = response.rateLimit
          break
        }
        case "analyze-pick": {
          if (!params.pokemon_name || !params.point_value) {
            throw new Error("pokemon_name and point_value are required")
          }
          const parsedParams: any = {
            pokemon_name: params.pokemon_name,
            point_value: parseInt(params.point_value),
          }
          if (params.team_id) parsedParams.team_id = parseInt(params.team_id)
          const response = await callProxyAPI("/api/analyze_pick_value", parsedParams)
          result = response.data
          rateLimit = response.rateLimit
          break
        }
        default:
          throw new Error(`Unknown tool: ${toolName}`)
      }

      const duration = Date.now() - startTime
      const testResult: TestResult = {
        success: true,
        data: result,
        duration,
        rateLimit,
        timestamp,
      }

      setResults(prev => ({ ...prev, [toolName]: testResult }))
      
      // Update log entry
      logEntry.response = result
      logEntry.duration = duration
      logEntry.rateLimit = rateLimit
      setRequestLog(prev => {
        const updated = [...prev]
        updated[0] = logEntry
        return updated
      })

      toast.success(`✅ ${toolName} test passed! (${duration}ms)`)
    } catch (error: any) {
      const duration = Date.now() - startTime
      const errorMessage = error.status
        ? `${error.status} ${error.statusText || ""}: ${error.message || String(error)}`
        : error.message || String(error)

      const testResult: TestResult = {
        success: false,
        error: errorMessage,
        status: error.status,
        duration,
        timestamp,
      }

      setResults(prev => ({ ...prev, [toolName]: testResult }))
      
      // Update log entry
      logEntry.error = errorMessage
      logEntry.duration = duration
      setRequestLog(prev => {
        const updated = [...prev]
        updated[0] = logEntry
        return updated
      })

      toast.error(`❌ ${toolName} test failed: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const clearResults = () => {
    setResults({})
    toast.info("Results cleared")
  }

  const clearLog = () => {
    setRequestLog([])
    toast.info("Request log cleared")
  }

  const result = results[activeTab]
  const resultJson = result ? JSON.stringify(result.data || { error: result.error }, null, 2) : ""

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <TestTube className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">MCP REST API Playground</h1>
            <p className="text-muted-foreground mt-1">
              Test all MCP REST API endpoints with type-safe client
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Type-Safe REST Client
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            9 Tools + Health Check
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <Gauge className="h-3.5 w-3.5" />
            Rate Limit Tracking
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <Code className="h-3.5 w-3.5" />
            Real-Time Results
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: API Methods */}
        <div className="lg:col-span-2">
          <MagicCard className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 mb-6">
                <TabsTrigger value="health" className="gap-1.5">
                  <Activity className="h-4 w-4" />
                  <span className="hidden sm:inline">Health</span>
                </TabsTrigger>
                <TabsTrigger value="available-pokemon" className="gap-1.5">
                  <ClipboardList className="h-4 w-4" />
                  <span className="hidden sm:inline">Available</span>
                </TabsTrigger>
                <TabsTrigger value="draft-status" className="gap-1.5">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Draft</span>
                </TabsTrigger>
                <TabsTrigger value="team-budget" className="gap-1.5">
                  <DollarSign className="h-4 w-4" />
                  <span className="hidden sm:inline">Budget</span>
                </TabsTrigger>
                <TabsTrigger value="team-picks" className="gap-1.5">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Picks</span>
                </TabsTrigger>
                <TabsTrigger value="pokemon-types" className="gap-1.5">
                  <Type className="h-4 w-4" />
                  <span className="hidden sm:inline">Types</span>
                </TabsTrigger>
                <TabsTrigger value="smogon-meta" className="gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Meta</span>
                </TabsTrigger>
                <TabsTrigger value="ability-mechanics" className="gap-1.5">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Ability</span>
                </TabsTrigger>
                <TabsTrigger value="move-mechanics" className="gap-1.5">
                  <Sword className="h-4 w-4" />
                  <span className="hidden sm:inline">Move</span>
                </TabsTrigger>
                <TabsTrigger value="analyze-pick" className="gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">Analyze</span>
                </TabsTrigger>
              </TabsList>

              {/* Health Check Tab */}
              <TabsContent value="health" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Health Check
                    </CardTitle>
                    <CardDescription>
                      Check MCP server health and status
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      No parameters required. This endpoint returns server status and available tools.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => handleTest("health", {})}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading && activeTab === "health" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Test Health Check
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* Get Available Pokémon Tab */}
              <TabsContent value="available-pokemon" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5" />
                      Get Available Pokémon
                    </CardTitle>
                    <CardDescription>
                      Query draft pool with optional filters
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="point_range_min">Point Range (Min)</Label>
                        <Input
                          id="point_range_min"
                          type="number"
                          placeholder="e.g., 15"
                          value={availablePokemonParams.point_range_min}
                          onChange={(e) => setAvailablePokemonParams(prev => ({ ...prev, point_range_min: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="point_range_max">Point Range (Max)</Label>
                        <Input
                          id="point_range_max"
                          type="number"
                          placeholder="e.g., 20"
                          value={availablePokemonParams.point_range_max}
                          onChange={(e) => setAvailablePokemonParams(prev => ({ ...prev, point_range_max: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="generation">Generation</Label>
                        <Input
                          id="generation"
                          type="number"
                          placeholder="e.g., 1"
                          value={availablePokemonParams.generation}
                          onChange={(e) => setAvailablePokemonParams(prev => ({ ...prev, generation: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Input
                          id="type"
                          placeholder="e.g., electric"
                          value={availablePokemonParams.type}
                          onChange={(e) => setAvailablePokemonParams(prev => ({ ...prev, type: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="limit">Limit</Label>
                        <Input
                          id="limit"
                          type="number"
                          placeholder="e.g., 10"
                          value={availablePokemonParams.limit}
                          onChange={(e) => setAvailablePokemonParams(prev => ({ ...prev, limit: e.target.value }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => handleTest("available-pokemon", availablePokemonParams)}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading && activeTab === "available-pokemon" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Test Get Available Pokémon
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* Get Draft Status Tab */}
              <TabsContent value="draft-status" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Get Draft Status
                    </CardTitle>
                    <CardDescription>
                      Get current draft session status
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="draft_season_id">Season ID (Optional)</Label>
                      <Input
                        id="draft_season_id"
                        type="number"
                        placeholder="e.g., 5"
                        value={draftStatusParams.season_id}
                        onChange={(e) => setDraftStatusParams(prev => ({ ...prev, season_id: e.target.value }))}
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => handleTest("draft-status", draftStatusParams)}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading && activeTab === "draft-status" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Test Get Draft Status
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* Get Team Budget Tab */}
              <TabsContent value="team-budget" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Get Team Budget
                    </CardTitle>
                    <CardDescription>
                      Get team's draft budget information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="team_budget_id">Team ID *</Label>
                        <Input
                          id="team_budget_id"
                          type="number"
                          placeholder="e.g., 1"
                          value={teamBudgetParams.team_id}
                          onChange={(e) => setTeamBudgetParams(prev => ({ ...prev, team_id: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="team_budget_season_id">Season ID (Optional)</Label>
                        <Input
                          id="team_budget_season_id"
                          type="number"
                          placeholder="e.g., 5"
                          value={teamBudgetParams.season_id}
                          onChange={(e) => setTeamBudgetParams(prev => ({ ...prev, season_id: e.target.value }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => handleTest("team-budget", teamBudgetParams)}
                      disabled={loading || !teamBudgetParams.team_id}
                      className="w-full"
                    >
                      {loading && activeTab === "team-budget" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Test Get Team Budget
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* Get Team Picks Tab */}
              <TabsContent value="team-picks" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Get Team Picks
                    </CardTitle>
                    <CardDescription>
                      Get all draft picks for a team
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="team_picks_id">Team ID *</Label>
                        <Input
                          id="team_picks_id"
                          type="number"
                          placeholder="e.g., 1"
                          value={teamPicksParams.team_id}
                          onChange={(e) => setTeamPicksParams(prev => ({ ...prev, team_id: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="team_picks_season_id">Season ID (Optional)</Label>
                        <Input
                          id="team_picks_season_id"
                          type="number"
                          placeholder="e.g., 5"
                          value={teamPicksParams.season_id}
                          onChange={(e) => setTeamPicksParams(prev => ({ ...prev, season_id: e.target.value }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => handleTest("team-picks", teamPicksParams)}
                      disabled={loading || !teamPicksParams.team_id}
                      className="w-full"
                    >
                      {loading && activeTab === "team-picks" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Test Get Team Picks
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* Get Pokémon Types Tab */}
              <TabsContent value="pokemon-types" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Type className="h-5 w-5" />
                      Get Pokémon Types
                    </CardTitle>
                    <CardDescription>
                      Get Pokémon type information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="pokemon_types_name">Pokémon Name</Label>
                        <Input
                          id="pokemon_types_name"
                          placeholder="e.g., pikachu"
                          value={pokemonTypesParams.pokemon_name}
                          onChange={(e) => setPokemonTypesParams(prev => ({ ...prev, pokemon_name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pokemon_types_id">Pokémon ID</Label>
                        <Input
                          id="pokemon_types_id"
                          type="number"
                          placeholder="e.g., 25"
                          value={pokemonTypesParams.pokemon_id}
                          onChange={(e) => setPokemonTypesParams(prev => ({ ...prev, pokemon_id: e.target.value }))}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Provide either Pokémon name or ID (name takes precedence)
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => handleTest("pokemon-types", pokemonTypesParams)}
                      disabled={loading || (!pokemonTypesParams.pokemon_name && !pokemonTypesParams.pokemon_id)}
                      className="w-full"
                    >
                      {loading && activeTab === "pokemon-types" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Test Get Pokémon Types
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* Get Smogon Meta Tab */}
              <TabsContent value="smogon-meta" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Get Smogon Meta
                    </CardTitle>
                    <CardDescription>
                      Get competitive meta data from Smogon
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="smogon_pokemon_name">Pokémon Name *</Label>
                        <Input
                          id="smogon_pokemon_name"
                          placeholder="e.g., pikachu"
                          value={smogonMetaParams.pokemon_name}
                          onChange={(e) => setSmogonMetaParams(prev => ({ ...prev, pokemon_name: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="smogon_format">Format (Optional)</Label>
                        <Input
                          id="smogon_format"
                          placeholder="e.g., gen9ou"
                          value={smogonMetaParams.format}
                          onChange={(e) => setSmogonMetaParams(prev => ({ ...prev, format: e.target.value }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => handleTest("smogon-meta", smogonMetaParams)}
                      disabled={loading || !smogonMetaParams.pokemon_name}
                      className="w-full"
                    >
                      {loading && activeTab === "smogon-meta" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Test Get Smogon Meta
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* Get Ability Mechanics Tab */}
              <TabsContent value="ability-mechanics" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Get Ability Mechanics
                    </CardTitle>
                    <CardDescription>
                      Get detailed mechanics explanation for a Pokémon ability
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ability_name">Ability Name *</Label>
                      <Input
                        id="ability_name"
                        placeholder="e.g., lightning-rod"
                        value={abilityMechanicsParams.ability_name}
                        onChange={(e) => setAbilityMechanicsParams(prev => ({ ...prev, ability_name: e.target.value }))}
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => handleTest("ability-mechanics", abilityMechanicsParams)}
                      disabled={loading || !abilityMechanicsParams.ability_name}
                      className="w-full"
                    >
                      {loading && activeTab === "ability-mechanics" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Test Get Ability Mechanics
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* Get Move Mechanics Tab */}
              <TabsContent value="move-mechanics" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sword className="h-5 w-5" />
                      Get Move Mechanics
                    </CardTitle>
                    <CardDescription>
                      Get detailed mechanics explanation for a Pokémon move
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="move_name">Move Name *</Label>
                      <Input
                        id="move_name"
                        placeholder="e.g., thunderbolt"
                        value={moveMechanicsParams.move_name}
                        onChange={(e) => setMoveMechanicsParams(prev => ({ ...prev, move_name: e.target.value }))}
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => handleTest("move-mechanics", moveMechanicsParams)}
                      disabled={loading || !moveMechanicsParams.move_name}
                      className="w-full"
                    >
                      {loading && activeTab === "move-mechanics" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Test Get Move Mechanics
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* Analyze Pick Value Tab */}
              <TabsContent value="analyze-pick" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Analyze Pick Value
                    </CardTitle>
                    <CardDescription>
                      Analyze the value of a draft pick
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="analyze_pokemon_name">Pokémon Name *</Label>
                        <Input
                          id="analyze_pokemon_name"
                          placeholder="e.g., pikachu"
                          value={analyzePickParams.pokemon_name}
                          onChange={(e) => setAnalyzePickParams(prev => ({ ...prev, pokemon_name: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="analyze_point_value">Point Value *</Label>
                        <Input
                          id="analyze_point_value"
                          type="number"
                          placeholder="e.g., 15"
                          value={analyzePickParams.point_value}
                          onChange={(e) => setAnalyzePickParams(prev => ({ ...prev, point_value: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="analyze_team_id">Team ID (Optional)</Label>
                        <Input
                          id="analyze_team_id"
                          type="number"
                          placeholder="e.g., 1"
                          value={analyzePickParams.team_id}
                          onChange={(e) => setAnalyzePickParams(prev => ({ ...prev, team_id: e.target.value }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => handleTest("analyze-pick", analyzePickParams)}
                      disabled={loading || !analyzePickParams.pokemon_name || !analyzePickParams.point_value}
                      className="w-full"
                    >
                      {loading && activeTab === "analyze-pick" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Test Analyze Pick Value
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </MagicCard>
        </div>

        {/* Right Column: Results & Logs */}
        <div className="space-y-6">
          {/* Results Display */}
          <MagicCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Code className="h-5 w-5" />
                Results
              </h2>
              <div className="flex gap-2">
                {result && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(resultJson)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearResults}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {result ? (
              <div className="space-y-4">
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <Badge variant="default" className="gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Success
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1.5">
                      <XCircle className="h-3.5 w-3.5" />
                      Error
                    </Badge>
                  )}
                  {result.duration !== undefined && (
                    <Badge variant="outline" className="gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {result.duration}ms
                    </Badge>
                  )}
                  {result.status && (
                    <Badge variant="outline">
                      Status: {result.status}
                    </Badge>
                  )}
                </div>

                {/* Rate Limit Info */}
                {result.rateLimit && (
                  <Alert>
                    <Gauge className="h-4 w-4" />
                    <AlertTitle>Rate Limit</AlertTitle>
                    <AlertDescription>
                      <div className="space-y-1 mt-2">
                        <div className="flex justify-between text-sm">
                          <span>Remaining:</span>
                          <span className="font-mono">{result.rateLimit.remaining}/{result.rateLimit.limit}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Resets:</span>
                          <span className="font-mono text-xs">
                            {new Date(result.rateLimit.reset * 1000).toLocaleTimeString()}
                          </span>
                        </div>
                        {result.rateLimit.retryAfter && (
                          <div className="flex justify-between text-sm">
                            <span>Retry After:</span>
                            <span className="font-mono">{result.rateLimit.retryAfter}s</span>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Error Display */}
                {result.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{result.error}</AlertDescription>
                  </Alert>
                )}

                {/* Result JSON */}
                {result.data && (
                  <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                    <pre className="text-xs">
                      <code>{resultJson}</code>
                    </pre>
                  </ScrollArea>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No results yet</p>
                <p className="text-sm mt-1">Execute a test to see results here</p>
              </div>
            )}
          </MagicCard>

          {/* Request Log */}
          <MagicCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Request Log
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={clearLog}
                disabled={requestLog.length === 0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {requestLog.length > 0 ? (
              <ScrollArea className="h-[300px] w-full">
                <div className="space-y-3">
                  {requestLog.map((log, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg border bg-muted/50 text-sm space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{log.tool}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {log.duration}ms
                        </span>
                      </div>
                      {log.rateLimit && (
                        <div className="text-xs text-muted-foreground">
                          Rate Limit: {log.rateLimit.remaining}/{log.rateLimit.limit}
                        </div>
                      )}
                      {log.error && (
                        <div className="text-xs text-destructive">
                          Error: {log.error}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {log.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No requests logged yet</p>
              </div>
            )}
          </MagicCard>
        </div>
      </div>
    </div>
  )
}
