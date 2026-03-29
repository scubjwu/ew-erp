/**
 * Escape `%` and `_` for PostgreSQL ILIKE patterns (PostgREST passes through).
 */
export function escapeIlikePatternFragment(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
