"use client"

import { useState, useEffect, useMemo } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Search, Save, Loader2, CheckCircle2, XCircle, RotateCcw, AlertTriangle, Heart, Sword, Shield, Zap, Sparkles, Gauge } from "lucide-react"
import { useRouter } from "next/navigation"
import { PokemonSprite } from "@/components/pokemon-sprite"
import { PokemonStatIcon } from "@/components/pokemon-stat-icon"
import { getPokemonTypeColors } from "@/lib/pokemon-type-colors"
import { GoogleSheetsExportDialog } from "@/components/admin/google-sheets-export-dialog"

interface PokemonRow {
  pokemon_id: number
  name: string
  generation: number
  types: string[]
  tier: string | null
  point_value: number
  available: boolean
  current_status?: string | null
  base_stats?: {
    hp: number
    attack: number
    defense: number
    "special-attack": number
    "special-defense": number
    speed: number
  } | null
  species_name?: string | null
  dex_format?: string
}

interface PokemonData extends PokemonRow {
  _edited?: boolean
  _originalTier?: string | null
  _originalAvailable?: boolean
  _originalPointValue?: number
}

const TIER_OPTIONS = [
  { value: "Uber", label: "Uber (20 pts)" },
  { value: "AG", label: "AG (20 pts)" },
  { value: "OU", label: "OU (19 pts)" },
  { value: "UUBL", label: "UUBL (18 pts)" },
  { value: "OUBL", label: "OUBL (18 pts)" },
  { value: "UU", label: "UU (17 pts)" },
  { value: "RUBL", label: "RUBL (16 pts)" },
  { value: "RU", label: "RU (15 pts)" },
  { value: "NUBL", label: "NUBL (14 pts)" },
  { value: "NU", label: "NU (13 pts)" },
  { value: "PUBL", label: "PUBL (12 pts)" },
  { value: "PU", label: "PU (11 pts)" },
  { value: "ZUBL", label: "ZUBL (10 pts)" },
  { value: "ZU", label: "ZU (9 pts)" },
  { value: "LC", label: "LC (8 pts)" },
  { value: "NFE", label: "NFE (7 pts)" },
  { value: "Untiered", label: "Untiered (6 pts)" },
  { value: null, label: "No Tier (5 pts)" },
]

const TIER_FILTER_OPTIONS = [
  { value: "all", label: "All Tiers" },
  { value: "Uber", label: "Uber" },
  { value: "AG", label: "AG" },
  { value: "OU", label: "OU" },
  { value: "UUBL", label: "UUBL" },
  { value: "OUBL", label: "OUBL" },
  { value: "UU", label: "UU" },
  { value: "RUBL", label: "RUBL" },
  { value: "RU", label: "RU" },
  { value: "NUBL", label: "NUBL" },
  { value: "NU", label: "NU" },
  { value: "PUBL", label: "PUBL" },
  { value: "PU", label: "PU" },
  { value: "ZUBL", label: "ZUBL" },
  { value: "ZU", label: "ZU" },
  { value: "LC", label: "LC" },
  { value: "NFE", label: "NFE" },
  { value: "Untiered", label: "Untiered" },
]

function mapTierToPointValue(tier: string | null): number {
  if (!tier) return 5
  switch (tier) {
    case 'Uber':
    case 'AG':
      return 20
    case 'OU':
      return 19
    case 'UUBL':
    case 'OUBL':
      return 18
    case 'UU':
      return 17
    case 'RUBL':
      return 16
    case 'RU':
      return 15
    case 'NUBL':
      return 14
    case 'NU':
      return 13
    case 'PUBL':
      return 12
    case 'PU':
      return 11
    case 'ZUBL':
      return 10
    case 'ZU':
      return 9
    case 'LC':
      return 8
    case 'NFE':
      return 7
    case 'Untiered':
      return 6
    default:
      return 5
  }
}

export default function AdminPokemonPage() {
  const [user, setUser] = useState<any>(null)
  const [pokemon, setPokemon] = useState<PokemonData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGeneration, setSelectedGeneration] = useState<number | "all">("all")
  const [selectedTier, setSelectedTier] = useState<string | "all">("all")
  const [pooledOnly, setPooledOnly] = useState(false)
  const [seasonId, setSeasonId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(30) // Default: 30 Pokémon per page
  const router = useRouter()
  const { toast } = useToast()

  // Check authentication and fetch data
  useEffect(() => {
    async function init() {
      const supabase = createBrowserClient()
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        router.push("/auth/login")
        return
      }

      setUser(user)

      // Fetch current season
      const { data: season } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_current", true)
        .single()

      if (season) {
        setSeasonId(season.id)
      }

      // Fetch Pokémon data
      await loadPokemon()
    }

    init()
  }, [router])

  async function loadPokemon() {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/pokemon")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to load Pokémon")
      }

      if (data.success && data.pokemon) {
        const pokemonWithEdits = data.pokemon.map((p: PokemonRow) => ({
          ...p,
          types: p.types || [],
          base_stats: p.base_stats || null,
          _edited: false,
          _originalTier: p.tier,
          _originalAvailable: p.available,
          _originalPointValue: p.point_value,
        }))
        console.log("[Admin Pokemon Page] Loaded Pokemon sample:", {
          total: pokemonWithEdits.length,
          sample: pokemonWithEdits.slice(0, 5).map(p => ({
            name: p.name,
            pokemon_id: p.pokemon_id,
            types: p.types,
            typesLength: p.types?.length || 0,
            hasTypes: !!p.types && p.types.length > 0,
            base_stats: p.base_stats,
            dex_format: p.dex_format,
          }))
        })
        setPokemon(pokemonWithEdits)
        setSeasonId(data.season_id)
      }
    } catch (error: any) {
      console.error("Error loading Pokémon:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load Pokémon data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  function handleTierChange(pokemonId: number, newTier: string | null) {
    setPokemon((prev) =>
      prev.map((p) => {
        if (p.pokemon_id === pokemonId) {
          const newPointValue = mapTierToPointValue(newTier)
          return {
            ...p,
            tier: newTier,
            point_value: newPointValue,
            _edited: p._originalTier !== newTier || p._originalAvailable !== p.available || p._originalPointValue !== newPointValue,
          }
        }
        return p
      })
    )
  }

  function handlePointValueChange(pokemonId: number, newPointValue: number) {
    // Clamp point value between 1 and 20
    const clampedValue = Math.max(1, Math.min(20, newPointValue))
    setPokemon((prev) =>
      prev.map((p) => {
        if (p.pokemon_id === pokemonId) {
          return {
            ...p,
            point_value: clampedValue,
            _edited: p._originalTier !== p.tier || p._originalAvailable !== p.available || p._originalPointValue !== clampedValue,
          }
        }
        return p
      })
    )
  }

  function handleAvailableChange(pokemonId: number, checked: boolean | "indeterminate") {
    // Convert checked value to boolean (handle "indeterminate" as false)
    const available = checked === true
    
    setPokemon((prev) =>
      prev.map((p) => {
        if (p.pokemon_id === pokemonId) {
          return {
            ...p,
            available,
            _edited: p._originalTier !== p.tier || p._originalAvailable !== available || p._originalPointValue !== p.point_value,
          }
        }
        return p
      })
    )
  }

  async function handleSave() {
    if (!seasonId) {
      toast({
        title: "Error",
        description: "No active season found",
        variant: "destructive",
      })
      return
    }

    const editedPokemon = pokemon.filter((p) => p._edited)
    
    if (editedPokemon.length === 0) {
      toast({
        title: "No Changes",
        description: "No changes to save",
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/admin/pokemon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          updates: editedPokemon.map((p) => ({
            pokemon_id: p.pokemon_id,
            name: p.name,
            tier: p.tier,
            point_value: p.point_value,
            available: p.available,
            generation: p.generation,
          })),
          season_id: seasonId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save changes")
      }

      // Reset edited flags
      setPokemon((prev) =>
        prev.map((p) => ({
          ...p,
          _edited: false,
          _originalTier: p.tier,
          _originalAvailable: p.available,
          _originalPointValue: p.point_value,
        }))
      )

      toast({
        title: "Success",
        description: `Saved ${data.updated || editedPokemon.length} Pokémon`,
      })
    } catch (error: any) {
      console.error("Error saving:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save changes",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (!seasonId) {
      toast({
        title: "Error",
        description: "No season selected",
        variant: "destructive",
      })
      return
    }

    setResetting(true)
    try {
      const response = await fetch(`/api/admin/pokemon?season_id=${encodeURIComponent(seasonId)}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset draft pool")
      }

      // Reload Pokemon data to show initial state
      await loadPokemon()

      toast({
        title: "Success",
        description: `Reset draft pool. All ${data.deleted_count || 0} entries cleared.`,
      })

      setShowResetConfirm(false)
    } catch (error: any) {
      console.error("Error resetting:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to reset draft pool",
        variant: "destructive",
      })
    } finally {
      setResetting(false)
    }
  }

  // Filter, sort, and paginate Pokémon
  const { filteredPokemon, editedCount, paginatedPokemon, totalPages, availableCount } = useMemo(() => {
    let filtered = pokemon

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.pokemon_id.toString().includes(query)
      )
    }

    // Apply generation filter
    if (selectedGeneration !== "all") {
      filtered = filtered.filter((p) => p.generation === selectedGeneration)
    }

    // Apply tier filter
    if (selectedTier !== "all") {
      filtered = filtered.filter((p) => {
        if (selectedTier === "null" || selectedTier === null) {
          return p.tier === null
        }
        return p.tier === selectedTier
      })
    }

    // Apply pooled filter (only show available Pokémon)
    if (pooledOnly) {
      filtered = filtered.filter((p) => p.available === true)
    }

    // Sort by ID
    const sorted = [...filtered].sort((a, b) => a.pokemon_id - b.pokemon_id)

    // Paginate
    const totalPages = Math.ceil(sorted.length / pageSize)
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginated = sorted.slice(startIndex, endIndex)

    const edited = pokemon.filter((p) => p._edited).length
    const available = pokemon.filter((p) => p.available === true).length

    return {
      filteredPokemon: sorted,
      paginatedPokemon: paginated,
      editedCount: edited,
      totalPages,
      availableCount: available,
    }
  }, [pokemon, searchQuery, selectedGeneration, selectedTier, pooledOnly, currentPage, pageSize])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedGeneration, selectedTier, pooledOnly])

  // Master checkbox handler - toggle all Pokémon on current page
  function handleMasterCheckboxChange(checked: boolean) {
    const currentPageIds = new Set(paginatedPokemon.map((p) => p.pokemon_id))
    setPokemon((prev) =>
      prev.map((p) => {
        // Only update Pokémon that are on the current page
        if (currentPageIds.has(p.pokemon_id)) {
          return {
            ...p,
            available: checked,
            _edited: p._originalTier !== p.tier || p._originalAvailable !== checked || p._originalPointValue !== p.point_value,
          }
        }
        return p
      })
    )
  }

  // Check if all visible Pokémon are checked
  const allChecked = useMemo(() => {
    if (paginatedPokemon.length === 0) return false
    return paginatedPokemon.every((p) => p.available === true)
  }, [paginatedPokemon])

  // Check if some (but not all) visible Pokémon are checked
  const someChecked = useMemo(() => {
    if (paginatedPokemon.length === 0) return false
    const checkedCount = paginatedPokemon.filter((p) => p.available === true).length
    return checkedCount > 0 && checkedCount < paginatedPokemon.length
  }, [paginatedPokemon])

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Pokémon Draft Pool Management</h1>
        <p className="text-muted-foreground">
          Manage which Pokémon are available for the draft pool. Edit tier and availability inline.
        </p>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={selectedGeneration.toString()}
                onValueChange={(v) => setSelectedGeneration(v === "all" ? "all" : parseInt(v))}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Generation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Generations</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((gen) => (
                    <SelectItem key={gen} value={gen.toString()}>
                      Gen {gen}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedTier}
                onValueChange={(v) => setSelectedTier(v)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent>
                  {TIER_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value || "null"} value={option.value || "null"}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center space-x-2 px-3 py-2 border rounded-md bg-background">
                <Checkbox
                  id="pooled-only"
                  checked={pooledOnly}
                  onCheckedChange={(checked) => setPooledOnly(checked === true)}
                />
                <label
                  htmlFor="pooled-only"
                  className="text-sm font-medium cursor-pointer"
                >
                  Pooled Only
                </label>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {editedCount > 0 && (
                <Badge variant="outline" className="text-sm">
                  {editedCount} unsaved changes
                </Badge>
              )}
              <GoogleSheetsExportDialog />
              <Button onClick={handleSave} disabled={saving || editedCount === 0}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                Pokémon List ({filteredPokemon.length} of {pokemon.length})
                {totalPages > 1 && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    (Page {currentPage} of {totalPages})
                  </span>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                Click tier dropdown or checkbox to edit. Changes are saved when you click "Save Changes".
                {pooledOnly && (
                  <span className="ml-2 font-medium">
                    • Showing {availableCount} available Pokémon
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Loading Pokémon...</span>
            </div>
          ) : filteredPokemon.length === 0 ? (
            <Alert>
              <AlertDescription>No Pokémon found matching your filters.</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Dex</TableHead>
                      <TableHead className="w-20">Artwork</TableHead>
                      <TableHead className="min-w-[200px]">Name</TableHead>
                      <TableHead className="min-w-[200px]">Base Stats</TableHead>
                      <TableHead className="min-w-[180px]">Types</TableHead>
                      <TableHead className="w-24">Generation</TableHead>
                      <TableHead className="min-w-[180px]">Tier</TableHead>
                      <TableHead className="w-24">Points</TableHead>
                      <TableHead className="w-32 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span>Available</span>
                          <Checkbox
                            checked={allChecked}
                            ref={(el) => {
                              if (el) {
                                el.indeterminate = someChecked && !allChecked
                              }
                            }}
                            onCheckedChange={(checked) => handleMasterCheckboxChange(checked)}
                            className="cursor-pointer"
                          />
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPokemon.map((p) => (
                      <TableRow
                        key={`${p.pokemon_id}-${p.available}`}
                        className={p._edited ? "bg-primary/5" : ""}
                      >
                        <TableCell className="font-mono text-sm font-semibold">
                          {p.pokemon_id}
                        </TableCell>
                        <TableCell>
                          <PokemonSprite
                            pokemonId={p.pokemon_id}
                            name={p.name}
                            size="md"
                            mode="artwork"
                          />
                        </TableCell>
                        <TableCell className="font-medium capitalize">{p.name}</TableCell>
                        <TableCell>
                          {p.base_stats ? (
                            <div className="flex items-center gap-3 text-xs">
                              <div className="flex items-center gap-1">
                                <Heart className="h-3 w-3 text-red-500" />
                                <span className="font-semibold">HP:</span>
                                <span>{p.base_stats.hp}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Sword className="h-3 w-3 text-orange-500" />
                                <span className="font-semibold">Atk:</span>
                                <span>{p.base_stats.attack}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Shield className="h-3 w-3 text-blue-500" />
                                <span className="font-semibold">Def:</span>
                                <span>{p.base_stats.defense}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Zap className="h-3 w-3 text-purple-500" />
                                <span className="font-semibold">SpA:</span>
                                <span>{p.base_stats["special-attack"]}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Shield className="h-3 w-3 text-green-500" />
                                <span className="font-semibold">SpD:</span>
                                <span>{p.base_stats["special-defense"]}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Gauge className="h-3 w-3 text-yellow-500" />
                                <span className="font-semibold">Spe:</span>
                                <span>{p.base_stats.speed}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No stats</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {Array.isArray(p.types) && p.types.length > 0 ? (
                              p.types.map((type: string) => {
                                const typeColors = getPokemonTypeColors([type])
                                return (
                                  <Badge
                                    key={type}
                                    className="capitalize text-xs font-medium whitespace-nowrap"
                                    style={{
                                      backgroundColor: typeColors.bg,
                                      color: typeColors.text,
                                      borderColor: typeColors.border,
                                      borderWidth: 1,
                                    }}
                                  >
                                    {type}
                                  </Badge>
                                )
                              })
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                No types
                                {process.env.NODE_ENV === 'development' && (
                                  <span className="ml-1 text-xs">(ID: {p.pokemon_id})</span>
                                )}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">Gen {p.generation}</Badge>
                        </TableCell>
                      <TableCell>
                        <Select
                          value={p.tier || "null"}
                          onValueChange={(v) =>
                            handleTierChange(p.pokemon_id, v === "null" ? null : v)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIER_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value || "null"}
                                value={option.value || "null"}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={p.point_value.toString()}
                          onValueChange={(v) => handlePointValueChange(p.pokemon_id, parseInt(v))}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 20 }, (_, i) => i + 1).map((value) => (
                              <SelectItem key={value} value={value.toString()}>
                                {value} pts
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={p.available}
                            onCheckedChange={(checked) =>
                              handleAvailableChange(p.pokemon_id, checked)
                            }
                            aria-label={`${p.name} available for draft`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredPokemon.length)} of {filteredPokemon.length} Pokémon
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Per page:</span>
                      <Select
                        value={pageSize.toString()}
                        onValueChange={(v) => {
                          setPageSize(parseInt(v))
                          setCurrentPage(1) // Reset to first page when changing page size
                        }}
                      >
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="30">30</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                {totalPages > 1 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-10"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Reset Draft Pool
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all draft pool entries for the current season. This action cannot be undone.
              <br />
              <br />
              <strong>Are you sure you want to continue?</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResetConfirm(false)}
              disabled={resetting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={resetting}
            >
              {resetting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Draft Pool
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
