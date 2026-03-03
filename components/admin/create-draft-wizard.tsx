"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ChevronRight, ChevronLeft } from "lucide-react"

const STEPS = [
  { id: 1, title: "Draft Basics" },
  { id: 2, title: "Rules & Season" },
  { id: 3, title: "Playoffs & Teams" },
  { id: 4, title: "Draft Order & Pool" },
  { id: 5, title: "Review" },
] as const

export interface CreateDraftWizardProps {
  onSuccess: () => void
  onCancel: () => void
}

export interface WizardState {
  draftType: "snake" | "linear" | "auction"
  pickTimeLimit: number
  rulesetSection: string
  seasonLengthWeeks: number
  playoffFormat: "3_week" | "4_week" | "single_elimination" | "double_elimination"
  playoffTeams: number
  draftPositionMethod: "randomizer" | "commissioner"
  turnOrder: string[]
  draftPoolSource: "generation" | "game" | "season_draft_pool" | "archived"
  draftPoolConfig: {
    generation?: number
    game_code?: string
    archived_pool_id?: string
    include_legendary?: boolean
    include_mythical?: boolean
    include_paradox?: boolean
  }
}

const DEFAULT_STATE: WizardState = {
  draftType: "snake",
  pickTimeLimit: 45,
  rulesetSection: "",
  seasonLengthWeeks: 10,
  playoffFormat: "4_week",
  playoffTeams: 4,
  draftPositionMethod: "randomizer",
  turnOrder: [],
  draftPoolSource: "season_draft_pool",
  draftPoolConfig: {},
}

interface LeagueConfigSection {
  id: string
  config_type: string
  section_title: string
}

interface ArchivedPool {
  id: string
  name: string
  rules_notes?: string
}

interface Team {
  id: string
  name: string
}

export function CreateDraftWizard({ onSuccess, onCancel }: CreateDraftWizardProps) {
  const [step, setStep] = useState(1)
  const [state, setState] = useState<WizardState>(DEFAULT_STATE)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [sections, setSections] = useState<LeagueConfigSection[]>([])
  const [archivedPools, setArchivedPools] = useState<ArchivedPool[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [sectionsRes, poolsRes, teamsRes] = await Promise.all([
          fetch("/api/admin/league-config/sections"),
          fetch("/api/admin/draft-pools/archived"),
          fetch("/api/admin/teams"),
        ])

        if (sectionsRes.ok) {
          const d = await sectionsRes.json()
          setSections(d.sections || [])
        }
        if (poolsRes.ok) {
          const d = await poolsRes.json()
          setArchivedPools(d.pools || [])
        }
        if (teamsRes.ok) {
          const d = await teamsRes.json()
          setTeams(d.teams || [])
        }
      } catch {
        // Non-critical
      } finally {
        setLoadingData(false)
      }
    }
    load()
  }, [])

  const update = <K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState((s) => ({ ...s, [key]: value }))
  }

  const canNext = () => {
    if (step === 1) return true
    if (step === 2) return true
    if (step === 3) return state.playoffTeams >= 2
    if (step === 4) {
      if (state.draftPoolSource === "archived" && !state.draftPoolConfig.archived_pool_id) return false
      if (state.draftPoolSource === "game" && !state.draftPoolConfig.game_code) return false
      if (state.draftPositionMethod === "commissioner" && teams.length >= 2) {
        const filled = state.turnOrder.filter(Boolean).length
        if (filled !== teams.length) return false
      }
      return true
    }
    return true
  }

  const handleCreate = async () => {
    setCreating(true)
    setError(null)
    try {
      const res = await fetch("/api/draft/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft_type: state.draftType,
          pick_time_limit: state.pickTimeLimit,
          ruleset_section: state.rulesetSection || undefined,
          season_length_weeks: state.seasonLengthWeeks,
          playoff_format: state.playoffFormat,
          playoff_teams: state.playoffTeams,
          draft_position_method: state.draftPositionMethod,
          turn_order: state.draftPositionMethod === "commissioner" ? state.turnOrder : undefined,
          draft_pool_source: state.draftPoolSource,
          draft_pool_config:
            state.draftPoolSource !== "season_draft_pool"
              ? {
                  generation: state.draftPoolConfig.generation,
                  game_code: state.draftPoolConfig.game_code,
                  archived_pool_id: state.draftPoolConfig.archived_pool_id,
                  include_legendary: state.draftPoolConfig.include_legendary,
                  include_mythical: state.draftPoolConfig.include_mythical,
                  include_paradox: state.draftPoolConfig.include_paradox,
                }
              : undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        onSuccess()
      } else {
        setError(data.error || "Failed to create session")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <button
              type="button"
              onClick={() => setStep(s.id)}
              className={`rounded-full w-8 h-8 text-sm font-medium flex items-center justify-center ${
                step === s.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {s.id}
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
          </div>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Draft Basics */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Draft Type</Label>
            <Select value={state.draftType} onValueChange={(v) => update("draftType", v as WizardState["draftType"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="snake">Snake Draft</SelectItem>
                <SelectItem value="linear">Linear Draft</SelectItem>
                <SelectItem value="auction">Auction Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Pick Time Limit (seconds)</Label>
            <Input
              type="number"
              value={state.pickTimeLimit}
              onChange={(e) => update("pickTimeLimit", parseInt(e.target.value) || 45)}
              min={10}
              max={300}
            />
          </div>
        </div>
      )}

      {/* Step 2: Rules & Season */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Rule Set (optional)</Label>
            <Select
              value={state.rulesetSection || "none"}
              onValueChange={(v) => update("rulesetSection", v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Use current season rules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Use current season rules</SelectItem>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.section_title}>
                    {s.section_title} ({s.config_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Season Length (regular weeks)</Label>
            <Input
              type="number"
              value={state.seasonLengthWeeks}
              onChange={(e) => update("seasonLengthWeeks", parseInt(e.target.value) || 10)}
              min={8}
              max={14}
            />
          </div>
        </div>
      )}

      {/* Step 3: Playoffs & Teams */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Playoff Format</Label>
            <Select
              value={state.playoffFormat}
              onValueChange={(v) => update("playoffFormat", v as WizardState["playoffFormat"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3_week">3 Week Playoff</SelectItem>
                <SelectItem value="4_week">4 Week Playoff</SelectItem>
                <SelectItem value="single_elimination">Single Elimination</SelectItem>
                <SelectItem value="double_elimination">Double Elimination</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Playoff Teams (top N)</Label>
            <Input
              type="number"
              value={state.playoffTeams}
              onChange={(e) => update("playoffTeams", parseInt(e.target.value) || 4)}
              min={2}
              max={16}
            />
          </div>
        </div>
      )}

      {/* Step 4: Draft Order & Pool */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Draft Position</Label>
            <Select
              value={state.draftPositionMethod}
              onValueChange={(v) => update("draftPositionMethod", v as WizardState["draftPositionMethod"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="randomizer">Randomizer</SelectItem>
                <SelectItem value="commissioner">Commissioner sets order</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {state.draftPositionMethod === "commissioner" && teams.length > 0 && (
            <div className="space-y-2">
              <Label>Draft order (pick 1 = first)</Label>
              <p className="text-xs text-muted-foreground">
                Select team for each pick. All {teams.length} teams must be assigned.
              </p>
              <div className="grid gap-2 max-h-48 overflow-y-auto">
                {teams.map((_, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-muted-foreground w-16">Pick {idx + 1}:</span>
                    <Select
                      value={state.turnOrder[idx] ?? ""}
                      onValueChange={(v) => {
                        const next = [...state.turnOrder]
                        next[idx] = v
                        update("turnOrder", next)
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((t) => (
                          <SelectItem
                            key={t.id}
                            value={t.id}
                            disabled={state.turnOrder.includes(t.id) && state.turnOrder[idx] !== t.id}
                          >
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Draft Pool Source</Label>
            <Select
              value={state.draftPoolSource}
              onValueChange={(v) =>
                update("draftPoolSource", v as WizardState["draftPoolSource"]) ||
                update("draftPoolConfig", {})
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="season_draft_pool">Use existing season pool</SelectItem>
                <SelectItem value="generation">By Generation</SelectItem>
                <SelectItem value="game">By Game</SelectItem>
                <SelectItem value="archived">Archived Pool</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {state.draftPoolSource === "generation" && (
            <div className="space-y-2">
              <Label>Generation (1–9)</Label>
              <Input
                type="number"
                value={state.draftPoolConfig.generation ?? ""}
                onChange={(e) =>
                  update("draftPoolConfig", {
                    ...state.draftPoolConfig,
                    generation: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  })
                }
                min={1}
                max={9}
                placeholder="e.g. 9"
              />
              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={state.draftPoolConfig.include_legendary ?? false}
                    onCheckedChange={(c) =>
                      update("draftPoolConfig", { ...state.draftPoolConfig, include_legendary: !!c })
                    }
                  />
                  Legendary
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={state.draftPoolConfig.include_mythical ?? false}
                    onCheckedChange={(c) =>
                      update("draftPoolConfig", { ...state.draftPoolConfig, include_mythical: !!c })
                    }
                  />
                  Mythical
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={state.draftPoolConfig.include_paradox ?? false}
                    onCheckedChange={(c) =>
                      update("draftPoolConfig", { ...state.draftPoolConfig, include_paradox: !!c })
                    }
                  />
                  Paradox
                </label>
              </div>
            </div>
          )}

          {state.draftPoolSource === "game" && (
            <div className="space-y-2">
              <Label>Game Code</Label>
              <Input
                value={state.draftPoolConfig.game_code ?? ""}
                onChange={(e) =>
                  update("draftPoolConfig", { ...state.draftPoolConfig, game_code: e.target.value || undefined })
                }
                placeholder="e.g. SV, FRLG, SwSh"
              />
            </div>
          )}

          {state.draftPoolSource === "archived" && (
            <div className="space-y-2">
              <Label>Archived Pool</Label>
              <Select
                value={state.draftPoolConfig.archived_pool_id ?? ""}
                onValueChange={(v) =>
                  update("draftPoolConfig", { ...state.draftPoolConfig, archived_pool_id: v || undefined })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select archived pool" />
                </SelectTrigger>
                <SelectContent>
                  {archivedPools.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                  {archivedPools.length === 0 && (
                    <SelectItem value="_none" disabled>
                      No archived pools. Save one first.
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Step 5: Review */}
      {step === 5 && (
        <div className="space-y-3 text-sm">
          <p><strong>Draft Type:</strong> {state.draftType}</p>
          <p><strong>Pick Time:</strong> {state.pickTimeLimit}s</p>
          <p><strong>Season Length:</strong> {state.seasonLengthWeeks} weeks</p>
          <p><strong>Playoff:</strong> {state.playoffFormat}, top {state.playoffTeams}</p>
          <p><strong>Draft Position:</strong> {state.draftPositionMethod}</p>
          <p><strong>Draft Pool:</strong> {state.draftPoolSource}
            {state.draftPoolSource === "generation" && state.draftPoolConfig.generation && ` (Gen ${state.draftPoolConfig.generation})`}
            {state.draftPoolSource === "game" && state.draftPoolConfig.game_code && ` (${state.draftPoolConfig.game_code})`}
            {state.draftPoolSource === "archived" && state.draftPoolConfig.archived_pool_id && ` (archived)`}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <div>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {step < 5 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Session"
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
