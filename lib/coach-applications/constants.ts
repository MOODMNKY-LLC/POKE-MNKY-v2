export const COACH_APPLICATION_STATUSES = [
  "pending",
  "hold",
  "follow_up",
  "approved",
  "rejected",
] as const

export type CoachApplicationStatus = (typeof COACH_APPLICATION_STATUSES)[number]

export const REJECTION_REASONS = [
  { value: "season_full", label: "Season full" },
  { value: "no_current_draft", label: "No current draft" },
  { value: "not_enough_experience", label: "Not enough experience" },
  { value: "not_qualified", label: "Not qualified" },
  { value: "other", label: "Other" },
] as const

export type RejectionReason = (typeof REJECTION_REASONS)[number]["value"]
