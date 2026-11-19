/**
 * Conventional Infisical environment slugs for this repo's three deploy slots.
 * Confirm these against the existing self-hosted project before the first
 * authenticated run, and change them here if that project uses other slugs.
 * There is no default slot: callers must pass one.
 */
export const INFISICAL_DEPLOYMENT_SLOTS = {
  development: "dev",
  preview: "staging",
  production: "prod",
} as const

export type InfisicalDeploymentSlot = keyof typeof INFISICAL_DEPLOYMENT_SLOTS

export function isInfisicalDeploymentSlot(
  value: string,
): value is InfisicalDeploymentSlot {
  return Object.prototype.hasOwnProperty.call(INFISICAL_DEPLOYMENT_SLOTS, value)
}
