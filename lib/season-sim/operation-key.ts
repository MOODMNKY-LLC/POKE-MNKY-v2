/**
 * Domain-epoch prefix for simulation_steps.operation_key.
 * After scoped UUID reset, epoch increments so replay does not hit prior-epoch idempotency.
 */

export function domainOperationKey(
  cursor: Record<string, unknown> | null | undefined,
  key: string,
): string {
  const epoch = Number(cursor?.domain_epoch ?? 0)
  return epoch > 0 ? `e${epoch}:${key}` : key
}
