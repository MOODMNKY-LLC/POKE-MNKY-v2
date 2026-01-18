"use client"

/**
 * MCP REST Client Testing Playground
 * 
 * Comprehensive testing interface for the MCP REST API client.
 * Allows testing all 9 MCP tools with real-time responses, error handling, and rate limit monitoring.
 */

import { useState, useEffect } from "react"
import { mcpClient, MCPApiError, type RateLimitInfo } from "@/lib/mcp-rest-client"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { 
  Play, 
  Copy, 
  Check, 
  AlertCircle, 
  Loader2, 
  Activity,
  Zap,
  Database,
  Users,
  Trophy,
  BookOpen,
  Search,
  Sparkles,
  TrendingUp,
  BarChart3,
} from "lucide-react"
import { toast } from "sonner"

interface RequestHistory {
  id: string
  tool: string
  timestamp: Date
  status: "success" | "error"
  duration: number
  rateLimit?: RateLimitInfo
}

interface ToolTestState {
  loading: boolean
  response: any
  error: string | null
  duration: number | null
  rateLimit?: RateLimitInfo
}

export default function MCPRestTestPage() {
  const [activeTab, setActiveTab] = useState("available-pokemon")
  const [requestHistory, setRequestHistory] = useState<RequestHistory[]>([])
  const [globalRateLimit, setGlobalRateLimit] = useState<RateLimitInfo | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Tool-specific states
  const [availablePokemon, setAvailablePokemon] = useState<ToolTestState>({
    loading: false,
    response: null,
    error: null,
    duration: null,
  })
  
  const [draftStatus, setDraftStatus] = useState<ToolTestState>({
    loading: false,
    response: null,
    error: null,
    duration: null,
  })
  
  const [teamBudget, setTeamBudget] = useState<ToolTestState>({
    loading: false,
    response: null,
    error: null,
    duration: null,
  })
  
  const [teamPicks, setTeamPicks] = useState<ToolTestState>({
    loading: false,
    response: null,
    error: null,
    duration: null,
  })
  
  const [pokemonTypes, setPokemonTypes] = useState<ToolTestState>({
    loading: false,
    response: null,
    error: null,
    duration: null,
  })
  
  const [smogonMeta, setSmogonMeta] = useState<ToolTestState>({
    loading: false,
    response: null,
    error: null,
    duration: null,
  })
  
  const [abilityMechanics, setAbilityMechanics] = useState<ToolTestState>({
    loading: false,
    response: null,
    error: null,
    duration: null,
  })
  
  const [moveMechanics, setMoveMechanics] = useState<ToolTestState>({
    loading: false,
    response: null,
    error: null,
    duration: null,
  })
  
  const [pickValue, setPickValue] = useState<ToolTestState>({
    loading: false,
    response: null,
    error: null,
    duration: null,
  })

  // Form states
  const [formData, setFormData] = useState({
    // get_available_pokemon
    pointRangeMin: "",
    pointRangeMax: "",
    generation: "",
    type: "",
    limit: "10",
    
    // get_draft_status
    draftSeasonId: "",
    
    // get_team_budget
    teamBudgetTeamId: "",
    teamBudgetSeasonId: "",
    
    // get_team_picks
    teamPicksTeamId: "",
    teamPicksSeasonId: "",
    
    // get_pokemon_types
    pokemonTypesName: "",
    pokemonTypesId: "",
    
    // get_smogon_meta
    smogonMetaName: "",
    smogonMetaFormat: "",
    
    // get_ability_mechanics
    abilityMechanicsName: "",
    
    // get_move_mechanics
    moveMechanicsName: "",
    
    // analyze_pick_value
    pickValueName: "",
    pickValuePoints: "",
    pickValueTeamId: "",
  })

  // Helper to update form data
  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Helper to add to history
  const addToHistory = (
    tool: string,
    status: "success" | "error",
    duration: number,
    rateLimit?: RateLimitInfo
  ) => {
    const historyItem: RequestHistory = {
      id: Date.now().toString(),
      tool,
      timestamp: new Date(),
      status,
      duration,
      rateLimit,
    }
    setRequestHistory(prev => [historyItem, ...prev].slice(0, 50)) // Keep last 50
    if (rateLimit) {
      setGlobalRateLimit(rateLimit)
    }
  }

  // Helper to copy to clipboard
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      toast.success("Copied to clipboard")
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      toast.error("Failed to copy")
    }
  }

  // Test: Get Available Pokémon
  const testGetAvailablePokemon = async () => {
    const startTime = Date.now()
    setAvailablePokemon({ loading: true, response: null, error: null, duration: null })
    
    try {
      const params: any = {}
      if (formData.limit) params.limit = parseInt(formData.limit)
      if (formData.pointRangeMin && formData.pointRangeMax) {
        params.point_range = [
          parseInt(formData.pointRangeMin),
          parseInt(formData.pointRangeMax),
        ]
      }
      if (formData.generation) params.generation = parseInt(formData.generation)
      if (formData.type) params.type = formData.type

      const result = await mcpClient.getAvailablePokemon(params)
      const duration = Date.now() - startTime
      
      setAvailablePokemon({
        loading: false,
        response: result.data,
        error: null,
        duration,
        rateLimit: result.rateLimit,
      })
      
      addToHistory("get_available_pokemon", "success", duration, result.rateLimit)
      toast.success(`Found ${result.data.pokemon?.length || 0} Pokémon`)
    } catch (error: any) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof MCPApiError
        ? `${error.status} ${error.statusText}: ${error.message}`
        : error.message || String(error)
      
      setAvailablePokemon({
        loading: false,
        response: null,
        error: errorMessage,
        duration,
      })
      
      addToHistory("get_available_pokemon", "error", duration)
      toast.error(`Error: ${errorMessage}`)
    }
  }

  // Test: Get Draft Status
  const testGetDraftStatus = async () => {
    const startTime = Date.now()
    setDraftStatus({ loading: true, response: null, error: null, duration: null })
    
    try {
      const params: any = {}
      if (formData.draftSeasonId) params.season_id = parseInt(formData.draftSeasonId)

      const result = await mcpClient.getDraftStatus(params)
      const duration = Date.now() - startTime
      
      setDraftStatus({
        loading: false,
        response: result.data,
        error: null,
        duration,
        rateLimit: result.rateLimit,
      })
      
      addToHistory("get_draft_status", "success", duration, result.rateLimit)
      toast.success("Draft status retrieved")
    } catch (error: any) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof MCPApiError
        ? `${error.status} ${error.statusText}: ${error.message}`
        : error.message || String(error)
      
      setDraftStatus({
        loading: false,
        response: null,
        error: errorMessage,
        duration,
      })
      
      addToHistory("get_draft_status", "error", duration)
      toast.error(`Error: ${errorMessage}`)
    }
  }

  // Test: Get Team Budget
  const testGetTeamBudget = async () => {
    if (!formData.teamBudgetTeamId) {
      toast.error("Team ID is required")
      return
    }

    const startTime = Date.now()
    setTeamBudget({ loading: true, response: null, error: null, duration: null })
    
    try {
      const params: any = {
        team_id: parseInt(formData.teamBudgetTeamId),
      }
      if (formData.teamBudgetSeasonId) {
        params.season_id = parseInt(formData.teamBudgetSeasonId)
      }

      const result = await mcpClient.getTeamBudget(params)
      const duration = Date.now() - startTime
      
      setTeamBudget({
        loading: false,
        response: result.data,
        error: null,
        duration,
        rateLimit: result.rateLimit,
      })
      
      addToHistory("get_team_budget", "success", duration, result.rateLimit)
      toast.success("Team budget retrieved")
    } catch (error: any) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof MCPApiError
        ? `${error.status} ${error.statusText}: ${error.message}`
        : error.message || String(error)
      
      setTeamBudget({
        loading: false,
        response: null,
        error: errorMessage,
        duration,
      })
      
      addToHistory("get_team_budget", "error", duration)
      toast.error(`Error: ${errorMessage}`)
    }
  }

  // Test: Get Team Picks
  const testGetTeamPicks = async () => {
    if (!formData.teamPicksTeamId) {
      toast.error("Team ID is required")
      return
    }

    const startTime = Date.now()
    setTeamPicks({ loading: true, response: null, error: null, duration: null })
    
    try {
      const params: any = {
        team_id: parseInt(formData.teamPicksTeamId),
      }
      if (formData.teamPicksSeasonId) {
        params.season_id = parseInt(formData.teamPicksSeasonId)
      }

      const result = await mcpClient.getTeamPicks(params)
      const duration = Date.now() - startTime
      
      setTeamPicks({
        loading: false,
        response: result.data,
        error: null,
        duration,
        rateLimit: result.rateLimit,
      })
      
      addToHistory("get_team_picks", "success", duration, result.rateLimit)
      toast.success(`Found ${result.data.picks?.length || 0} picks`)
    } catch (error: any) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof MCPApiError
        ? `${error.status} ${error.statusText}: ${error.message}`
        : error.message || String(error)
      
      setTeamPicks({
        loading: false,
        response: null,
        error: errorMessage,
        duration,
      })
      
      addToHistory("get_team_picks", "error", duration)
      toast.error(`Error: ${errorMessage}`)
    }
  }

  // Test: Get Pokémon Types
  const testGetPokemonTypes = async () => {
    if (!formData.pokemonTypesName && !formData.pokemonTypesId) {
      toast.error("Pokémon name or ID is required")
      return
    }

    const startTime = Date.now()
    setPokemonTypes({ loading: true, response: null, error: null, duration: null })
    
    try {
      const params: any = {}
      if (formData.pokemonTypesName) params.pokemon_name = formData.pokemonTypesName
      if (formData.pokemonTypesId) params.pokemon_id = parseInt(formData.pokemonTypesId)

      const result = await mcpClient.getPokemonTypes(params)
      const duration = Date.now() - startTime
      
      setPokemonTypes({
        loading: false,
        response: result.data,
        error: null,
        duration,
        rateLimit: result.rateLimit,
      })
      
      addToHistory("get_pokemon_types", "success", duration, result.rateLimit)
      toast.success("Pokémon types retrieved")
    } catch (error: any) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof MCPApiError
        ? `${error.status} ${error.statusText}: ${error.message}`
        : error.message || String(error)
      
      setPokemonTypes({
        loading: false,
        response: null,
        error: errorMessage,
        duration,
      })
      
      addToHistory("get_pokemon_types", "error", duration)
      toast.error(`Error: ${errorMessage}`)
    }
  }

  // Test: Get Smogon Meta
  const testGetSmogonMeta = async () => {
    if (!formData.smogonMetaName) {
      toast.error("Pokémon name is required")
      return
    }

    const startTime = Date.now()
    setSmogonMeta({ loading: true, response: null, error: null, duration: null })
    
    try {
      const params: any = {
        pokemon_name: formData.smogonMetaName,
      }
      if (formData.smogonMetaFormat) params.format = formData.smogonMetaFormat

      const result = await mcpClient.getSmogonMeta(params)
      const duration = Date.now() - startTime
      
      setSmogonMeta({
        loading: false,
        response: result.data,
        error: null,
        duration,
        rateLimit: result.rateLimit,
      })
      
      addToHistory("get_smogon_meta", "success", duration, result.rateLimit)
      toast.success("Smogon meta retrieved")
    } catch (error: any) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof MCPApiError
        ? `${error.status} ${error.statusText}: ${error.message}`
        : error.message || String(error)
      
      setSmogonMeta({
        loading: false,
        response: null,
        error: errorMessage,
        duration,
      })
      
      addToHistory("get_smogon_meta", "error", duration)
      toast.error(`Error: ${errorMessage}`)
    }
  }

  // Test: Get Ability Mechanics
  const testGetAbilityMechanics = async () => {
    if (!formData.abilityMechanicsName) {
      toast.error("Ability name is required")
      return
    }

    const startTime = Date.now()
    setAbilityMechanics({ loading: true, response: null, error: null, duration: null })
    
    try {
      const result = await mcpClient.getAbilityMechanics({
        ability_name: formData.abilityMechanicsName,
      })
      const duration = Date.now() - startTime
      
      setAbilityMechanics({
        loading: false,
        response: result.data,
        error: null,
        duration,
        rateLimit: result.rateLimit,
      })
      
      addToHistory("get_ability_mechanics", "success", duration, result.rateLimit)
      toast.success("Ability mechanics retrieved")
    } catch (error: any) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof MCPApiError
        ? `${error.status} ${error.statusText}: ${error.message}`
        : error.message || String(error)
      
      setAbilityMechanics({
        loading: false,
        response: null,
        error: errorMessage,
        duration,
      })
      
      addToHistory("get_ability_mechanics", "error", duration)
      toast.error(`Error: ${errorMessage}`)
    }
  }

  // Test: Get Move Mechanics
  const testGetMoveMechanics = async () => {
    if (!formData.moveMechanicsName) {
      toast.error("Move name is required")
      return
    }

    const startTime = Date.now()
    setMoveMechanics({ loading: true, response: null, error: null, duration: null })
    
    try {
      const result = await mcpClient.getMoveMechanics({
        move_name: formData.moveMechanicsName,
      })
      const duration = Date.now() - startTime
      
      setMoveMechanics({
        loading: false,
        response: result.data,
        error: null,
        duration,
        rateLimit: result.rateLimit,
      })
      
      addToHistory("get_move_mechanics", "success", duration, result.rateLimit)
      toast.success("Move mechanics retrieved")
    } catch (error: any) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof MCPApiError
        ? `${error.status} ${error.statusText}: ${error.message}`
        : error.message || String(error)
      
      setMoveMechanics({
        loading: false,
        response: null,
        error: errorMessage,
        duration,
      })
      
      addToHistory("get_move_mechanics", "error", duration)
      toast.error(`Error: ${errorMessage}`)
    }
  }

  // Test: Analyze Pick Value
  const testAnalyzePickValue = async () => {
    if (!formData.pickValueName || !formData.pickValuePoints) {
      toast.error("Pokémon name and point value are required")
      return
    }

    const startTime = Date.now()
    setPickValue({ loading: true, response: null, error: null, duration: null })
    
    try {
      const params: any = {
        pokemon_name: formData.pickValueName,
        point_value: parseInt(formData.pickValuePoints),
      }
      if (formData.pickValueTeamId) {
        params.team_id = parseInt(formData.pickValueTeamId)
      }

      const result = await mcpClient.analyzePickValue(params)
      const duration = Date.now() - startTime
      
      setPickValue({
        loading: false,
        response: result.data,
        error: null,
        duration,
        rateLimit: result.rateLimit,
      })
      
      addToHistory("analyze_pick_value", "success", duration, result.rateLimit)
      toast.success("Pick value analyzed")
    } catch (error: any) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof MCPApiError
        ? `${error.status} ${error.statusText}: ${error.message}`
        : error.message || String(error)
      
      setPickValue({
        loading: false,
        response: null,
        error: errorMessage,
        duration,
      })
      
      addToHistory("analyze_pick_value", "error", duration)
      toast.error(`Error: ${errorMessage}`)
    }
  }

  // Render response display
  const renderResponse = (state: ToolTestState, toolName: string) => {
    if (state.loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
        </div>
      )
    }

    if (state.error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )
    }

    if (!state.response) {
      return (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No response yet. Click "Execute" to test the API.
        </div>
      )
    }

    const responseJson = JSON.stringify(state.response, null, 2)
    const responseId = `${toolName}-response`

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Check className="h-3 w-3" />
              Success
            </Badge>
            {state.duration !== null && (
              <Badge variant="secondary">
                {state.duration}ms
              </Badge>
            )}
            {state.rateLimit && (
              <Badge variant="outline">
                Rate Limit: {state.rateLimit.remaining}/{state.rateLimit.limit}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(responseJson, responseId)}
          >
            {copiedId === responseId ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <ScrollArea className="h-[400px] rounded-md border bg-muted/50 p-4">
          <pre className="text-xs">
            <code>{responseJson}</code>
          </pre>
        </ScrollArea>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">MCP REST Client Playground</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Test all 9 MCP tools with real-time responses, error handling, and rate limit monitoring.
        </p>
      </div>

      {/* Rate Limit Status */}
      {globalRateLimit && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Activity className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Rate Limit Status</div>
                  <div className="text-xs text-muted-foreground">
                    {globalRateLimit.remaining} of {globalRateLimit.limit} requests remaining
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">
                  Resets: {new Date(globalRateLimit.reset * 1000).toLocaleTimeString()}
                </div>
                {globalRateLimit.remaining < 10 && (
                  <Badge variant="destructive" className="mt-1">
                    Low
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Main Testing Area */}
        <Card>
          <CardHeader>
            <CardTitle>API Tools</CardTitle>
            <CardDescription>
              Select a tool and configure parameters to test the MCP REST API
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5 mb-6">
                <TabsTrigger value="available-pokemon" className="gap-1">
                  <Database className="h-4 w-4" />
                  <span className="hidden sm:inline">Available</span>
                </TabsTrigger>
                <TabsTrigger value="draft-status" className="gap-1">
                  <Trophy className="h-4 w-4" />
                  <span className="hidden sm:inline">Draft</span>
                </TabsTrigger>
                <TabsTrigger value="team-budget" className="gap-1">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Budget</span>
                </TabsTrigger>
                <TabsTrigger value="team-picks" className="gap-1">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Picks</span>
                </TabsTrigger>
                <TabsTrigger value="pokemon-types" className="gap-1">
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Types</span>
                </TabsTrigger>
                <TabsTrigger value="smogon-meta" className="gap-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Meta</span>
                </TabsTrigger>
                <TabsTrigger value="ability-mechanics" className="gap-1">
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">Ability</span>
                </TabsTrigger>
                <TabsTrigger value="move-mechanics" className="gap-1">
                  <Zap className="h-4 w-4" />
                  <span className="hidden sm:inline">Move</span>
                </TabsTrigger>
                <TabsTrigger value="pick-value" className="gap-1">
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Analyze</span>
                </TabsTrigger>
              </TabsList>

              {/* Get Available Pokémon */}
              <TabsContent value="available-pokemon" className="space-y-4">
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Point Range (Min)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 15"
                        value={formData.pointRangeMin}
                        onChange={(e) => updateFormData("pointRangeMin", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Point Range (Max)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 20"
                        value={formData.pointRangeMax}
                        onChange={(e) => updateFormData("pointRangeMax", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Generation</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 1"
                        value={formData.generation}
                        onChange={(e) => updateFormData("generation", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Input
                        placeholder="e.g., electric"
                        value={formData.type}
                        onChange={(e) => updateFormData("type", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Limit</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 10"
                        value={formData.limit}
                        onChange={(e) => updateFormData("limit", e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={testGetAvailablePokemon}
                    disabled={availablePokemon.loading}
                    className="w-full"
                  >
                    {availablePokemon.loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Execute
                      </>
                    )}
                  </Button>
                </div>
                <div className="mt-6">
                  <h3 className="mb-2 text-sm font-semibold">Response</h3>
                  {renderResponse(availablePokemon, "available-pokemon")}
                </div>
              </TabsContent>

              {/* Get Draft Status */}
              <TabsContent value="draft-status" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Season ID (Optional)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 5"
                      value={formData.draftSeasonId}
                      onChange={(e) => updateFormData("draftSeasonId", e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={testGetDraftStatus}
                    disabled={draftStatus.loading}
                    className="w-full"
                  >
                    {draftStatus.loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Execute
                      </>
                    )}
                  </Button>
                </div>
                <div className="mt-6">
                  <h3 className="mb-2 text-sm font-semibold">Response</h3>
                  {renderResponse(draftStatus, "draft-status")}
                </div>
              </TabsContent>

              {/* Get Team Budget */}
              <TabsContent value="team-budget" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Team ID *</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 1"
                      value={formData.teamBudgetTeamId}
                      onChange={(e) => updateFormData("teamBudgetTeamId", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Season ID (Optional)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 5"
                      value={formData.teamBudgetSeasonId}
                      onChange={(e) => updateFormData("teamBudgetSeasonId", e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={testGetTeamBudget}
                    disabled={teamBudget.loading}
                    className="w-full"
                  >
                    {teamBudget.loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Execute
                      </>
                    )}
                  </Button>
                </div>
                <div className="mt-6">
                  <h3 className="mb-2 text-sm font-semibold">Response</h3>
                  {renderResponse(teamBudget, "team-budget")}
                </div>
              </TabsContent>

              {/* Get Team Picks */}
              <TabsContent value="team-picks" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Team ID *</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 1"
                      value={formData.teamPicksTeamId}
                      onChange={(e) => updateFormData("teamPicksTeamId", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Season ID (Optional)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 5"
                      value={formData.teamPicksSeasonId}
                      onChange={(e) => updateFormData("teamPicksSeasonId", e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={testGetTeamPicks}
                    disabled={teamPicks.loading}
                    className="w-full"
                  >
                    {teamPicks.loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Execute
                      </>
                    )}
                  </Button>
                </div>
                <div className="mt-6">
                  <h3 className="mb-2 text-sm font-semibold">Response</h3>
                  {renderResponse(teamPicks, "team-picks")}
                </div>
              </TabsContent>

              {/* Get Pokémon Types */}
              <TabsContent value="pokemon-types" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Pokémon Name</Label>
                    <Input
                      placeholder="e.g., pikachu"
                      value={formData.pokemonTypesName}
                      onChange={(e) => updateFormData("pokemonTypesName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>OR Pokémon ID</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 25"
                      value={formData.pokemonTypesId}
                      onChange={(e) => updateFormData("pokemonTypesId", e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={testGetPokemonTypes}
                    disabled={pokemonTypes.loading}
                    className="w-full"
                  >
                    {pokemonTypes.loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Execute
                      </>
                    )}
                  </Button>
                </div>
                <div className="mt-6">
                  <h3 className="mb-2 text-sm font-semibold">Response</h3>
                  {renderResponse(pokemonTypes, "pokemon-types")}
                </div>
              </TabsContent>

              {/* Get Smogon Meta */}
              <TabsContent value="smogon-meta" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Pokémon Name *</Label>
                    <Input
                      placeholder="e.g., pikachu"
                      value={formData.smogonMetaName}
                      onChange={(e) => updateFormData("smogonMetaName", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Format (Optional)</Label>
                    <Input
                      placeholder="e.g., gen9ou"
                      value={formData.smogonMetaFormat}
                      onChange={(e) => updateFormData("smogonMetaFormat", e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={testGetSmogonMeta}
                    disabled={smogonMeta.loading}
                    className="w-full"
                  >
                    {smogonMeta.loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Execute
                      </>
                    )}
                  </Button>
                </div>
                <div className="mt-6">
                  <h3 className="mb-2 text-sm font-semibold">Response</h3>
                  {renderResponse(smogonMeta, "smogon-meta")}
                </div>
              </TabsContent>

              {/* Get Ability Mechanics */}
              <TabsContent value="ability-mechanics" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Ability Name *</Label>
                    <Input
                      placeholder="e.g., lightning-rod"
                      value={formData.abilityMechanicsName}
                      onChange={(e) => updateFormData("abilityMechanicsName", e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    onClick={testGetAbilityMechanics}
                    disabled={abilityMechanics.loading}
                    className="w-full"
                  >
                    {abilityMechanics.loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Execute
                      </>
                    )}
                  </Button>
                </div>
                <div className="mt-6">
                  <h3 className="mb-2 text-sm font-semibold">Response</h3>
                  {renderResponse(abilityMechanics, "ability-mechanics")}
                </div>
              </TabsContent>

              {/* Get Move Mechanics */}
              <TabsContent value="move-mechanics" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Move Name *</Label>
                    <Input
                      placeholder="e.g., thunderbolt"
                      value={formData.moveMechanicsName}
                      onChange={(e) => updateFormData("moveMechanicsName", e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    onClick={testGetMoveMechanics}
                    disabled={moveMechanics.loading}
                    className="w-full"
                  >
                    {moveMechanics.loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Execute
                      </>
                    )}
                  </Button>
                </div>
                <div className="mt-6">
                  <h3 className="mb-2 text-sm font-semibold">Response</h3>
                  {renderResponse(moveMechanics, "move-mechanics")}
                </div>
              </TabsContent>

              {/* Analyze Pick Value */}
              <TabsContent value="pick-value" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Pokémon Name *</Label>
                    <Input
                      placeholder="e.g., pikachu"
                      value={formData.pickValueName}
                      onChange={(e) => updateFormData("pickValueName", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Point Value *</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 15"
                      value={formData.pickValuePoints}
                      onChange={(e) => updateFormData("pickValuePoints", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Team ID (Optional)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 1"
                      value={formData.pickValueTeamId}
                      onChange={(e) => updateFormData("pickValueTeamId", e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={testAnalyzePickValue}
                    disabled={pickValue.loading}
                    className="w-full"
                  >
                    {pickValue.loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Execute
                      </>
                    )}
                  </Button>
                </div>
                <div className="mt-6">
                  <h3 className="mb-2 text-sm font-semibold">Response</h3>
                  {renderResponse(pickValue, "pick-value")}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Sidebar: Request History & Info */}
        <div className="space-y-6">
          {/* Request History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Request History</CardTitle>
              <CardDescription>
                Last {requestHistory.length} requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {requestHistory.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No requests yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {requestHistory.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-md border p-3 text-sm"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge
                            variant={item.status === "success" ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {item.status === "success" ? "✓" : "✗"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {item.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="font-medium">{item.tool}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.duration}ms
                          {item.rateLimit && (
                            <span className="ml-2">
                              • {item.rateLimit.remaining}/{item.rateLimit.limit} remaining
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* API Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">API Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium mb-1">Base URL</div>
                <div className="text-muted-foreground font-mono text-xs break-all">
                  https://mcp-draft-pool.moodmnky.com
                </div>
              </div>
              <div>
                <div className="font-medium mb-1">Authentication</div>
                <div className="text-muted-foreground">
                  Bearer token (API key)
                </div>
              </div>
              <div>
                <div className="font-medium mb-1">Rate Limits</div>
                <div className="text-muted-foreground">
                  General: 100/15min<br />
                  Heavy: 50/15min
                </div>
              </div>
              <div>
                <div className="font-medium mb-1">Tools Available</div>
                <div className="text-muted-foreground">9 tools</div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documentation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/api-docs" target="_blank">
                  <BookOpen className="mr-2 h-4 w-4" />
                  API Documentation
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/openapi.json" target="_blank">
                  <Database className="mr-2 h-4 w-4" />
                  OpenAPI Spec
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
