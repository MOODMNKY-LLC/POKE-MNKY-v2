"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PokemonSprite } from "@/components/pokemon-sprite"
import { Confetti } from "@/components/ui/confetti"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface PickConfirmationDialogProps {
  pokemon: {
    name: string
    point_value: number
    generation?: number
    pokemon_id?: number | null
  }
  teamId: string
  seasonId?: string
  currentBudget: {
    total: number
    spent: number
    remaining: number
  }
  open: boolean
  onConfirm: () => Promise<void>
  onCancel: () => void
}

export function PickConfirmationDialog({
  pokemon,
  teamId,
  seasonId,
  currentBudget,
  open,
  onConfirm,
  onCancel,
}: PickConfirmationDialogProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const canAfford = currentBudget.remaining >= pokemon.point_value
  const newRemaining = currentBudget.remaining - pokemon.point_value

  const handleConfirm = async () => {
    if (!canAfford) return

    try {
      setLoading(true)
      await onConfirm()
      setSuccess(true)
      // Auto-close after showing success
      setTimeout(() => {
        setSuccess(false)
        setLoading(false)
        onCancel()
      }, 2000)
    } catch (error) {
      console.error("Error confirming pick:", error)
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => !open && !loading && onCancel()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Draft Pick</DialogTitle>
            <DialogDescription>
              Review your selection before confirming
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Pokemon Display */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-32 w-32 flex items-center justify-center">
                    <PokemonSprite
                      name={pokemon.name}
                      pokemonId={pokemon.pokemon_id || undefined}
                      size="xl"
                      mode="artwork"
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold capitalize">{pokemon.name}</h3>
                    <div className="flex items-center justify-center gap-2">
                      <Badge variant="secondary" className="text-lg px-3 py-1">
                        {pokemon.point_value} points
                      </Badge>
                      {pokemon.generation && (
                        <Badge variant="outline" className="text-sm">
                          Gen {pokemon.generation}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Budget Impact */}
            <div className="space-y-3 p-4 rounded-lg bg-muted">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Budget</span>
                <span className="font-semibold">
                  {currentBudget.remaining} / {currentBudget.total} points
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">After Pick</span>
                <span
                  className={cn(
                    "font-semibold",
                    newRemaining < 0 && "text-destructive",
                    newRemaining >= 0 && newRemaining < 20 && "text-yellow-600"
                  )}
                >
                  {newRemaining} / {currentBudget.total} points
                </span>
              </div>
              {!canAfford && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-destructive font-medium">
                    Insufficient budget! Need {pokemon.point_value} points, have{" "}
                    {currentBudget.remaining} points.
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading || !canAfford || success}
              className="min-w-[100px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Drafting...
                </>
              ) : success ? (
                "Success!"
              ) : (
                "Confirm Pick"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confetti on success */}
      {success && <Confetti />}
    </>
  )
}
