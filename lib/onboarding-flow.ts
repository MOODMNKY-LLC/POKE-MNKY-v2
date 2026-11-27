export type OnboardingBackendStep =
  | "welcome"
  | "register_as_coach"
  | "link_team"
  | "team_builder_intro"
  | "complete"

export type OnboardingChecklistId =
  | "discord_linked"
  | "coach_assigned"
  | "team_linked"
  | "team_builder_intro"
  | "complete"

export type OnboardingChecklistStatus = "complete" | "current" | "upcoming"

export interface OnboardingChecklistItem {
  id: OnboardingChecklistId
  title: string
  description: string
}

export const ONBOARDING_CHECKLIST: OnboardingChecklistItem[] = [
  {
    id: "discord_linked",
    title: "Discord linked",
    description: "Sign in with Discord so the app can match your profile, roles, and bot commands.",
  },
  {
    id: "coach_assigned",
    title: "Coach assigned",
    description: "Coach role is active. Claim your league team on the dashboard (or ask an admin to assign you).",
  },
  {
    id: "team_linked",
    title: "Team linked",
    description: "Link your league team under Dashboard → My team — required for draft board and the assistant.",
  },
  {
    id: "team_builder_intro",
    title: "Team Builder intro",
    description: "Open Showdown tools → Builder to paste or build weekly team exports. Battling on public Pokémon Showdown is optional.",
  },
  {
    id: "complete",
    title: "Complete",
    description: "You are ready for the league app. Optional next: Guides → Battle network (NetBird) if you play on Ryujinx.",
  },
]

const BACKEND_STEP_ORDER: OnboardingBackendStep[] = [
  "welcome",
  "register_as_coach",
  "link_team",
  "team_builder_intro",
  "complete",
]

const CHECKLIST_STEP_TO_BACKEND_INDEX: Record<OnboardingChecklistId, number> = {
  discord_linked: -1,
  coach_assigned: 1,
  team_linked: 2,
  team_builder_intro: 3,
  complete: 4,
}

export function getVisibleOnboardingStepId(currentStep: string | null | undefined): OnboardingChecklistId {
  switch (currentStep) {
    case "link_team":
      return "team_linked"
    case "team_builder_intro":
      return "team_builder_intro"
    case "complete":
      return "complete"
    case "register_as_coach":
    case "welcome":
    default:
      return "coach_assigned"
  }
}

export function getOnboardingChecklistStatus(
  itemId: OnboardingChecklistId,
  currentStep: string | null | undefined,
  completedSteps: string[] = [],
  completedAt: string | null = null
): OnboardingChecklistStatus {
  if (itemId === "discord_linked") return "complete"
  if (completedAt) return "complete"

  const currentIndex = BACKEND_STEP_ORDER.findIndex((step) => step === currentStep)
  const itemIndex = CHECKLIST_STEP_TO_BACKEND_INDEX[itemId]
  const completedIndex = completedSteps
    .map((step) => BACKEND_STEP_ORDER.findIndex((backendStep) => backendStep === step))
    .filter((index) => index >= 0)
    .reduce((max, index) => Math.max(max, index), -1)

  if (completedIndex >= itemIndex) return "complete"
  if (currentIndex === itemIndex) return "current"
  if (currentIndex > itemIndex) return "complete"
  return "upcoming"
}

export function getOnboardingProgressLabel(currentStep: string | null | undefined): string {
  const visibleStep = getVisibleOnboardingStepId(currentStep)
  const item = ONBOARDING_CHECKLIST.find((step) => step.id === visibleStep)
  return item?.title ?? "Discord linked"
}

export function getDashboardOnboardingCopy(hasCoachAccess: boolean, onboardingCompleted: boolean) {
  if (onboardingCompleted) {
    return {
      title: "Onboarding complete",
      description:
        "Your Discord profile, coach role, and league team are linked. Use My team, This week, and Draft from the sidebar. Showdown battles stay optional on the public client.",
      cta: "Open Team Builder",
    }
  }

  if (hasCoachAccess) {
    return {
      title: "Continue coach onboarding",
      description:
        "Discord is linked. Finish team linking and the Team Builder intro — no self-hosted Showdown install is required.",
      cta: "Continue onboarding",
    }
  }

  return {
    title: "Start coach onboarding",
    description:
      "Sign in with Discord, claim your league team, then open the Team Builder. Public Showdown and the battle-network guide are optional after you finish.",
    cta: "Start onboarding",
  }
}

export const DISCORD_LOGIN_COPY = {
  eyebrow: "Discord is the entrypoint",
  title: "Sign in with Discord",
  description:
    "Use Discord to enter the league app, sync your roles, and continue the onboarding checklist in one place.",
  footer:
    "Email sign-in stays available for legacy access, but Discord is the path that unlocks the full league workflow.",
}

export const DISCORD_LINKED_ROLES_COPY = {
  title: "Optional Discord-side verification",
  description:
    "Linked Roles is separate from app onboarding. Use it if your Discord server requires role verification, but it does not replace the app checklist.",
  helper:
    "This flow only connects Discord role verification. Your league onboarding still happens in the dashboard.",
}

