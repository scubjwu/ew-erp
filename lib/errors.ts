/**
 * Supabase PostgREST errors are usually `Error` subclasses, but some paths
 * surface plain objects or non-standard shapes — normalize for UI toasts.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  if (typeof err === "string" && err.trim()) {
    return err;
  }
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    const parts = [o.message, o.details, o.hint, o.code].filter(
      (v): v is string => typeof v === "string" && v.length > 0
    );
    if (parts.length) return parts.join(" — ");
  }
  try {
    return JSON.stringify(err);
  } catch {
    return "Something went wrong";
  }
}
