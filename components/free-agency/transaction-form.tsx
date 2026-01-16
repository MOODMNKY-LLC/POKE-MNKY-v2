"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Plus, Minus, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { MagicCard } from "@/components/ui/magic-card"

const transactionSchema = z.object({
  transaction_type: z.enum(["replacement", "addition", "drop_only"]),
  added_pokemon_id: z.string().optional(),
  dropped_pokemon_id: z.string().optional(),
}).refine((data) => {
  if (data.transaction_type === "replacement") {
    return data.added_pokemon_id && data.dropped_pokemon_id
  }
  if (data.transaction_type === "addition") {
    return data.added_pokemon_id
  }
  if (data.transaction_type === "drop_only") {
    return data.dropped_pokemon_id
  }
  return false
}, {
  message: "Please select the required Pokemon for this transaction type",
})

interface TransactionFormProps {
  teamId: string
  seasonId: string
  roster: Array<{ pokemon_id: string; pokemon_name: string; point_value: number }>
  availablePokemon: Array<{ pokemon_id: string; pokemon_name: string; point_value: number }>
  onSuccess: () => void
}

export function TransactionForm({
  teamId,
  seasonId,
  roster,
  availablePokemon,
  onSuccess,
}: TransactionFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [validation, setValidation] = useState<any>(null)
  const [previewing, setPreviewing] = useState(false)

  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      transaction_type: "replacement",
      added_pokemon_id: "",
      dropped_pokemon_id: "",
    },
  })

  const transactionType = form.watch("transaction_type")
  const addedPokemonId = form.watch("added_pokemon_id")
  const droppedPokemonId = form.watch("dropped_pokemon_id")

  // Preview transaction - validate before submit
  const previewTransaction = async () => {
    if (!addedPokemonId && !droppedPokemonId) {
      setValidation(null)
      return
    }

    setPreviewing(true)
    try {
      // Call team-status to get current state, then calculate preview
      const statusResponse = await fetch(
        `/api/free-agency/team-status?team_id=${teamId}&season_id=${seasonId}`
      )
      const statusData = await statusResponse.json()

      if (!statusData.success || !statusData.status) {
        return
      }

      const currentStatus = statusData.status
      const addedPokemon = availablePokemon.find((p) => p.pokemon_id === addedPokemonId)
      const droppedPokemon = roster.find((p) => p.pokemon_id === droppedPokemonId)

      let newRosterSize = currentStatus.rosterSize
      let newPointTotal = currentStatus.budget.spent
      const errors: string[] = []

      if (transactionType === "replacement") {
        newRosterSize = currentStatus.rosterSize
        newPointTotal = currentStatus.budget.spent - (droppedPokemon?.point_value || 0) + (addedPokemon?.point_value || 0)
      } else if (transactionType === "addition") {
        newRosterSize = currentStatus.rosterSize + 1
        newPointTotal = currentStatus.budget.spent + (addedPokemon?.point_value || 0)
      } else if (transactionType === "drop_only") {
        newRosterSize = currentStatus.rosterSize - 1
        newPointTotal = currentStatus.budget.spent - (droppedPokemon?.point_value || 0)
      }

      if (newPointTotal > 120) {
        errors.push(`Budget exceeded: ${newPointTotal}/120 points (${newPointTotal - 120} over)`)
      }
      if (newRosterSize < 8) {
        errors.push(`Roster size would be ${newRosterSize}, minimum is 8`)
      }
      if (newRosterSize > 10) {
        errors.push(`Roster size would be ${newRosterSize}, maximum is 10`)
      }
      if (currentStatus.transactionCount >= 10) {
        errors.push("Transaction limit reached (10 F/A moves per season)")
      }

      setValidation({
        is_valid: errors.length === 0,
        errors,
        new_roster_size: newRosterSize,
        new_point_total: newPointTotal,
        transaction_count: currentStatus.transactionCount,
        remaining_transactions: currentStatus.remainingTransactions,
      })
    } catch (error) {
      console.error("Preview error:", error)
    } finally {
      setPreviewing(false)
    }
  }

  useEffect(() => {
    if (addedPokemonId || droppedPokemonId) {
      previewTransaction()
    }
  }, [addedPokemonId, droppedPokemonId, transactionType])

  const onSubmit = async (values: z.infer<typeof transactionSchema>) => {
    setSubmitting(true)
    try {
      const response = await fetch("/api/free-agency/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: teamId,
          season_id: seasonId,
          transaction_type: values.transaction_type,
          added_pokemon_id: values.added_pokemon_id || null,
          dropped_pokemon_id: values.dropped_pokemon_id || null,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to submit transaction")
      }

      toast.success("Transaction submitted successfully!")
      form.reset()
      setValidation(null)
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || "Failed to submit transaction")
    } finally {
      setSubmitting(false)
    }
  }

  const addedPokemon = availablePokemon.find((p) => p.pokemon_id === addedPokemonId)
  const droppedPokemon = roster.find((p) => p.pokemon_id === droppedPokemonId)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Free Agency Transaction</CardTitle>
        <CardDescription>
          Add, drop, or replace Pokemon on your roster
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Transaction Type */}
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <Select
              value={transactionType}
              onValueChange={(value) => {
                form.setValue("transaction_type", value as any)
                form.setValue("added_pokemon_id", "")
                form.setValue("dropped_pokemon_id", "")
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="replacement">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Replacement (Drop + Add)
                  </div>
                </SelectItem>
                <SelectItem value="addition">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Addition Only
                  </div>
                </SelectItem>
                <SelectItem value="drop_only">
                  <div className="flex items-center gap-2">
                    <Minus className="h-4 w-4" />
                    Drop Only
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Drop Pokemon (for replacement and drop_only) */}
          {(transactionType === "replacement" || transactionType === "drop_only") && (
            <div className="space-y-2">
              <Label>Drop Pokemon</Label>
              <Select
                value={droppedPokemonId || ""}
                onValueChange={(value) => form.setValue("dropped_pokemon_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Pokemon to drop" />
                </SelectTrigger>
                <SelectContent>
                  {roster.map((pokemon) => (
                    <SelectItem key={pokemon.pokemon_id} value={pokemon.pokemon_id}>
                      {pokemon.pokemon_name} ({pokemon.point_value}pts)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Add Pokemon (for replacement and addition) */}
          {(transactionType === "replacement" || transactionType === "addition") && (
            <div className="space-y-2">
              <Label>Add Pokemon</Label>
              <Select
                value={addedPokemonId || ""}
                onValueChange={(value) => form.setValue("added_pokemon_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Pokemon to add" />
                </SelectTrigger>
                <SelectContent>
                  {availablePokemon.map((pokemon) => (
                    <SelectItem key={pokemon.pokemon_id} value={pokemon.pokemon_id}>
                      {pokemon.pokemon_name} ({pokemon.point_value}pts)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Validation Preview */}
          {validation && (
            <Alert variant={validation.is_valid ? "default" : "destructive"}>
              {validation.is_valid ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {validation.is_valid ? "Transaction Valid" : "Validation Errors"}
              </AlertTitle>
              <AlertDescription>
                {validation.is_valid ? (
                  <div className="space-y-1 mt-2">
                    <p>New Roster Size: {validation.new_roster_size}</p>
                    <p>New Point Total: {validation.new_point_total}/120</p>
                    <p>Remaining Transactions: {validation.remaining_transactions}/10</p>
                  </div>
                ) : (
                  <ul className="list-disc list-inside mt-2">
                    {validation.errors.map((error: string, idx: number) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Transaction Preview */}
          {(addedPokemon || droppedPokemon) && (
            <MagicCard className="p-4">
              <h4 className="font-semibold mb-2">Transaction Preview</h4>
              <div className="space-y-2 text-sm">
                {droppedPokemon && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Drop:</span>
                    <Badge variant="destructive">
                      {droppedPokemon.pokemon_name} ({droppedPokemon.point_value}pts)
                    </Badge>
                  </div>
                )}
                {addedPokemon && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Add:</span>
                    <Badge variant="default">
                      {addedPokemon.pokemon_name} ({addedPokemon.point_value}pts)
                    </Badge>
                  </div>
                )}
              </div>
            </MagicCard>
          )}

          {submitting || !validation?.is_valid ? (
            <Button
              type="submit"
              disabled={true}
              className="w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Transaction"
              )}
            </Button>
          ) : (
            <ShimmerButton
              type="submit"
              className="w-full"
            >
              Submit Transaction
            </ShimmerButton>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
