import { getErrorMessage } from "@/lib/errors";

export type CustomerSaveErrorToast = {
  title: string;
  description: string;
};

function extractCode(err: unknown): string {
  if (!err || typeof err !== "object") return "";
  const o = err as Record<string, unknown>;
  const c = o.code;
  return typeof c === "string" || typeof c === "number" ? String(c) : "";
}

/**
 * Maps Supabase / network failures to operator-facing copy.
 */
export function classifyCustomerSaveError(
  err: unknown
): CustomerSaveErrorToast {
  const msg = getErrorMessage(err);
  const lower = msg.toLowerCase();
  const code = extractCode(err);

  if (
    code === "PGRST301" ||
    /jwt expired|invalid jwt|session expired|not authenticated|401/.test(
      lower
    )
  ) {
    return {
      title: "Session expired",
      description:
        "Sign in again, then retry. Your session is no longer valid.",
    };
  }

  if (
    code === "42501" ||
    /permission denied|row-level security|rls policy|new row violates row-level security/.test(
      lower
    )
  ) {
    return {
      title: "Access denied",
      description:
        "This save was blocked by database permissions (RLS). Check your role or contact an admin.",
    };
  }

  if (
    /failed to fetch|networkerror|network request failed|load failed|net::err|econnrefused|timeout/.test(
      lower
    )
  ) {
    return {
      title: "Network error",
      description:
        "Could not reach the server. Check your connection and try again.",
    };
  }

  return {
    title: "Could not save",
    description: msg,
  };
}

/** True if the row in the database was updated after our edit baseline (OCC). */
export function isOccConflict(
  latestDbUpdatedAt: string,
  baselineUpdatedAt: string
): boolean {
  const latest = new Date(latestDbUpdatedAt).getTime();
  const base = new Date(baselineUpdatedAt).getTime();
  if (!Number.isFinite(latest) || !Number.isFinite(base)) return false;
  return latest > base;
}
