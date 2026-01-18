"use client"

import { useState } from "react"
import { mcpClient, MCPApiError } from "@/lib/mcp-rest-client"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { MagicCard } from "@/components/ui/magic-card"
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text"
import { SparklesText } from "@/components/ui/sparkles-text"
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
  TestTube
} from "lucide-react"
import { toast } from "sonner"

interface TestResult {
  success: boolean
  data?: any
  error?: string
  status?: number
  duration?: number
  rateLimit?: {
    limit: number
    remaining: number
    reset: number
  }
}

export default function TestMCPPage() {
  const [activeTab, setActiveTab] = useState("available-pokemon")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Record<string, TestResult>>({})
  const [requestLog, setRequestLog] = useState<Array<{ tool: string; request: any; timestamp: Date }>>([])

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

  const handleTest = async (toolName: string, params: any) => {
    setLoading(true)
    const startTime = Date.now()
    
    // Add to request log
    setRequestLog(prev => [...prev, { tool: toolName, request: params, timestamp: new Date() }])

    try {
      let result: any
      let rateLimit: any

      switch (toolName) {
        case "available-pokemon": {
          const parsedParams: any = {}
          if (params.limit) parsedParams.limit = parseInt(params.limit)
          if (params.point_range_min && params.point_range_max) {
            parsedParams.point_range = [parseInt(params.point_range_min), parseInt(params.point_range_max)]
          }
          if (params.generation) parsedParams.generation = parseInt(params.generation)
          if (params.type) parsedParams.type = params.type
          const response = await mcpClient.getAvailablePokemon(parsedParams)
          result = response.data
          rateLimit = response.rateLimit
          break
        }
        case "draft-status": {
          const parsedParams: any = {}
          if (params.season_id) parsedParams.season_id = parseInt(params.season_id)
          const response = await mcpClient.getDraftStatus(parsedParams)
          result = response.data
          rateLimit = response.rateLimit
          break
        }
        case "team-budget": {
          if (!params.team_id) throw new Error("team_id is required")
          const parsedParams: any = { team_id: parseInt(params.team_id) }
          if (params.season_id) parsedParams.season_id = parseInt(params.season_id)
          const response = await mcpClient.getTeamBudget(parsedParams)
          result = response.data
          rateLimit = response.rateLimit
          break
        }
        case "team-picks": {
          if (!params.team_id) throw new Error("team_id is required")
          const parsedParams: any = { team_id: parseInt(params.team_id) }
          if (params.season_id) parsedParams.season_id = parseInt(params.season_id)
          const response = await mcpClient.getTeamPicks(parsedParams)
          result = response.data
          rateLimit = response.rateLimit
          break
        }
        case "pokemon-types": {
          const parsedParams: any = {}
          if (params.pokemon_name) parsedParams.pokemon_name = params.pokemon_name
          if (params.pokemon_id) parsedParams.pokemon_id = parseInt(params.pokemon_id)
          const response = await mcpClient.getPokemonTypes(parsedParams)
          result = response.data
          rateLimit = response.rateLimit
          break
        }
        case "smogon-meta": {
          if (!params.pokemon_name) throw new Error("pokemon_name is required")
          const parsedParams: any = { pokemon_name: params.pokemon_name }
          if (params.format) parsedParams.format = params.format
          const response = await mcpClient.getSmogonMeta(parsedParams)
          result = response.data
          rateLimit = response.rateLimit
          break
        }
        case "ability-mechanics": {
          if (!params.ability_name) throw new Error("ability_name is required")
          const response = await mcpClient.getAbilityMechanics({ ability_name: params.ability_name })
          result = response.data
          rateLimit = response.rateLimit
          break
        }
        case "move-mechanics": {
          if (!params.move_name) throw new Error("move_name is required")
          const response = await mcpClient.getMoveMechanics({ move_name: params.move_name })
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
          const response = await mcpClient.analyzePickValue(parsedParams)
          result = response.data
          rateLimit = response.rateLimit
          break
        }
        default:
          throw new Error(`Unknown tool: ${toolName}`)
      }

      const duration = Date.now() - startTime
      setResults(prev => ({
        ...prev,
        [toolName]: {
          success: true,
          data: result,
          duration,
          rateLimit,
        },
      }))
      toast.success(`✅ ${toolName} test passed!`)
    } catch (error: any) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof MCPApiError
        ? `${error.status} ${error.statusText}: ${error.message}`
        : error.message || "Unknown error"
      
      setResults(prev => ({
        ...prev,
        [toolName]: {
          success: false,
          error: errorMessage,
          status: error instanceof MCPApiError ? error.status : undefined,
          duration,
        },
      }))
      toast.error(`❌ ${toolName} test failed: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard!")
  }

  const ToolCard = ({ 
    toolName, 
    title, 
    description, 
    icon: Icon, 
    children 
  }: { 
    toolName: string
    title: string
    description: string
    icon: any
    children: React.ReactNode 
  }) => {
    const result = results[toolName]
    const isSuccess = result?.success
    const isError = result && !result.success

    return (
      <MagicCard className="w-full">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5" />
                <CardTitle>{title}</CardTitle>
              </div>
              {result && (
                <Badge variant={isSuccess ? "default" : "destructive"}>
                  {isSuccess ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Success
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      Failed
                    </>
                  )}
                </Badge>
              )}
            </div>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {children}
            
            {result && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Result</h4>
                  {result.duration && (
                    <Badge variant="outline">{result.duration}ms</Badge>
                  )}
                </div>
                
                {result.rateLimit && (
                  <Alert>
                    <BarChart3 className="h-4 w-4" />
                    <AlertDescription>
                      Rate Limit: {result.rateLimit.remaining}/{result.rateLimit.limit} remaining
                      {result.rateLimit.reset && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (Resets: {new Date(result.rateLimit.reset * 1000).toLocaleTimeString()})
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {isSuccess && result.data && (
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 z-10"
                      onClick={() => copyToClipboard(JSON.stringify(result.data, null, 2))}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-sm">
                      <code>{JSON.stringify(result.data, null, 2)}</code>
                    </pre>
                  </div>
                )}

                {isError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-1">Error</div>
                      <div>{result.error}</div>
                      {result.status && (
                        <Badge variant="outline" className="mt-2">
                          Status: {result.status}
                        </Badge>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </MagicCard>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <TestTube className="h-8 w-8 text-primary" />
          <AnimatedGradientText className="text-4xl font-bold" style={{ fontFamily: 'var(--font-marker)' }}>
            MCP REST Client Testing Playground
          </AnimatedGradientText>
        </div>
        <p className="text-muted-foreground text-lg">
          Test all 9 MCP tools with the type-safe REST client. Perfect for validating functionality before full integration.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5 mb-6">
          <TabsTrigger value="available-pokemon">
            <Sparkles className="h-4 w-4 mr-1" />
            Available
          </TabsTrigger>
          <TabsTrigger value="draft-status">
            <ClipboardList className="h-4 w-4 mr-1" />
            Status
          </TabsTrigger>
          <TabsTrigger value="team-budget">
            <DollarSign className="h-4 w-4 mr-1" />
            Budget
          </TabsTrigger>
          <TabsTrigger value="team-picks">
            <Users className="h-4 w-4 mr-1" />
            Picks
          </TabsTrigger>
          <TabsTrigger value="pokemon-types">
            <Type className="h-4 w-4 mr-1" />
            Types
          </TabsTrigger>
          <TabsTrigger value="smogon-meta">
            <TrendingUp className="h-4 w-4 mr-1" />
            Meta
          </TabsTrigger>
          <TabsTrigger value="ability-mechanics">
            <Shield className="h-4 w-4 mr-1" />
            Ability
          </TabsTrigger>
          <TabsTrigger value="move-mechanics">
            <Sword className="h-4 w-4 mr-1" />
            Move
          </TabsTrigger>
          <TabsTrigger value="analyze-pick">
            <BarChart3 className="h-4 w-4 mr-1" />
            Analyze
          </TabsTrigger>
        </TabsList>

        {/* Available Pokémon */}
        <TabsContent value="available-pokemon">
          <ToolCard
            toolName="available-pokemon"
            title="Get Available Pokémon"
            description="Query draft pool with optional filters for point range, generation, and type"
            icon={Sparkles}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Point Range (Min)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 15"
                  value={availablePokemonParams.point_range_min}
                  onChange={(e) => setAvailablePokemonParams(prev => ({ ...prev, point_range_min: e.target.value }))}
                />
              </div>
              <div>
                <Label>Point Range (Max)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 20"
                  value={availablePokemonParams.point_range_max}
                  onChange={(e) => setAvailablePokemonParams(prev => ({ ...prev, point_range_max: e.target.value }))}
                />
              </div>
              <div>
                <Label>Generation</Label>
                <Input
                  type="number"
                  placeholder="e.g., 1"
                  value={availablePokemonParams.generation}
                  onChange={(e) => setAvailablePokemonParams(prev => ({ ...prev, generation: e.target.value }))}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Input
                  placeholder="e.g., electric"
                  value={availablePokemonParams.type}
                  onChange={(e) => setAvailablePokemonParams(prev => ({ ...prev, type: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Limit</Label>
                <Input
                  type="number"
                  placeholder="e.g., 10"
                  value={availablePokemonParams.limit}
                  onChange={(e) => setAvailablePokemonParams(prev => ({ ...prev, limit: e.target.value }))}
                />
              </div>
            </div>
            <Button
              onClick={() => handleTest("available-pokemon", availablePokemonParams)}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Test Get Available Pokémon
                </>
              )}
            </Button>
          </ToolCard>
        </TabsContent>

        {/* Draft Status */}
        <TabsContent value="draft-status">
          <ToolCard
            toolName="draft-status"
            title="Get Draft Status"
            description="Get current draft session status including current pick, round, and whose turn it is"
            icon={ClipboardList}
          >
            <div>
              <Label>Season ID (Optional)</Label>
              <Input
                type="number"
                placeholder="e.g., 5"
                value={draftStatusParams.season_id}
                onChange={(e) => setDraftStatusParams(prev => ({ ...prev, season_id: e.target.value }))}
              />
            </div>
            <Button
              onClick={() => handleTest("draft-status", draftStatusParams)}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Test Get Draft Status
                </>
              )}
            </Button>
          </ToolCard>
        </TabsContent>

        {/* Team Budget */}
        <TabsContent value="team-budget">
          <ToolCard
            toolName="team-budget"
            title="Get Team Budget"
            description="Get team's draft budget including total, spent, and remaining points"
            icon={DollarSign}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Team ID *</Label>
                <Input
                  type="number"
                  placeholder="e.g., 1"
                  value={teamBudgetParams.team_id}
                  onChange={(e) => setTeamBudgetParams(prev => ({ ...prev, team_id: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Season ID (Optional)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 5"
                  value={teamBudgetParams.season_id}
                  onChange={(e) => setTeamBudgetParams(prev => ({ ...prev, season_id: e.target.value }))}
                />
              </div>
            </div>
            <Button
              onClick={() => handleTest("team-budget", teamBudgetParams)}
              disabled={loading || !teamBudgetParams.team_id}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Test Get Team Budget
                </>
              )}
            </Button>
          </ToolCard>
        </TabsContent>

        {/* Team Picks */}
        <TabsContent value="team-picks">
          <ToolCard
            toolName="team-picks"
            title="Get Team Picks"
            description="Get all draft picks for a team"
            icon={Users}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Team ID *</Label>
                <Input
                  type="number"
                  placeholder="e.g., 1"
                  value={teamPicksParams.team_id}
                  onChange={(e) => setTeamPicksParams(prev => ({ ...prev, team_id: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Season ID (Optional)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 5"
                  value={teamPicksParams.season_id}
                  onChange={(e) => setTeamPicksParams(prev => ({ ...prev, season_id: e.target.value }))}
                />
              </div>
            </div>
            <Button
              onClick={() => handleTest("team-picks", teamPicksParams)}
              disabled={loading || !teamPicksParams.team_id}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Test Get Team Picks
                </>
              )}
            </Button>
          </ToolCard>
        </TabsContent>

        {/* Pokémon Types */}
        <TabsContent value="pokemon-types">
          <ToolCard
            toolName="pokemon-types"
            title="Get Pokémon Types"
            description="Get Pokémon type information (primary and secondary types) from pokepedia_pokemon table"
            icon={Type}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Pokémon Name</Label>
                <Input
                  placeholder="e.g., pikachu"
                  value={pokemonTypesParams.pokemon_name}
                  onChange={(e) => setPokemonTypesParams(prev => ({ ...prev, pokemon_name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Pokémon ID</Label>
                <Input
                  type="number"
                  placeholder="e.g., 25"
                  value={pokemonTypesParams.pokemon_id}
                  onChange={(e) => setPokemonTypesParams(prev => ({ ...prev, pokemon_id: e.target.value }))}
                />
              </div>
            </div>
            <Button
              onClick={() => handleTest("pokemon-types", pokemonTypesParams)}
              disabled={loading || (!pokemonTypesParams.pokemon_name && !pokemonTypesParams.pokemon_id)}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Test Get Pokémon Types
                </>
              )}
            </Button>
          </ToolCard>
        </TabsContent>

        {/* Smogon Meta */}
        <TabsContent value="smogon-meta">
          <ToolCard
            toolName="smogon-meta"
            title="Get Smogon Meta"
            description="Get competitive meta data from Smogon for a Pokémon"
            icon={TrendingUp}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Pokémon Name *</Label>
                <Input
                  placeholder="e.g., pikachu"
                  value={smogonMetaParams.pokemon_name}
                  onChange={(e) => setSmogonMetaParams(prev => ({ ...prev, pokemon_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Format (Optional)</Label>
                <Input
                  placeholder="e.g., gen9ou"
                  value={smogonMetaParams.format}
                  onChange={(e) => setSmogonMetaParams(prev => ({ ...prev, format: e.target.value }))}
                />
              </div>
            </div>
            <Button
              onClick={() => handleTest("smogon-meta", smogonMetaParams)}
              disabled={loading || !smogonMetaParams.pokemon_name}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Test Get Smogon Meta
                </>
              )}
            </Button>
          </ToolCard>
        </TabsContent>

        {/* Ability Mechanics */}
        <TabsContent value="ability-mechanics">
          <ToolCard
            toolName="ability-mechanics"
            title="Get Ability Mechanics"
            description="Get detailed mechanics explanation for a Pokémon ability"
            icon={Shield}
          >
            <div>
              <Label>Ability Name *</Label>
              <Input
                placeholder="e.g., lightning-rod"
                value={abilityMechanicsParams.ability_name}
                onChange={(e) => setAbilityMechanicsParams(prev => ({ ...prev, ability_name: e.target.value }))}
                required
              />
            </div>
            <Button
              onClick={() => handleTest("ability-mechanics", abilityMechanicsParams)}
              disabled={loading || !abilityMechanicsParams.ability_name}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Test Get Ability Mechanics
                </>
              )}
            </Button>
          </ToolCard>
        </TabsContent>

        {/* Move Mechanics */}
        <TabsContent value="move-mechanics">
          <ToolCard
            toolName="move-mechanics"
            title="Get Move Mechanics"
            description="Get detailed mechanics explanation for a Pokémon move"
            icon={Sword}
          >
            <div>
              <Label>Move Name *</Label>
              <Input
                placeholder="e.g., thunderbolt"
                value={moveMechanicsParams.move_name}
                onChange={(e) => setMoveMechanicsParams(prev => ({ ...prev, move_name: e.target.value }))}
                required
              />
            </div>
            <Button
              onClick={() => handleTest("move-mechanics", moveMechanicsParams)}
              disabled={loading || !moveMechanicsParams.move_name}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Test Get Move Mechanics
                </>
              )}
            </Button>
          </ToolCard>
        </TabsContent>

        {/* Analyze Pick Value */}
        <TabsContent value="analyze-pick">
          <ToolCard
            toolName="analyze-pick"
            title="Analyze Pick Value"
            description="Analyze the value of a draft pick based on Pokémon, point value, and optional team context"
            icon={BarChart3}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Pokémon Name *</Label>
                <Input
                  placeholder="e.g., pikachu"
                  value={analyzePickParams.pokemon_name}
                  onChange={(e) => setAnalyzePickParams(prev => ({ ...prev, pokemon_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Point Value *</Label>
                <Input
                  type="number"
                  placeholder="e.g., 15"
                  value={analyzePickParams.point_value}
                  onChange={(e) => setAnalyzePickParams(prev => ({ ...prev, point_value: e.target.value }))}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label>Team ID (Optional)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 1"
                  value={analyzePickParams.team_id}
                  onChange={(e) => setAnalyzePickParams(prev => ({ ...prev, team_id: e.target.value }))}
                />
              </div>
            </div>
            <Button
              onClick={() => handleTest("analyze-pick", analyzePickParams)}
              disabled={loading || !analyzePickParams.pokemon_name || !analyzePickParams.point_value}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Test Analyze Pick Value
                </>
              )}
            </Button>
          </ToolCard>
        </TabsContent>
      </Tabs>

      {/* Request Log */}
      {requestLog.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Request Log</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRequestLog([])}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
            <CardDescription>History of all API requests made during this session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-auto">
              {requestLog.slice().reverse().map((log, index) => (
                <div key={index} className="bg-muted p-3 rounded-lg text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline">{log.tool}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="text-xs overflow-x-auto">
                    <code>{JSON.stringify(log.request, null, 2)}</code>
                  </pre>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
