import { ErrorState, NotFoundRecoveryLinks } from "@/components/states/error-state"

export default function NotFound() {
  return (
    <ErrorState
      title="This page fainted"
      description="We could not find that page. Head home, check the standings, or browse the draft board."
      primaryAction={<NotFoundRecoveryLinks />}
    />
  )
}
