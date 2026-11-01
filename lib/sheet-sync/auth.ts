/** Cron bearer secret, or an admin session limited to dry-run. */
export function authorizeSheetSync(input: {
  authorization: string | null
  cronSecret: string | undefined
  isAdmin: boolean
  dryRun: boolean
}): boolean {
  const secret = input.cronSecret?.trim()
  if (secret && input.authorization === `Bearer ${secret}`) return true
  return input.isAdmin && input.dryRun
}
