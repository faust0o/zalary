/**
 * Compute the next due date for a payroll, based on the last run date.
 * Matches the server-side logic in dashboard.queries.ts.
 */
export function getNextDueDate(
  schedule: string,
  customDays?: number | null,
  lastRunDate?: Date | null
): Date {
  const base = lastRunDate ?? new Date()
  const next = new Date(base)
  switch (schedule) {
    case "EVERY_TWO_WEEKS":
      next.setDate(next.getDate() + 14)
      break
    case "EVERY_MONTH":
      next.setMonth(next.getMonth() + 1)
      break
    case "EVERY_X_DAYS":
      next.setDate(next.getDate() + (customDays ?? 30))
      break
  }
  return next
}
