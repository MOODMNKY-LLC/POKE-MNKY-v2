"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Edit, Save, Loader2, AlertCircle } from "lucide-react"

interface QuickEditData {
  pokemon_name: string
  point_value: number
  available: boolean
}

export function QuickEditPanel() {
  const [searchQuery, setSearchQuery] = useState("")
  const [pokemon, setPokemon] = useState<QuickEditData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [seasonId, setSeasonId] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createBrowserClient()

  useEffect(() => {
    // Get current season
    supabase
      .from("seasons")
      .select("id")
      .eq("is_current", true)
      .single()
      .then(({ data }) => {
        if (data) setSeasonId(data.id)
      })
  }, [])

  async function searchPokemon() {
    if (!searchQuery.trim() || !seasonId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("draft_pool")
        .select("pokemon_name, point_value, status")
        .eq("season_id", seasonId)
        .ilike("pokemon_name", `%${searchQuery.trim()}%`)
        .limit(1)
        .single()

      if (error) {
        if (error.code === "PGRST116") {
          // No rows found
          setPokemon(null)
          toast({
            title: "Not Found",
            description: `No Pokémon found matching "${searchQuery}"`,
          })
          return
        }
        throw error
      }

      setPokemon({
        pokemon_name: data.pokemon_name,
        point_value: data.point_value,
        available: data.status === "available",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to search Pokémon",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function saveChanges() {
    if (!pokemon || !seasonId) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from("draft_pool")
        .update({
          point_value: pokemon.point_value,
          status: pokemon.available ? "available" : "banned",
          updated_at: new Date().toISOString(),
        })
        .eq("season_id", seasonId)
        .eq("pokemon_name", pokemon.pokemon_name)

      if (error) throw error

      toast({
        title: "Success",
        description: `Updated ${pokemon.pokemon_name}`,
      })

      // Clear search
      setSearchQuery("")
      setPokemon(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save changes",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="h-5 w-5" />
          Quick Edit
        </CardTitle>
        <CardDescription>
          Quick edits without leaving admin dashboard (fallback option)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!seasonId && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              No current season found
            </AlertDescription>
          </Alert>
        )}

        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="pokemon-search">Search Pokémon</Label>
          <div className="flex gap-2">
            <Input
              id="pokemon-search"
              placeholder="Enter Pokémon name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  searchPokemon()
                }
              }}
              disabled={loading || !seasonId}
            />
            <Button
              onClick={searchPokemon}
              disabled={loading || !searchQuery.trim() || !seasonId}
              variant="outline"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>
        </div>

        {/* Edit Form */}
        {pokemon && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Pokémon Name</Label>
              <div className="text-sm font-medium">{pokemon.pokemon_name}</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="point-value">Point Value (1-20)</Label>
              <Input
                id="point-value"
                type="number"
                min="1"
                max="20"
                value={pokemon.point_value}
                onChange={(e) => {
                  const value = parseInt(e.target.value)
                  if (!isNaN(value) && value >= 1 && value <= 20) {
                    setPokemon({ ...pokemon, point_value: value })
                  }
                }}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="available"
                checked={pokemon.available}
                onChange={(e) => {
                  setPokemon({ ...pokemon, available: e.target.checked })
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="available" className="text-sm font-normal">
                Available for draft
              </Label>
            </div>

            <Button
              onClick={saveChanges}
              disabled={saving}
              className="w-full"
              variant="default"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>

            <div className="text-xs text-muted-foreground">
              <strong>Note:</strong> This directly updates Supabase. For bulk operations, use
              Notion Draft Board.
            </div>
          </div>
        )}

        {!pokemon && searchQuery && !loading && (
          <Alert>
            <AlertDescription className="text-xs">
              No Pokémon found. Try searching in Notion Draft Board for comprehensive management.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
